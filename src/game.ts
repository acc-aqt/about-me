import kaplay, { type GameObj, type Vec2 } from "kaplay";
import { zoneById, type Content, type PointOfInterest, type Zone, type ZoneId } from "./content";
import { CATS, chooseCatStep, chooseRest, chooseWalkLength, directionTowards, type CatName, type CatPose } from "./cats";
import {
  isInNamePlateRange,
  LABEL_PADDING,
  NAME_PLATE_WRAP_WIDTH,
  NAME_PLATES,
  namePlateBox,
  needsWrap,
  shownNamePlates,
  ZONE_TITLE_BOTTOM,
  ZONE_TITLE_Y,
  type NamePlate,
} from "./namePlates";
import {
  CAT_ANIMS,
  CAT_FRAME_COUNT,
  CAT_FRAME_HEIGHT,
  CAT_SLEEPING_HEIGHT,
  catAnim,
  INK,
  PLAYER_ANIMS,
  PLAYER_FRAME_COUNT,
  paintCatSheet,
  paintFilmRoll,
  paintHeart,
  paintOverworld,
  paintPlayerSheet,
  playerAnim,
  type Rgb,
} from "./art";
import {
  facedPointOfInterest,
  fastTravelLanding,
  filmRollCover,
  isWalkable,
  MAP_COLUMNS,
  MAP_ROWS,
  OVERWORLD_TILE_SIZE,
  SPAWN,
  tileAhead,
  tileKey,
  tileToPixels,
  zoneAt,
  type Direction,
  type Landing,
  type Tile,
} from "./overworld";
import { createPlayerWalk, STEP_TIME, type Step } from "./playerWalk";
import { PIXEL_FONT_CELL_HEIGHT, PIXEL_FONT_CELL_WIDTH, PIXEL_FONT_CHARS, PIXEL_FONT_NAME, paintPixelFont } from "./pixel-font";

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 180;
const MAP_WIDTH = MAP_COLUMNS * OVERWORLD_TILE_SIZE;
const MAP_HEIGHT = MAP_ROWS * OVERWORLD_TILE_SIZE;
/** Cats stroll, a little slower than the Player walks. */
const CAT_STEP_TIME = STEP_TIME * 1.5;
/** How long a Cat sits facing the Player, showing a heart, after the Shutter. */
const CAT_REACTION_TIME = 2;
const HEART_HEIGHT = 6;
const BACKGROUND: Rgb = [20, 20, 30];
const LABEL_PLATE_COLOR: Rgb = [251, 248, 240];
const Z_FILM_ROLL = 1;
/** A copy of the cover tile beside a Film roll, drawn over the roll so it peeks out from behind. */
const Z_FILM_ROLL_COVER = 1.5;
/** Just below the Player, so a Player standing south of a Cat stands in front of it. */
const Z_CAT = 1.8;
const Z_PLAYER = 2;
const Z_LABEL = 3;

const KEY_BUTTONS: Record<string, GameButton> = {
  arrowup: "up",
  w: "up",
  arrowdown: "down",
  s: "down",
  arrowleft: "left",
  a: "left",
  arrowright: "right",
  d: "right",
  " ": "shutter",
};

export type GameButton = Direction | "shutter";

export type GameControls = {
  press(button: GameButton): void;
  release(button: GameButton): void;
  travelTo(zoneId: ZoneId): void;
  /** Where the Player stands and which way it faces; mid-step, the tile it is leaving. */
  position(): Landing;
  focus(): void;
  /** Frees the game's canvas, input and loop, so another renderer can take over the container. */
  stop(): void;
};

/** The Player spawns in the Hub facing down. */
export const SPAWN_LANDING: Landing = { tile: SPAWN, facing: "down" };

export type GameEvents = {
  onFacingChange(poi: PointOfInterest | null): void;
  onShutter(poi: PointOfInterest): void;
  canFireShutter(): boolean;
  onFilmRollCollected(zone: Zone): void;
  onFootstep(): void;
  onBump(): void;
  /** True while an overlay such as the Viewfinder covers the game, which stills the Cats. */
  isPaused(): boolean;
};

type LabelOptions = { wrap?: boolean; fixed?: boolean };
type CatMode = { kind: "walking"; stepsLeft: number } | { kind: "resting"; pose: CatPose; secondsLeft: number };
type Cat = {
  name: CatName;
  sprite: GameObj;
  plate: GameObj;
  heart: GameObj;
  tile: Tile;
  facing: Direction;
  step: Step | null;
  mode: CatMode;
  heartSecondsLeft: number;
  shutterPending: boolean;
};

/** Where a sprite standing on a tile is anchored: the bottom centre of the tile. */
function tileFoot(tile: Tile): [number, number] {
  const [x, y] = tileToPixels(tile);
  return [x + OVERWORLD_TILE_SIZE / 2, y + OVERWORLD_TILE_SIZE];
}

function loadImage(path: string) {
  const image = new Image();
  image.src = import.meta.env.BASE_URL + path;
  return image;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** A fresh canvas each start: stopping Kaplay loses the canvas's WebGL context for good. */
function addCanvas(container: HTMLElement) {
  const canvas = document.createElement("canvas");
  canvas.id = "game";
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "application");
  canvas.setAttribute("aria-label", "Portfolio game");
  canvas.setAttribute("aria-describedby", "hint");
  container.prepend(canvas);
  return canvas;
}

export function startGame(container: HTMLElement, content: Content, events: GameEvents, start = SPAWN_LANDING): GameControls {
  const canvas = addCanvas(container);
  let stopped = false;
  const k = kaplay({
    canvas,
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
    letterbox: true,
    stretch: true,
    crisp: true,
    texFilter: "nearest",
    global: false,
    debug: false,
    background: BACKGROUND,
  });

  const pointsOfInterest = content.zones.flatMap((zone) => zone.pointsOfInterest);

  k.loadSprite("player", paintPlayerSheet(), { sliceX: PLAYER_FRAME_COUNT, anims: PLAYER_ANIMS });
  k.loadSprite("film-roll", paintFilmRoll());
  k.loadSprite("heart", paintHeart());
  for (const { name } of CATS) k.loadSprite(`cat-${name}`, paintCatSheet(name), { sliceX: CAT_FRAME_COUNT, anims: CAT_ANIMS });
  k.loadBitmapFont(PIXEL_FONT_NAME, paintPixelFont(), PIXEL_FONT_CELL_WIDTH, PIXEL_FONT_CELL_HEIGHT, {
    chars: PIXEL_FONT_CHARS,
  });

  const sheets = { town: loadImage("art/kenney-tiny-town-tiles.png"), dungeon: loadImage("art/kenney-tiny-dungeon-tiles.png") };
  Promise.all([sheets.town.decode(), sheets.dungeon.decode()]).then(() => {
    if (stopped) return;
    k.loadSprite("overworld", paintOverworld(sheets, pointsOfInterest));
    k.add([k.sprite("overworld"), k.pos(0, 0)]);
    for (const zone of content.zones) if (zone.filmRoll) addFilmRollCover(zone.filmRoll);
  });

  /** Half a tile from the tile's centre towards its cover, so the cover hides half the roll. */
  function filmRollCentre(roll: Tile): Vec2 {
    const centre = k.vec2(...tileToPixels(roll)).add(OVERWORLD_TILE_SIZE / 2, OVERWORLD_TILE_SIZE / 2);
    const cover = filmRollCover(roll);
    if (!cover) return centre;
    const towards = tileAhead(roll, cover);
    return centre.add(k.vec2(towards.col - roll.col, towards.row - roll.row).scale(OVERWORLD_TILE_SIZE / 2));
  }

  function addFilmRollCover(roll: Tile) {
    const cover = filmRollCover(roll);
    if (!cover) return;
    const [x, y] = tileToPixels(tileAhead(roll, cover));
    const size = OVERWORLD_TILE_SIZE;
    const quad = k.quad(x / MAP_WIDTH, y / MAP_HEIGHT, size / MAP_WIDTH, size / MAP_HEIGHT);
    k.add([k.sprite("overworld", { quad }), k.pos(x, y), k.z(Z_FILM_ROLL_COVER)]);
  }

  function addLabel(text: string, position: Vec2, anchor: "top" | "bot", { wrap = false, fixed = false }: LabelOptions = {}) {
    const plate = k.add([
      k.rect(0, 0),
      k.pos(position),
      k.anchor(anchor),
      k.color(...LABEL_PLATE_COLOR),
      k.opacity(0.9),
      k.z(Z_LABEL),
      ...(fixed ? [k.fixed()] : []),
    ]);
    const textY = anchor === "top" ? LABEL_PADDING + 1 : -LABEL_PADDING + 1;
    // Kaplay reports the wrap width as the text width, so only wrap titles that need it.
    const width = wrap && needsWrap(text) ? NAME_PLATE_WRAP_WIDTH : undefined;
    const label = plate.add([
      k.text(text, { font: PIXEL_FONT_NAME, size: PIXEL_FONT_CELL_HEIGHT, width, align: "center" }),
      k.pos(0, textY),
      k.anchor(anchor),
      k.color(...INK),
    ]);
    plate.onUpdate(() => {
      plate.width = Math.ceil(label.width) + LABEL_PADDING * 2;
      plate.height = Math.ceil(label.height) + LABEL_PADDING * 2;
    });
    return label;
  }

  function addNamePlate(namePlate: NamePlate) {
    const { left, right, bottom } = namePlateBox(namePlate);
    return addLabel(namePlate.text, k.vec2((left + right) / 2, bottom), "bot", { wrap: true }).parent!;
  }

  const namePlates = new Map(NAME_PLATES.map((namePlate) => [namePlate, addNamePlate(namePlate)]));

  /** A tall footprint's plate can rise to the top of the view; there it slides down over the footprint, below the Zone title. */
  function keepNamePlatesBelowZoneTitle() {
    const viewTop = k.getCamPos().y - VIEW_HEIGHT / 2;
    for (const [namePlate, plate] of namePlates) {
      if (plate.hidden) continue;
      plate.pos.y = Math.max(namePlateBox(namePlate).bottom, viewTop + ZONE_TITLE_BOTTOM + 1 + plate.height);
    }
  }

  function showNearbyNamePlates() {
    const { tile, facing } = walk.position();
    const shown = new Set(shownNamePlates(tile, facing));
    for (const [namePlate, plate] of namePlates) plate.hidden = !shown.has(namePlate);
  }

  const filmRolls = new Map<string, { zone: Zone; sprite: GameObj }>();
  for (const zone of content.zones) {
    if (!zone.filmRoll) continue;
    const sprite = k.add([k.sprite("film-roll"), k.pos(filmRollCentre(zone.filmRoll)), k.anchor("center"), k.z(Z_FILM_ROLL)]);
    filmRolls.set(tileKey(zone.filmRoll), { zone, sprite });
  }

  // The current Zone's title sits top-centre of the view, clear of the DOM corner controls.
  const zoneTitle = addLabel("", k.vec2(VIEW_WIDTH / 2, ZONE_TITLE_Y), "top", { fixed: true });

  const player = k.add([k.sprite("player", { anim: playerAnim(start.facing, false) }), k.pos(...tileFoot(start.tile)), k.anchor("bot"), k.z(Z_PLAYER)]);

  function restingMode(): CatMode {
    const rest = chooseRest(Math.random);
    return { kind: "resting", pose: rest.pose, secondsLeft: rest.seconds };
  }

  const cats: Cat[] = CATS.map(({ name, start }) => ({
    name,
    sprite: k.add([k.sprite(`cat-${name}`), k.pos(...tileFoot(start)), k.anchor("bot"), k.z(Z_CAT)]),
    plate: addLabel(name, k.vec2(0, 0), "bot").parent!,
    heart: k.add([k.sprite("heart"), k.pos(0, 0), k.anchor("bot"), k.z(Z_LABEL)]),
    tile: start,
    facing: "down",
    step: null,
    mode: restingMode(),
    heartSecondsLeft: 0,
    shutterPending: false,
  }));

  /** The tiles a Cat or the Player stands on or is stepping onto. */
  function occupied(at: { tile: Tile; step: Step | null }): string[] {
    return at.step ? [tileKey(at.tile), tileKey(at.step.to)] : [tileKey(at.tile)];
  }

  function catOn(target: Tile): Cat | undefined {
    return cats.find((cat) => occupied(cat).includes(tileKey(target)));
  }

  let facedPoi: PointOfInterest | null = null;

  const walk = createPlayerWalk(start, (next) => !isWalkable(next) || catOn(next) !== undefined, {
    onTurn() {
      const { tile, facing } = walk.position();
      setFacedPoi(facedPointOfInterest(tile, facing) ?? null);
      showNearbyNamePlates();
    },
    onStepStart: () => setFacedPoi(null),
    onArrive: arrive,
    onBump: () => events.onBump(),
  });

  function setFacedPoi(poi: PointOfInterest | null) {
    if (poi === facedPoi) return;
    facedPoi = poi;
    events.onFacingChange(poi);
  }

  function showSurroundings() {
    const zoneId = zoneAt(walk.position().tile);
    // Tiles between Zones keep the last Zone's title.
    if (zoneId) zoneTitle.text = zoneById(zoneId).title;
    showNearbyNamePlates();
  }

  function arrive() {
    const { tile, facing } = walk.position();
    events.onFootstep();
    player.pos = k.vec2(...tileFoot(tile));
    const roll = filmRolls.get(tileKey(tile));
    if (roll) {
      filmRolls.delete(tileKey(tile));
      roll.sprite.destroy();
      events.onFilmRollCollected(roll.zone);
    }
    showSurroundings();
    setFacedPoi(facedPointOfInterest(tile, facing) ?? null);
  }

  function stepPosition(current: Step, duration: number): Vec2 {
    return k.vec2(...tileFoot(current.from)).lerp(k.vec2(...tileFoot(current.to)), current.elapsed / duration);
  }

  function react(cat: Cat) {
    cat.shutterPending = false;
    cat.facing = directionTowards(cat.tile, walk.position().tile);
    cat.mode = { kind: "resting", pose: "sit", secondsLeft: CAT_REACTION_TIME };
    cat.heartSecondsLeft = CAT_REACTION_TIME;
  }

  function moveCat(cat: Cat) {
    if (cat.step) {
      cat.step.elapsed += k.dt();
      if (cat.step.elapsed < CAT_STEP_TIME) return;
      cat.tile = cat.step.to;
      cat.step = null;
    }
    if (cat.shutterPending) return react(cat);
    if (cat.mode.kind === "resting") {
      cat.mode.secondsLeft -= k.dt();
      if (cat.mode.secondsLeft <= 0) cat.mode = { kind: "walking", stepsLeft: chooseWalkLength(Math.random) };
      return;
    }
    const playerAt = { tile: walk.position().tile, step: walk.step() };
    const blocked = new Set([...occupied(playerAt), ...cats.filter((other) => other !== cat).flatMap(occupied)]);
    const direction = cat.mode.stepsLeft > 0 ? chooseCatStep(cat.tile, blocked, Math.random) : undefined;
    if (!direction) {
      cat.mode = restingMode();
      return;
    }
    cat.mode.stepsLeft--;
    cat.facing = direction;
    cat.step = { from: cat.tile, to: tileAhead(cat.tile, direction), elapsed: 0 };
  }

  function catPose(cat: Cat) {
    if (cat.step) return "walk";
    return cat.mode.kind === "resting" ? cat.mode.pose : "stand";
  }

  function drawCat(cat: Cat) {
    cat.sprite.pos = cat.step ? stepPosition(cat.step, CAT_STEP_TIME) : k.vec2(...tileFoot(cat.tile));
    const pose = catPose(cat);
    const anim = catAnim(pose, cat.facing);
    if (cat.sprite.getCurAnim()?.name !== anim) cat.sprite.play(anim);
    const head = cat.sprite.pos.sub(0, (pose === "sleep" ? CAT_SLEEPING_HEIGHT : CAT_FRAME_HEIGHT) + 1);
    cat.heart.hidden = cat.heartSecondsLeft <= 0;
    cat.heart.pos = head;
    cat.plate.hidden = !isInNamePlateRange(walk.position().tile, cat.tile);
    cat.plate.pos = cat.heart.hidden ? head : head.sub(0, HEART_HEIGHT + 1);
  }

  function updateCats() {
    const paused = events.isPaused();
    for (const cat of cats) {
      cat.sprite.animSpeed = paused ? 0 : 1;
      if (!paused) {
        moveCat(cat);
        cat.heartSecondsLeft -= k.dt();
      }
      drawCat(cat);
    }
  }

  function updateCamera() {
    const x = clamp(player.pos.x, VIEW_WIDTH / 2, MAP_WIDTH - VIEW_WIDTH / 2);
    const y = clamp(player.pos.y - OVERWORLD_TILE_SIZE / 2, VIEW_HEIGHT / 2, MAP_HEIGHT - VIEW_HEIGHT / 2);
    k.setCamPos(Math.round(x), Math.round(y));
  }

  k.onUpdate(() => {
    walk.update(k.dt());
    const step = walk.step();
    if (step) player.pos = stepPosition(step, STEP_TIME);
    const anim = playerAnim(walk.position().facing, step !== null);
    if (player.getCurAnim()?.name !== anim) player.play(anim);
    updateCats();
    updateCamera();
    keepNamePlatesBelowZoneTitle();
  });

  function press(button: GameButton) {
    if (button !== "shutter") {
      walk.press(button);
      return;
    }
    if (!events.canFireShutter()) return;
    if (facedPoi) events.onShutter(facedPoi);
    else if (!walk.step()) {
      const { tile, facing } = walk.position();
      const cat = catOn(tileAhead(tile, facing));
      if (cat) cat.shutterPending = true;
    }
  }

  function release(button: GameButton) {
    if (button !== "shutter") walk.release(button);
  }

  canvas.addEventListener("keydown", (event) => {
    const button = KEY_BUTTONS[event.key.toLowerCase()];
    if (!button) return;
    event.preventDefault();
    if (!event.repeat) press(button);
  });
  canvas.addEventListener("keyup", (event) => {
    const button = KEY_BUTTONS[event.key.toLowerCase()];
    if (button) release(button);
  });
  canvas.addEventListener("blur", () => walk.releaseAll());

  showSurroundings();
  setFacedPoi(facedPointOfInterest(start.tile, start.facing) ?? null);

  return {
    press,
    release,
    travelTo(zoneId) {
      const landing = fastTravelLanding(zoneId);
      walk.travelTo(landing);
      player.pos = k.vec2(...tileFoot(landing.tile));
      showSurroundings();
    },
    position: () => walk.position(),
    focus: () => canvas.focus(),
    stop() {
      if (stopped) return;
      stopped = true;
      k.quit();
      canvas.remove();
    },
  };
}

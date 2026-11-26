import kaplay, { type GameObj, type Vec2 } from "kaplay";
import { zoneById, type Content, type PointOfInterest, type Zone, type ZoneId } from "./content";
import { CAT_STEP_TIME, CATS, catPose, isHeartShown, type Cats } from "./cats";
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
  LABEL_PLATE_COLOR,
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
  tileAhead,
  tileKey,
  tileToPixels,
  zoneAt,
  type Landing,
  type Tile,
} from "./overworld";
import { createPlayerWalk, STEP_TIME, type Step } from "./playerWalk";
import { addCanvas, clamp, KEY_BUTTONS, type GameButton, type GameControls, type GameEvents } from "./renderer";
import { PIXEL_FONT_CELL_HEIGHT, PIXEL_FONT_CELL_WIDTH, PIXEL_FONT_CHARS, PIXEL_FONT_NAME, paintPixelFont } from "./pixel-font";

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 180;
const MAP_WIDTH = MAP_COLUMNS * OVERWORLD_TILE_SIZE;
const MAP_HEIGHT = MAP_ROWS * OVERWORLD_TILE_SIZE;
const HEART_HEIGHT = 6;
const BACKGROUND: Rgb = [20, 20, 30];
const Z_FILM_ROLL = 1;
/** A copy of the cover tile beside a Film roll, drawn over the roll so it peeks out from behind. */
const Z_FILM_ROLL_COVER = 1.5;
/** Just below the Player, so a Player standing south of a Cat stands in front of it. */
const Z_CAT = 1.8;
const Z_PLAYER = 2;
const Z_LABEL = 3;

type LabelOptions = { wrap?: boolean; fixed?: boolean };

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

export function startGame(
  container: HTMLElement,
  content: Content,
  events: GameEvents,
  start: Landing,
  collectedFilmRolls: ReadonlySet<ZoneId>,
  cats: Cats,
): GameControls {
  // Stopping Kaplay loses the canvas's WebGL context for good, so each start adds a fresh one.
  const canvas = addCanvas(container, "game", "Portfolio game");
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
    if (!zone.filmRoll || collectedFilmRolls.has(zone.id)) continue;
    const sprite = k.add([k.sprite("film-roll"), k.pos(filmRollCentre(zone.filmRoll)), k.anchor("center"), k.z(Z_FILM_ROLL)]);
    filmRolls.set(tileKey(zone.filmRoll), { zone, sprite });
  }

  // The current Zone's title sits top-centre of the view, clear of the DOM corner controls.
  const zoneTitle = addLabel("", k.vec2(VIEW_WIDTH / 2, ZONE_TITLE_Y), "top", { fixed: true });

  const player = k.add([k.sprite("player", { anim: playerAnim(start.facing, false) }), k.pos(...tileFoot(start.tile)), k.anchor("bot"), k.z(Z_PLAYER)]);

  const catSprites = cats.all.map((cat) => ({
    cat,
    sprite: k.add([k.sprite(`cat-${cat.name}`), k.pos(...tileFoot(cat.tile)), k.anchor("bot"), k.z(Z_CAT)]),
    plate: addLabel(cat.name, k.vec2(0, 0), "bot").parent!,
    heart: k.add([k.sprite("heart"), k.pos(0, 0), k.anchor("bot"), k.z(Z_LABEL)]),
  }));

  let facedPoi: PointOfInterest | null = null;

  const walk = createPlayerWalk(start, (next) => !isWalkable(next) || cats.catOn(next) !== undefined, {
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

  function drawCat({ cat, sprite, plate, heart }: (typeof catSprites)[number]) {
    sprite.pos = cat.step ? stepPosition(cat.step, CAT_STEP_TIME) : k.vec2(...tileFoot(cat.tile));
    const pose = catPose(cat);
    const anim = catAnim(pose, cat.facing);
    if (sprite.getCurAnim()?.name !== anim) sprite.play(anim);
    const head = sprite.pos.sub(0, (pose === "sleep" ? CAT_SLEEPING_HEIGHT : CAT_FRAME_HEIGHT) + 1);
    heart.hidden = !isHeartShown(cat);
    heart.pos = head;
    plate.hidden = !isInNamePlateRange(walk.position().tile, cat.tile);
    plate.pos = heart.hidden ? head : head.sub(0, HEART_HEIGHT + 1);
  }

  /** The tiles the Player stands on or is stepping onto. */
  function playerTiles(): Tile[] {
    const step = walk.step();
    return step ? [step.from, step.to] : [walk.position().tile];
  }

  function updateCats() {
    const paused = events.isPaused();
    if (!paused) cats.update(k.dt(), playerTiles());
    for (const drawn of catSprites) {
      drawn.sprite.animSpeed = paused ? 0 : 1;
      drawCat(drawn);
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
      const cat = cats.catOn(tileAhead(tile, facing));
      if (cat) cats.pet(cat, tile);
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

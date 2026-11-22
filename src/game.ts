import kaplay, { type GameObj, type Vec2 } from "kaplay";
import { zoneById, type Content, type PointOfInterest, type Zone, type ZoneId } from "./content";
import { LABEL_PADDING, NAME_PLATE_WRAP_WIDTH, NAME_PLATES, needsWrap, shownNamePlates, ZONE_TITLE_Y, type NamePlate } from "./namePlates";
import { INK, PLAYER_ANIMS, PLAYER_FRAME_COUNT, paintFilmRoll, paintOverworld, paintPlayerSheet, playerAnim, type Rgb } from "./art";
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
  type Tile,
} from "./overworld";
import { PIXEL_FONT_CELL_HEIGHT, PIXEL_FONT_CELL_WIDTH, PIXEL_FONT_CHARS, PIXEL_FONT_NAME, paintPixelFont } from "./pixel-font";

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 180;
const MAP_WIDTH = MAP_COLUMNS * OVERWORLD_TILE_SIZE;
const MAP_HEIGHT = MAP_ROWS * OVERWORLD_TILE_SIZE;
/** Seconds to walk from one tile to the next. */
const STEP_TIME = 0.16;
/** A direction held at least this long walks; a shorter tap in a new direction only turns. */
const HOLD_DELAY = 0.12;
/** Seconds between bump sounds while the Player keeps walking into a solid tile. */
const BUMP_INTERVAL = 0.4;
const BACKGROUND: Rgb = [20, 20, 30];
const LABEL_PLATE_COLOR: Rgb = [251, 248, 240];
const Z_FILM_ROLL = 1;
/** A copy of the cover tile beside a Film roll, drawn over the roll so it peeks out from behind. */
const Z_FILM_ROLL_COVER = 1.5;
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
};

export type GameEvents = {
  onFacingChange(poi: PointOfInterest | null): void;
  onShutter(poi: PointOfInterest): void;
  canFireShutter(): boolean;
  onFilmRollCollected(zone: Zone): void;
  onFootstep(): void;
  onBump(): void;
};

type LabelOptions = { wrap?: boolean; fixed?: boolean };
type Step = { from: Tile; to: Tile; elapsed: number };

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

export function startGame(canvas: HTMLCanvasElement, content: Content, events: GameEvents): GameControls {
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
  k.loadBitmapFont(PIXEL_FONT_NAME, paintPixelFont(), PIXEL_FONT_CELL_WIDTH, PIXEL_FONT_CELL_HEIGHT, {
    chars: PIXEL_FONT_CHARS,
  });

  const sheets = { town: loadImage("art/kenney-tiny-town-tiles.png"), dungeon: loadImage("art/kenney-tiny-dungeon-tiles.png") };
  Promise.all([sheets.town.decode(), sheets.dungeon.decode()]).then(() => {
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

  function addNamePlate({ text, at }: NamePlate) {
    const [x, y] = tileFoot(at);
    return addLabel(text, k.vec2(x, y - OVERWORLD_TILE_SIZE - 1), "bot", { wrap: true }).parent!;
  }

  const namePlates = new Map(NAME_PLATES.map((namePlate) => [namePlate, addNamePlate(namePlate)]));

  function showNearbyNamePlates() {
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

  const player = k.add([k.sprite("player", { anim: playerAnim("down", false) }), k.pos(...tileFoot(SPAWN)), k.anchor("bot"), k.z(Z_PLAYER)]);

  let tile: Tile = SPAWN;
  let facing: Direction = "down";
  let step: Step | null = null;
  let facedPoi: PointOfInterest | null = null;
  let lastBumpAt = -Infinity;
  /** Directions held down, the most recently pressed last. */
  const held: Direction[] = [];
  const heldSince = new Map<Direction, number>();
  /** Each press of a direction, in order, so quick taps are never lost between frames. */
  const taps: Direction[] = [];

  function setFacedPoi(poi: PointOfInterest | null) {
    if (poi === facedPoi) return;
    facedPoi = poi;
    events.onFacingChange(poi);
  }

  function showSurroundings() {
    const zoneId = zoneAt(tile);
    // Tiles between Zones keep the last Zone's title.
    if (zoneId) zoneTitle.text = zoneById(zoneId).title;
    showNearbyNamePlates();
  }

  function turn(direction: Direction) {
    facing = direction;
    setFacedPoi(facedPointOfInterest(tile, facing) ?? null);
    showNearbyNamePlates();
  }

  function tryStep(direction: Direction) {
    turn(direction);
    const next = tileAhead(tile, direction);
    if (!isWalkable(next)) {
      bump();
      return;
    }
    step = { from: tile, to: next, elapsed: 0 };
    setFacedPoi(null);
  }

  function bump() {
    if (k.time() - lastBumpAt < BUMP_INTERVAL) return;
    lastBumpAt = k.time();
    events.onBump();
  }

  function arrive() {
    tile = step!.to;
    step = null;
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

  function nextMove() {
    const tap = taps.shift();
    if (tap) {
      if (tap === facing) tryStep(tap);
      else turn(tap);
      return;
    }
    const direction = held.at(-1);
    if (direction && k.time() - heldSince.get(direction)! >= HOLD_DELAY) tryStep(direction);
  }

  function updateCamera() {
    const x = clamp(player.pos.x, VIEW_WIDTH / 2, MAP_WIDTH - VIEW_WIDTH / 2);
    const y = clamp(player.pos.y - OVERWORLD_TILE_SIZE / 2, VIEW_HEIGHT / 2, MAP_HEIGHT - VIEW_HEIGHT / 2);
    k.setCamPos(Math.round(x), Math.round(y));
  }

  k.onUpdate(() => {
    if (step) {
      step.elapsed += k.dt();
      if (step.elapsed >= STEP_TIME) arrive();
      else {
        const from = k.vec2(...tileFoot(step.from));
        player.pos = from.lerp(k.vec2(...tileFoot(step.to)), step.elapsed / STEP_TIME);
      }
    }
    if (!step) nextMove();
    const anim = playerAnim(facing, step !== null);
    if (player.getCurAnim()?.name !== anim) player.play(anim);
    updateCamera();
  });

  function press(button: GameButton) {
    if (button === "shutter") {
      if (facedPoi && events.canFireShutter()) events.onShutter(facedPoi);
      return;
    }
    if (held.includes(button)) return;
    held.push(button);
    heldSince.set(button, k.time());
    taps.push(button);
  }

  function release(button: GameButton) {
    const index = held.indexOf(button as Direction);
    if (index >= 0) held.splice(index, 1);
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
  canvas.addEventListener("blur", () => held.splice(0));

  showSurroundings();

  return {
    press,
    release,
    travelTo(zoneId) {
      const landing = fastTravelLanding(zoneId);
      step = null;
      taps.splice(0);
      tile = landing.tile;
      player.pos = k.vec2(...tileFoot(tile));
      showSurroundings();
      turn(landing.facing);
    },
  };
}

import kaplay, { type GameObj, type Vec2 } from "kaplay";
import type { Content, PointOfInterest, Zone, ZoneId } from "./content";
import { INK, PLAYER_ANIMS, PLAYER_FRAME_COUNT, paintFilmRoll, paintOverworld, paintPlayerSheet, playerAnim, type Rgb } from "./art";
import {
  facedPointOfInterest,
  fastTravelLanding,
  isWalkable,
  MAP_COLUMNS,
  MAP_ROWS,
  OVERWORLD_TILE_SIZE,
  SPAWN,
  tileAhead,
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
const BACKGROUND: Rgb = [20, 20, 30];
const POI_LABEL_WIDTH = 120;
/** Tiles from the Player within which a Point of Interest's name plate shows. */
const NAME_PLATE_RANGE = 2;
const LABEL_PADDING = 2;
const LABEL_PLATE_COLOR: Rgb = [251, 248, 240];
const ZONE_TITLE_Y = 8;
const Z_FILM_ROLL = 1;
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
};

type LabelOptions = { wrapWidth?: number; fixed?: boolean };
type Step = { from: Tile; to: Tile; elapsed: number };

const tileKey = ({ col, row }: Tile) => `${col},${row}`;

/** Where a sprite standing on a tile is anchored: the bottom centre of the tile. */
function tileFoot({ col, row }: Tile): [number, number] {
  return [(col + 0.5) * OVERWORLD_TILE_SIZE, (row + 1) * OVERWORLD_TILE_SIZE];
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

  const tileset = new Image();
  tileset.src = import.meta.env.BASE_URL + "art/kenney-tiny-town-tiles.png";
  tileset.decode().then(() => {
    k.loadSprite("overworld", paintOverworld(tileset, pointsOfInterest.map((poi) => poi.placement)));
    k.add([k.sprite("overworld"), k.pos(0, 0)]);
  });

  function addLabel(text: string, position: Vec2, anchor: "top" | "bot", { wrapWidth, fixed = false }: LabelOptions = {}) {
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
    const needsWrap = wrapWidth !== undefined && text.length * PIXEL_FONT_CELL_WIDTH > wrapWidth;
    const label = plate.add([
      k.text(text, { font: PIXEL_FONT_NAME, size: PIXEL_FONT_CELL_HEIGHT, width: needsWrap ? wrapWidth : undefined, align: "center" }),
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

  const namePlates = pointsOfInterest.map((poi) => {
    const [x, y] = tileFoot(poi.placement);
    const label = addLabel(poi.title, k.vec2(x, y - OVERWORLD_TILE_SIZE - 1), "bot", { wrapWidth: POI_LABEL_WIDTH });
    return { at: poi.placement, plate: label.parent! };
  });

  /** Only nearby name plates show, so the plates of close-set Points of Interest never pile up. */
  function showNearbyNamePlates() {
    for (const { at, plate } of namePlates) {
      plate.hidden = Math.max(Math.abs(at.col - tile.col), Math.abs(at.row - tile.row)) > NAME_PLATE_RANGE;
    }
  }

  const filmRolls = new Map<string, { zone: Zone; sprite: GameObj }>();
  for (const zone of content.zones) {
    if (!zone.filmRoll) continue;
    const [x, y] = tileFoot(zone.filmRoll);
    const sprite = k.add([k.sprite("film-roll"), k.pos(x, y - 4), k.anchor("bot"), k.z(Z_FILM_ROLL)]);
    filmRolls.set(tileKey(zone.filmRoll), { zone, sprite });
  }

  // The current Zone's title sits top-centre of the view, clear of the DOM corner controls.
  const zoneTitle = addLabel("", k.vec2(VIEW_WIDTH / 2, ZONE_TITLE_Y), "top", { fixed: true });

  const player = k.add([k.sprite("player", { anim: playerAnim("down", false) }), k.pos(...tileFoot(SPAWN)), k.anchor("bot"), k.z(Z_PLAYER)]);

  let tile: Tile = SPAWN;
  let facing: Direction = "down";
  let step: Step | null = null;
  let faced: PointOfInterest | null = null;
  /** Directions held down, the most recently pressed last. */
  const held: Direction[] = [];
  const heldSince = new Map<Direction, number>();
  /** Each press of a direction, in order, so quick taps are never lost between frames. */
  const taps: Direction[] = [];

  function setFaced(poi: PointOfInterest | null) {
    if (poi === faced) return;
    faced = poi;
    events.onFacingChange(poi);
  }

  function showSurroundings() {
    const zoneId = zoneAt(tile);
    // Tiles between Zones keep the last Zone's title.
    if (zoneId) zoneTitle.text = content.zones.find((zone) => zone.id === zoneId)!.title;
    showNearbyNamePlates();
  }

  function turn(direction: Direction) {
    facing = direction;
    setFaced(facedPointOfInterest(tile, facing) ?? null);
  }

  function tryStep(direction: Direction) {
    turn(direction);
    const next = tileAhead(tile, direction);
    if (!isWalkable(next)) return;
    step = { from: tile, to: next, elapsed: 0 };
    setFaced(null);
  }

  function arrive() {
    tile = step!.to;
    step = null;
    player.pos = k.vec2(...tileFoot(tile));
    const roll = filmRolls.get(tileKey(tile));
    if (roll) {
      filmRolls.delete(tileKey(tile));
      roll.sprite.destroy();
      events.onFilmRollCollected(roll.zone);
    }
    showSurroundings();
    setFaced(facedPointOfInterest(tile, facing) ?? null);
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
      if (faced && events.canFireShutter()) events.onShutter(faced);
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

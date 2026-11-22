import kaplay, { type GameObj, type Vec2 } from "kaplay";
import type { Content, PointOfInterest, Zone, ZoneId } from "./content";
import {
  GROUND_Y,
  INK,
  PLAYER_ANIMS,
  PLAYER_FRAME_COUNT,
  Pixels,
  TILE_COLUMNS,
  TILE_ROWS,
  TILE_SIZE,
  TILES,
  ZONE_ART,
  paintFilmRoll,
  paintPlayerSheet,
  paintSky,
  type Rgb,
  type ZoneArt,
} from "./art";
import { photoPaths } from "./photos";
import { PIXEL_FONT_CELL_HEIGHT, PIXEL_FONT_CELL_WIDTH, PIXEL_FONT_CHARS, PIXEL_FONT_NAME, paintPixelFont } from "./pixel-font";

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 180;
const PLAYER_SPEED = 160;
const PLAYER_START_X = 40;
const SHUTTER_RANGE = 28;
const FILM_ROLL_PICKUP_RANGE = 8;
/** How far right of its Film roll a Zone's cover prop stands, so only an edge of the roll peeks out. */
const FILM_ROLL_COVER_OFFSET = 6;
const FAST_TRAVEL_OFFSET = 16;
const POI_LABEL_WIDTH = 120;
const PRINTS_PER_POI = 3;
const PRINT_SPACING = 34;
const PRINT_Y = GROUND_Y - 64;
const PRINT_FRAME_SIZE = 30;
const PRINT_MAT_SIZE = 26;
const PRINT_FRAME_COLOR: Rgb = [60, 40, 25];
const PRINT_MAT_COLOR: Rgb = [245, 240, 225];
const CUE_Y = GROUND_Y - 56;
const CUE_ABOVE_PRINTS_Y = PRINT_Y - 18;
const CUE_BOB = 2;
const BACKGROUND: Rgb = [20, 20, 30];
const LABEL_PADDING = 2;
const LABEL_PLATE_COLOR: Rgb = [251, 248, 240];
const ZONE_TITLE_Y = 8;
const SIGN_LABEL_Y = GROUND_Y - 30;

export type GameButton = "left" | "right" | "shutter";

export type GameControls = {
  press(button: GameButton): void;
  release(button: GameButton): void;
  travelTo(zoneId: ZoneId): void;
};

type PlacedPointOfInterest = { poi: PointOfInterest; x: number };
type PlacedZone = { zone: Zone; x: number };
type PlacedFilmRoll = { zone: Zone; x: number; sprite: GameObj };
type LabelOptions = { wrapWidth?: number; fixed?: boolean };

export type GameEvents = {
  onNearbyChange(poi: PointOfInterest | null): void;
  onShutter(poi: PointOfInterest): void;
  canFireShutter(): boolean;
  onFilmRollCollected(zone: Zone): void;
};

function layOutRoute(content: Content) {
  const zones: PlacedZone[] = [];
  const pointsOfInterest: PlacedPointOfInterest[] = [];
  let x = 0;
  for (const zone of content.zones) {
    zones.push({ zone, x });
    for (const poi of zone.pointsOfInterest) {
      pointsOfInterest.push({ poi, x: x + poi.placement.x });
    }
    x += zone.width;
  }
  return { zones, pointsOfInterest, routeWidth: x };
}

function fastTravelX(placed: PlacedZone): number {
  const target = placed.zone.pointsOfInterest.find((poi) => poi.id === placed.zone.fastTravelTo);
  if (target) return placed.x + target.placement.x - FAST_TRAVEL_OFFSET;
  return placed.x + FAST_TRAVEL_OFFSET;
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
    buttons: {
      left: { keyboard: ["left", "a"] },
      right: { keyboard: ["right", "d"] },
      shutter: { keyboard: ["space"] },
    },
  });

  const route = layOutRoute(content);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  k.loadSprite("tiles", import.meta.env.BASE_URL + "art/kenney-pixel-platformer-tiles.png", {
    sliceX: TILE_COLUMNS,
    sliceY: TILE_ROWS,
  });
  k.loadSprite("player", paintPlayerSheet(), { sliceX: PLAYER_FRAME_COUNT, anims: PLAYER_ANIMS });
  k.loadSprite("film-roll", paintFilmRoll());
  k.loadBitmapFont(PIXEL_FONT_NAME, paintPixelFont(), PIXEL_FONT_CELL_WIDTH, PIXEL_FONT_CELL_HEIGHT, {
    chars: PIXEL_FONT_CHARS,
  });

  const filmRolls: PlacedFilmRoll[] = [];
  const parallaxLayers = route.zones.flatMap((placed) => addZoneScenery(placed, ZONE_ART[placed.zone.id]));

  function addZoneScenery({ zone, x }: PlacedZone, art: ZoneArt) {
    const skyName = `sky-${zone.id}`;
    k.loadSprite(skyName, paintSky(art.sky, GROUND_Y));
    const frame = k.add([k.rect(zone.width, GROUND_Y), k.pos(x, 0), k.mask("intersect")]);
    frame.add([k.sprite(skyName, { width: zone.width, height: GROUND_Y })]);

    const cameraAtCentre = Math.min(Math.max(x + zone.width / 2, VIEW_WIDTH / 2), route.routeWidth - VIEW_WIDTH / 2);
    const layers = art.layers.map((layer, index) => {
      const depth = reducedMotion ? 0 : layer.depth;
      const margin = Math.ceil((zone.width / 2 + VIEW_WIDTH) * depth);
      const pixels = new Pixels(zone.width + margin * 2, GROUND_Y, -margin);
      layer.paint(pixels, -margin, zone.width + margin);
      const name = `backdrop-${zone.id}-${index}`;
      k.loadSprite(name, pixels.canvas);
      const object = frame.add([k.sprite(name), k.pos(-margin, 0)]);
      return { object, depth, restX: -margin, cameraAtCentre };
    });

    art.ground.forEach(({ frame, from }, index) => {
      const until = art.ground[index + 1]?.from ?? zone.width;
      addTiles(frame, x + from, GROUND_Y, until - from, art.groundTint);
    });
    addTiles(TILES.dirt, x, GROUND_Y + TILE_SIZE, zone.width, art.groundTint);
    if (zone.filmRoll) {
      const rollX = x + zone.filmRoll.x;
      filmRolls.push({ zone, x: rollX, sprite: k.add([k.sprite("film-roll"), k.pos(rollX, GROUND_Y), k.anchor("bot")]) });
    }
    const cover = zone.filmRoll && { frame: art.filmRollCover, x: zone.filmRoll.x + FILM_ROLL_COVER_OFFSET };
    for (const prop of cover ? [...art.props, cover] : art.props) {
      k.add([k.sprite("tiles", { frame: prop.frame }), k.pos(x + prop.x, GROUND_Y), k.anchor("bot"), k.color(...art.groundTint)]);
    }
    return layers;
  }

  function addTiles(frame: number, x: number, y: number, width: number, tint: Rgb) {
    k.add([k.sprite("tiles", { frame, tiled: true, width, height: TILE_SIZE }), k.pos(x, y), k.color(...tint)]);
  }

  function addLabel(text: string, position: Vec2, anchor: "top" | "bot", { wrapWidth, fixed = false }: LabelOptions = {}) {
    const plate = k.add([
      k.rect(0, 0),
      k.pos(position),
      k.anchor(anchor),
      k.color(...LABEL_PLATE_COLOR),
      k.opacity(0.9),
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

  function updateParallax(cameraX: number) {
    for (const layer of parallaxLayers) {
      if (layer.depth > 0) layer.object.pos.x = Math.round(layer.restX + (cameraX - layer.cameraAtCentre) * layer.depth);
    }
  }

  for (const { poi, x } of route.pointsOfInterest) {
    k.add([k.sprite("tiles", { frame: TILES.sign }), k.pos(x, GROUND_Y), k.anchor("bot")]);
    addLabel(poi.title, k.vec2(x, SIGN_LABEL_Y), "bot", { wrapWidth: POI_LABEL_WIDTH });
  }

  for (const { poi, x } of route.pointsOfInterest) {
    const prints = (poi.photos ?? []).slice(0, PRINTS_PER_POI);
    prints.forEach((photo, index) => {
      const sprite = photoPaths(photo).thumb;
      k.loadSprite(sprite, import.meta.env.BASE_URL + sprite);
      const printX = x + (index - (prints.length - 1) / 2) * PRINT_SPACING;
      k.add([k.rect(PRINT_FRAME_SIZE, PRINT_FRAME_SIZE), k.pos(printX, PRINT_Y), k.anchor("center"), k.color(...PRINT_FRAME_COLOR)]);
      k.add([k.rect(PRINT_MAT_SIZE, PRINT_MAT_SIZE), k.pos(printX, PRINT_Y), k.anchor("center"), k.color(...PRINT_MAT_COLOR)]);
      k.add([k.sprite(sprite), k.pos(printX, PRINT_Y), k.anchor("center")]);
    });
  }

  const proximityCue = k.add([
    k.text("!", { size: 16 }),
    k.pos(0, 0),
    k.anchor("bot"),
    k.color(255, 240, 120),
    k.outline(2, k.rgb(...INK)),
    k.opacity(0),
  ]);

  // The current Zone's title sits top-centre of the view, clear of the DOM corner controls.
  const zoneTitle = addLabel("", k.vec2(VIEW_WIDTH / 2, ZONE_TITLE_Y), "top", { fixed: true });

  const player = k.add([k.sprite("player", { anim: "idle" }), k.pos(PLAYER_START_X, GROUND_Y), k.anchor("bot")]);

  function animatePlayer(direction: number) {
    if (direction !== 0) player.flipX = direction < 0;
    const anim = direction === 0 ? "idle" : "walk";
    if (player.getCurAnim()?.name !== anim) player.play(anim);
  }

  function zoneAt(x: number): Zone {
    return route.zones.filter((placed) => placed.x <= x).at(-1)!.zone;
  }

  let nearby: PointOfInterest | null = null;

  function nearestInRange(): PlacedPointOfInterest | null {
    const inRange = route.pointsOfInterest
      .filter(({ x }) => Math.abs(player.pos.x - x) <= SHUTTER_RANGE)
      .sort((a, b) => Math.abs(player.pos.x - a.x) - Math.abs(player.pos.x - b.x));
    return inRange[0] ?? null;
  }

  k.onUpdate(() => {
    const direction = Number(k.isButtonDown("right")) - Number(k.isButtonDown("left"));
    const previousX = player.pos.x;
    player.pos.x = Math.min(Math.max(player.pos.x + direction * PLAYER_SPEED * k.dt(), 0), route.routeWidth);
    animatePlayer(direction);
    zoneTitle.text = zoneAt(player.pos.x).title;

    const halfView = VIEW_WIDTH / 2;
    const cameraX = Math.min(Math.max(player.pos.x, halfView), route.routeWidth - halfView);
    k.setCamPos(Math.round(cameraX), VIEW_HEIGHT / 2);
    updateParallax(cameraX);

    const sweptFrom = Math.min(previousX, player.pos.x) - FILM_ROLL_PICKUP_RANGE;
    const sweptTo = Math.max(previousX, player.pos.x) + FILM_ROLL_PICKUP_RANGE;
    for (const roll of filmRolls) {
      if (roll.sprite.exists() && roll.x >= sweptFrom && roll.x <= sweptTo) {
        roll.sprite.destroy();
        events.onFilmRollCollected(roll.zone);
      }
    }

    const current = nearestInRange();
    if (current?.poi !== nearby) {
      nearby = current?.poi ?? null;
      events.onNearbyChange(nearby);
    }
    proximityCue.opacity = current ? 1 : 0;
    if (current) {
      const cueY = current.poi.photos?.length ? CUE_ABOVE_PRINTS_Y : CUE_Y;
      const bob = reducedMotion ? 0 : Math.sin(k.time() * 8) * CUE_BOB;
      proximityCue.pos = k.vec2(current.x, cueY + bob);
    }
  });

  k.onButtonPress("shutter", () => {
    if (nearby && events.canFireShutter()) events.onShutter(nearby);
  });

  return {
    press: (button) => k.pressButton(button),
    release: (button) => k.releaseButton(button),
    travelTo(zoneId) {
      const placed = route.zones.find(({ zone }) => zone.id === zoneId);
      if (placed) player.pos.x = fastTravelX(placed);
    },
  };
}

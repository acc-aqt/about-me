import kaplay, { type Vec2 } from "kaplay";
import type { Content, PointOfInterest, Zone } from "./content";
import {
  PLAYER_ANIMS,
  Pixels,
  TILE_COLUMNS,
  TILE_ROWS,
  TILE_SIZE,
  TILES,
  ZONE_ART,
  paintFilmRoll,
  paintPlayerSheet,
  paintSky,
  type ZoneArt,
} from "./art";
import { photoPaths } from "./photos";

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 180;
const GROUND_Y = VIEW_HEIGHT - 24;
const PLAYER_SPEED = 160;
const PLAYER_START_X = 40;
const SHUTTER_RANGE = 28;
const FILM_ROLL_PICKUP_RANGE = 8;
const FAST_TRAVEL_OFFSET = 16;
const POI_LABEL_WIDTH = 120;
const PRINTS_PER_POINT = 3;
const PRINT_SPACING = 34;
const PRINT_Y = GROUND_Y - 64;
const CUE_ABOVE_PRINTS_Y = PRINT_Y - 18;

const CUE_BOB = 2;

export type GameButton = "left" | "right" | "shutter";

export type GameControls = {
  press(button: GameButton): void;
  release(button: GameButton): void;
  travelTo(zoneId: string): void;
};

type PlacedPointOfInterest = { poi: PointOfInterest; x: number };
type PlacedZone = { zone: Zone; x: number };
type PlacedFilmRoll = { zone: Zone; x: number };

export type GameEvents = {
  onNearbyChange(poi: PointOfInterest | null): void;
  onShutter(poi: PointOfInterest): void;
  canFireShutter(): boolean;
  onFilmRollCollected(zone: Zone): void;
};

function layOutRoute(content: Content) {
  const zones: PlacedZone[] = [];
  const pointsOfInterest: PlacedPointOfInterest[] = [];
  const filmRolls: PlacedFilmRoll[] = [];
  let x = 0;
  for (const zone of content.zones) {
    zones.push({ zone, x });
    for (const poi of zone.pointsOfInterest) {
      pointsOfInterest.push({ poi, x: x + poi.placement.x });
    }
    if (zone.filmRoll) filmRolls.push({ zone, x: x + zone.filmRoll.x });
    x += zone.width;
  }
  return { zones, pointsOfInterest, filmRolls, routeWidth: x };
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
    background: [20, 20, 30],
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
  k.loadSprite("player", paintPlayerSheet(), { sliceX: 5, anims: PLAYER_ANIMS });
  k.loadSprite("film-roll", paintFilmRoll());

  const parallaxLayers = route.zones.flatMap((placed) => addZoneBackdrop(placed, ZONE_ART[placed.zone.id] ?? ZONE_ART.start));

  function addZoneBackdrop({ zone, x }: PlacedZone, art: ZoneArt) {
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

    addLabelPlate(zone.title, k.vec2(x + 8, 8), "topleft");
    k.add([k.text(zone.title, { size: 8 }), k.pos(x + 8, 8), k.color(...art.label)]);
    k.add([
      k.sprite("tiles", { frame: art.ground, tiled: true, width: zone.width, height: TILE_SIZE }),
      k.pos(x, GROUND_Y),
      k.color(...art.groundTint),
    ]);
    k.add([
      k.sprite("tiles", { frame: TILES.dirt, tiled: true, width: zone.width, height: TILE_SIZE }),
      k.pos(x, GROUND_Y + TILE_SIZE),
      k.color(...art.groundTint),
    ]);
    for (const prop of art.props) {
      k.add([k.sprite("tiles", { frame: prop.frame }), k.pos(x + prop.x, GROUND_Y), k.anchor("bot"), k.color(...art.groundTint)]);
    }
    return layers;
  }

  function addLabelPlate(text: string, position: Vec2, anchor: "topleft" | "bot", wrapWidth?: number) {
    const lineWidth = k.formatText({ text, size: 8 }).width;
    const height = k.formatText({ text, size: 8, width: wrapWidth }).height;
    const width = Math.min(lineWidth, wrapWidth ?? lineWidth);
    const offset = anchor === "bot" ? k.vec2(0, 1) : k.vec2(-2, -2);
    k.add([k.rect(width + 4, height + 3), k.pos(position.add(offset)), k.anchor(anchor), k.color(251, 248, 240), k.opacity(0.7)]);
  }

  function updateParallax(cameraX: number) {
    for (const layer of parallaxLayers) {
      if (layer.depth > 0) layer.object.pos.x = Math.round(layer.restX + (cameraX - layer.cameraAtCentre) * layer.depth);
    }
  }

  for (const { poi, x } of route.pointsOfInterest) {
    k.add([k.sprite("tiles", { frame: TILES.sign }), k.pos(x, GROUND_Y), k.anchor("bot")]);
    addLabelPlate(poi.title, k.vec2(x, GROUND_Y - 30), "bot", POI_LABEL_WIDTH);
    k.add([
      k.text(poi.title, { size: 8, width: POI_LABEL_WIDTH, align: "center" }),
      k.pos(x, GROUND_Y - 30),
      k.anchor("bot"),
      k.color(20, 20, 30),
    ]);
  }

  for (const { poi, x } of route.pointsOfInterest) {
    const prints = (poi.photos ?? []).slice(0, PRINTS_PER_POINT);
    prints.forEach((photo, index) => {
      const sprite = photoPaths(photo).thumb;
      k.loadSprite(sprite, import.meta.env.BASE_URL + sprite);
      const printX = x + (index - (prints.length - 1) / 2) * PRINT_SPACING;
      k.add([k.rect(30, 30), k.pos(printX, PRINT_Y), k.anchor("center"), k.color(60, 40, 25)]);
      k.add([k.rect(26, 26), k.pos(printX, PRINT_Y), k.anchor("center"), k.color(245, 240, 225)]);
      k.add([k.sprite(sprite), k.pos(printX, PRINT_Y), k.anchor("center")]);
    });
  }

  const filmRolls = route.filmRolls.map(({ zone, x }) => ({
    zone,
    x,
    sprite: k.add([k.sprite("film-roll"), k.pos(x, GROUND_Y), k.anchor("bot")]),
  }));

  const proximityCue = k.add([
    k.text("!", { size: 16 }),
    k.pos(0, 0),
    k.anchor("bot"),
    k.color(255, 240, 120),
    k.outline(2, k.rgb(20, 20, 30)),
    k.opacity(0),
  ]);

  const player = k.add([k.sprite("player", { anim: "idle" }), k.pos(PLAYER_START_X, GROUND_Y), k.anchor("bot")]);

  function animatePlayer(direction: number) {
    if (direction !== 0) player.flipX = direction < 0;
    const anim = direction === 0 ? "idle" : "walk";
    if (player.getCurAnim()?.name !== anim) player.play(anim);
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

    const halfView = VIEW_WIDTH / 2;
    const cameraX = Math.min(Math.max(player.pos.x, halfView), route.routeWidth - halfView);
    k.setCamPos(cameraX, VIEW_HEIGHT / 2);
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
      const cueY = current.poi.photos?.length ? CUE_ABOVE_PRINTS_Y : GROUND_Y - 56;
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

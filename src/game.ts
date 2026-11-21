import kaplay from "kaplay";
import type { Content, PointOfInterest, Zone } from "./content";

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 180;
const GROUND_Y = VIEW_HEIGHT - 24;
const PLAYER_SPEED = 160;
const PLAYER_START_X = 40;
const SHUTTER_RANGE = 28;
const POI_LABEL_WIDTH = 120;

const ZONE_COLORS: [number, number, number][] = [
  [135, 190, 230],
  [160, 170, 190],
];

type PlacedPointOfInterest = { poi: PointOfInterest; x: number };
type PlacedZone = { zone: Zone; x: number };

export type GameEvents = {
  onNearbyChange(poi: PointOfInterest | null): void;
  onShutter(poi: PointOfInterest): void;
  canFireShutter(): boolean;
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

export function startGame(canvas: HTMLCanvasElement, content: Content, events: GameEvents) {
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

  route.zones.forEach(({ zone, x }, index) => {
    k.add([k.rect(zone.width, GROUND_Y), k.pos(x, 0), k.color(...ZONE_COLORS[index % ZONE_COLORS.length])]);
    k.add([k.text(zone.title, { size: 8 }), k.pos(x + 8, 8), k.color(20, 20, 30)]);
  });

  k.add([k.rect(route.routeWidth, VIEW_HEIGHT - GROUND_Y), k.pos(0, GROUND_Y), k.color(90, 160, 70)]);

  for (const { poi, x } of route.pointsOfInterest) {
    k.add([k.rect(16, 24), k.pos(x, GROUND_Y), k.anchor("bot"), k.color(230, 180, 60), k.outline(1)]);
    k.add([
      k.text(poi.title, { size: 8, width: POI_LABEL_WIDTH, align: "center" }),
      k.pos(x, GROUND_Y - 30),
      k.anchor("bot"),
      k.color(20, 20, 30),
    ]);
  }

  const proximityCue = k.add([
    k.text("!", { size: 16 }),
    k.pos(0, 0),
    k.anchor("bot"),
    k.color(255, 240, 120),
    k.outline(2, k.rgb(20, 20, 30)),
    k.opacity(0),
  ]);

  const player = k.add([k.rect(12, 20), k.pos(PLAYER_START_X, GROUND_Y), k.anchor("bot"), k.color(200, 60, 60)]);
  player.add([k.rect(6, 4), k.pos(4, -12), k.anchor("center"), k.color(30, 30, 30)]);

  let nearby: PointOfInterest | null = null;

  function nearestInRange(): PlacedPointOfInterest | null {
    const inRange = route.pointsOfInterest
      .filter(({ x }) => Math.abs(player.pos.x - x) <= SHUTTER_RANGE)
      .sort((a, b) => Math.abs(player.pos.x - a.x) - Math.abs(player.pos.x - b.x));
    return inRange[0] ?? null;
  }

  k.onUpdate(() => {
    const direction = Number(k.isButtonDown("right")) - Number(k.isButtonDown("left"));
    player.pos.x = Math.min(Math.max(player.pos.x + direction * PLAYER_SPEED * k.dt(), 0), route.routeWidth);

    const halfView = VIEW_WIDTH / 2;
    k.setCamPos(Math.min(Math.max(player.pos.x, halfView), route.routeWidth - halfView), VIEW_HEIGHT / 2);

    const current = nearestInRange();
    if (current?.poi !== nearby) {
      nearby = current?.poi ?? null;
      events.onNearbyChange(nearby);
    }
    proximityCue.opacity = current ? 1 : 0;
    if (current) proximityCue.pos = k.vec2(current.x, GROUND_Y - 56 + Math.sin(k.time() * 8) * 2);
  });

  k.onButtonPress("shutter", () => {
    if (nearby && events.canFireShutter()) events.onShutter(nearby);
  });
}

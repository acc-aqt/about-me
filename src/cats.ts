import { DIRECTIONS, fastTravelLanding, isWalkable, SPAWN, tileAhead, tileKey, tileKindAt, ZONE_RECTS, type Direction, type Tile } from "./overworld";

/** Returns a number in [0, 1), like Math.random. */
export type Random = () => number;

export type CatName = "Berlioz" | "Manouche";

export const CATS: readonly { name: CatName; start: Tile }[] = [
  { name: "Berlioz", start: { col: 28, row: 20 } },
  { name: "Manouche", start: { col: 34, row: 25 } },
];

const hub = ZONE_RECTS.start;
const offLimits = new Set([tileKey(SPAWN), tileKey(fastTravelLanding("start").tile)]);

/** Walkable grass inside the Hub, so a Cat never blocks a path or the tiles the Player appears on. */
export function isCatGround(tile: Tile): boolean {
  const { col, row } = tile;
  const inHub = col >= hub.left && col <= hub.right && row >= hub.top && row <= hub.bottom;
  return inHub && tileKindAt(tile) === "grass" && isWalkable(tile) && !offLimits.has(tileKey(tile));
}

function pick<T>(options: readonly T[], random: Random): T {
  return options[Math.floor(random() * options.length)];
}

/** A random direction onto open Cat ground, skipping blocked tiles (keyed by `tileKey`), or none when boxed in. */
export function chooseCatStep(tile: Tile, blocked: ReadonlySet<string>, random: Random): Direction | undefined {
  const open = DIRECTIONS.filter((direction) => {
    const next = tileAhead(tile, direction);
    return isCatGround(next) && !blocked.has(tileKey(next));
  });
  return open.length > 0 ? pick(open, random) : undefined;
}

const LONGEST_WALK = 4;
const SLEEP_CHANCE = 0.15;
const SIT_SECONDS = { min: 2, max: 6 };
const SLEEP_SECONDS = { min: 8, max: 14 };

function between({ min, max }: { min: number; max: number }, random: Random) {
  return min + random() * (max - min);
}

export function chooseWalkLength(random: Random): number {
  return 1 + Math.floor(random() * LONGEST_WALK);
}

export type CatPose = "sit" | "sleep";

export type CatRest = { pose: CatPose; seconds: number };

export function chooseRest(random: Random): CatRest {
  const pose = random() < SLEEP_CHANCE ? "sleep" : "sit";
  return { pose, seconds: between(pose === "sleep" ? SLEEP_SECONDS : SIT_SECONDS, random) };
}

/** The way from one tile towards another, along whichever axis is further. */
export function directionTowards(from: Tile, to: Tile): Direction {
  const dx = to.col - from.col;
  const dy = to.row - from.row;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
  return dy >= 0 ? "down" : "up";
}

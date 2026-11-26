import { DIRECTIONS, fastTravelLanding, isWalkable, SPAWN, tileAhead, tileKey, tileKindAt, ZONE_RECTS, type Direction, type Tile } from "./overworld";
import { STEP_TIME } from "./playerWalk";

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

/** Cats stroll, a little slower than the Player walks. */
export const CAT_STEP_TIME = STEP_TIME * 1.5;
/** How long a Cat sits facing the Player, showing a heart, after the Shutter. */
export const CAT_REACTION_TIME = 2;

type CatMode = { kind: "walking"; stepsLeft: number } | { kind: "resting"; pose: CatPose; secondsLeft: number };

export type CatStep = { from: Tile; to: Tile; elapsed: number };

export type Cat = {
  readonly name: CatName;
  tile: Tile;
  facing: Direction;
  step: CatStep | null;
  mode: CatMode;
  heartSecondsLeft: number;
  /** The Player's tile to turn towards once the current step ends, after the Shutter. */
  pettedFrom: Tile | null;
};

export type CatAnimPose = "stand" | "walk" | CatPose;

export function catPose(cat: Cat): CatAnimPose {
  if (cat.step) return "walk";
  return cat.mode.kind === "resting" ? cat.mode.pose : "stand";
}

export function isHeartShown(cat: Cat): boolean {
  return cat.heartSecondsLeft > 0;
}

/** Where a Cat is, in tiles: its tile, or part way along its step. */
export function catPlace(cat: Cat): { col: number; row: number } {
  if (!cat.step) return cat.tile;
  const { from, to, elapsed } = cat.step;
  const t = Math.min(elapsed / CAT_STEP_TIME, 1);
  return { col: from.col + (to.col - from.col) * t, row: from.row + (to.row - from.row) * t };
}

/** The tiles a Cat stands on or is stepping onto. */
function occupied(cat: Cat): string[] {
  return cat.step ? [tileKey(cat.tile), tileKey(cat.step.to)] : [tileKey(cat.tile)];
}

/**
 * Berlioz and Manouche wandering the Hub tile by tile: a few steps, then a sit or a sleep. Whichever renderer runs
 * drives them with `update` while the world isn't paused, so they carry on where they were after a switch.
 */
export function createCats(random: Random) {
  function restingMode(): CatMode {
    const rest = chooseRest(random);
    return { kind: "resting", pose: rest.pose, secondsLeft: rest.seconds };
  }

  const all: Cat[] = CATS.map(({ name, start }) => ({
    name,
    tile: start,
    facing: "down",
    step: null,
    mode: restingMode(),
    heartSecondsLeft: 0,
    pettedFrom: null,
  }));

  function react(cat: Cat, player: Tile) {
    cat.pettedFrom = null;
    cat.facing = directionTowards(cat.tile, player);
    cat.mode = { kind: "resting", pose: "sit", secondsLeft: CAT_REACTION_TIME };
    cat.heartSecondsLeft = CAT_REACTION_TIME;
  }

  function move(cat: Cat, seconds: number, playerTiles: readonly Tile[]) {
    if (cat.step) {
      cat.step.elapsed += seconds;
      if (cat.step.elapsed < CAT_STEP_TIME) return;
      cat.tile = cat.step.to;
      cat.step = null;
    }
    if (cat.pettedFrom) return react(cat, cat.pettedFrom);
    if (cat.mode.kind === "resting") {
      cat.mode.secondsLeft -= seconds;
      if (cat.mode.secondsLeft <= 0) cat.mode = { kind: "walking", stepsLeft: chooseWalkLength(random) };
      return;
    }
    const blocked = new Set([...playerTiles.map(tileKey), ...all.filter((other) => other !== cat).flatMap(occupied)]);
    const direction = cat.mode.stepsLeft > 0 ? chooseCatStep(cat.tile, blocked, random) : undefined;
    if (!direction) {
      cat.mode = restingMode();
      return;
    }
    cat.mode.stepsLeft--;
    cat.facing = direction;
    cat.step = { from: cat.tile, to: tileAhead(cat.tile, direction), elapsed: 0 };
  }

  return {
    all: all as readonly Cat[],
    /** Moves the Cats on; they never step onto the tiles the Player stands on or is stepping onto. */
    update(seconds: number, playerTiles: readonly Tile[]) {
      for (const cat of all) {
        move(cat, seconds, playerTiles);
        cat.heartSecondsLeft = Math.max(0, cat.heartSecondsLeft - seconds);
      }
    },
    /** The Cat standing on or stepping onto a tile. */
    catOn(tile: Tile): Cat | undefined {
      return all.find((cat) => occupied(cat).includes(tileKey(tile)));
    },
    /** The Shutter at a Cat: once any step ends, it turns to the Player's tile, sits and shows a heart. */
    pet(cat: Cat, player: Tile) {
      cat.pettedFrom = player;
    },
  };
}

export type Cats = ReturnType<typeof createCats>;

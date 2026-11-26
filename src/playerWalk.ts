import { tileAhead, type Direction, type Landing, type Tile } from "./overworld";

/** Seconds the Player takes to step from one tile to the next. */
export const STEP_TIME = 0.16;
/** A direction held at least this long walks; a shorter tap in a new direction only turns. */
const HOLD_DELAY = 0.12;
/** Seconds between bumps while the Player keeps walking into a solid tile. */
const BUMP_INTERVAL = 0.4;

export type Step = { from: Tile; to: Tile; elapsed: number };

export type PlayerWalkEvents = {
  /** The Player turned, or tried to step, towards its facing. */
  onTurn(): void;
  onStepStart(): void;
  onArrive(): void;
  onBump(): void;
};

const NO_EVENTS: PlayerWalkEvents = { onTurn() {}, onStepStart() {}, onArrive() {}, onBump() {} };

/** The Player's tile-by-tile walk: where it stands and faces, driven by direction presses and the passing of time. */
export function createPlayerWalk(start: Landing, isBlocked: (tile: Tile) => boolean, events: PlayerWalkEvents = NO_EVENTS) {
  let tile = start.tile;
  let facing = start.facing;
  let step: Step | null = null;
  let now = 0;
  let lastBumpAt = -Infinity;
  /** Directions held down, the most recently pressed last. */
  const held: Direction[] = [];
  const heldSince = new Map<Direction, number>();
  /** Each press of a direction, in order, so quick taps are never lost between frames. */
  const taps: Direction[] = [];

  function turn(direction: Direction) {
    facing = direction;
    events.onTurn();
  }

  function tryStep(direction: Direction) {
    turn(direction);
    const next = tileAhead(tile, direction);
    if (isBlocked(next)) {
      bump();
      return;
    }
    step = { from: tile, to: next, elapsed: 0 };
    events.onStepStart();
  }

  function bump() {
    if (now - lastBumpAt < BUMP_INTERVAL) return;
    lastBumpAt = now;
    events.onBump();
  }

  function arrive() {
    tile = step!.to;
    step = null;
    events.onArrive();
  }

  function nextMove() {
    const tap = taps.shift();
    if (tap) {
      if (tap === facing) tryStep(tap);
      else turn(tap);
      return;
    }
    const direction = held.at(-1);
    if (direction && now - heldSince.get(direction)! >= HOLD_DELAY) tryStep(direction);
  }

  return {
    position(): Landing {
      return { tile, facing };
    },
    /** The step under way, if the Player is between two tiles. */
    step(): Step | null {
      return step;
    },
    update(dt: number) {
      now += dt;
      if (step) {
        step.elapsed += dt;
        if (step.elapsed >= STEP_TIME) arrive();
      }
      if (!step) nextMove();
    },
    press(direction: Direction) {
      if (held.includes(direction)) return;
      held.push(direction);
      heldSince.set(direction, now);
      taps.push(direction);
    },
    release(direction: Direction) {
      const index = held.indexOf(direction);
      if (index >= 0) held.splice(index, 1);
    },
    releaseAll() {
      held.splice(0);
    },
    travelTo(landing: Landing) {
      step = null;
      taps.splice(0);
      tile = landing.tile;
      turn(landing.facing);
    },
  };
}

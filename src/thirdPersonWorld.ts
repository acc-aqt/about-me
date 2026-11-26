import {
  DIRECTIONS,
  isReachableFromSpawn,
  isWalkable,
  MAP_COLUMNS,
  MAP_ROWS,
  type Direction,
  type Landing,
  type Tile,
} from "./overworld";

/**
 * The Third-person world lies on the x/z plane with y up: one tile is one world unit (≈ 1.2 m), x grows east with
 * the column and z grows south with the row, so tile (col, row) covers x ∈ [col, col + 1] and z ∈ [row, row + 1].
 */
export type WorldPosition = { x: number; z: number };

/** Headings are radians about the y axis, the way a Three.js object turns: 0 faces south (+z), π/2 faces east (+x). */
export type PlayerState = { position: WorldPosition; heading: number };

/** Forward and right are -1, 0 or 1, relative to where the camera looks. */
export type MoveInput = { forward: number; right: number; running: boolean };

export const PLAYER_RADIUS = 0.3;
/** World units (tiles) per second. */
export const WALK_SPEED = 3.5;
export const RUN_SPEED = 2 * WALK_SPEED;
/** Each frame's move is cut into sub-steps no longer than this, so the Player can never tunnel through a tile. */
const MAX_SUB_STEP = 0.1;
const PUSH_OUT_PASSES = 3;
/** Overlaps this small are rounding error, not contact. */
const CONTACT_TOLERANCE = 1e-9;

const HEADINGS: Record<Direction, number> = { down: 0, right: Math.PI / 2, up: Math.PI, left: -Math.PI / 2 };

export function directionToHeading(direction: Direction): number {
  return HEADINGS[direction];
}

function angleBetween(a: number, b: number) {
  const difference = (((a - b) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
  return Math.abs(difference);
}

function nearestDirection(heading: number): Direction {
  return DIRECTIONS.reduce((best, direction) =>
    angleBetween(heading, HEADINGS[direction]) < angleBetween(heading, HEADINGS[best]) ? direction : best,
  );
}

/** The centre of a tile. */
export function tileToWorld({ col, row }: Tile): WorldPosition {
  return { x: col + 0.5, z: row + 0.5 };
}

export function isSolid(tile: Tile): boolean {
  return !isWalkable(tile);
}

const reachableTiles: Tile[] = Array.from({ length: MAP_ROWS }, (_, row) =>
  Array.from({ length: MAP_COLUMNS }, (_, col) => ({ col, row })),
)
  .flat()
  .filter(isReachableFromSpawn);

/** The reachable tile nearest a position, with the nearest of the four directions to a heading. */
export function snapToLanding(position: WorldPosition, heading: number): Landing {
  const under = { col: Math.floor(position.x), row: Math.floor(position.z) };
  const distance = (tile: Tile) => {
    const centre = tileToWorld(tile);
    return Math.hypot(centre.x - position.x, centre.z - position.z);
  };
  const tile = isReachableFromSpawn(under)
    ? under
    : reachableTiles.reduce((best, candidate) => (distance(candidate) < distance(best) ? candidate : best));
  return { tile, facing: nearestDirection(heading) };
}

/** Pushes a circle out of every solid tile it overlaps, so it slides along walls instead of sticking to them. */
function pushOutOfSolids(position: WorldPosition): WorldPosition | null {
  let { x, z } = position;
  for (let pass = 0; pass < PUSH_OUT_PASSES; pass++) {
    let pushed = false;
    for (let row = Math.floor(z) - 1; row <= Math.floor(z) + 1; row++) {
      for (let col = Math.floor(x) - 1; col <= Math.floor(x) + 1; col++) {
        if (!isSolid({ col, row })) continue;
        const nearestX = Math.min(Math.max(x, col), col + 1);
        const nearestZ = Math.min(Math.max(z, row), row + 1);
        const distance = Math.hypot(x - nearestX, z - nearestZ);
        if (distance >= PLAYER_RADIUS - CONTACT_TOLERANCE) continue;
        if (distance === 0) return null;
        const depth = PLAYER_RADIUS - distance;
        x += ((x - nearestX) / distance) * depth;
        z += ((z - nearestZ) / distance) * depth;
        pushed = true;
      }
    }
    if (!pushed) return { x, z };
  }
  return null;
}

function moveCircle(from: WorldPosition, dx: number, dz: number): WorldPosition {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / MAX_SUB_STEP));
  let position = from;
  for (let step = 0; step < steps; step++) {
    const next = pushOutOfSolids({ x: position.x + dx / steps, z: position.z + dz / steps });
    if (!next) break;
    position = next;
  }
  return position;
}

/** The Player after a frame of free movement relative to the camera's yaw, colliding with solid tiles. */
export function stepPlayer(player: PlayerState, input: MoveInput, cameraYaw: number, seconds: number): PlayerState {
  const dx = input.forward * Math.sin(cameraYaw) - input.right * Math.cos(cameraYaw);
  const dz = input.forward * Math.cos(cameraYaw) + input.right * Math.sin(cameraYaw);
  const length = Math.hypot(dx, dz);
  if (length === 0) return player;
  const distance = (input.running ? RUN_SPEED : WALK_SPEED) * seconds;
  return {
    position: moveCircle(player.position, (dx / length) * distance, (dz / length) * distance),
    heading: Math.atan2(dx, dz),
  };
}

/** ↑ ↑ ↓ ↓ ← → ← → B A, as KeyboardEvent keys. */
const CHEAT_SEQUENCE = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];

/** Watches a stream of keys for the cheat that toggles Third-person mode. */
export function createCheatDetector() {
  const recent: string[] = [];
  return {
    /** True when this key completes the cheat. */
    type(key: string): boolean {
      recent.push(key.toLowerCase());
      if (recent.length > CHEAT_SEQUENCE.length) recent.shift();
      return recent.length === CHEAT_SEQUENCE.length && recent.every((typed, index) => typed === CHEAT_SEQUENCE[index]);
    },
  };
}

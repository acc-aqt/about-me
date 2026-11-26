import type { PointOfInterest } from "./content";
import {
  DIRECTIONS,
  footprintRect,
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

export type PlayerAnimation = "idle" | "walk" | "run";

/** Which of the Player's animations plays for the held movement keys and Shift. */
export function playerAnimation(input: MoveInput): PlayerAnimation {
  if (input.forward === 0 && input.right === 0) return "idle";
  return input.running ? "run" : "walk";
}

/** How far in front of the Player a Footprint can be and still be targeted, in tiles from the Player's centre. */
export const TARGET_REACH = 1.5;
/** Half the width of the forward cone; narrow enough that a one-tile Footprint right beside the Player is missed. */
export const TARGET_HALF_ANGLE = 0.6;

function headingTowards(from: WorldPosition, to: WorldPosition) {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

type Rect = { left: number; top: number; right: number; bottom: number };

/** How far along a ray from a point it first meets a rectangle, or null when it misses. */
function rayEntry(from: WorldPosition, heading: number, rect: Rect): number | null {
  let near = 0;
  let far = Infinity;
  const slabs = [
    { origin: from.x, direction: Math.sin(heading), min: rect.left, max: rect.right },
    { origin: from.z, direction: Math.cos(heading), min: rect.top, max: rect.bottom },
  ];
  for (const { origin, direction, min, max } of slabs) {
    if (Math.abs(direction) < 1e-12) {
      if (origin < min || origin > max) return null;
      continue;
    }
    const [t1, t2] = [(min - origin) / direction, (max - origin) / direction];
    near = Math.max(near, Math.min(t1, t2));
    far = Math.min(far, Math.max(t1, t2));
  }
  return near <= far ? near : null;
}

/**
 * How near a Footprint comes to the Player inside the forward cone, or null when no part of it lies in the cone within
 * reach. The nearest part is the Footprint's closest point when that lies in the cone, otherwise where an edge of the
 * cone first meets it.
 */
function distanceInCone(poi: PointOfInterest, { position, heading }: PlayerState): number | null {
  const footprint = footprintRect(poi.placement);
  const rect = { ...footprint, right: footprint.right + 1, bottom: footprint.bottom + 1 };
  const closest = {
    x: Math.min(Math.max(position.x, rect.left), rect.right),
    z: Math.min(Math.max(position.z, rect.top), rect.bottom),
  };
  const closestDistance = Math.hypot(closest.x - position.x, closest.z - position.z);
  const inCone = closestDistance === 0 || angleBetween(headingTowards(position, closest), heading) <= TARGET_HALF_ANGLE;
  const candidates = inCone
    ? [closestDistance]
    : [heading - TARGET_HALF_ANGLE, heading + TARGET_HALF_ANGLE].map((edge) => rayEntry(position, edge, rect));
  const distances = candidates.filter((distance) => distance !== null);
  const distance = distances.length ? Math.min(...distances) : Infinity;
  return distance <= TARGET_REACH ? distance : null;
}

/** The Point of Interest the Shutter would photograph: the nearest whose Footprint lies in the forward cone, within reach. */
export function targetedPointOfInterest(
  pointsOfInterest: readonly PointOfInterest[],
  player: PlayerState,
): PointOfInterest | undefined {
  let best: { poi: PointOfInterest; distance: number } | undefined;
  for (const poi of pointsOfInterest) {
    const distance = distanceInCone(poi, player);
    if (distance !== null && (!best || distance < best.distance)) best = { poi, distance };
  }
  return best?.poi;
}

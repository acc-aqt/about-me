import { catPlace, type Cat } from "./cats";
import { content, type Footprint, type PointOfInterest } from "./content";
import { isInNamePlateRange, NAME_PLATES, type NamePlate } from "./namePlates";
import {
  DIRECTIONS,
  footprintRect,
  footprintTiles,
  HUB_SIGNPOSTS,
  isReachableFromSpawn,
  isWalkable,
  mapCharAt,
  MAP_COLUMNS,
  MAP_ROWS,
  tileKey,
  tileKindAt,
  type Direction,
  type Landing,
  type Tile,
  type TileKind,
  type TileRect,
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

/** Every tile of the map, row by row from the top-left. */
export const MAP_TILES: readonly Tile[] = Array.from({ length: MAP_ROWS }, (_, row) =>
  Array.from({ length: MAP_COLUMNS }, (_, col) => ({ col, row })),
).flat();

const reachableTiles = MAP_TILES.filter(isReachableFromSpawn);

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

export type GroundKind = "grass" | "path" | "asphalt" | "track" | "snow" | "water";
/** What stands on a tile; a model is a Point of Interest, Signpost or set piece, built in `thirdPersonPointsOfInterest.ts`. */
export type SceneryKind = "tree" | "bush" | "building" | "fence" | "rock" | "car" | "model";
export type TileLayout = { ground: GroundKind; scenery: SceneryKind | null };

export const TILE_LAYOUTS: Record<TileKind, TileLayout> = {
  grass: { ground: "grass", scenery: null },
  path: { ground: "path", scenery: null },
  asphalt: { ground: "asphalt", scenery: null },
  track: { ground: "track", scenery: null },
  tree: { ground: "grass", scenery: "tree" },
  bush: { ground: "grass", scenery: "bush" },
  water: { ground: "water", scenery: null },
  building: { ground: "grass", scenery: "building" },
  fence: { ground: "grass", scenery: "fence" },
  maypole: { ground: "grass", scenery: "model" },
  well: { ground: "grass", scenery: "model" },
  prop: { ground: "grass", scenery: "model" },
  landmark: { ground: "grass", scenery: "model" },
  car: { ground: "asphalt", scenery: "car" },
  rock: { ground: "snow", scenery: "rock" },
  snow: { ground: "snow", scenery: null },
};

const modelTiles = new Set([
  ...content.zones.flatMap((zone) => zone.pointsOfInterest).flatMap((poi) => footprintTiles(poi.placement)),
  ...HUB_SIGNPOSTS.map(({ tile }) => tile),
].map(tileKey));

/** What a tile becomes in the Third-person world; Points of Interest and Signposts are models. */
export function layoutAt(tile: Tile): TileLayout {
  const { ground, scenery } = TILE_LAYOUTS[tileKindAt(tile) ?? "tree"];
  return modelTiles.has(tileKey(tile)) ? { ground, scenery: "model" } : { ground, scenery };
}

const isTree = (tile: Tile) => layoutAt(tile).scenery === "tree";

/** Steps (diagonals included) from each tree tile to the nearest tile that is not a tree. */
const forestDepths = (() => {
  const depths = new Map(MAP_TILES.filter((tile) => !isTree(tile)).map((tile) => [tileKey(tile), 0]));
  let frontier = MAP_TILES.filter((tile) => !isTree(tile));
  for (let depth = 1; frontier.length > 0; depth++) {
    const next: Tile[] = [];
    for (const { col, row } of frontier) {
      for (let dRow = -1; dRow <= 1; dRow++) {
        for (let dCol = -1; dCol <= 1; dCol++) {
          const neighbour = { col: col + dCol, row: row + dRow };
          if (mapCharAt(neighbour) === undefined || depths.has(tileKey(neighbour))) continue;
          depths.set(tileKey(neighbour), depth);
          next.push(neighbour);
        }
      }
    }
    frontier = next;
  }
  return depths;
})();

/** How deep a tile lies inside the forest walls: 0 off the trees, 1 on their edge, more further in. */
export function forestDepth(tile: Tile): number {
  return forestDepths.get(tileKey(tile)) ?? 0;
}

/** Building tiles grouped into rectangles, scanned row by row, so each house is drawn whole. */
export function buildingBlocks(): TileRect[] {
  const claimed = new Set<string>();
  const free = (tile: Tile) => layoutAt(tile).scenery === "building" && !claimed.has(tileKey(tile));
  const blocks: TileRect[] = [];
  for (const start of MAP_TILES) {
    if (!free(start)) continue;
    let right = start.col;
    while (free({ col: right + 1, row: start.row })) right++;
    let bottom = start.row;
    const rowIsFree = (row: number) =>
      Array.from({ length: right - start.col + 1 }, (_, i) => ({ col: start.col + i, row })).every(free);
    while (rowIsFree(bottom + 1)) bottom++;
    const block = { left: start.col, top: start.row, right, bottom };
    for (let row = block.top; row <= bottom; row++) for (let col = block.left; col <= right; col++) claimed.add(tileKey({ col, row }));
    blocks.push(block);
  }
  return blocks;
}

/**
 * The Sport mountain rises south from its rocky foot (row 47) to the summit cross (row 60), and its flank fades
 * eastwards into the forest, flat again by column 47. The skin track runs only south or across, so it always climbs.
 */
const MOUNTAIN = { height: 7, footZ: 47, summitZ: 60.5, flankStartX: 32, flankEndX: 47 };

function smoothstep(from: number, to: number, value: number) {
  const t = Math.min(Math.max((value - from) / (to - from), 0), 1);
  return t * t * (3 - 2 * t);
}

/** How high the ground stands at a position, in world units: flat everywhere but the Sport mountain. */
export function groundHeight({ x, z }: WorldPosition): number {
  const rise = smoothstep(MOUNTAIN.footZ, MOUNTAIN.summitZ, z);
  const flank = 1 - smoothstep(MOUNTAIN.flankStartX, MOUNTAIN.flankEndX, x);
  return MOUNTAIN.height * rise * flank;
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

/** Bounds on the ground: x from left to right, z from top to bottom. */
export type WorldRect = { left: number; top: number; right: number; bottom: number };

/** The ground a Footprint covers, edge to edge. */
export function footprintWorldRect(footprint: Footprint): WorldRect {
  const { left, top, right, bottom } = footprintRect(footprint);
  return { left, top, right: right + 1, bottom: bottom + 1 };
}

/** How far along a ray from a point it first meets a rectangle, or null when it misses. */
function rayEntry(from: WorldPosition, heading: number, rect: WorldRect): number | null {
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
 * How near a rectangle (a Footprint, a Cat) comes to the Player inside the forward cone, or null when no part of it lies
 * in the cone within reach. The nearest part is its closest point when that lies in the cone, otherwise where an edge
 * of the cone first meets it.
 */
function distanceInCone(rect: WorldRect, { position, heading }: PlayerState): number | null {
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
  return nearestInCone(pointsOfInterest, (poi) => footprintWorldRect(poi.placement), player);
}

function nearestInCone<T>(items: readonly T[], rectOf: (item: T) => WorldRect, player: PlayerState): T | undefined {
  let best: { item: T; distance: number } | undefined;
  for (const item of items) {
    const distance = distanceInCone(rectOf(item), player);
    if (distance !== null && (!best || distance < best.distance)) best = { item, distance };
  }
  return best?.item;
}

/** Where a Cat stands in the world: the centre of its tile, or part way along its step. */
export function catWorldPosition(cat: Cat): WorldPosition {
  const { col, row } = catPlace(cat);
  return { x: col + 0.5, z: row + 0.5 };
}

/** The Cat the Shutter would reach, as for a Point of Interest: the nearest one-tile Cat in the forward cone. */
export function targetedCat(cats: readonly Cat[], player: PlayerState): Cat | undefined {
  return nearestInCone(
    cats,
    (cat) => {
      const { x, z } = catWorldPosition(cat);
      return { left: x - 0.5, top: z - 0.5, right: x + 0.5, bottom: z + 0.5 };
    },
    player,
  );
}

/** What a Point of Interest is built as in the Third-person world. */
export type PoiShape =
  | "camera stand"
  | "darkroom hut"
  | "welcome board"
  | "university hall"
  | "four-cylinder tower"
  | "kangaroo sign"
  | "factory shed"
  | "office block"
  | "engine works"
  | "mailbox"
  | "computer"
  | "3D printer"
  | "workbench"
  | "swimming pool"
  | "tennis court"
  | "summit cross"
  | "jukebox";

/** The height is the model's top in world units, above which its Name plate floats. */
export type PoiModel = { shape: PoiShape; height: number };

/** The 3D details of each Point of Interest, by id. */
const POI_MODELS: Readonly<Record<string, PoiModel>> = {
  intro: { shape: "welcome board", height: 1.6 },
  tum: { shape: "university hall", height: 7 },
  "bmw-group": { shape: "four-cylinder tower", height: 9 },
  "canberra-detour": { shape: "kangaroo sign", height: 1.9 },
  "forward-engineering": { shape: "factory shed", height: 3.6 },
  "arrk-engineering": { shape: "office block", height: 5 },
  mtu: { shape: "engine works", height: 4 },
  framewise: { shape: "computer", height: 1.3 },
  "lens-caps": { shape: "3D printer", height: 1.3 },
  reelmaker: { shape: "workbench", height: 1.1 },
  "preset-fitting": { shape: "computer", height: 1.3 },
  jordan: { shape: "camera stand", height: 1.5 },
  norway: { shape: "camera stand", height: 1.5 },
  "new-york": { shape: "camera stand", height: 1.5 },
  nepal: { shape: "camera stand", height: 1.5 },
  lisbon: { shape: "camera stand", height: 1.5 },
  "eastern-adriatic": { shape: "camera stand", height: 1.5 },
  peru: { shape: "camera stand", height: 1.5 },
  darkroom: { shape: "darkroom hut", height: 3.2 },
  "swimming-pool": { shape: "swimming pool", height: 0.5 },
  "tennis-court": { shape: "tennis court", height: 1 },
  "ski-touring-slope": { shape: "summit cross", height: 2.6 },
  "track-back": { shape: "jukebox", height: 1.7 },
  "contact-board": { shape: "mailbox", height: 1.4 },
};

/** A Point of Interest's model, standing on its whole Footprint. */
export function pointOfInterestModel(poi: PointOfInterest): PoiModel & { base: WorldRect } {
  const model = POI_MODELS[poi.id];
  if (!model) throw new Error(`No 3D model for the Point of Interest "${poi.id}"`);
  return { ...model, base: footprintWorldRect(poi.placement) };
}

export const SIGNPOST_HEIGHT = 1.5;
/** The gap between the top of a model and the bottom of its Name plate. */
const NAME_PLATE_GAP = 0.3;

/** A Name plate's bottom centre, in world units with y up. */
export type NamePlateAnchor = WorldPosition & { y: number };

export type FloatingNamePlate = NamePlate & { anchor: NamePlateAnchor };

const pointsOfInterest = content.zones.flatMap((zone) => zone.pointsOfInterest);

function heightUnder({ at }: NamePlate) {
  const poi = pointsOfInterest.find((candidate) => candidate.placement === at);
  return poi ? pointOfInterestModel(poi).height : SIGNPOST_HEIGHT;
}

/** The 2D Name plates, each floating centred above its Point of Interest's model or Signpost, on the ground beneath. */
export const FLOATING_NAME_PLATES: readonly FloatingNamePlate[] = NAME_PLATES.map((plate) => {
  const { left, top, right, bottom } = footprintWorldRect(plate.at);
  const centre = { x: (left + right) / 2, z: (top + bottom) / 2 };
  return { ...plate, anchor: { ...centre, y: groundHeight(centre) + heightUnder(plate) + NAME_PLATE_GAP } };
});

/** Whether a Name plate over a Footprint, or over a single tile such as a Cat's, shows: the 2D range rule. */
export function isNamePlateShown(at: Footprint, player: WorldPosition): boolean {
  return isInNamePlateRange({ col: Math.floor(player.x), row: Math.floor(player.z) }, at);
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

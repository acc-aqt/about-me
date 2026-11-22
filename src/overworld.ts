import { content, type PointOfInterest, type ZoneId } from "./content";

export type Tile = { col: number; row: number };

export type Direction = "up" | "down" | "left" | "right";

export type TileKind = "grass" | "path" | "tree" | "water" | "building" | "bush" | "fence" | "prop";

export const OVERWORLD_TILE_SIZE = 16;

export const LEGEND: Record<string, { kind: TileKind; walkable: boolean }> = {
  ".": { kind: "grass", walkable: true },
  "=": { kind: "path", walkable: true },
  T: { kind: "tree", walkable: false },
  "~": { kind: "water", walkable: false },
  B: { kind: "building", walkable: false },
  "*": { kind: "bush", walkable: false },
  "#": { kind: "fence", walkable: false },
  o: { kind: "prop", walkable: false },
};

/** One string per row, one character per tile; see LEGEND. Row 0 is the top (north) edge. */
export const OVERWORLD_MAP: readonly string[] = [
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTBBTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTT===============.BBTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTT=T............TTBBTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTT=TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTT=TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTT================================================TTTTTT",
  "TTTTTTTT...........................................TT=...TTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT~~~~~~~TTTTTT=...TTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT=...TTT",
  "TTTTTT================================================TTTTTT",
  "TTTTTT=T...........................................TTTTTTTTT",
  "TTTTTT=TTTTT~~~~~TTTTTTTTTTTTTTTTTTT~~~~~~~~~TTTTTTTTTTTTTTT",
  "TTTTTT=TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTT=========================TTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTT.......TTT.........TTT=TTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT=TTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT=TTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTT**.....=....**TTTTTTTTTTTTTTTTTTTTTTT",
  "TT****................T*......=.....*TT*...*...*...*...*..TT",
  "TT****........oo......T.......=......TT...................TT",
  "TT....................T.......=......TT...................TT",
  "TT....................T.......=......TT...................TT",
  "TT========================================================TT",
  "TT....................T........=.....TT...................TT",
  "TT....................T........=.....TT...................TT",
  "TT.BBBBBB...BBBBBB.o..T........=.....TT...................TT",
  "TT.BBBBBB...BBBBBB....T........=.....TT.........BBBBB.....TT",
  "TT.BBBBBBo..BBBBBB....T*.......=....*TT.........BBBBB.....TT",
  "TT....................TTT.TTTTT=TTTTTTT.........BBBBB.....TT",
  "TT....................#....#***=******T~~~~~~.............TT",
  "TTTTTTTTTTTTTTTTTTTTTT#....#***=******TTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTT#....#***=******TTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTT######TTT=TTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT.................o.o........T=...o.o....................TT",
  "TT========================================================TT",
  "TT............................TT..........................TT",
  "TT.o.o........................TT....................ooo...TT",
  "TT............~~~~~~~~~.......TT..........................TT",
  "TT............~~~~~~~~~.......TT..........BBBBBBB.........TT",
  "TT............~~~~~~~~~.......TT..........BBBBBBB.........TT",
  "TT............~~~~~~~~~.......TT..........BBBBBBBo........TT",
  "TT............~~~~~~~~~.......TT..........BBBBBBB.........TT",
  "TTTTTTT.......................TT..........................TT",
  "TTTTTTTo......................TT..........................TT",
  "TTTTTTT.......................TT..........................TT",
  "TTTTTTT.......................TT..........................TT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
];

export const MAP_COLUMNS = OVERWORLD_MAP[0].length;
export const MAP_ROWS = OVERWORLD_MAP.length;

export const SPAWN: Tile = { col: 29, row: 24 };

/** Inclusive tile bounds. */
export type TileRect = { left: number; top: number; right: number; bottom: number };

/** Tiles in no rectangle, such as the southern path before its fork, belong to no Zone. */
export const ZONE_RECTS: Record<ZoneId, TileRect> = {
  start: { left: 22, top: 17, right: 37, bottom: 29 },
  "photography-trail": { left: 1, top: 1, right: 58, bottom: 16 },
  "career-road": { left: 38, top: 17, right: 58, bottom: 33 },
  "maker-workshop": { left: 1, top: 17, right: 21, bottom: 33 },
  contact: { left: 22, top: 30, right: 27, bottom: 33 },
  sport: { left: 1, top: 34, right: 30, bottom: 48 },
  "music-and-games": { left: 31, top: 34, right: 58, bottom: 48 },
};

export function zoneAt({ col, row }: Tile): ZoneId | undefined {
  const zones = Object.keys(ZONE_RECTS) as ZoneId[];
  return zones.find((zone) => {
    const rect = ZONE_RECTS[zone];
    return col >= rect.left && col <= rect.right && row >= rect.top && row <= rect.bottom;
  });
}

export function tileKindAt({ col, row }: Tile): TileKind | undefined {
  const char = OVERWORLD_MAP[row]?.[col];
  return char === undefined ? undefined : LEGEND[char].kind;
}

function tileKey({ col, row }: Tile) {
  return `${col},${row}`;
}

const pointsOfInterestByTile = new Map(
  content.zones.flatMap((zone) => zone.pointsOfInterest).map((poi) => [tileKey(poi.placement), poi] as const),
);

function pointOfInterestAt(tile: Tile): PointOfInterest | undefined {
  return pointsOfInterestByTile.get(tileKey(tile));
}

/** Points of Interest are solid; Film roll tiles keep the ground's walkability. */
export function isWalkable(tile: Tile): boolean {
  const char = OVERWORLD_MAP[tile.row]?.[tile.col];
  return char !== undefined && LEGEND[char].walkable && !pointOfInterestAt(tile);
}

const STEPS: Record<Direction, Tile> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};

export const DIRECTIONS = Object.keys(STEPS) as Direction[];

export function tileAhead({ col, row }: Tile, direction: Direction): Tile {
  const step = STEPS[direction];
  return { col: col + step.col, row: row + step.row };
}

export function facedPointOfInterest(tile: Tile, facing: Direction): PointOfInterest | undefined {
  return pointOfInterestAt(tileAhead(tile, facing));
}

/** Breadth-first walk from the spawn, nearest tiles first, with the direction of the step that reached each. */
function walkFromSpawn() {
  const arrivals = new Map<string, { tile: Tile; facing?: Direction }>([[tileKey(SPAWN), { tile: SPAWN }]]);
  const queue = [SPAWN];
  for (let tile = queue.shift(); tile; tile = queue.shift()) {
    for (const direction of DIRECTIONS) {
      const next = tileAhead(tile, direction);
      if (!isWalkable(next) || arrivals.has(tileKey(next))) continue;
      arrivals.set(tileKey(next), { tile: next, facing: direction });
      queue.push(next);
    }
  }
  return arrivals;
}

const arrivalsFromSpawn = walkFromSpawn();

export function isReachableFromSpawn(tile: Tile): boolean {
  return arrivalsFromSpawn.has(tileKey(tile));
}

export type Landing = { tile: Tile; facing: Direction };

/** Where the Player stands to face a Point of Interest, preferring to stand below it. */
const APPROACHES: { from: Direction; facing: Direction }[] = [
  { from: "down", facing: "up" },
  { from: "left", facing: "right" },
  { from: "right", facing: "left" },
  { from: "up", facing: "down" },
];

/**
 * In front of the Zone's `fastTravelTo` Point of Interest, facing it; otherwise the first tile of the
 * Zone on the shortest walk from the spawn (where its path leaves the Hub), facing onward.
 */
export function fastTravelLanding(zoneId: ZoneId): Landing {
  const zone = content.zones.find((candidate) => candidate.id === zoneId);
  const featured = zone?.pointsOfInterest.find((poi) => poi.id === zone.fastTravelTo);
  if (featured) {
    for (const { from, facing } of APPROACHES) {
      const tile = tileAhead(featured.placement, from);
      if (isReachableFromSpawn(tile)) return { tile, facing };
    }
    throw new Error(`No reachable tile in front of ${featured.id}`);
  }
  for (const arrival of arrivalsFromSpawn.values()) {
    if (zoneAt(arrival.tile) === zoneId) return { tile: arrival.tile, facing: arrival.facing ?? "down" };
  }
  throw new Error(`Zone ${zoneId} is not reachable from the spawn`);
}

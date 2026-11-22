import { content, zoneById, type PointOfInterest, type ZoneId } from "./content";

export type Tile = { col: number; row: number };

export type Direction = "up" | "down" | "left" | "right";

export type TileKind = "grass" | "path" | "tree" | "water" | "building" | "bush" | "fence" | "maypole" | "well" | "prop";

export const OVERWORLD_TILE_SIZE = 16;

export const LEGEND: Record<string, { kind: TileKind; walkable: boolean }> = {
  ".": { kind: "grass", walkable: true },
  "=": { kind: "path", walkable: true },
  T: { kind: "tree", walkable: false },
  "~": { kind: "water", walkable: false },
  B: { kind: "building", walkable: false },
  "*": { kind: "bush", walkable: false },
  "#": { kind: "fence", walkable: false },
  Y: { kind: "maypole", walkable: false },
  o: { kind: "well", walkable: false },
  p: { kind: "prop", walkable: false },
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
  "TT****........pp......T.......=...Y..TT...................TT",
  "TT....................T.......=...Y..TT...................TT",
  "TT....................T.......=......TT...................TT",
  "TT========================================================TT",
  "TT....................T........=.....TT...................TT",
  "TT....................T...o....=.....TT...................TT",
  "TT.BBBBBB...BBBBBB.p..T........=.....TT...................TT",
  "TT.BBBBBB...BBBBBB....T........=.....TT.........BBBBB.....TT",
  "TT.BBBBBBp..BBBBBB....T*.......=....*TT.........BBBBB.....TT",
  "TT....................TTTTTTTTT=TTTTTTT.........BBBBB.....TT",
  "TT....................TTTTTT***=******T~~~~~~.............TT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTT***=******TTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTT***=******TTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT=TTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT.................p.p........T=...p.p....................TT",
  "TT========================================================TT",
  "TT............................TT..........................TT",
  "TT.p.p........................TT....................ppp...TT",
  "TT............~~~~~~~~~.......TT..........................TT",
  "TT............~~~~~~~~~.......TT..........BBBBBBB.........TT",
  "TT............~~~~~~~~~.......TT..........BBBBBBB.........TT",
  "TT............~~~~~~~~~.......TT..........BBBBBBBp........TT",
  "TT............~~~~~~~~~.......TT..........BBBBBBB.........TT",
  "TTTTTTT.......................TT..........................TT",
  "TTTTTTTp......................TT..........................TT",
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

/**
 * Tiles in no rectangle, such as the southern path before its fork, belong to no Zone. Contact's corner lies inside
 * the Hub's rectangle and wins there; no other rectangles overlap.
 */
export const ZONE_RECTS: Record<ZoneId, TileRect> = {
  start: { left: 22, top: 17, right: 37, bottom: 29 },
  "photography-trail": { left: 1, top: 1, right: 58, bottom: 16 },
  "career-road": { left: 38, top: 17, right: 58, bottom: 33 },
  "maker-workshop": { left: 1, top: 17, right: 21, bottom: 33 },
  contact: { left: 23, top: 26, right: 28, bottom: 28 },
  sport: { left: 1, top: 34, right: 30, bottom: 48 },
  "music-and-games": { left: 31, top: 34, right: 58, bottom: 48 },
};

function area({ left, top, right, bottom }: TileRect) {
  return (right - left + 1) * (bottom - top + 1);
}

/** The Zone whose rectangle contains the tile, the smallest one where rectangles nest. */
export function zoneAt({ col, row }: Tile): ZoneId | undefined {
  const zones = Object.keys(ZONE_RECTS) as ZoneId[];
  const containing = zones.filter((zone) => {
    const rect = ZONE_RECTS[zone];
    return col >= rect.left && col <= rect.right && row >= rect.top && row <= rect.bottom;
  });
  return containing.sort((a, b) => area(ZONE_RECTS[a]) - area(ZONE_RECTS[b]))[0];
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

export type Signpost = { tile: Tile; leadsTo: ZoneId[] };

/** One signpost beside each path out of the Hub, naming the Zones down that path; Contact is in the Hub itself. */
export const HUB_SIGNPOSTS: Signpost[] = [
  { tile: { col: 31, row: 18 }, leadsTo: ["photography-trail"] },
  { tile: { col: 23, row: 22 }, leadsTo: ["maker-workshop"] },
  { tile: { col: 36, row: 22 }, leadsTo: ["career-road"] },
  { tile: { col: 32, row: 28 }, leadsTo: ["sport", "music-and-games"] },
];

const signpostTiles = new Set(HUB_SIGNPOSTS.map(({ tile }) => tileKey(tile)));

/** Points of Interest and signposts are solid; Film roll tiles keep the ground's walkability. */
export function isWalkable(tile: Tile): boolean {
  const char = OVERWORLD_MAP[tile.row]?.[tile.col];
  return char !== undefined && LEGEND[char].walkable && !pointOfInterestAt(tile) && !signpostTiles.has(tileKey(tile));
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

const COVER_KINDS: readonly TileKind[] = ["tree", "bush", "building", "fence", "prop"];

/** Cover to the south stands in front of a Film roll, so it is tried first; cover to the north is the last resort. */
const COVER_DIRECTIONS: Direction[] = ["down", "left", "right", "up"];

/** The side of a Film roll's tile where solid cover stands, for the roll to peek out from behind. */
export function filmRollCover(tile: Tile): Direction | undefined {
  return COVER_DIRECTIONS.find((direction) => {
    const kind = tileKindAt(tileAhead(tile, direction));
    return kind !== undefined && COVER_KINDS.includes(kind);
  });
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
  const zone = zoneById(zoneId);
  const featured = zone.pointsOfInterest.find((poi) => poi.id === zone.fastTravelTo);
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

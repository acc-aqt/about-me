import { content, zoneById, type Footprint, type PointOfInterest, type ZoneId } from "./content";

export type Tile = { col: number; row: number };

export type Direction = "up" | "down" | "left" | "right";

export type TileKind =
  | "grass"
  | "path"
  | "tree"
  | "water"
  | "building"
  | "bush"
  | "fence"
  | "maypole"
  | "well"
  | "prop"
  | "landmark"
  | "asphalt"
  | "car"
  | "rock"
  | "snow"
  | "track";

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
  /** Ground under a Point of Interest drawn whole over its footprint, such as the FIZ or the tennis court. */
  X: { kind: "landmark", walkable: false },
  _: { kind: "asphalt", walkable: true },
  c: { kind: "car", walkable: false },
  "^": { kind: "rock", walkable: false },
  S: { kind: "snow", walkable: false },
  /** The skin track up the mountain. */
  ":": { kind: "track", walkable: true },
};

/** One string per row, one character per tile; see LEGEND. Row 0 is the top (north) edge. */
export const OVERWORLD_MAP: readonly string[] = [
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTBBBTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTT===============BBBTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTT=T............=BBBTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTT=TTTTTTTTTTTTT===TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTT=TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTT================================================TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTT...........................................TT=...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT~~~~~~~TTTTTT=...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT=...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTT================================================TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTT=T...........................................TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTT=TTTTT~~~~~TTTTTTTTTTTTTTTTTTT~~~~~~~~~TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTT=TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTT=========================TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTT.......TTT.........TTT=TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT=TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT=TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTT**.....=....**TTT.......TT..........TTT.......T.......T.........TTT",
  "TT****................T*......=.....*TTTBBBBBBB..XXXXXXXXX..............................TT",
  "TT****........pp......T.......=...Y..TTTBBBBBBB..XXXXXXXXX.....BBBBBB..BBBBB..BBBBBBXXX.TT",
  "TT....................T.......=...Y..TTTBBBBBBB..XXXXXXXXX.....BBBBBB..BBBBB..BBBBBBXXX.TT",
  "TT....................T.......=......TTTBBBBBBB..XXXXXXXXX.....BBBBBB..BBBBB..BBBBBBXXX.TT",
  "TT======================================================================================TT",
  "TT....................T........=.....TTT........___________T=*..........................TT",
  "TT....................T...o....=.....TTT........_c_c___c_c_.=...........................TT",
  "TT.BBBBBB...BBBBBB.p..T........=.....TTT..*..*.._c_c___c_c_.=...*..*....*..*....*....T..TT",
  "TT.BBBBBB...BBBBBB....T........=.....TTT........___________.=.......................TT..TT",
  "TT.BBBBBBp..BBBBBB....T*.......=....*TTT...................*=*........*.................TT",
  "TT....................TTTTTTTTT=TTTTTTTTTTTTTTTTTTTTTTTTTTTT.TTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT....................TTTTTT***=******TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTT***=******TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTT***=******TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT=TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT............................T=...p.p....................TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT========================================================TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT............................TT..........................TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT.XXXXXXXXXXXX.XXXXXXXXXXXXX.TT....................ppp...TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT.XXXXXXXXXXXX.XXXXXXXXXXXXX.TT..........................TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT.XXXXXXXXXXXX.XXXXXXXXXXXXX.TT..........BBBBBBB.........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT.XXXXXXXXXXXX.XXXXXXXXXXXXX.TT..........BBBBBBB.........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT.XXXXXXXXXXXX.XXXXXXXXXXXXX.TT..........BBBBBBBp........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT..............XXXXXXXXXXXXX.TT..........BBBBBBB.........TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT............................TT..........................TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT.p.p.p......................TT..........................TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT............................TT..........................TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTT*.......................**.TT..........................TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTT^^^^:^^^^^^^^^^TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTT^^^^S:::::::::S^^TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTT^^SSSSSSSSSSSSS:SSS^^TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTT^SSSSSSSSSSSSSSS:SSSS^^TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTT^^S:::::::::::::::SSSSS^^TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTT^^SS:SSSSSSSSSSSSSSSSSSSS^^TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTT^^SSSS:SSSSSSSSSSSSSSSSSSS^^S^^TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTT^^SSSSS:::::::::::::::::SSSSSSS^^TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TT^^SSSSSSSSSSSSSSSSSSSSSS:SSSSSSSS^^TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "SSSSSS^SSSSSSSSSSSSSSSSSSS:SSSSSSSSSS^^TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "SSSSSSSSSSSSSS:::::::::::::SSSSSSSSSSS^^TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "SSSSSSSSSSSSSS:SSSSSSSSSSSSSSSSSSS^^SSS^^TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "SSSSSSSSSSSSSS:SSSSSSSSSSSSSSSSSSSSSSSSSS^^TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "SSSS^SSSSSSSSS:XXSSSSSSS^SSSSSSSSSSSSSSSSS^^TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSS^SSSSSSSSSSSS^^TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "SSSSSSSS^SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS^^SSS^^TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "SSSSSSSSSSSSSSSSSS^SSSSSSSSSSSSSSSSSSSSSSSSSS^^TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
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
  "career-road": { left: 38, top: 17, right: 88, bottom: 33 },
  "maker-workshop": { left: 1, top: 17, right: 21, bottom: 33 },
  contact: { left: 23, top: 26, right: 28, bottom: 28 },
  sport: { left: 1, top: 34, right: 30, bottom: 63 },
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

export function mapCharAt({ col, row }: Tile): string | undefined {
  return OVERWORLD_MAP[row]?.[col];
}

export function tileKindAt(tile: Tile): TileKind | undefined {
  const char = mapCharAt(tile);
  return char === undefined ? undefined : LEGEND[char].kind;
}

export function tileKey({ col, row }: Tile) {
  return `${col},${row}`;
}

/** The map pixel at a tile's top-left corner. */
export function tileToPixels({ col, row }: Tile): [number, number] {
  return [col * OVERWORLD_TILE_SIZE, row * OVERWORLD_TILE_SIZE];
}

export function footprintRect({ col, row, width = 1, height = 1 }: Footprint): TileRect {
  return { left: col, top: row, right: col + width - 1, bottom: row + height - 1 };
}

export function footprintTiles(footprint: Footprint): Tile[] {
  const { left, top, right, bottom } = footprintRect(footprint);
  const tiles: Tile[] = [];
  for (let row = top; row <= bottom; row++) for (let col = left; col <= right; col++) tiles.push({ col, row });
  return tiles;
}

/** Every tile of every footprint, so facing any of them faces its Point of Interest. */
const pointsOfInterestByTile = new Map(
  content.zones
    .flatMap((zone) => zone.pointsOfInterest)
    .flatMap((poi) => footprintTiles(poi.placement).map((tile) => [tileKey(tile), poi] as const)),
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
  const char = mapCharAt(tile);
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

const COVER_KINDS: readonly TileKind[] = ["tree", "bush", "building", "fence", "prop", "landmark", "car"];

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

/** The sides the Player may stand on to face a footprint, preferring below it, with the way it then faces. */
const APPROACHES: { from: Direction; facing: Direction }[] = [
  { from: "down", facing: "up" },
  { from: "left", facing: "right" },
  { from: "right", facing: "left" },
  { from: "up", facing: "down" },
];

/** The tiles just outside one side of a footprint, nearest that side's middle first. */
function tilesBeside(footprint: Footprint, side: Direction): Tile[] {
  const { left, top, right, bottom } = footprintRect(footprint);
  const across = side === "up" || side === "down";
  const [from, to] = across ? [left, right] : [top, bottom];
  const middle = (from + to) / 2;
  const offsets = Array.from({ length: to - from + 1 }, (_, index) => from + index).sort(
    (a, b) => Math.abs(a - middle) - Math.abs(b - middle) || a - b,
  );
  const fixed = { up: top - 1, down: bottom + 1, left: left - 1, right: right + 1 }[side];
  return offsets.map((offset) => (across ? { col: offset, row: fixed } : { col: fixed, row: offset }));
}

/**
 * In front of the middle of the Zone's `fastTravelTo` Point of Interest, facing it; otherwise the first tile of the
 * Zone on the shortest walk from the spawn (where its path leaves the Hub), facing onward.
 */
export function fastTravelLanding(zoneId: ZoneId): Landing {
  const zone = zoneById(zoneId);
  const featured = zone.pointsOfInterest.find((poi) => poi.id === zone.fastTravelTo);
  if (featured) {
    for (const { from, facing } of APPROACHES) {
      const tile = tilesBeside(featured.placement, from).find(isReachableFromSpawn);
      if (tile) return { tile, facing };
    }
    throw new Error(`No reachable tile in front of ${featured.id}`);
  }
  for (const arrival of arrivalsFromSpawn.values()) {
    if (zoneAt(arrival.tile) === zoneId) return { tile: arrival.tile, facing: arrival.facing ?? "down" };
  }
  throw new Error(`Zone ${zoneId} is not reachable from the spawn`);
}

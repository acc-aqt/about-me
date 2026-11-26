// Original pixel art, painted in code at start-up so no large image files ship.
// The Overworld's terrain, buildings, signs and props come from Kenney's CC0 Tiny Town and Tiny Dungeon tiles
// (see CREDITS.md); the water, the mountain, the parked cars, the Player, the Cats, the Film roll, the Hub's maypole, the
// themed objects Kenney lacks and the stations drawn over whole Footprints (the FIZ, MTU's engine, the tennis court,
// the pool and the summit cross) are painted here.

import {
  HUB_SIGNPOSTS,
  MAP_COLUMNS,
  MAP_ROWS,
  footprintTiles,
  mapCharAt,
  OVERWORLD_TILE_SIZE,
  tileAhead,
  tileKey,
  tileKindAt,
  tileToPixels,
  type Direction,
  type Tile,
  type TileKind,
} from "./overworld";
import type { CatAnimPose, CatName } from "./cats";
import type { Footprint } from "./content";

export type Rgb = [number, number, number];

export const PLAYER_FRAME_WIDTH = 16;
export const PLAYER_FRAME_HEIGHT = 24;

export class Pixels {
  readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;

  constructor(width: number, height: number) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = Math.max(1, Math.ceil(width));
    this.canvas.height = height;
    this.context = this.canvas.getContext("2d")!;
  }

  rect(x: number, y: number, width: number, height: number, [r, g, b]: Rgb) {
    this.context.fillStyle = `rgb(${r} ${g} ${b})`;
    this.context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
  }

  dot(x: number, y: number, color: Rgb) {
    this.rect(x, y, 1, 1, color);
  }

  /** Copies one square tile of a sheet laid out `columns` tiles wide. */
  tile(sheet: CanvasImageSource, columns: number, frame: number, x: number, y: number) {
    const size = OVERWORLD_TILE_SIZE;
    const sourceX = (frame % columns) * size;
    const sourceY = Math.floor(frame / columns) * size;
    this.context.drawImage(sheet, sourceX, sourceY, size, size, x, y, size, size);
  }
}

function hex(value: string): Rgb {
  const n = Number.parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const INK = hex("#1d1d24");
export const LABEL_PLATE_COLOR: Rgb = [251, 248, 240];

function hash(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}


const PLAYER_COLORS: Record<string, Rgb> = {
  k: INK,
  b: hex("#d8613a"),
  B: hex("#a8452a"),
  h: hex("#5a3825"),
  s: hex("#f1c9a0"),
  e: INK,
  j: hex("#3c8c84"),
  J: hex("#2a645f"),
  c: hex("#2b2b33"),
  g: hex("#c4c8d0"),
  l: hex("#8fd2ee"),
  r: hex("#e6b43c"),
  p: hex("#3b4466"),
  P: hex("#2b3150"),
  o: hex("#6b4129"),
};

type PlayerPose = { body: string[]; legs: string[][] };

const PLAYER_SIDE_BODY = [
  "......kkkk......",
  ".....kbbbbk.....",
  "....kbbbbbbk....",
  "....kBBBBBBBk...",
  "....khhssssk....",
  "....khssseskk...",
  "....khsssssk....",
  ".....kssssk.....",
  "....kjrjjjjk....",
  "...kjjrjjgggk...",
  "...kjjjrccccck..",
  "...kjjjcccclck..",
  "...kjjssccccck..",
  "...kJjjjrjjjk...",
  "...kJjjjjrjjk...",
  "....kJJJJJJk....",
];

/** Standing, then the stride, passing and opposite-stride poses. */
const PLAYER_SIDE_LEGS = [
  [
    "....kppkppk.....",
    "....kppkppk.....",
    "....kppkppk.....",
    "....kppkppk.....",
    "....kppkppk.....",
    "...koookoook....",
    "...koookoook....",
    "...kkkkkkkkk....",
  ],
  [
    "....kPPkppk.....",
    "...kPPk.kppk....",
    "...kPPk..kppk...",
    "..kPPk...kppk...",
    "..kPPk....kppk..",
    ".kook.....koook.",
    ".kook.....koook.",
    ".kkkk.....kkkkk.",
  ],
  [
    "....kPPkppk.....",
    "....kPPkppk.....",
    "....kPPkppk.....",
    "....kPPkook.....",
    "....kPPkook.....",
    "...koook.kk.....",
    "...koook........",
    "...kkkkk........",
  ],
  [
    "....kppkPPk.....",
    "...kppk.kPPk....",
    "...kppk..kPPk...",
    "..kppk...kPPk...",
    "..kppk....kPPk..",
    ".kook.....koook.",
    ".kook.....koook.",
    ".kkkk.....kkkkk.",
  ],
];

const PLAYER_FRONT_BODY = [
  "......kkkk......",
  ".....kbbbbk.....",
  "....kbbbbbbk....",
  "...kBBBBBBBBk...",
  "....khsssshk....",
  "....ksessesk....",
  "....kssssssk....",
  ".....kssssk.....",
  "....kjrjjrjk....",
  "...kjjrjjrjjk...",
  "..kjjjcggcjjjk..",
  "..kjjjcllcjjjk..",
  "..ksjjccccjjsk..",
  "...kJjjjjjjJk...",
  "...kJjjjjjjJk...",
  "....kJJJJJJk....",
];

const PLAYER_BACK_BODY = [
  "......kkkk......",
  ".....kbbbbk.....",
  "....kbbbbbbk....",
  "....kBBBBBBk....",
  "....khhhhhhk....",
  "....khhhhhhk....",
  "....khhhhhhk....",
  ".....kssssk.....",
  "....kjjjjrjk....",
  "...kjjjjrjjjk...",
  "..kjjjjrjjjjjk..",
  "..kjjjrjjjjjjk..",
  "..ksjjjjjjjjsk..",
  "...kJjjjjjjJk...",
  "...kJjjjjjjJk...",
  "....kJJJJJJk....",
];

const PLAYER_FACING_LEGS_STANDING = [
  "....kppkkppk....",
  "....kppkkppk....",
  "....kppkkppk....",
  "....kppkkppk....",
  "....kppkkppk....",
  "...koookkoook...",
  "...koookkoook...",
  "...kkkkkkkkkk...",
];

const PLAYER_FACING_LEGS_STRIDE = [
  "....kppkkppk....",
  "....kppkkppk....",
  "....kppkkppk....",
  "...koookkppk....",
  "...koookkppk....",
  "...kkkkkkoook...",
  "........koook...",
  "........kkkkk...",
];

function mirror(rows: string[]): string[] {
  return rows.map((row) => [...row].reverse().join(""));
}

/** Legs seen from the front or back: one foot lifts, they pass, then the other lifts. */
const PLAYER_FACING_LEGS = [
  PLAYER_FACING_LEGS_STANDING,
  PLAYER_FACING_LEGS_STRIDE,
  PLAYER_FACING_LEGS_STANDING,
  mirror(PLAYER_FACING_LEGS_STRIDE),
];

const PLAYER_POSES: Record<Direction, PlayerPose> = {
  down: { body: PLAYER_FRONT_BODY, legs: PLAYER_FACING_LEGS },
  up: { body: PLAYER_BACK_BODY, legs: PLAYER_FACING_LEGS },
  left: { body: mirror(PLAYER_SIDE_BODY), legs: PLAYER_SIDE_LEGS.map(mirror) },
  right: { body: PLAYER_SIDE_BODY, legs: PLAYER_SIDE_LEGS },
};

/** Leg pose per frame of one direction: frame 0 stands idle, the rest form the walk cycle. */
const PLAYER_LEG_SEQUENCE = [0, 1, 2, 3, 2];
const PLAYER_PASSING_LEGS = 2;

const PLAYER_DIRECTIONS: Direction[] = ["down", "up", "left", "right"];

export const PLAYER_FRAME_COUNT = PLAYER_DIRECTIONS.length * PLAYER_LEG_SEQUENCE.length;

export function playerAnim(facing: Direction, walking: boolean): string {
  return `${walking ? "walk" : "idle"}-${facing}`;
}

export const PLAYER_ANIMS = Object.fromEntries(
  PLAYER_DIRECTIONS.flatMap((direction, index) => {
    const first = index * PLAYER_LEG_SEQUENCE.length;
    const last = first + PLAYER_LEG_SEQUENCE.length - 1;
    return [
      [playerAnim(direction, false), first],
      [playerAnim(direction, true), { from: first + 1, to: last, loop: true, speed: 10 }],
    ];
  }),
);

export function paintPlayerSheet(): HTMLCanvasElement {
  const pixels = new Pixels(PLAYER_FRAME_WIDTH * PLAYER_FRAME_COUNT, PLAYER_FRAME_HEIGHT);
  const frames = PLAYER_DIRECTIONS.flatMap((direction) => PLAYER_LEG_SEQUENCE.map((legs) => ({ pose: PLAYER_POSES[direction], legs })));
  frames.forEach(({ pose, legs }, frame) => {
    const bob = legs === PLAYER_PASSING_LEGS ? 1 : 0;
    const rows = [...pose.body.map((row, y) => ({ row, y: y + bob })), ...pose.legs[legs].map((row, y) => ({ row, y: y + pose.body.length }))];
    for (const { row, y } of rows) {
      [...row].forEach((char, x) => {
        const color = PLAYER_COLORS[char];
        if (color) pixels.dot(frame * PLAYER_FRAME_WIDTH + x, y, color);
      });
    }
  });
  return pixels.canvas;
}

export const CAT_FRAME_WIDTH = 16;
export const CAT_FRAME_HEIGHT = 12;

/** `o` marks the patches: Manouche's are orange, Berlioz is black all over. */
export const CAT_COATS: Record<CatName, Record<string, Rgb>> = {
  Berlioz: { k: INK, f: hex("#34343f"), F: hex("#25252e"), o: hex("#34343f"), e: hex("#e8d44a"), n: hex("#8a5a66") },
  Manouche: { k: INK, f: hex("#9a9ca6"), F: hex("#74767f"), o: hex("#e08a3c"), e: hex("#8fcf5a"), n: hex("#e89aa8") },
};

const CAT_SIDE_BODY = [
  "...........k..k.",
  "..........kfkkfk",
  ".kk.......kffffk",
  "kfk.......kffefk",
  "kfk.......kfffnk",
  ".kfkkkkkkkkffffk",
  "..kffooffffffkk.",
  "..kfoooffffffk..",
  "..kFFfffffffFk..",
];

const CAT_FRONT_BODY = [
  "....k......k....",
  "...kfk....kfk...",
  "...kffkkkkffk...",
  "...kffffffffk...",
  "...kfeffffefk...",
  "...kfffnnfffk...",
  "....kffffffk.kk.",
  "...kfffoofffkfk.",
  "...kFfoooffFkk..",
];

const CAT_BACK_BODY = CAT_FRONT_BODY.map((row) => row.replace(/[en]/g, "f"));

const CAT_SITTING_LEGS = ["...kffffffffkfk.", "...kfkffffkfkk..", "...kkkkkkkkkk..."];

const CAT_SIDE_SITTING = [
  "................",
  "..........k..k..",
  ".........kfkkfk.",
  ".........kffffk.",
  ".........kffefk.",
  ".........kfffnk.",
  "......kkkkffffk.",
  ".....kfoofffffk.",
  "....kfoooffffk..",
  "....kffffffffk..",
  "kkk.kFfffffkfk..",
  "kffkkkkkkkkkkk..",
];

/** A curled-up Cat fills only the bottom rows of its frame. */
export const CAT_SLEEPING_HEIGHT = 6;

const CAT_SLEEPING = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "....kkkkkk......",
  "..kkffooffkk.k.k",
  ".kffoooffffkfkfk",
  "kfffffffffkffffk",
  "kFFffffffkfkkffk",
  ".kkkkkkkkkkkkkk.",
];

type CatLeg = { x: number; lifted?: boolean };

/** The three rows under a standing Cat's body: each leg a column of shaded fur outlined in ink, a lifted one shorter. */
function catLegRows(legs: CatLeg[]): string[] {
  const rows = Array.from({ length: 3 }, () => [..."................"]);
  for (const { x, lifted } of legs) {
    const foot = lifted ? 1 : 2;
    for (let y = 0; y < foot; y++) {
      rows[y][x - 1] = "k";
      rows[y][x + 1] = "k";
    }
    for (let dx = -1; dx <= 1; dx++) rows[foot][x + dx] = "k";
  }
  for (const { x, lifted } of legs) for (let y = 0; y < (lifted ? 1 : 2); y++) rows[y][x] = "F";
  return rows.map((row) => row.join(""));
}

/** Standing, then the two strides of the walk. */
const CAT_SIDE_LEGS = [
  catLegRows([{ x: 4 }, { x: 6 }, { x: 10 }, { x: 12 }]),
  catLegRows([{ x: 3 }, { x: 7 }, { x: 9 }, { x: 13 }]),
  catLegRows([{ x: 5 }, { x: 6 }, { x: 10 }, { x: 11 }]),
];

const CAT_FACING_LEGS = [
  catLegRows([{ x: 5 }, { x: 10 }]),
  catLegRows([{ x: 5, lifted: true }, { x: 10 }]),
  catLegRows([{ x: 5 }, { x: 10, lifted: true }]),
];

const CAT_DIRECTIONS: Direction[] = ["down", "up", "left", "right"];

/** Per direction: standing, the two strides, then sitting. */
function catFrames(direction: Direction): string[][] {
  const side = direction === "left" || direction === "right";
  const body = side ? CAT_SIDE_BODY : direction === "down" ? CAT_FRONT_BODY : CAT_BACK_BODY;
  const legs = side ? CAT_SIDE_LEGS : CAT_FACING_LEGS;
  const frames = [...legs.map((rows) => [...body, ...rows]), side ? CAT_SIDE_SITTING : [...body, ...CAT_SITTING_LEGS]];
  return direction === "left" ? frames.map(mirror) : frames;
}

const CAT_FRAMES_PER_DIRECTION = 4;
const CAT_SLEEP_FRAME = CAT_DIRECTIONS.length * CAT_FRAMES_PER_DIRECTION;

export const CAT_FRAME_COUNT = CAT_SLEEP_FRAME + 1;

export function catAnim(pose: CatAnimPose, facing: Direction): string {
  return pose === "sleep" ? "sleep" : `${pose}-${facing}`;
}

export const CAT_ANIMS = Object.fromEntries([
  ...CAT_DIRECTIONS.flatMap((direction, index) => {
    const first = index * CAT_FRAMES_PER_DIRECTION;
    return [
      [catAnim("stand", direction), first],
      [catAnim("walk", direction), { frames: [first + 1, first, first + 2, first], loop: true, speed: 8 }],
      [catAnim("sit", direction), first + 3],
    ];
  }),
  [catAnim("sleep", "down"), CAT_SLEEP_FRAME],
]);

export function paintCatSheet(name: CatName): HTMLCanvasElement {
  const colors = CAT_COATS[name];
  const pixels = new Pixels(CAT_FRAME_WIDTH * CAT_FRAME_COUNT, CAT_FRAME_HEIGHT);
  const frames = [...CAT_DIRECTIONS.flatMap(catFrames), CAT_SLEEPING];
  frames.forEach((rows, frame) => paintRows(pixels, { rows, colors }, frame * CAT_FRAME_WIDTH, 0));
  return pixels.canvas;
}

export function paintHeart(): HTMLCanvasElement {
  const rows = [".kk.kk.", "krrkrrk", "krrrrrk", ".krrrk.", "..krk..", "...k..."];
  const pixels = new Pixels(7, rows.length);
  paintRows(pixels, { rows, colors: { k: INK, r: hex("#e04a5a") } }, 0, 0);
  return pixels.canvas;
}

export function paintFilmRoll(): HTMLCanvasElement {
  const rows = [".ggg..", "kkkkk.", "krrrkk", "krkrk.", "krrrk.", "kkkkk.", ".ggg.."];
  const pixels = new Pixels(6, rows.length);
  paintRows(pixels, { rows, colors: { g: hex("#c4c8d0"), k: INK, r: hex("#e6b43c") } }, 0, 0);
  return pixels.canvas;
}

/** Frames of Kenney's Tiny Town packed tilemap. */
const TINY_TOWN_COLUMNS = 12;
const TINY_TOWN = {
  grass: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2],
  path: 25,
  trees: [16, 4, 28],
  forest: 19,
  bush: 5,
  fenceAcross: 81,
  fenceDown: 59,
  roofTop: [52, 53, 54],
  roof: [64, 65, 66],
  slateRoofTop: [48, 49, 50],
  slateRoof: [60, 61, 62],
  wall: 84,
  stoneWall: 77,
  stoneWindow: 88,
  stoneDoor: 89,
  stoneArch: 78,
  plainWall: 73,
  door: 85,
  sign: 83,
  well: 104,
  wheelbarrow: 57,
  archeryTarget: 95,
  barrel: 130,
} as const;

const WATER: Rgb = hex("#3d7fc4");
const WATER_DEEP: Rgb = hex("#2f67a8");
const WATER_GLINT: Rgb = hex("#9fd3f2");
const SHORE: Rgb = hex("#d9c48c");

function tileSeed({ col, row }: Tile): number {
  return hash(row * MAP_COLUMNS + col);
}

function variantForTile<T>(choices: readonly T[], tile: Tile): T {
  return choices[Math.floor(tileSeed(tile) * choices.length)];
}

/** Left, middle or right piece of a row of joined tiles, such as a roof. */
function rowPieceFrame(tile: Tile, char: string, pieces: readonly [number, number, number]): number {
  if (mapCharAt({ ...tile, col: tile.col - 1 }) !== char) return pieces[0];
  if (mapCharAt({ ...tile, col: tile.col + 1 }) !== char) return pieces[2];
  return pieces[1];
}

function paintWater(pixels: Pixels, tile: Tile, x: number, y: number) {
  const size = OVERWORLD_TILE_SIZE;
  pixels.rect(x, y, size, size, WATER);
  if (mapCharAt({ ...tile, row: tile.row - 1 }) !== "~") {
    pixels.rect(x, y, size, 2, SHORE);
    pixels.rect(x, y + 2, size, 2, WATER_DEEP);
  }
  const seed = tileSeed(tile);
  pixels.rect(x + 2 + Math.floor(seed * 9), y + 6 + Math.floor(hash(seed * 1e6) * 7), 4, 1, WATER_GLINT);
}

function buildingFrame(tile: Tile, style: BuildingStyle): number {
  if (mapCharAt({ ...tile, row: tile.row + 1 }) === "B") {
    return rowPieceFrame(tile, "B", mapCharAt({ ...tile, row: tile.row - 1 }) === "B" ? style.roof : style.roofTop);
  }
  let left = tile.col;
  while (mapCharAt({ ...tile, col: left - 1 }) === "B") left--;
  let right = tile.col;
  while (mapCharAt({ ...tile, col: right + 1 }) === "B") right++;
  return tile.col === Math.floor((left + right) / 2) ? style.door : style.wall;
}

function treeFrame(tile: Tile): number {
  const surrounded = [-1, 1].every(
    (offset) => mapCharAt({ ...tile, col: tile.col + offset }) === "T" && mapCharAt({ ...tile, row: tile.row + offset }) === "T",
  );
  return surrounded ? TINY_TOWN.forest : variantForTile(TINY_TOWN.trees, tile);
}

function fenceFrame(tile: Tile): number {
  const across = [-1, 1].some((offset) => mapCharAt({ ...tile, col: tile.col + offset }) === "#");
  return across ? TINY_TOWN.fenceAcross : TINY_TOWN.fenceDown;
}

/** The object drawn over the ground on a tile, if any. */
function objectFrame(tile: Tile, kind: TileKind, buildingStyle: BuildingStyle): number | undefined {
  switch (kind) {
    case "tree":
      return treeFrame(tile);
    case "bush":
      return TINY_TOWN.bush;
    case "fence":
      return fenceFrame(tile);
    case "building":
      return buildingFrame(tile, buildingStyle);
    case "well":
      return TINY_TOWN.well;
    default:
      return undefined;
  }
}

/** Pixel rows centred across a tile, the last row `bottom` pixels below its top edge (by default its bottom edge). */
type Prop = { rows: readonly string[]; colors: Record<string, Rgb>; bottom?: number };

/** One layer of a themed object: painted pixel rows, or a Tiny Town or Tiny Dungeon frame. */
type PropLayer = Prop | { town: number } | { dungeon: number };

/** Frames of Kenney's Tiny Dungeon packed tilemap. */
const TINY_DUNGEON_COLUMNS = 12;
const TINY_DUNGEON = { table: 72, anvil: 74, chest: 89 } as const;

const SCENERY_COLORS: Record<string, Rgb> = {
  k: INK,
  g: hex("#c4c8d0"),
  s: hex("#8a8f9c"),
  d: hex("#3a3a48"),
  o: hex("#e6873c"),
  r: hex("#d04a3a"),
  y: hex("#e6c84a"),
  w: hex("#f4f4f0"),
  b: hex("#3f6fc4"),
  c: hex("#7fd8e6"),
  N: hex("#5a3825"),
  p: hex("#7a4ab0"),
  m: hex("#d05ab0"),
  G: hex("#4ab05a"),
};

function paintedRows(bottom: number, rows: string[]): Prop {
  return { rows, colors: SCENERY_COLORS, bottom };
}

const CAMERA_STAND: Prop = {
  rows: [
    "................",
    "......kkkk......",
    ".....kggggk.....",
    "..kkkkkkkkkkkk..",
    "..kccccccccrck..",
    "..kcccckkkkcck..",
    "..kccckllwkcck..",
    "..kccckllllcck..",
    "..kcccckkkkcck..",
    "..kkkkkkkkkkkk..",
    ".......kk.......",
    "......kook......",
    ".....kokkok.....",
    "....kok..kok....",
    "...kok....kok...",
    "...kk......kk...",
  ],
  colors: { k: INK, g: hex("#c4c8d0"), c: hex("#2b2b33"), r: hex("#d23c3c"), l: hex("#3c8c84"), w: hex("#8fd2ee"), o: hex("#8a5a3a") },
};

const DARKROOM_DOOR: Prop = {
  rows: [
    "......kkkk......",
    ".....krrrrk.....",
    "......kkkk......",
    "..kkkkkkkkkkkk..",
    "..kwwwwwwwwwwk..",
    "..kwkkkkkkkkwk..",
    "..kwkddddddkwk..",
    "..kwkddddddkwk..",
    "..kwkddddddkwk..",
    "..kwkddddydkwk..",
    "..kwkddddddkwk..",
    "..kwkddddddkwk..",
    "..kwkddddddkwk..",
    "..kwkddddddkwk..",
    "..kwkddddddkwk..",
    "..kkkkkkkkkkkk..",
  ],
  colors: { k: INK, r: hex("#d23c3c"), w: hex("#8a5a3a"), d: hex("#2b2b33"), y: hex("#e6b43c") },
};

const WELCOME_BOARD: Prop = {
  rows: [
      ".kkkkkkkkkkkkkk.",
      ".kwwwwwwwwwwwwk.",
      ".kwwkwkwkkkwkwk.",
      ".kwwkwkwwkwwkwk.",
      ".kwwkkkwwkwwkwk.",
      ".kwwkwkwwkwwwwk.",
      ".kwwkwkwkkkwkwk.",
      ".kwwwwwwwwwwwwk.",
      ".kkkkkkkkkkkkkk.",
      "..kpk......kpk..",
      "..kpk......kpk..",
      "..kpk......kpk..",
      "..kpk......kpk..",
  ],
  colors: { k: INK, w: hex("#fbf8f0"), p: hex("#8a5a3a") },
};

const KANGAROO_SIGN: Prop = {
  rows: [
      ".......k........",
      "......kyk.......",
      ".....kyyyk......",
      "....kyyyykk.....",
      "...kyyyykkyk....",
      "..kyyyyykyyyk...",
      ".kyyyykkkkyyyk..",
      "kyyyykkkkyyyyyk.",
      ".kykkkkkkyyyyk..",
      "..kyyyykkkyyk...",
      "...kyyyykkkk....",
      "....kyyyyyk.....",
      ".....kyyyk......",
      "......kyk.......",
      ".......k........",
      ".......p........",
  ],
  colors: { k: INK, y: hex("#e6b43c"), p: hex("#6b4129") },
};

const MAILBOX: Prop = {
  rows: [
      "....kkkkkkkk....",
      "...kyyyyyyyyk...",
      "...kyyyyyyyyk...",
      "...kykkkkkkyk...",
      "...kyyyyyyyyk...",
      "...kyyyyyyyyk...",
      "...kyyyyyyyyk...",
      "...kYYYYYYYYk...",
      "....kkkkkkkk....",
      "......kppk......",
      "......kppk......",
      "......kppk......",
      "......kppk......",
      ".....kkkkkk.....",
  ],
  colors: { k: INK, y: hex("#f2c230"), Y: hex("#c89a1e"), p: hex("#6b6f7a") },
};

const LIFE_RING: Prop = paintedRows(16, [
  "..kkkkkk..",
  ".krrwwrrk.",
  "krrkkkkrrk",
  "kwk....kwk",
  "kwk....kwk",
  "kwk....kwk",
  "kwk....kwk",
  "krrkkkkrrk",
  ".krrwwrrk.",
  "..kkkkkk..",
  "....kk....",
  "....kk....",
  "....kk....",
  "...kkkk...",
]);

const SKIS: Prop = paintedRows(16, [
  ".kk...kk.",
  "kyyk.kyyk",
  "kyyk.kyyk",
  "kryk.kryk",
  "kyyk.kyyk",
  "kyyk.kyyk",
  "kssk.kssk",
  "kyyk.kyyk",
  "kyyk.kyyk",
  "kyyk.kyyk",
  "kyyk.kyyk",
  "kyyk.kyyk",
  "kyyk.kyyk",
  "kyyk.kyyk",
  "kwwwwwwwk",
  ".kkkkkkk.",
]);

const PROPS = {
  "camera stand": CAMERA_STAND,
  "welcome board": WELCOME_BOARD,
  "kangaroo sign": KANGAROO_SIGN,
  mailbox: MAILBOX,
  workbench: [{ dungeon: TINY_DUNGEON.table }],
  computer: [
    { dungeon: TINY_DUNGEON.table },
    paintedRows(8, ["kkkkkkkkkk", "kbbbbbbbbk", "kbcbbbbbbk", "kbbbbGGbbk", "kbbbGGGGbk", "kkkkkkkkkk", "....kk....", "..kkkkkk.."]),
  ],
  anvil: [{ dungeon: TINY_DUNGEON.anvil }],
  "kit chest": [{ dungeon: TINY_DUNGEON.chest }],
  barrel: [{ town: TINY_TOWN.barrel }],
  wheelbarrow: [{ town: TINY_TOWN.wheelbarrow }],
  "archery target": [{ town: TINY_TOWN.archeryTarget }],
  "3D printer": [
    paintedRows(15, [
      "kkkkkkkkkkkk",
      "ksggggggggsk",
      "ksdddkkdddsk",
      "ksdddkkdddsk",
      "ksdddoodddsk",
      "ksddddddddsk",
      "ksddooooddsk",
      "ksddooooddsk",
      "kssssssssssk",
      "kkkkkkkkkkkk",
      "kggggggggggk",
      "kgcggggggggk",
      "kkkkkkkkkkkk",
      ".k........k.",
    ]),
  ],
  jukebox: [
    paintedRows(16, [
      "...kkkkkk...",
      "..kyyyyyyk..",
      ".kyrrrrrryk.",
      "kyrkkkkkkryk",
      "kyrkwwwwkryk",
      "kyrkwkkwkryk",
      "kyrkwwwwkryk",
      "kyrkkkkkkryk",
      "kyrrrrrrrryk",
      "kyrpmpmpmryk",
      "kyrrrrrrrryk",
      "kyrNNNNNNryk",
      "kyrNkNkNkryk",
      "kyrNNNNNNryk",
      "kyyyyyyyyyyk",
      "kkkkkkkkkkkk",
    ]),
  ],
  speaker: [
    paintedRows(16, [
      "kkkkkkkkkk",
      "kddddddddk",
      "kdddssdddk",
      "kddsddsddk",
      "kdddssdddk",
      "kddddddddk",
      "kddssssddk",
      "kdssddssdk",
      "kdsdkkdsdk",
      "kdssddssdk",
      "kddssssddk",
      "kddddddddk",
      "kkkkkkkkkk",
    ]),
  ],
  "arcade cabinet": [
    paintedRows(16, [
      ".kkkkkkkkkk.",
      ".kmmmmmmmmk.",
      ".kkkkkkkkkk.",
      ".kbbbbbbbbk.",
      ".kbccbbbbbk.",
      ".kbbbbGbbbk.",
      ".kbbbGGGbbk.",
      ".kkkkkkkkkk.",
      "kppppppppppk",
      "kpkppppyprpk",
      "kkkkkkkkkkkk",
      ".kppppppppk.",
      ".kpppyypppk.",
      ".kppppppppk.",
      ".kppppppppk.",
      ".kkkkkkkkkk.",
    ]),
  ],
} satisfies Record<string, Prop | readonly PropLayer[]>;

type PropName = keyof typeof PROPS;

/** A rectangle of map pixels. */
type Area = { x: number; y: number; width: number; height: number };

/** The Tiny Town frames a building's roof and front wall are made of. */
type BuildingStyle = {
  roofTop: readonly [number, number, number];
  roof: readonly [number, number, number];
  wall: number;
  door: number;
};

const RED_ROOF = { roofTop: TINY_TOWN.roofTop, roof: TINY_TOWN.roof } as const;
const SLATE_ROOF = { roofTop: TINY_TOWN.slateRoofTop, roof: TINY_TOWN.slateRoof } as const;
const COTTAGE: BuildingStyle = { ...RED_ROOF, wall: TINY_TOWN.wall, door: TINY_TOWN.door };

/** A board over a building's door, its name in small capitals. */
type Sign = { text: string; board: Rgb; letters: Rgb };

/**
 * A Point of Interest drawn over its whole footprint: its building tiles (`B`) in a Tiny Town style, with a sign or a
 * door over the middle of the front wall, and its landmark tiles (`X`) painted whole.
 */
type Station = { building?: BuildingStyle; sign?: Sign; door?: Prop; landmark?: (pixels: Pixels, area: Area) => void };

const STATIONS = {
  "university hall": {
    building: { ...SLATE_ROOF, wall: TINY_TOWN.stoneWindow, door: TINY_TOWN.stoneArch },
    sign: { text: "TUM", board: hex("#3070b3"), letters: hex("#f4f1e8") },
  },
  "research center": { landmark: paintResearchCenter },
  "factory shed": {
    building: { ...SLATE_ROOF, wall: TINY_TOWN.stoneWall, door: TINY_TOWN.stoneArch },
    sign: { text: "FORWARD", board: hex("#2b2b33"), letters: hex("#e6873c") },
  },
  "office block": {
    building: { ...RED_ROOF, wall: TINY_TOWN.stoneWindow, door: TINY_TOWN.stoneDoor },
    sign: { text: "ARRK", board: hex("#f4f1e8"), letters: hex("#d04a3a") },
  },
  "engine works": {
    building: { ...SLATE_ROOF, wall: TINY_TOWN.stoneWall, door: TINY_TOWN.stoneArch },
    sign: { text: "MTU", board: hex("#1d3c78"), letters: hex("#f4f1e8") },
    landmark: paintTurbofan,
  },
  "darkroom hut": { building: { ...COTTAGE, door: TINY_TOWN.plainWall }, door: DARKROOM_DOOR },
  "tennis court": { landmark: paintTennisCourt },
  "swimming pool": { landmark: paintSwimmingPool },
  "summit cross": { landmark: paintSummitCross },
} satisfies Record<string, Station>;

type StationName = keyof typeof STATIONS;

export type ThemedObject = PropName | StationName;

/** Points of Interest drawn as a themed object; the rest stand as a signpost. */
export const THEMED_PROPS: Readonly<Record<string, ThemedObject>> = {
  jordan: "camera stand",
  norway: "camera stand",
  "new-york": "camera stand",
  nepal: "camera stand",
  lisbon: "camera stand",
  "eastern-adriatic": "camera stand",
  peru: "camera stand",
  darkroom: "darkroom hut",
  intro: "welcome board",
  tum: "university hall",
  "bmw-group": "research center",
  "canberra-detour": "kangaroo sign",
  "forward-engineering": "factory shed",
  "arrk-engineering": "office block",
  mtu: "engine works",
  "contact-board": "mailbox",
  framewise: "computer",
  "lens-caps": "3D printer",
  reelmaker: "workbench",
  "preset-fitting": "computer",
  "swimming-pool": "swimming pool",
  "tennis-court": "tennis court",
  "ski-touring-slope": "summit cross",
  "track-back": "jukebox",
};

/** Props that are scenery rather than Points of Interest, one on each prop tile (`p`) of the map. */
export const SCENERY_PROPS: readonly { at: Tile; prop: PropName }[] = [
  { at: { col: 14, row: 20 }, prop: "workbench" },
  { at: { col: 15, row: 20 }, prop: "anvil" },
  { at: { col: 19, row: 26 }, prop: "wheelbarrow" },
  { at: { col: 9, row: 28 }, prop: "barrel" },
  { at: { col: 3, row: 44 }, prop: "archery target" },
  { at: { col: 5, row: 44 }, prop: "archery target" },
  { at: { col: 7, row: 44 }, prop: "kit chest" },
  { at: { col: 35, row: 34 }, prop: "speaker" },
  { at: { col: 37, row: 34 }, prop: "speaker" },
  { at: { col: 52, row: 37 }, prop: "arcade cabinet" },
  { at: { col: 53, row: 37 }, prop: "arcade cabinet" },
  { at: { col: 54, row: 37 }, prop: "arcade cabinet" },
  { at: { col: 49, row: 41 }, prop: "speaker" },
];

export function themedProp(poiId: string): ThemedObject | undefined {
  return THEMED_PROPS[poiId];
}

function isStation(name: ThemedObject): name is StationName {
  return name in STATIONS;
}

/** Draws pixel rows with their top-left corner at a map pixel. */
function paintRows(pixels: Pixels, { rows, colors }: Prop, x: number, y: number) {
  rows.forEach((row, dy) => [...row].forEach((char, dx) => colors[char] && pixels.dot(x + dx, y + dy, colors[char])));
}

/** Draws a prop standing on a tile: bottom-aligned, so a prop taller than a tile rises into the tile above. */
function paintProp(pixels: Pixels, prop: Prop, tile: Tile) {
  const [tileX, tileY] = tileToPixels(tile);
  const x = tileX + Math.floor((OVERWORLD_TILE_SIZE - prop.rows[0].length) / 2);
  paintRows(pixels, prop, x, tileY + (prop.bottom ?? OVERWORLD_TILE_SIZE) - prop.rows.length);
}

export type TileSheets = { town: CanvasImageSource; dungeon: CanvasImageSource };

function paintThemedObject(pixels: Pixels, sheets: TileSheets, prop: PropName, tile: Tile) {
  const art: Prop | readonly PropLayer[] = PROPS[prop];
  const layers: readonly PropLayer[] = Array.isArray(art) ? art : [art];
  const [x, y] = tileToPixels(tile);
  for (const layer of layers) {
    if ("town" in layer) pixels.tile(sheets.town, TINY_TOWN_COLUMNS, layer.town, x, y);
    else if ("dungeon" in layer) pixels.tile(sheets.dungeon, TINY_DUNGEON_COLUMNS, layer.dungeon, x, y);
    else paintProp(pixels, layer, tile);
  }
}

const MAYPOLE_HEIGHT = 32;
const MAYPOLE_STRIPE_ROWS = 2;
const MAYPOLE_CROWN = ["......kkkk......", ".....kggggk.....", "....kggggggk....", ".....kggggk.....", "......kkkk......"];
const MAYPOLE_BASE = ["......kkkk......", ".....kssssk.....", ".....kkkkkk....."];
/** Crossbars and the guild boards hanging from them, by row; the striped pole runs through the middle. */
const MAYPOLE_BARS: Record<number, string> = {
  10: "..kkkkkkkkkkkk..",
  11: "..r..r....r..r..",
  12: "..r..r....r..r..",
  18: "kkkkkkkkkkkkkkkk",
  19: ".b..b......b..b.",
  20: ".b..b......b..b.",
};

/** Munich's blue-and-white maypole, two tiles tall, with a green crown and guild boards on its crossbars. */
function maypole(): Prop {
  const poleRows = MAYPOLE_HEIGHT - MAYPOLE_CROWN.length - MAYPOLE_BASE.length;
  const pole = Array.from({ length: poleRows }, (_, index) => {
    const row = MAYPOLE_CROWN.length + index;
    const stripe = Math.floor(row / MAYPOLE_STRIPE_ROWS) % 2 === 0 ? "bw" : "wb";
    const bar = MAYPOLE_BARS[row] ?? "................";
    return `${bar.slice(0, 6)}k${stripe}k${bar.slice(10)}`;
  });
  return {
    rows: [...MAYPOLE_CROWN, ...pole, ...MAYPOLE_BASE],
    colors: { k: INK, g: hex("#3f8f3a"), b: hex("#2f7fd0"), w: hex("#f4f1e8"), r: hex("#d8613a"), s: hex("#b8b8b0") },
  };
}

const MAYPOLE = maypole();

/** Letters for the signs over station doors, 5 pixels tall. */
const SIGN_LETTERS: Record<string, readonly string[]> = {
  A: [".#.", "#.#", "###", "#.#", "#.#"],
  D: ["##.", "#.#", "#.#", "#.#", "##."],
  F: ["###", "#..", "##.", "#..", "#.."],
  K: ["#.#", "#.#", "##.", "#.#", "#.#"],
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#"],
  O: ["###", "#.#", "#.#", "#.#", "###"],
  R: ["##.", "#.#", "##.", "#.#", "#.#"],
  T: ["###", ".#.", ".#.", ".#.", ".#."],
  U: ["#.#", "#.#", "#.#", "#.#", "###"],
  W: ["#...#", "#...#", "#.#.#", "##.##", "#...#"],
};

/** An outlined board centred on `centreX`, its bottom edge on `bottom`, the text in small capitals. */
function paintSign(pixels: Pixels, { text, board, letters }: Sign, centreX: number, bottom: number) {
  const glyphs = [...text].map((char) => SIGN_LETTERS[char]);
  const textWidth = glyphs.reduce((sum, glyph) => sum + glyph[0].length + 1, -1);
  const width = textWidth + 6;
  const height = 9;
  const left = Math.round(centreX - width / 2);
  const top = bottom - height;
  outlined(pixels, left, top, width, height, board);
  let x = left + 3;
  for (const glyph of glyphs) {
    glyph.forEach((row, dy) => [...row].forEach((char, dx) => char === "#" && pixels.dot(x + dx, top + 2 + dy, letters)));
    x += glyph[0].length + 1;
  }
}

function outlined(pixels: Pixels, x: number, y: number, width: number, height: number, fill: Rgb) {
  pixels.rect(x, y, width, height, INK);
  pixels.rect(x + 1, y + 1, width - 2, height - 2, fill);
}

const WHITE = hex("#f4f4f0");
const STEEL = hex("#9aa3b0");
const DARK_GLASS = hex("#3a4a66");
const SLAT = hex("#e4e7ec");
const PAVING = hex("#cfcac0");
const PAVING_SEAM = hex("#b9b3a7");
const PYRAMID_GLASS = hex("#a9c8e6");

/** A block of dark glass behind white vertical slats, with steel louvre bands across it, like the FIZ's facade. */
function slattedBlock(pixels: Pixels, x: number, y: number, width: number, height: number) {
  outlined(pixels, x, y, width, height, DARK_GLASS);
  for (let dx = 2; dx < width - 1; dx += 3) pixels.rect(x + dx, y + 1, 1, height - 2, SLAT);
  for (let dy = 7; dy < height - 3; dy += 9) pixels.rect(x + 1, y + dy, width - 2, 2, STEEL);
  pixels.rect(x + 1, y + 1, width - 2, 1, SLAT);
}

/** BMW's Research and Innovation Center: two slatted towers, wings stepping forward, a glass pyramid hall and flags. */
function paintResearchCenter(pixels: Pixels, { x, y, width, height }: Area) {
  const centre = x + width / 2;
  const hallBottom = y + height - 12;
  pixels.rect(x, hallBottom, width, 12, PAVING);
  for (let dx = 4; dx < width; dx += 8) pixels.rect(x + dx, hallBottom, 1, 12, PAVING_SEAM);
  slattedBlock(pixels, x + 26, y + 1, 40, hallBottom - y - 1);
  slattedBlock(pixels, x + width - 66, y + 1, 40, hallBottom - y - 1);
  slattedBlock(pixels, centre - 10, y + 8, 20, hallBottom - y - 8);
  for (const side of [-1, 1]) {
    const outer = side < 0 ? x : x + width - 18;
    const inner = side < 0 ? x + 14 : x + width - 34;
    slattedBlock(pixels, inner, y + 18, 20, hallBottom - y - 18);
    slattedBlock(pixels, outer, y + 24, 18, hallBottom - y - 24);
  }
  paintGlassPyramid(pixels, centre, y + 34, hallBottom);
  for (const offset of [-24, -12, 0, 12, 24]) {
    const pole = Math.round(centre + offset);
    pixels.rect(pole, y + 26, 1, height - 28, STEEL);
    outlined(pixels, pole + 1, y + 26, 5, 10, WHITE);
  }
}

/** The entrance hall: a glass pyramid with a white lattice, its glass front wall standing on the forecourt. */
function paintGlassPyramid(pixels: Pixels, centre: number, top: number, bottom: number) {
  const [halfTop, halfBase] = [14, 36];
  const rows = bottom - top;
  for (let row = 0; row < rows; row++) {
    const half = Math.round(halfTop + ((halfBase - halfTop) * row) / rows);
    const y = top + row;
    for (let x = Math.round(centre - half); x < centre + half; x++) {
      const lattice = (x - y) % 6 === 0 || (x + y) % 6 === 0;
      pixels.dot(x, y, lattice ? WHITE : PYRAMID_GLASS);
    }
    pixels.dot(Math.round(centre - half), y, INK);
    pixels.dot(Math.round(centre + half) - 1, y, INK);
  }
  pixels.rect(centre - halfTop, top, halfTop * 2, 1, INK);
  outlined(pixels, centre - halfBase, bottom - 1, halfBase * 2, 7, DARK_GLASS);
  for (let dx = 4; dx < halfBase * 2 - 2; dx += 8) pixels.rect(centre - halfBase + dx, bottom, 2, 5, WHITE);
}

const ENGINE_COLORS = {
  nacelle: hex("#c4c8d0"),
  nacelleShade: hex("#8a8f9c"),
  blade: hex("#5a6272"),
  bladeLight: hex("#8a93a8"),
  spinner: hex("#e8eaee"),
  stand: hex("#e6b43c"),
  standShade: hex("#b8862a"),
};

/** A turbofan on a yellow transport stand, seen from the front: nacelle ring, fan blades and spinner. */
function paintTurbofan(pixels: Pixels, { x, y, width, height }: Area) {
  const c = ENGINE_COLORS;
  const centreX = x + width / 2;
  const centreY = y + 20;
  const radius = 18;
  for (const side of [-1, 1]) outlined(pixels, centreX + side * 11 - 2, centreY + 8, 5, height - 30, c.stand);
  outlined(pixels, x + 2, y + height - 8, width - 4, 5, c.stand);
  pixels.rect(x + 3, y + height - 5, width - 6, 1, c.standShade);
  for (const wheel of [x + 5, x + width - 9]) pixels.rect(wheel, y + height - 3, 4, 3, INK);
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const distance = Math.hypot(dx, dy);
      if (distance > radius) continue;
      const blade = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * 20 + distance / 6) % 2 === 0;
      let color: Rgb;
      if (distance > radius - 1) color = INK;
      else if (distance > radius - 4) color = dy < -4 ? c.nacelle : c.nacelleShade;
      else if (distance > radius - 5) color = INK;
      else if (distance > 5) color = blade ? c.blade : c.bladeLight;
      else if (distance > 4) color = INK;
      else color = c.spinner;
      pixels.dot(centreX + dx, centreY + dy, color);
    }
  }
  pixels.dot(centreX - 1, centreY - 1, INK);
}

const CLAY = hex("#c8643c");
const CLAY_DARK = hex("#b4552f");
const FENCE_GREEN = hex("#2f5f3a");

/** A clay tennis court at about 60% of real scale beside the Player, fenced, the net across its middle. */
function paintTennisCourt(pixels: Pixels, { x, y, width, height }: Area) {
  pixels.rect(x, y, width, height, CLAY);
  for (let index = 0; index < 60; index++) {
    pixels.dot(x + Math.floor(hash(index * 7 + 1) * width), y + Math.floor(hash(index * 7 + 2) * height), CLAY_DARK);
  }
  const [left, right, top, bottom] = [x + 14, x + width - 14, y + 10, y + height - 9];
  const centre = Math.round((left + right) / 2);
  const middle = Math.round((top + bottom) / 2);
  const service = Math.round(((right - left) / 2) * (6.4 / 11.885));
  pixels.rect(left, top, right - left, 1, WHITE);
  pixels.rect(left, bottom, right - left + 1, 1, WHITE);
  pixels.rect(left, top, 1, bottom - top, WHITE);
  pixels.rect(right, top, 1, bottom - top, WHITE);
  for (const line of [centre - service, centre + service]) pixels.rect(line, top, 1, bottom - top, WHITE);
  pixels.rect(centre - service, middle, service * 2, 1, WHITE);
  for (const end of [left + 1, right - 2]) pixels.rect(end, middle, 2, 1, WHITE);
  pixels.rect(centre - 1, top - 4, 2, bottom - top + 9, INK);
  pixels.rect(centre, top - 3, 1, bottom - top + 7, WHITE);
  pixels.rect(x, y, width, 3, FENCE_GREEN);
  pixels.rect(x, y + height - 2, width, 2, FENCE_GREEN);
  pixels.rect(x, y, 2, height, FENCE_GREEN);
  pixels.rect(x + width - 2, y, 2, height, FENCE_GREEN);
  for (let dx = 0; dx < width; dx += 16) pixels.rect(x + dx, y, 2, 4, INK);
  pixels.rect(x + width - 2, y, 2, 4, INK);
}

const DECK = hex("#d9d2c3");
const DECK_SEAM = hex("#c7bfae");
const POOL_WATER = hex("#3d9ad8");
const POOL_FLOOR_LINE = hex("#2a6fa8");
const POOL_GLINT = hex("#9fd3f2");
const ROPE_RED = hex("#d04a3a");
const LANES = 4;

/** A 4-lane pool at about 60% of real scale beside the Player, on a tiled deck with starting blocks and a life ring. */
function paintSwimmingPool(pixels: Pixels, { x, y, width, height }: Area) {
  pixels.rect(x, y, width, height, DECK);
  for (let dx = 0; dx < width; dx += 8) pixels.rect(x + dx, y, 1, height, DECK_SEAM);
  for (let dy = 0; dy < height; dy += 8) pixels.rect(x, y + dy, width, 1, DECK_SEAM);
  const [left, top, right, bottom] = [x + 16, y + 18, x + width - 8, y + height - 8];
  const lane = (bottom - top) / LANES;
  pixels.rect(left - 2, top - 2, right - left + 4, bottom - top + 4, WHITE);
  pixels.rect(left - 1, top - 1, right - left + 2, bottom - top + 2, INK);
  pixels.rect(left, top, right - left, bottom - top, POOL_WATER);
  for (let index = 0; index < LANES; index++) {
    const laneMiddle = Math.round(top + lane * (index + 0.5));
    pixels.rect(left + 8, laneMiddle, right - left - 16, 1, POOL_FLOOR_LINE);
    for (const end of [left + 8, right - 9]) pixels.rect(end, laneMiddle - 2, 1, 5, POOL_FLOOR_LINE);
    outlined(pixels, x + 4, laneMiddle - 3, 9, 7, WHITE);
    pixels.rect(x + 6, laneMiddle - 1, 5, 3, POOL_WATER);
    if (index > 0) {
      const rope = Math.round(top + lane * index);
      for (let dx = 0; dx < right - left; dx += 2) pixels.rect(left + dx, rope, 2, 1, (dx / 2) % 4 < 2 ? ROPE_RED : WHITE);
    }
  }
  for (let index = 0; index < 14; index++) {
    pixels.rect(left + 4 + Math.floor(hash(index + 101) * (right - left - 10)), top + 2 + Math.floor(hash(index + 211) * (bottom - top - 4)), 3, 1, POOL_GLINT);
  }
  for (const rail of [right - 12, right - 7]) pixels.rect(rail, bottom - 3, 1, 6, STEEL);
  paintRows(pixels, LIFE_RING, x + width - 16, y + 2);
}

const CROSS_WOOD = hex("#8a5a3a");

/** The summit: a wooden cross with a cairn, and skis stuck upright in the snow beside it. */
function paintSummitCross(pixels: Pixels, { x, y, width }: Area) {
  for (let dx = 0; dx < width; dx += OVERWORLD_TILE_SIZE) {
    const tile = { col: (x + dx) / OVERWORLD_TILE_SIZE, row: y / OVERWORLD_TILE_SIZE };
    paintSnow(pixels, tile, x + dx, y);
  }
  outlined(pixels, x + 6, y - 14, 5, 28, CROSS_WOOD);
  outlined(pixels, x + 1, y - 8, 15, 5, CROSS_WOOD);
  outlined(pixels, x + 3, y + 10, 11, 5, STEEL);
  paintRows(pixels, SKIS, x + 20, y - 2);
}

const SNOW = hex("#eef3f8");
const SNOW_SHADE = hex("#cbd8e8");
/** Snow from the mountain's foot to its heights, brighter the further a tile lies from the mountain's edge. */
const SNOW_BANDS: readonly { from: number; color: Rgb }[] = [
  { from: 0, color: hex("#d3deeb") },
  { from: 3, color: hex("#dfe7f1") },
  { from: 5, color: hex("#e9eff6") },
  { from: 8, color: hex("#f6f9fc") },
];
const MOUNTAIN_KINDS: readonly (TileKind | undefined)[] = ["snow", "rock", "track", "landmark"];

/** Steps from each mountain tile to the nearest tile off the mountain; the map's edge does not count, so it rises off-map. */
function mountainHeights(): Map<string, number> {
  const heights = new Map<string, number>();
  let frontier: Tile[] = [];
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLUMNS; col++) {
      if (!MOUNTAIN_KINDS.includes(tileKindAt({ col, row }))) frontier.push({ col, row });
    }
  }
  for (const tile of frontier) heights.set(tileKey(tile), 0);
  for (let height = 1; frontier.length > 0; height++) {
    frontier = frontier
      .flatMap((tile) => (["up", "down", "left", "right"] as const).map((direction) => tileAhead(tile, direction)))
      .filter((tile) => tileKindAt(tile) !== undefined && !heights.has(tileKey(tile)));
    for (const tile of frontier) heights.set(tileKey(tile), height);
  }
  return heights;
}

let heights: Map<string, number> | undefined;

function snowColor(tile: Tile): Rgb {
  heights ??= mountainHeights();
  const height = heights.get(tileKey(tile)) ?? 0;
  return SNOW_BANDS.filter((band) => height >= band.from).at(-1)!.color;
}
const ROCK = hex("#8a8478");
const ROCK_DARK = hex("#5f5a52");
const ROCK_LIGHT = hex("#b0aa9c");
const SKIN_TRACK = hex("#9fb3c8");
const ASPHALT = hex("#5c5f66");
const ASPHALT_SPECK = hex("#6b6e76");

function paintSnow(pixels: Pixels, tile: Tile, x: number, y: number) {
  const size = OVERWORLD_TILE_SIZE;
  pixels.rect(x, y, size, size, snowColor(tile));
  const seed = tileSeed(tile);
  pixels.rect(x + 1 + Math.floor(seed * 9), y + 3 + Math.floor(hash(seed * 1e6) * 4), 5, 1, SNOW_SHADE);
  pixels.rect(x + 2 + Math.floor(hash(seed * 1e7) * 8), y + 10 + Math.floor(hash(seed * 1e8) * 4), 4, 1, SNOW_SHADE);
  if (tileKindAt({ ...tile, row: tile.row + 1 }) === "rock") pixels.rect(x, y + size - 2, size, 2, SNOW_SHADE);
}

function paintRock(pixels: Pixels, tile: Tile, x: number, y: number) {
  const size = OVERWORLD_TILE_SIZE;
  const seed = tileSeed(tile);
  pixels.rect(x, y, size, size, ROCK);
  pixels.rect(x + 1 + Math.floor(seed * 6), y + 2, 6, 1, ROCK_LIGHT);
  pixels.rect(x + 2 + Math.floor(hash(seed * 1e5) * 8), y + 6 + Math.floor(hash(seed * 1e6) * 6), 1, 5, ROCK_DARK);
  pixels.rect(x + 3 + Math.floor(hash(seed * 1e7) * 6), y + 12, 7, 1, ROCK_DARK);
  const above = tileKindAt({ ...tile, row: tile.row - 1 });
  if (above === "snow" || above === "track") {
    pixels.rect(x, y, size, 3, SNOW);
    pixels.rect(x + 3 + Math.floor(seed * 8), y + 3, 4, 1, SNOW);
  }
}

/** Snow with the two grooves of the skin track running from the tile's middle to each neighbour it joins. */
function paintSkinTrack(pixels: Pixels, tile: Tile, x: number, y: number) {
  paintSnow(pixels, tile, x, y);
  for (const direction of ["up", "down", "left", "right"] as const) {
    const next = tileAhead(tile, direction);
    const kind = tileKindAt(next);
    if (kind !== "track" && kind !== "grass" && kind !== "landmark") continue;
    if (direction === "up") for (const dx of [6, 9]) pixels.rect(x + dx, y, 1, 10, SKIN_TRACK);
    if (direction === "down") for (const dx of [6, 9]) pixels.rect(x + dx, y + 6, 1, 10, SKIN_TRACK);
    if (direction === "left") for (const dy of [6, 9]) pixels.rect(x, y + dy, 10, 1, SKIN_TRACK);
    if (direction === "right") for (const dy of [6, 9]) pixels.rect(x + 6, y + dy, 10, 1, SKIN_TRACK);
  }
}

function paintAsphalt(pixels: Pixels, tile: Tile, x: number, y: number) {
  const size = OVERWORLD_TILE_SIZE;
  pixels.rect(x, y, size, size, ASPHALT);
  const seed = tileSeed(tile);
  for (let index = 0; index < 4; index++) {
    pixels.dot(x + Math.floor(hash(seed * 1e5 + index) * size), y + Math.floor(hash(seed * 1e6 + index) * size), ASPHALT_SPECK);
  }
}

const CAR_COLORS: readonly Rgb[] = [hex("#2f5fb0"), hex("#e6e6e6"), hex("#c03a3a"), hex("#6b6f7a"), hex("#2b2b33")];
const CAR_GLASS = hex("#2b3a55");

/** A car parked nose north in its white-lined bay, drawn whole from the bay's bottom tile over the tile above. */
function paintCar(pixels: Pixels, bottomTile: Tile) {
  const [x, bottomY] = tileToPixels(bottomTile);
  const y = bottomY - OVERWORLD_TILE_SIZE;
  const color = variantForTile(CAR_COLORS, bottomTile);
  pixels.rect(x, y + 1, 1, 30, WHITE);
  pixels.rect(x + 15, y + 1, 1, 30, WHITE);
  for (const wheelY of [y + 7, y + 21]) for (const wheelX of [x + 2, x + 12]) pixels.rect(wheelX, wheelY, 2, 4, INK);
  outlined(pixels, x + 3, y + 3, 10, 26, color);
  pixels.rect(x + 4, y + 10, 8, 3, CAR_GLASS);
  pixels.rect(x + 4, y + 22, 8, 2, CAR_GLASS);
  pixels.dot(x + 5, y + 4, hex("#f2e6a0"));
  pixels.dot(x + 10, y + 4, hex("#f2e6a0"));
}

/** The pixel rectangle covering a set of tiles. */
function areaOf(tiles: readonly Tile[]): Area {
  const cols = tiles.map((tile) => tile.col);
  const rows = tiles.map((tile) => tile.row);
  const [x, y] = tileToPixels({ col: Math.min(...cols), row: Math.min(...rows) });
  const size = OVERWORLD_TILE_SIZE;
  return { x, y, width: (Math.max(...cols) - Math.min(...cols) + 1) * size, height: (Math.max(...rows) - Math.min(...rows) + 1) * size };
}

/** Paints a station's landmark over its landmark tiles, and its door and sign over the middle of its front wall. */
function paintStation(pixels: Pixels, station: Station, footprint: Footprint) {
  const tiles = footprintTiles(footprint);
  const landmarkTiles = tiles.filter((tile) => tileKindAt(tile) === "landmark");
  if (station.landmark && landmarkTiles.length > 0) station.landmark(pixels, areaOf(landmarkTiles));
  const frontWall = tiles.filter((tile) => tileKindAt(tile) === "building" && tileKindAt({ ...tile, row: tile.row + 1 }) !== "building");
  if (frontWall.length === 0) return;
  const door = frontWall[Math.floor((frontWall.length - 1) / 2)];
  if (station.door) paintProp(pixels, station.door, door);
  if (station.sign) {
    const [x, y] = tileToPixels(door);
    paintSign(pixels, station.sign, x + OVERWORLD_TILE_SIZE / 2, y + 3);
  }
}

/** The Tiny Town style of each building tile that belongs to a station; other buildings are cottages. */
function stationBuildingStyles(pointsOfInterest: readonly { id: string; placement: Footprint }[]) {
  const styles = new Map<string, BuildingStyle>();
  for (const { id, placement } of pointsOfInterest) {
    const name = themedProp(id);
    const building = name && isStation(name) ? (STATIONS[name] as Station).building : undefined;
    if (building) for (const tile of footprintTiles(placement)) styles.set(tileKey(tile), building);
  }
  return styles;
}

/** Ground that is painted rather than taken from Tiny Town, with nothing standing on it. */
const PAINTED_GROUND: Partial<Record<TileKind, (pixels: Pixels, tile: Tile, x: number, y: number) => void>> = {
  water: paintWater,
  snow: paintSnow,
  rock: paintRock,
  track: paintSkinTrack,
  asphalt: paintAsphalt,
  car: paintAsphalt,
};

/**
 * Paints the whole Overworld from the text tilemap, with its parked cars and scenery props, and a themed object, a
 * station over its footprint or a sign on each Point of Interest.
 */
export function paintOverworld(sheets: TileSheets, pointsOfInterest: { id: string; placement: Footprint }[]): HTMLCanvasElement {
  const sheet = sheets.town;
  const size = OVERWORLD_TILE_SIZE;
  const pixels = new Pixels(MAP_COLUMNS * size, MAP_ROWS * size);
  const buildingStyles = stationBuildingStyles(pointsOfInterest);
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLUMNS; col++) {
      const tile = { col, row };
      const [x, y] = tileToPixels(tile);
      const kind = tileKindAt(tile)!;
      const below = tileKindAt({ col, row: row + 1 });
      const paintGround = PAINTED_GROUND[kind];
      if (paintGround) paintGround(pixels, tile, x, y);
      else pixels.tile(sheet, TINY_TOWN_COLUMNS, kind === "path" ? TINY_TOWN.path : variantForTile(TINY_TOWN.grass, tile), x, y);
      const object = objectFrame(tile, kind, buildingStyles.get(tileKey(tile)) ?? COTTAGE);
      if (object !== undefined) pixels.tile(sheet, TINY_TOWN_COLUMNS, object, x, y);
      // A maypole and a car are drawn whole from their bottom tile.
      if (kind === "maypole" && below !== "maypole") paintProp(pixels, MAYPOLE, tile);
      if (kind === "car" && below !== "car") paintCar(pixels, tile);
    }
  }
  for (const { tile } of HUB_SIGNPOSTS) pixels.tile(sheet, TINY_TOWN_COLUMNS, TINY_TOWN.sign, ...tileToPixels(tile));
  for (const { at, prop } of SCENERY_PROPS) paintThemedObject(pixels, sheets, prop, at);
  for (const { id, placement } of pointsOfInterest) {
    const name = themedProp(id);
    if (!name) pixels.tile(sheet, TINY_TOWN_COLUMNS, TINY_TOWN.sign, ...tileToPixels(placement));
    else if (isStation(name)) paintStation(pixels, STATIONS[name], placement);
    else paintThemedObject(pixels, sheets, name, placement);
  }
  return pixels.canvas;
}

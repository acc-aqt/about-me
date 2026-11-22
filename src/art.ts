// Original pixel art, painted in code at start-up so no large image files ship.
// The Overworld's terrain, buildings, signs and props come from Kenney's CC0 Tiny Town and Tiny Dungeon tiles
// (see CREDITS.md); the water, the Player, the Film roll, the Hub's maypole and the themed objects Kenney lacks are
// painted here.

import { HUB_SIGNPOSTS, MAP_COLUMNS, MAP_ROWS, OVERWORLD_MAP, OVERWORLD_TILE_SIZE, tileKindAt, type Direction, type Tile, type TileKind } from "./overworld";

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

export function paintFilmRoll(): HTMLCanvasElement {
  const rows = [".ggg..", "kkkkk.", "krrrkk", "krkrk.", "krrrk.", "kkkkk.", ".ggg.."];
  const colors: Record<string, Rgb> = { g: hex("#c4c8d0"), k: INK, r: hex("#e6b43c") };
  const pixels = new Pixels(6, rows.length);
  rows.forEach((row, y) => [...row].forEach((char, x) => colors[char] && pixels.dot(x, y, colors[char])));
  return pixels.canvas;
}

/** Frames of Kenney's Tiny Town packed tilemap, which is 12 tiles wide. */
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
  wall: 84,
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

function charAt({ col, row }: Tile): string | undefined {
  return OVERWORLD_MAP[row]?.[col];
}

function tileSeed({ col, row }: Tile): number {
  return hash(row * MAP_COLUMNS + col);
}

function pick<T>(choices: readonly T[], tile: Tile): T {
  return choices[Math.floor(tileSeed(tile) * choices.length)];
}

/** Left, middle or right piece of a row of joined tiles, such as a roof. */
function piece(tile: Tile, char: string, pieces: readonly [number, number, number]): number {
  if (charAt({ ...tile, col: tile.col - 1 }) !== char) return pieces[0];
  if (charAt({ ...tile, col: tile.col + 1 }) !== char) return pieces[2];
  return pieces[1];
}

function paintWater(pixels: Pixels, tile: Tile, x: number, y: number) {
  const size = OVERWORLD_TILE_SIZE;
  pixels.rect(x, y, size, size, WATER);
  if (charAt({ ...tile, row: tile.row - 1 }) !== "~") {
    pixels.rect(x, y, size, 2, SHORE);
    pixels.rect(x, y + 2, size, 2, WATER_DEEP);
  }
  const seed = tileSeed(tile);
  pixels.rect(x + 2 + Math.floor(seed * 9), y + 6 + Math.floor(hash(seed * 1e6) * 7), 4, 1, WATER_GLINT);
}

function buildingFrame(tile: Tile): number {
  if (charAt({ ...tile, row: tile.row + 1 }) === "B") {
    return piece(tile, "B", charAt({ ...tile, row: tile.row - 1 }) === "B" ? TINY_TOWN.roof : TINY_TOWN.roofTop);
  }
  let left = tile.col;
  while (charAt({ ...tile, col: left - 1 }) === "B") left--;
  let right = tile.col;
  while (charAt({ ...tile, col: right + 1 }) === "B") right++;
  return tile.col === Math.floor((left + right) / 2) ? TINY_TOWN.door : TINY_TOWN.wall;
}

function treeFrame(tile: Tile): number {
  const surrounded = [-1, 1].every(
    (offset) => charAt({ ...tile, col: tile.col + offset }) === "T" && charAt({ ...tile, row: tile.row + offset }) === "T",
  );
  return surrounded ? TINY_TOWN.forest : pick(TINY_TOWN.trees, tile);
}

function fenceFrame(tile: Tile): number {
  const across = [-1, 1].some((offset) => charAt({ ...tile, col: tile.col + offset }) === "#");
  return across ? TINY_TOWN.fenceAcross : TINY_TOWN.fenceDown;
}

/** The object drawn over the ground on a tile, if any. */
function objectFrame(tile: Tile, kind: TileKind): number | undefined {
  switch (kind) {
    case "tree":
      return treeFrame(tile);
    case "bush":
      return TINY_TOWN.bush;
    case "fence":
      return fenceFrame(tile);
    case "building":
      return buildingFrame(tile);
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

/** Frames of Kenney's Tiny Dungeon packed tilemap, laid out like Tiny Town. */
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

function painted(bottom: number, rows: string[]): Prop {
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

const UNIVERSITY: Prop = {
  rows: [
      "......kkkk......",
      "....kkbbbbkk....",
      "..kkbbbwwbbbkk..",
      "kkbbbbbbbbbbbbkk",
      "kwwwwwwwwwwwwwwk",
      "kkkkkkkkkkkkkkkk",
      "kwkddkwkkwkddkwk",
      "kwkddkwkkwkddkwk",
      "kwkddkwkkwkddkwk",
      "kwkddkwkkwkddkwk",
      "kwkddkwkkwkddkwk",
      "kwkddkwkkwkddkwk",
      "kwkddkwkkwkddkwk",
      "kkkkkkkkkkkkkkkk",
      "kssssssssssssssk",
      "kkkkkkkkkkkkkkkk",
  ],
  colors: { k: INK, b: hex("#3070b3"), w: hex("#f4f1e8"), d: hex("#2b3a55"), s: hex("#b8b8b0") },
};

const OFFICE_TOWER: Prop = {
  rows: [
      "...kkkkkkkkkk...",
      "...kssssssssk...",
      "...kllsllsllk...",
      "...kssssssssk...",
      "...kllsllsllk...",
      "...kssssssssk...",
      "...kllsllsllk...",
      "...kssssssssk...",
      "...kllsllsllk...",
      "...kssssssssk...",
      "...kllsllsllk...",
      "...kssssssssk...",
      ".kkkkkkkkkkkkkk.",
      ".ksssssddsssssk.",
      ".ksssssddsssssk.",
      "kkkkkkkkkkkkkkkk",
  ],
  colors: { k: INK, s: hex("#c4c8d0"), l: hex("#5aa0d8"), d: hex("#2b2b33") },
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

const WORKS: Prop = {
  rows: [
      "k...k...k...k...",
      "kk..kk..kk..kk..",
      "klk.klk.klk.klk.",
      "kllkkllkkllkkllk",
      "kkkkkkkkkkkkkkkk",
      "krrrrrrrrrrrrrrk",
      "krwwrrwwrrwwrrrk",
      "krwwrrwwrrwwrrrk",
      "krrrrrrrrrrrrrrk",
      "krwwrrwwrrrddrrk",
      "krwwrrwwrrrddrrk",
      "krrrrrrrrrrddrrk",
      "krrrrrrrrrrddrrk",
      "kkkkkkkkkkkkkkkk",
  ],
  colors: { k: INK, l: hex("#8fd2ee"), r: hex("#b8643c"), w: hex("#8fd2ee"), d: hex("#5a3825") },
};

const OFFICE_BLOCK: Prop = {
  rows: [
      "....k...........",
      "....k...........",
      ".kkkkkkkkkkkkkk.",
      ".kggggggggggggk.",
      ".kgwgwgwgwgwggk.",
      ".kkkkkkkkkkkkkk.",
      ".kggggggggggggk.",
      ".kgwgwgwgwgwggk.",
      ".kkkkkkkkkkkkkk.",
      ".kggggggggggggk.",
      ".kgwgwgddgwgwgk.",
      ".kgggggddgggggk.",
      "kkkkkkkkkkkkkkkk",
  ],
  colors: { k: INK, g: hex("#3c8c84"), w: hex("#9fd3f2"), d: hex("#2b2b33") },
};

const JET_ENGINE: Prop = {
  rows: [
      ".....kkkkkk.....",
      "...kksssssskk...",
      "..kssddddddssk..",
      ".ksddgddddgddsk.",
      "ksdddgddddgdddsk",
      "ksddddgkkgddddsk",
      "ksddddkwwkddddsk",
      "ksddddkwwkddddsk",
      "ksddddgkkgddddsk",
      "ksdddgddddgdddsk",
      ".ksddgddddgddsk.",
      "..kssddddddssk..",
      "...kksssssskk...",
      ".....kkkkkk.....",
      "......kppk......",
      "....kkkkkkkk....",
  ],
  colors: { k: INK, s: hex("#c4c8d0"), d: hex("#3b4466"), g: hex("#8a93a8"), w: hex("#f4f1e8"), p: hex("#6b6f7a") },
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

const PROPS = {
  "camera stand": CAMERA_STAND,
  "darkroom door": DARKROOM_DOOR,
  "welcome board": WELCOME_BOARD,
  university: UNIVERSITY,
  "office tower": OFFICE_TOWER,
  "kangaroo sign": KANGAROO_SIGN,
  "composites works": WORKS,
  "office block": OFFICE_BLOCK,
  "jet engine": JET_ENGINE,
  mailbox: MAILBOX,
  workbench: [{ dungeon: TINY_DUNGEON.table }],
  computer: [
    { dungeon: TINY_DUNGEON.table },
    painted(8, ["kkkkkkkkkk", "kbbbbbbbbk", "kbcbbbbbbk", "kbbbbGGbbk", "kbbbGGGGbk", "kkkkkkkkkk", "....kk....", "..kkkkkk.."]),
  ],
  anvil: [{ dungeon: TINY_DUNGEON.anvil }],
  "kit chest": [{ dungeon: TINY_DUNGEON.chest }],
  barrel: [{ town: TINY_TOWN.barrel }],
  wheelbarrow: [{ town: TINY_TOWN.wheelbarrow }],
  "archery target": [{ town: TINY_TOWN.archeryTarget }],
  "3D printer": [
    painted(15, [
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
  "tennis net": [
    painted(15, [
      "kk............kk",
      "kkwwwwwwwwwwwwkk",
      "kkdsdsdsdsdsdskk",
      "kksdsdsdsdsdsdkk",
      "kkdsdsdsdsdsdskk",
      "kksdsdsdsdsdsdkk",
      "kk............kk",
      "kk............kk",
    ]),
  ],
  "life ring": [
    painted(16, [
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
    ]),
  ],
  skis: [
    painted(16, [
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
    ]),
  ],
  jukebox: [
    painted(16, [
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
    painted(16, [
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
    painted(16, [
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

/** Points of Interest drawn as a themed object; the rest stand as a signpost. */
const THEMED_PROPS: Record<string, PropName> = {
  jordan: "camera stand",
  norway: "camera stand",
  "new-york": "camera stand",
  nepal: "camera stand",
  lisbon: "camera stand",
  "eastern-adriatic": "camera stand",
  peru: "camera stand",
  darkroom: "darkroom door",
  intro: "welcome board",
  tum: "university",
  "bmw-group": "office tower",
  "canberra-detour": "kangaroo sign",
  "forward-engineering": "composites works",
  "arrk-engineering": "office block",
  mtu: "jet engine",
  "contact-board": "mailbox",
  framewise: "computer",
  "lens-caps": "3D printer",
  reelmaker: "workbench",
  "preset-fitting": "computer",
  "swimming-pool": "life ring",
  "tennis-court": "tennis net",
  "ski-touring-slope": "skis",
  "track-back": "jukebox",
};

/** Props that are scenery rather than Points of Interest, one on each prop tile (`p`) of the map. */
export const SCENERY_PROPS: readonly { at: Tile; prop: PropName }[] = [
  { at: { col: 14, row: 20 }, prop: "workbench" },
  { at: { col: 15, row: 20 }, prop: "anvil" },
  { at: { col: 19, row: 26 }, prop: "wheelbarrow" },
  { at: { col: 9, row: 28 }, prop: "barrel" },
  { at: { col: 19, row: 34 }, prop: "tennis net" },
  { at: { col: 21, row: 34 }, prop: "tennis net" },
  { at: { col: 3, row: 37 }, prop: "archery target" },
  { at: { col: 5, row: 37 }, prop: "archery target" },
  { at: { col: 7, row: 44 }, prop: "kit chest" },
  { at: { col: 35, row: 34 }, prop: "speaker" },
  { at: { col: 37, row: 34 }, prop: "speaker" },
  { at: { col: 52, row: 37 }, prop: "arcade cabinet" },
  { at: { col: 53, row: 37 }, prop: "arcade cabinet" },
  { at: { col: 54, row: 37 }, prop: "arcade cabinet" },
  { at: { col: 49, row: 41 }, prop: "speaker" },
];

export function themedProp(poiId: string): PropName | undefined {
  return THEMED_PROPS[poiId];
}

/** Draws a prop standing on a tile: bottom-aligned, so a prop taller than a tile rises into the tile above. */
function paintProp(pixels: Pixels, { rows, colors, bottom = OVERWORLD_TILE_SIZE }: Prop, { col, row }: Tile) {
  const x = col * OVERWORLD_TILE_SIZE + Math.floor((OVERWORLD_TILE_SIZE - rows[0].length) / 2);
  const y = row * OVERWORLD_TILE_SIZE + bottom - rows.length;
  rows.forEach((row, dy) => [...row].forEach((char, dx) => colors[char] && pixels.dot(x + dx, y + dy, colors[char])));
}

export type TileSheets = { town: CanvasImageSource; dungeon: CanvasImageSource };

function paintThemedObject(pixels: Pixels, sheets: TileSheets, prop: PropName, tile: Tile) {
  const art: Prop | readonly PropLayer[] = PROPS[prop];
  const layers: readonly PropLayer[] = Array.isArray(art) ? art : [art];
  const [x, y] = [tile.col * OVERWORLD_TILE_SIZE, tile.row * OVERWORLD_TILE_SIZE];
  for (const layer of layers) {
    if ("town" in layer) pixels.tile(sheets.town, TINY_TOWN_COLUMNS, layer.town, x, y);
    else if ("dungeon" in layer) pixels.tile(sheets.dungeon, TINY_TOWN_COLUMNS, layer.dungeon, x, y);
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

/** Paints the whole Overworld from the text tilemap, with its scenery props and a themed object or a sign on each Point of Interest tile. */
export function paintOverworld(sheets: TileSheets, pointsOfInterest: { id: string; placement: Tile }[]): HTMLCanvasElement {
  const sheet = sheets.town;
  const size = OVERWORLD_TILE_SIZE;
  const pixels = new Pixels(MAP_COLUMNS * size, MAP_ROWS * size);
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLUMNS; col++) {
      const tile = { col, row };
      const [x, y] = [col * size, row * size];
      const kind = tileKindAt(tile)!;
      if (kind === "water") {
        paintWater(pixels, tile, x, y);
        continue;
      }
      pixels.tile(sheet, TINY_TOWN_COLUMNS, kind === "path" ? TINY_TOWN.path : pick(TINY_TOWN.grass, tile), x, y);
      const object = objectFrame(tile, kind);
      if (object !== undefined) pixels.tile(sheet, TINY_TOWN_COLUMNS, object, x, y);
      // A maypole is drawn whole from its bottom tile.
      if (kind === "maypole" && tileKindAt({ col, row: row + 1 }) !== "maypole") paintProp(pixels, MAYPOLE, tile);
    }
  }
  for (const { tile } of HUB_SIGNPOSTS) pixels.tile(sheet, TINY_TOWN_COLUMNS, TINY_TOWN.sign, tile.col * size, tile.row * size);
  for (const { at, prop } of SCENERY_PROPS) paintThemedObject(pixels, sheets, prop, at);
  for (const { id, placement } of pointsOfInterest) {
    const prop = themedProp(id);
    if (prop) paintThemedObject(pixels, sheets, prop, placement);
    else pixels.tile(sheet, TINY_TOWN_COLUMNS, TINY_TOWN.sign, placement.col * size, placement.row * size);
  }
  return pixels.canvas;
}

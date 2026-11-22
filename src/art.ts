// Original pixel art, painted in code at start-up so no large image files ship.
// The Overworld's terrain, buildings, signs and props come from Kenney's CC0 Tiny Town and Tiny Dungeon tiles
// (see CREDITS.md); the water, the Player, the Film roll and the themed objects Kenney lacks, such as the camera
// stands, the 3D printer and the jukebox, are painted here.

import { MAP_COLUMNS, MAP_ROWS, OVERWORLD_MAP, OVERWORLD_TILE_SIZE, tileKindAt, type Direction, type Tile, type TileKind } from "./overworld";

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
    default:
      return undefined;
  }
}

/** Pixel rows centred across the tile, the last row `bottom` pixels below its top edge (default 16, its bottom). */
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

const PROPS = {
  "camera stand": [CAMERA_STAND],
  "darkroom door": [DARKROOM_DOOR],
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
} satisfies Record<string, readonly PropLayer[]>;

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
  framewise: "computer",
  "lens-caps": "3D printer",
  reelmaker: "workbench",
  "preset-fitting": "computer",
  "swimming-pool": "life ring",
  "tennis-court": "tennis net",
  "ski-touring-slope": "skis",
  "track-back": "jukebox",
};

/** Props that are scenery rather than Points of Interest, one on each prop tile (`o`) of the map. */
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

export type TileSheets = { town: CanvasImageSource; dungeon: CanvasImageSource };

function paintProp(pixels: Pixels, sheets: TileSheets, layers: readonly PropLayer[], x: number, y: number) {
  for (const layer of layers) {
    if ("town" in layer) pixels.tile(sheets.town, TINY_TOWN_COLUMNS, layer.town, x, y);
    else if ("dungeon" in layer) pixels.tile(sheets.dungeon, TINY_TOWN_COLUMNS, layer.dungeon, x, y);
    else {
      const { rows, colors, bottom = OVERWORLD_TILE_SIZE } = layer;
      const left = x + Math.floor((OVERWORLD_TILE_SIZE - rows[0].length) / 2);
      const top = y + bottom - rows.length;
      rows.forEach((row, dy) => [...row].forEach((char, dx) => colors[char] && pixels.dot(left + dx, top + dy, colors[char])));
    }
  }
}

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
    }
  }
  for (const { at, prop } of SCENERY_PROPS) paintProp(pixels, sheets, PROPS[prop], at.col * size, at.row * size);
  for (const { id, placement } of pointsOfInterest) {
    const [x, y] = [placement.col * size, placement.row * size];
    const prop = themedProp(id);
    if (prop) paintProp(pixels, sheets, PROPS[prop], x, y);
    else pixels.tile(sheet, TINY_TOWN_COLUMNS, TINY_TOWN.sign, x, y);
  }
  return pixels.canvas;
}

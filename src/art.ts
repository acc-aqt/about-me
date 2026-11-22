// Original pixel art, painted in code at start-up so no large image files ship.
// Only the ground, signs and small props come from Kenney's CC0 Pixel Platformer tiles (see CREDITS.md).

import type { ZoneId } from "./content";

export type Rgb = [number, number, number];

/** The ground line, in view pixels from the top; the Player and every prop stand on it. */
export const GROUND_Y = 156;

export const TILE_SIZE = 18;
export const TILE_COLUMNS = 20;
export const TILE_ROWS = 9;
export const TILES = {
  grass: 2,
  sand: 42,
  snow: 82,
  dirt: 122,
  sign: 86,
  fenceA: 105,
  fenceB: 106,
  sproutA: 124,
  sproutB: 125,
  mushroom: 128,
  snowman: 145,
  flag: 111,
} as const;

export const PLAYER_FRAME_WIDTH = 16;
export const PLAYER_FRAME_HEIGHT = 24;

type Painter = (pixels: Pixels, from: number, to: number) => void;

export type BackdropLayer = { depth: number; paint: Painter };

export type ZoneArt = {
  sky: [Rgb, Rgb];
  /** Ground tiles from each `from` (Zone-local x) to the next span. */
  ground: { frame: number; from: number }[];
  groundTint: Rgb;
  layers: BackdropLayer[];
  props: { frame: number; x: number }[];
  /** Tile the Zone's Film roll is tucked behind. */
  filmRollCover: number;
};

export class Pixels {
  readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;

  constructor(
    width: number,
    height: number,
    private readonly originX = 0,
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = Math.max(1, Math.ceil(width));
    this.canvas.height = height;
    this.context = this.canvas.getContext("2d")!;
  }

  rect(x: number, y: number, width: number, height: number, [r, g, b]: Rgb) {
    this.context.fillStyle = `rgb(${r} ${g} ${b})`;
    this.context.fillRect(Math.round(x - this.originX), Math.round(y), Math.round(width), Math.round(height));
  }

  dot(x: number, y: number, color: Rgb) {
    this.rect(x, y, 1, 1, color);
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

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as Rgb;
}

export function paintSky([top, bottom]: [Rgb, Rgb], height: number): HTMLCanvasElement {
  const bands = 8;
  const pixels = new Pixels(4, height);
  const bandHeight = height / bands;
  for (let band = 0; band < bands; band++) {
    const y = Math.round(band * bandHeight);
    pixels.rect(0, y, 4, Math.ceil(bandHeight), mix(top, bottom, band / (bands - 1)));
    if (band > 0) {
      const previous = mix(top, bottom, (band - 1) / (bands - 1));
      for (let x = 0; x < 4; x += 2) pixels.dot(x + (y % 2), y, previous);
    }
  }
  return pixels.canvas;
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

const PLAYER_BODY = [
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

const PLAYER_LEGS = [
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

/** Leg pose per sheet frame: frame 0 stands idle, the rest form the walk cycle. */
const PLAYER_LEG_SEQUENCE = [0, 1, 2, 3, 2];

export const PLAYER_FRAME_COUNT = PLAYER_LEG_SEQUENCE.length;

export const PLAYER_ANIMS = {
  idle: 0,
  walk: { from: 1, to: PLAYER_FRAME_COUNT - 1, loop: true, speed: 10 },
};

export function paintPlayerSheet(): HTMLCanvasElement {
  const pixels = new Pixels(PLAYER_FRAME_WIDTH * PLAYER_FRAME_COUNT, PLAYER_FRAME_HEIGHT);
  PLAYER_LEG_SEQUENCE.forEach((legs, frame) => {
    const bob = legs === 2 ? 1 : 0;
    const rows = [...PLAYER_BODY.map((row, y) => ({ row, y: y + bob })), ...PLAYER_LEGS[legs].map((row, y) => ({ row, y: y + PLAYER_BODY.length }))];
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


function hills(color: Rgb, height: number, amplitude: number, period: number, seed: number): Painter {
  return (pixels, from, to) => {
    for (let x = Math.floor(from); x < to; x++) {
      const wave = Math.sin(x / period + seed) * 0.6 + Math.sin(x / (period * 0.37) + seed * 2) * 0.4;
      const top = Math.round(GROUND_Y - height - wave * amplitude);
      pixels.rect(x, top, 1, GROUND_Y - top, color);
    }
  };
}

type MountainStyle = { lit: Rgb; shade: Rgb; snow: Rgb; snowShade: Rgb; height: number; spacing: number; seed: number; snowDepth: number };

function mountains(style: MountainStyle, range?: [number, number]): Painter {
  return (pixels, from, to) => {
    const start = Math.floor(range ? Math.max(from, range[0]) : from);
    const end = range ? Math.min(to, range[1]) : to;
    const firstPeak = Math.floor(start / style.spacing) - 2;
    const lastPeak = Math.ceil(end / style.spacing) + 2;
    const peaks: { x: number; top: number }[] = [];
    for (let i = firstPeak; i <= lastPeak; i++) {
      peaks.push({
        x: i * style.spacing + (hash(i * 7 + style.seed) - 0.5) * style.spacing * 0.6,
        top: GROUND_Y - style.height * (0.6 + hash(i * 13 + style.seed) * 0.4),
      });
    }
    for (let x = start; x < end; x++) {
      let best = { y: GROUND_Y, peak: peaks[0] };
      for (const peak of peaks) {
        const y = peak.top + Math.abs(x - peak.x) * 1.1;
        if (y < best.y) best = { y, peak };
      }
      if (range) best.y = Math.max(best.y, GROUND_Y - (GROUND_Y - best.y) * Math.min(1, (x - range[0]) / 40, (range[1] - x) / 40));
      const top = Math.round(best.y);
      const lit = x <= best.peak.x;
      const snowBottom = Math.min(GROUND_Y, best.peak.top + style.snowDepth + (hash(x) > 0.5 ? 1 : 0) + ((x >> 2) % 2) * 2);
      if (top < snowBottom) pixels.rect(x, top, 1, snowBottom - top, lit ? style.snow : style.snowShade);
      pixels.rect(x, Math.max(top, snowBottom), 1, GROUND_Y - Math.max(top, snowBottom), lit ? style.lit : style.shade);
    }
  };
}

function pines(color: Rgb, spacing: number, seed: number, range?: [number, number]): Painter {
  return (pixels, from, to) => {
    for (let i = Math.floor(from / spacing) - 1; i < to / spacing + 1; i++) {
      const x = i * spacing + Math.round(hash(i + seed) * spacing * 0.5);
      if (range && (x < range[0] || x > range[1])) continue;
      const height = 10 + Math.round(hash(i * 3 + seed) * 10);
      for (let row = 0; row < height; row++) {
        const half = Math.floor((row % 6) / 2) + Math.floor(row / 6);
        pixels.rect(x - half, GROUND_Y - height - 2 + row, half * 2 + 1, 1, color);
      }
      pixels.rect(x, GROUND_Y - 2, 1, 2, mix(color, [40, 30, 20], 0.5));
    }
  };
}

function skyline(body: Rgb, shade: Rgb, window: Rgb, seed: number, tall: number): Painter {
  return (pixels, from, to) => {
    let x = Math.floor(from / 24) * 24 - 24;
    let slot = Math.floor(from / 24);
    while (x < to) {
      const r = hash(slot * 31 + seed);
      const width = 14 + Math.round(hash(slot * 17 + seed) * 18);
      const height = Math.round(tall * (0.45 + r * 0.55));
      const top = GROUND_Y - height;
      const kind = Math.floor(hash(slot * 5 + seed) * 6);
      pixels.rect(x, top, width, height, body);
      pixels.rect(x + width - 2, top, 2, height, shade);
      if (kind === 0) {
        for (let step = 0; step < width / 2; step++) pixels.rect(x + step, top - step, width - step * 2, 1, body);
      } else if (kind === 1) {
        const tower = x + Math.floor(width / 2) - 2;
        pixels.rect(tower, top - 14, 5, 14, body);
        for (let step = 0; step < 4; step++) pixels.rect(tower + 2 - Math.floor(step / 2), top - 22 + step * 2, 1 + Math.floor(step / 2) * 2, 2, body);
        pixels.rect(tower + 2, top - 26, 1, 4, shade);
      } else if (kind === 2) {
        const radius = Math.min(7, Math.floor(width / 2) - 1);
        const centre = x + Math.floor(width / 2);
        for (let dy = 0; dy < radius; dy++) {
          const half = Math.round(Math.sqrt(radius * radius - dy * dy));
          pixels.rect(centre - half, top - dy - 1, half * 2, 1, body);
        }
        pixels.rect(centre, top - radius - 4, 1, 4, shade);
      } else if (kind === 3) {
        pixels.rect(x + 3, top - 6, 2, 6, shade);
      }
      for (let wy = top + 4; wy < GROUND_Y - 6; wy += 6) {
        for (let wx = x + 3; wx < x + width - 4; wx += 4) {
          if (hash(wx * 3 + wy * 7 + seed) > 0.55) pixels.rect(wx, wy, 2, 3, window);
        }
      }
      x += width + 1 + Math.round(hash(slot * 11 + seed) * 4);
      slot++;
    }
  };
}

function stars(color: Rgb, seed: number): Painter {
  return (pixels, from, to) => {
    for (let x = Math.floor(from); x < to; x++) {
      const r = hash(x * 19 + seed);
      if (r > 0.92) pixels.dot(x, Math.floor(hash(x * 23 + seed) * 100) + 4, r > 0.985 ? [255, 255, 255] : color);
    }
  };
}

function disc(cx: number, cy: number, radius: number, color: Rgb, bands?: Rgb): Painter {
  return (pixels, from, to) => {
    if (cx + radius < from || cx - radius > to) return;
    for (let dy = -radius; dy <= radius; dy++) {
      const half = Math.round(Math.sqrt(radius * radius - dy * dy));
      const striped = bands && dy > radius / 3 && Math.floor(dy / 3) % 2 === 0;
      pixels.rect(cx - half, cy + dy, half * 2 + 1, 1, striped ? bands : color);
    }
  };
}

function clouds(color: Rgb, spacing: number, seed: number): Painter {
  return (pixels, from, to) => {
    for (let i = Math.floor(from / spacing) - 1; i < to / spacing + 1; i++) {
      const x = i * spacing + Math.round(hash(i + seed) * spacing * 0.6);
      const y = 18 + Math.round(hash(i * 5 + seed) * 40);
      const width = 18 + Math.round(hash(i * 9 + seed) * 26);
      pixels.rect(x, y, width, 4, color);
      pixels.rect(x + 4, y - 3, width - 12, 3, color);
      pixels.rect(x + 8, y - 5, Math.max(4, width / 3), 2, color);
    }
  };
}

function workshop(x: number, width: number, body: Rgb, glow: Rgb): Painter {
  return (pixels, from, to) => {
    if (x + width < from || x > to) return;
    const top = GROUND_Y - 46;
    pixels.rect(x, top, width, 46, body);
    for (let tooth = x; tooth < x + width; tooth += 16) {
      for (let step = 0; step < 10; step++) pixels.rect(tooth, top - 10 + step, Math.min(16, step * 1.6 + 1), 1, body);
      pixels.rect(tooth + 14, top - 10, 2, 10, glow);
    }
    for (let wx = x + 6; wx < x + width - 10; wx += 14) pixels.rect(wx, top + 12, 8, 10, glow);
    pixels.rect(x + width - 20, top - 30, 6, 30, body);
  };
}

function jetEngineHangar(cx: number): Painter {
  const width = 176;
  const height = 100;
  const left = cx - width / 2;
  const top = GROUND_Y - height;
  const wall = hex("#c3c9d2");
  const wallShade = hex("#8c95a3");
  const roof = hex("#5d6878");
  const interior = hex("#2d323d");
  const floor = hex("#4a505c");
  const lip = hex("#e3e7ec");
  const ring = hex("#1b1e25");
  const bladeA = hex("#6d7686");
  const bladeB = hex("#9aa3b2");
  const spinner = hex("#eef0f3");
  const stand = hex("#e0b030");
  const hazard = INK;
  return (pixels, from, to) => {
    if (left + width < from || left > to) return;
    for (let x = 0; x < width; x++) {
      const t = x / (width - 1) - 0.5;
      const roofTop = top + 26 - Math.round(26 * (1 - 4 * t * t));
      pixels.rect(left + x, roofTop, 1, 4, roof);
      pixels.rect(left + x, roofTop + 4, 1, GROUND_Y - roofTop - 4, x % 12 === 0 ? wallShade : wall);
    }
    const doorLeft = left + 22;
    const doorWidth = width - 44;
    const doorTop = top + 30;
    pixels.rect(doorLeft, doorTop, doorWidth, GROUND_Y - doorTop, interior);
    for (let y = doorTop; y < GROUND_Y; y += 4) {
      pixels.rect(doorLeft - 3, y, 3, 2, stand);
      pixels.rect(doorLeft - 3, y + 2, 3, 2, hazard);
      pixels.rect(doorLeft + doorWidth, y, 3, 2, stand);
      pixels.rect(doorLeft + doorWidth, y + 2, 3, 2, hazard);
    }
    pixels.rect(doorLeft, GROUND_Y - 6, doorWidth, 6, floor);
    for (let lamp = doorLeft + 8; lamp < doorLeft + doorWidth; lamp += 20) pixels.rect(lamp, doorTop + 2, 6, 2, hex("#fff1b8"));

    const radius = 24;
    const ex = cx;
    const ey = GROUND_Y - 12 - radius;
    pixels.rect(ex - 14, ey + radius - 2, 4, GROUND_Y - 6 - (ey + radius - 2), stand);
    pixels.rect(ex + 10, ey + radius - 2, 4, GROUND_Y - 6 - (ey + radius - 2), stand);
    pixels.rect(ex - 20, GROUND_Y - 8, 40, 3, stand);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > radius) continue;
        let color: Rgb;
        if (distance > radius - 3) color = lip;
        else if (distance > radius - 5) color = ring;
        else if (distance < 5) color = distance < 2 ? ring : spinner;
        else {
          const angle = Math.atan2(dy, dx) / (Math.PI * 2) + 0.5;
          color = Math.floor(angle * 20 + distance * 0.06) % 2 === 0 ? bladeA : bladeB;
        }
        pixels.dot(ex + dx, ey + dy, color);
      }
    }
  };
}

type TownStyle = { wall: Rgb; shade: Rgb; roof: Rgb; window?: Rgb; minHeight: number; maxHeight: number; seed: number };

function oldTown(style: TownStyle): Painter {
  return (pixels, from, to) => {
    let slot = Math.floor(from / 20) - 1;
    let x = slot * 20;
    while (x < to) {
      const width = 14 + Math.round(hash(slot * 17 + style.seed) * 12);
      const height = style.minHeight + Math.round(hash(slot * 31 + style.seed) * (style.maxHeight - style.minHeight));
      const top = GROUND_Y - height;
      pixels.rect(x, top, width, height, style.wall);
      pixels.rect(x + width - 2, top, 2, height, style.shade);
      const pitch = Math.ceil(width / 2);
      for (let step = 0; step < pitch; step++) {
        pixels.rect(x + step, top - 1 - step, width - step * 2, 1, style.roof);
      }
      if (hash(slot * 7 + style.seed) > 0.5) pixels.rect(x + width - 6, top - pitch + 1, 2, pitch - 2, style.shade);
      if (style.window) {
        for (let wy = top + 3; wy < GROUND_Y - 4; wy += 6) {
          for (let wx = x + 3; wx < x + width - 4; wx += 5) {
            if (hash(wx * 3 + wy * 7 + style.seed) > 0.4) pixels.rect(wx, wy, 2, 3, style.window);
          }
        }
      }
      x += width + Math.round(hash(slot * 11 + style.seed) * 3);
      slot++;
    }
  };
}

/** An original twin-towered old-town church: square brick towers capped with green onion domes. */
function twinTowerChurch(cx: number, body: Rgb, shade: Rgb, dome: Rgb, domeShade: Rgb): Painter {
  const towerWidth = 12;
  const towerHeight = 70;
  const gap = 8;
  const towers = [cx - gap / 2 - towerWidth, cx + gap / 2];
  const naveWidth = 56;
  const naveHeight = 30;
  return (pixels, from, to) => {
    if (cx + naveWidth < from || cx - naveWidth > to) return;
    const naveLeft = cx - naveWidth / 2;
    const naveTop = GROUND_Y - naveHeight;
    pixels.rect(naveLeft, naveTop, naveWidth, naveHeight, body);
    for (let step = 0; step < 16; step++) pixels.rect(naveLeft + step, naveTop - 1 - step, naveWidth - step * 2, 1, shade);
    for (const left of towers) {
      const top = GROUND_Y - towerHeight;
      pixels.rect(left, top, towerWidth, towerHeight, body);
      pixels.rect(left + towerWidth - 2, top, 2, towerHeight, shade);
      for (let wy = top + 8; wy < GROUND_Y - 30; wy += 12) pixels.rect(left + 5, wy, 2, 5, shade);
      const domeRows = [14, 16, 16, 14, 12, 10, 8, 6, 4, 2];
      domeRows.forEach((width, row) => {
        const y = top - 1 - row;
        const domeLeft = left + (towerWidth - width) / 2;
        pixels.rect(domeLeft, y, width, 1, dome);
        pixels.rect(domeLeft + width - Math.ceil(width / 4), y, Math.ceil(width / 4), 1, domeShade);
      });
      pixels.rect(left + towerWidth / 2 - 1, top - 1 - domeRows.length - 4, 1, 4, domeShade);
    }
  };
}

function swimmingPool(cx: number): Painter {
  const width = 104;
  const wallHeight = 14;
  const left = cx - width / 2;
  const waterTop = GROUND_Y - wallHeight - 3;
  const tile = hex("#e8eef2");
  const grout = hex("#b8c6d0");
  const water = hex("#3fa9d8");
  const crest = hex("#bfe9f7");
  const ropeA = hex("#d8463a");
  const ropeB = hex("#f4f4f4");
  const block = hex("#5d6878");
  const rail = hex("#c4c8d0");
  return (pixels, from, to) => {
    if (left + width < from || left > to) return;
    pixels.rect(left, waterTop, width, 3, water);
    for (let x = left; x < left + width; x += 6) pixels.rect(x + ((x / 6) % 2), waterTop, 3, 1, crest);
    for (let x = left + 2; x < left + width - 2; x += 4) pixels.rect(x, waterTop + 1, 2, 1, (x / 4) % 2 < 1 ? ropeA : ropeB);
    pixels.rect(left, GROUND_Y - wallHeight, width, wallHeight, tile);
    for (let y = GROUND_Y - wallHeight + 4; y < GROUND_Y; y += 5) pixels.rect(left, y, width, 1, grout);
    for (let x = left + 7; x < left + width; x += 8) pixels.rect(x, GROUND_Y - wallHeight, 1, wallHeight, grout);
    pixels.rect(left + 4, waterTop - 8, 8, 8, block);
    pixels.rect(left + 4, waterTop - 9, 9, 2, ropeB);
    pixels.rect(left + width - 10, waterTop - 10, 1, 13, rail);
    pixels.rect(left + width - 5, waterTop - 10, 1, 13, rail);
    pixels.rect(left + width - 10, waterTop - 10, 6, 1, rail);
  };
}

function tennisCourt(cx: number): Painter {
  const fenceWidth = 130;
  const fenceHeight = 42;
  const left = cx - fenceWidth / 2;
  const post = hex("#2c4a3c");
  const mesh = hex("#3f6c56");
  const court = hex("#c8643a");
  const line = hex("#f4f4f4");
  const net = hex("#1d2a24");
  const ball = hex("#d7e84a");
  return (pixels, from, to) => {
    if (left + fenceWidth < from || left > to) return;
    const top = GROUND_Y - fenceHeight;
    for (let y = top; y < GROUND_Y - 4; y++) {
      for (let x = left; x < left + fenceWidth; x++) {
        if ((x + y) % 6 === 0 || (x - y + 600) % 6 === 0) pixels.dot(x, y, mesh);
      }
    }
    for (let x = left; x <= left + fenceWidth; x += 26) pixels.rect(x, top - 2, 2, fenceHeight + 2, post);
    pixels.rect(left, top - 2, fenceWidth + 2, 2, post);
    pixels.rect(left, GROUND_Y - 4, fenceWidth + 2, 4, court);
    pixels.rect(left + 4, GROUND_Y - 3, fenceWidth - 6, 1, line);
    const netLeft = cx + 14;
    pixels.rect(netLeft, GROUND_Y - 13, 2, 13, post);
    pixels.rect(netLeft + 34, GROUND_Y - 13, 2, 13, post);
    for (let y = GROUND_Y - 11; y < GROUND_Y - 3; y += 2) pixels.rect(netLeft + 2, y, 32, 1, net);
    for (let x = netLeft + 3; x < netLeft + 34; x += 3) pixels.rect(x, GROUND_Y - 11, 1, 8, net);
    pixels.rect(netLeft + 2, GROUND_Y - 12, 32, 1, line);
    disc(cx - 30, GROUND_Y - 26, 2, ball)(pixels, from, to);
  };
}

function skiTouringSlope(left: number, right: number, peak: number): Painter {
  const snow = hex("#f4f8fb");
  const snowShade = hex("#c9d6e6");
  const track = hex("#8ea6c9");
  const ski = hex("#d8463a");
  const pole = hex("#5d6878");
  return (pixels, from, to) => {
    if (right < from || left > to) return;
    const heightAt = (x: number) => {
      const t = Math.min(1, Math.max(0, (x - left) / (right - left)));
      return Math.round(peak * t * t * (3 - 2 * t));
    };
    for (let x = Math.max(left, Math.floor(from)); x < Math.min(to, right + 400); x++) {
      const height = heightAt(x);
      pixels.rect(x, GROUND_Y - height, 1, height, snow);
      pixels.rect(x, GROUND_Y - Math.min(height, 3), 1, Math.min(height, 3), snowShade);
    }
    for (let x = left + 10; x < right; x += 2) {
      const zig = Math.abs(((x - left) % 40) - 20) / 20;
      const height = heightAt(x);
      const y = GROUND_Y - Math.round(height * (0.35 + zig * 0.4));
      if (height > 6) pixels.dot(x, y, track);
    }
    const skisX = left + Math.round((right - left) * 0.2);
    const skisTop = GROUND_Y - heightAt(skisX) - 16;
    pixels.rect(skisX, skisTop, 2, 18, ski);
    pixels.rect(skisX + 3, skisTop + 1, 2, 17, ski);
    pixels.rect(skisX + 7, skisTop - 2, 1, 20, pole);
    pixels.rect(skisX + 6, skisTop - 2, 3, 1, pole);
  };
}

function jukebox(cx: number): Painter {
  const width = 28;
  const height = 46;
  const left = cx - width / 2;
  const top = GROUND_Y - height;
  const radius = width / 2;
  const wood = hex("#7a3e2a");
  const woodShade = hex("#5a2a1c");
  const neon = [hex("#ff6fb5"), hex("#ffd166"), hex("#5fe3e8")];
  const glass = hex("#2b1f45");
  const record = INK;
  const label = hex("#ffd166");
  const grille = hex("#c9a46a");
  return (pixels, from, to) => {
    if (left + width < from || left > to) return;
    for (let dy = 0; dy < radius; dy++) {
      const half = Math.round(Math.sqrt(radius * radius - (radius - dy) * (radius - dy)));
      pixels.rect(cx - half, top + dy, half * 2, 1, wood);
    }
    pixels.rect(left, top + radius, width, height - radius, wood);
    pixels.rect(left + width - 3, top + radius, 3, height - radius, woodShade);
    neon.forEach((color, band) => {
      const r = radius - 3 - band * 2;
      for (let dy = 0; dy < r; dy++) {
        const half = Math.round(Math.sqrt(r * r - (r - dy) * (r - dy)));
        pixels.dot(cx - half, top + radius - r + dy, color);
        pixels.dot(cx + half - 1, top + radius - r + dy, color);
      }
      pixels.rect(cx - r, top + radius, 1, 20, color);
      pixels.rect(cx + r - 1, top + radius, 1, 20, color);
    });
    pixels.rect(cx - 6, top + 8, 12, 12, glass);
    disc(cx, top + 14, 4, record)(pixels, from, to);
    pixels.rect(cx - 1, top + 13, 2, 2, label);
    for (let y = top + 26; y < GROUND_Y - 6; y += 2) pixels.rect(cx - 6, y, 12, 1, grille);
    pixels.rect(left + 2, GROUND_Y - 3, width - 4, 3, woodShade);
  };
}

const MOUNTAIN_FAR: MountainStyle = {
  lit: hex("#8ea6c9"),
  shade: hex("#6f86ab"),
  snow: hex("#f4f8fb"),
  snowShade: hex("#c9d6e6"),
  height: 112,
  spacing: 90,
  seed: 3,
  snowDepth: 22,
};

const MOUNTAIN_NEAR: MountainStyle = {
  lit: hex("#4f6c93"),
  shade: hex("#3d5577"),
  snow: hex("#e8f0f6"),
  snowShade: hex("#b5c6da"),
  height: 76,
  spacing: 70,
  seed: 11,
  snowDepth: 12,
};

export const ZONE_ART: Record<ZoneId, ZoneArt> = {
  start: {
    sky: [hex("#7fa9d8"), hex("#f7d3aa")],
    ground: [{ frame: TILES.grass, from: 0 }],
    groundTint: [255, 255, 255],
    layers: [
      { depth: 0.6, paint: clouds(hex("#fbeee0"), 120, 1) },
      {
        depth: 0.5,
        paint: mountains({
          lit: hex("#bcc5de"),
          shade: hex("#aab4d0"),
          snow: hex("#f1f4f9"),
          snowShade: hex("#d9e0ee"),
          height: 52,
          spacing: 60,
          seed: 31,
          snowDepth: 10,
        }),
      },
      { depth: 0.35, paint: twinTowerChurch(300, hex("#8f7fae"), hex("#7c6c9c"), hex("#6fa48e"), hex("#558a75")) },
      {
        depth: 0.35,
        paint: oldTown({ wall: hex("#a89cc4"), shade: hex("#9488b4"), roof: hex("#9a7fa8"), minHeight: 14, maxHeight: 24, seed: 5 }),
      },
      {
        depth: 0.2,
        paint: oldTown({
          wall: hex("#4f4d7c"),
          shade: hex("#3f3d68"),
          roof: hex("#8a4a52"),
          window: hex("#f3d27a"),
          minHeight: 16,
          maxHeight: 28,
          seed: 9,
        }),
      },
    ],
    filmRollCover: TILES.fenceB,
    props: [
      { frame: TILES.sproutA, x: 120 },
      { frame: TILES.fenceA, x: 250 },
      { frame: TILES.fenceB, x: 268 },
    ],
  },
  "career-road": {
    sky: [hex("#4f9ee0"), hex("#cdeaf7")],
    ground: [{ frame: TILES.grass, from: 0 }],
    groundTint: [255, 255, 255],
    layers: [
      { depth: 0.6, paint: clouds(hex("#ffffff"), 150, 4) },
      { depth: 0.4, paint: hills(hex("#94c6a6"), 40, 10, 50, 1) },
      { depth: 0.2, paint: hills(hex("#5f9d7d"), 20, 8, 30, 4) },
      { depth: 0, paint: jetEngineHangar(900) },
    ],
    filmRollCover: TILES.flag,
    props: [
      { frame: TILES.sproutB, x: 160 },
      { frame: TILES.sproutA, x: 330 },
      { frame: TILES.fenceA, x: 470 },
      { frame: TILES.fenceB, x: 488 },
      { frame: TILES.mushroom, x: 640 },
    ],
  },
  "maker-workshop": {
    sky: [hex("#d4734f"), hex("#f6d58e")],
    ground: [{ frame: TILES.sand, from: 0 }],
    groundTint: [255, 240, 225],
    layers: [
      { depth: 0.5, paint: hills(hex("#c27c5a"), 34, 10, 40, 2) },
      { depth: 0.2, paint: workshop(130, 180, hex("#6a3a32"), hex("#f4c46a")) },
      { depth: 0.2, paint: workshop(430, 150, hex("#6a3a32"), hex("#f4c46a")) },
    ],
    filmRollCover: TILES.fenceA,
    props: [
      { frame: TILES.fenceA, x: 160 },
      { frame: TILES.sproutB, x: 480 },
    ],
  },
  "photography-trail": {
    sky: [hex("#3d8f9a"), hex("#f4d79a")],
    ground: [{ frame: TILES.grass, from: 0 }],
    groundTint: [235, 255, 235],
    layers: [
      { depth: 0.6, paint: clouds(hex("#fdf1d6"), 170, 8) },
      { depth: 0.45, paint: mountains({ ...MOUNTAIN_FAR, seed: 21, height: 100 }, [160, 520]) },
      { depth: 0.4, paint: hills(hex("#78b49a"), 30, 10, 60, 6) },
      { depth: 0.25, paint: mountains({ ...MOUNTAIN_NEAR, seed: 23 }, [220, 440]) },
      { depth: 0.2, paint: hills(hex("#3f7f6e"), 14, 6, 26, 7) },
      { depth: 0.2, paint: pines(hex("#2f5a4a"), 26, 5, [230, 430]) },
    ],
    filmRollCover: TILES.sproutA,
    props: [
      { frame: TILES.sproutA, x: 110 },
      { frame: TILES.mushroom, x: 560 },
      { frame: TILES.sproutB, x: 720 },
      { frame: TILES.fenceA, x: 880 },
      { frame: TILES.sproutA, x: 1060 },
      { frame: TILES.mushroom, x: 1200 },
    ],
  },
  sport: {
    sky: [hex("#2f6cc0"), hex("#c4e3f5")],
    ground: [
      { frame: TILES.grass, from: 0 },
      { frame: TILES.snow, from: 310 },
    ],
    groundTint: [255, 255, 255],
    layers: [
      { depth: 0.55, paint: mountains(MOUNTAIN_FAR) },
      { depth: 0.3, paint: mountains(MOUNTAIN_NEAR, [260, 640]) },
      { depth: 0.15, paint: pines(hex("#2c5446"), 22, 9, [300, 560]) },
      { depth: 0, paint: swimmingPool(80) },
      { depth: 0, paint: tennisCourt(240) },
      { depth: 0, paint: skiTouringSlope(310, 470, 72) },
    ],
    filmRollCover: TILES.fenceA,
    props: [
      { frame: TILES.snowman, x: 340 },
      { frame: TILES.sproutA, x: 18 },
    ],
  },
  "music-and-games": {
    sky: [hex("#171436"), hex("#4b2c6c")],
    ground: [{ frame: TILES.grass, from: 0 }],
    groundTint: [140, 130, 200],
    layers: [
      { depth: 0.7, paint: stars(hex("#fff2b0"), 2) },
      { depth: 0.65, paint: disc(240, 34, 10, hex("#f3ecd0")) },
      { depth: 0.4, paint: hills(hex("#2c2458"), 34, 10, 40, 3) },
      { depth: 0.2, paint: skyline(hex("#1f1a40"), hex("#17132f"), hex("#e86fb0"), 17, 50) },
      { depth: 0, paint: jukebox(212) },
    ],
    filmRollCover: TILES.mushroom,
    props: [{ frame: TILES.mushroom, x: 60 }],
  },
  contact: {
    sky: [hex("#e0706a"), hex("#fcd8a0")],
    ground: [{ frame: TILES.grass, from: 0 }],
    groundTint: [255, 225, 205],
    layers: [
      { depth: 0.7, paint: disc(200, 110, 26, hex("#ffe07a"), hex("#f6a35e")) },
      { depth: 0.4, paint: hills(hex("#9a5a7a"), 34, 10, 40, 5) },
      { depth: 0.2, paint: hills(hex("#6c3e66"), 16, 6, 24, 8) },
    ],
    filmRollCover: TILES.sproutB,
    props: [
      { frame: TILES.flag, x: 290 },
      { frame: TILES.sproutB, x: 40 },
    ],
  },
};

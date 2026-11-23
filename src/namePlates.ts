import { content, zoneById, type Footprint } from "./content";
import { footprintRect, HUB_SIGNPOSTS, OVERWORLD_TILE_SIZE, tileAhead, type Direction, type Tile } from "./overworld";
import { PIXEL_FONT_CELL_HEIGHT, PIXEL_FONT_CELL_WIDTH } from "./pixel-font";

export const LABEL_PADDING = 2;
export const NAME_PLATE_WRAP_WIDTH = 120;
/** Tiles from the Player to the nearest tile of a footprint within which its name plate shows. */
const NAME_PLATE_RANGE = 2;

/** The Zone title is fixed to the top of the view, so at the map's top edge it covers this band of the map. */
export const ZONE_TITLE_Y = 8;
export const ZONE_TITLE_BOTTOM = ZONE_TITLE_Y + PIXEL_FONT_CELL_HEIGHT + LABEL_PADDING * 2;

export type NamePlate = { text: string; at: Footprint };

/** Pixel bounds on the map; right and bottom are exclusive. */
export type PlateBox = { left: number; top: number; right: number; bottom: number };

export const NAME_PLATES: readonly NamePlate[] = [
  ...content.zones.flatMap((zone) => zone.pointsOfInterest).map((poi) => ({ text: poi.title, at: poi.placement })),
  ...HUB_SIGNPOSTS.map((signpost) => ({ text: signpost.leadsTo.map((id) => zoneById(id).title).join(" / "), at: signpost.tile })),
];

export function needsWrap(text: string): boolean {
  return text.length * PIXEL_FONT_CELL_WIDTH > NAME_PLATE_WRAP_WIDTH;
}

/** Lines the text wraps onto, breaking between words like Kaplay does. */
function lineCount(text: string): number {
  if (!needsWrap(text)) return 1;
  const maxChars = Math.floor(NAME_PLATE_WRAP_WIDTH / PIXEL_FONT_CELL_WIDTH);
  let lines = 1;
  let length = 0;
  for (const word of text.split(" ")) {
    const next = length === 0 ? word.length : length + 1 + word.length;
    if (next > maxChars && length > 0) {
      lines++;
      length = word.length;
    } else length = next;
  }
  return lines;
}

/**
 * The plate sits one pixel above its footprint, centred across it, but never rises into the Zone title's band at the
 * top of the map.
 */
export function namePlateBox({ text, at }: NamePlate): PlateBox {
  // Kaplay reports a wrapped text's width as its wrap width.
  const textWidth = needsWrap(text) ? NAME_PLATE_WRAP_WIDTH : text.length * PIXEL_FONT_CELL_WIDTH;
  const width = textWidth + LABEL_PADDING * 2;
  const height = lineCount(text) * PIXEL_FONT_CELL_HEIGHT + LABEL_PADDING * 2;
  const { left, right, top } = footprintRect(at);
  const centre = ((left + right + 1) * OVERWORLD_TILE_SIZE) / 2;
  const bottom = Math.max(top * OVERWORLD_TILE_SIZE - 1, ZONE_TITLE_BOTTOM + 1 + height);
  return { left: centre - width / 2, top: bottom - height, right: centre + width / 2, bottom };
}

/** Columns and rows from the Player to the footprint's tile nearest it. */
function offsetToNearestTile(player: Tile, footprint: Footprint): [number, number] {
  const { left, top, right, bottom } = footprintRect(footprint);
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
  return [clamp(player.col, left, right) - player.col, clamp(player.row, top, bottom) - player.row];
}

function overlaps(a: PlateBox, b: PlateBox) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/**
 * The plates near the Player, so close-set ones never pile up. Of two that would overlap, the nearer one shows; at
 * equal distance, the one further in the direction the Player faces.
 */
export function shownNamePlates(player: Tile, facing: Direction): NamePlate[] {
  const ahead = tileAhead({ col: 0, row: 0 }, facing);
  const rank = ({ at }: NamePlate) => {
    const [dx, dy] = offsetToNearestTile(player, at);
    return { distance: dx * dx + dy * dy, towards: dx * ahead.col + dy * ahead.row };
  };
  const nearby = NAME_PLATES.filter(({ at }) => {
    const [dx, dy] = offsetToNearestTile(player, at);
    return Math.max(Math.abs(dx), Math.abs(dy)) <= NAME_PLATE_RANGE;
  });
  const ordered = nearby
    .map((plate) => ({ plate, ...rank(plate) }))
    .sort((a, b) => a.distance - b.distance || b.towards - a.towards)
    .map(({ plate }) => plate);
  const shown: NamePlate[] = [];
  for (const plate of ordered) {
    if (shown.every((other) => !overlaps(namePlateBox(plate), namePlateBox(other)))) shown.push(plate);
  }
  return shown;
}

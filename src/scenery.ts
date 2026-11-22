import { tileAhead, type Direction, type Tile } from "./overworld";

export type SceneryArt =
  | "workbench"
  | "computer"
  | "printer"
  | "anvil"
  | "barrel"
  | "wheelbarrow"
  | "archery-target"
  | "tennis-net"
  | "life-ring"
  | "skis"
  | "kit-chest"
  | "jukebox"
  | "speaker"
  | "arcade-cabinet";

/** A themed object drawn over a solid tile: a Point of Interest, or a prop on an `o` tile of the map. */
export type SceneryPiece = { at: Tile; art: SceneryArt };

export const SCENERY: readonly SceneryPiece[] = [
  // Maker workshop
  { at: { col: 19, row: 22 }, art: "computer" },
  { at: { col: 15, row: 24 }, art: "printer" },
  { at: { col: 11, row: 22 }, art: "workbench" },
  { at: { col: 7, row: 24 }, art: "computer" },
  { at: { col: 14, row: 20 }, art: "workbench" },
  { at: { col: 15, row: 20 }, art: "anvil" },
  { at: { col: 19, row: 26 }, art: "wheelbarrow" },
  { at: { col: 9, row: 28 }, art: "barrel" },
  // Sport
  { at: { col: 27, row: 36 }, art: "life-ring" },
  { at: { col: 20, row: 34 }, art: "tennis-net" },
  { at: { col: 19, row: 34 }, art: "tennis-net" },
  { at: { col: 21, row: 34 }, art: "tennis-net" },
  { at: { col: 10, row: 36 }, art: "skis" },
  { at: { col: 3, row: 37 }, art: "archery-target" },
  { at: { col: 5, row: 37 }, art: "archery-target" },
  { at: { col: 7, row: 44 }, art: "kit-chest" },
  // Music & games
  { at: { col: 36, row: 34 }, art: "jukebox" },
  { at: { col: 35, row: 34 }, art: "speaker" },
  { at: { col: 37, row: 34 }, art: "speaker" },
  { at: { col: 52, row: 37 }, art: "arcade-cabinet" },
  { at: { col: 53, row: 37 }, art: "arcade-cabinet" },
  { at: { col: 54, row: 37 }, art: "arcade-cabinet" },
  { at: { col: 49, row: 41 }, art: "speaker" },
];

const sceneryByTile = new Map(SCENERY.map((piece) => [`${piece.at.col},${piece.at.row}`, piece] as const));

export function sceneryAt({ col, row }: Tile): SceneryPiece | undefined {
  return sceneryByTile.get(`${col},${row}`);
}

/** Sides a piece of scenery can hide a Film roll from: in front of it (south) or beside it. */
const COVER_SIDES: Direction[] = ["down", "left", "right"];

/** The side of the Film roll's tile whose scenery it peeks out from behind, if any. */
export function filmRollCover(tile: Tile): Direction | undefined {
  return COVER_SIDES.find((side) => sceneryAt(tileAhead(tile, side)));
}

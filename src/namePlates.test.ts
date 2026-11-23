import { describe, expect, it } from "vitest";
import { NAME_PLATES, namePlateBox, shownNamePlates, ZONE_TITLE_BOTTOM, type PlateBox } from "./namePlates";
import { DIRECTIONS, isReachableFromSpawn, MAP_COLUMNS, MAP_ROWS, type Tile } from "./overworld";

function overlaps(a: PlateBox, b: PlateBox) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

function reachableTiles(): Tile[] {
  const tiles: Tile[] = [];
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLUMNS; col++) if (isReachableFromSpawn({ col, row })) tiles.push({ col, row });
  }
  return tiles;
}

const titles = (player: Tile, facing: (typeof DIRECTIONS)[number]) => shownNamePlates(player, facing).map((plate) => plate.text);

describe("Name plates", () => {
  it("names every Point of Interest and every Hub signpost", () => {
    expect(NAME_PLATES.map((plate) => plate.text)).toEqual(expect.arrayContaining(["framewise", "Maker workshop", "Darkroom", "Sport / Music & games"]));
  });

  it("sits just above its tile, centred on it", () => {
    expect(namePlateBox({ text: "Darkroom", at: { col: 22, row: 3 } })).toEqual({ left: 334, top: 33, right: 386, bottom: 47 });
  });

  it("sits just above a footprint's top row, centred across the whole footprint", () => {
    expect(namePlateBox({ text: "Darkroom", at: { col: 40, row: 19, width: 7, height: 4 } })).toEqual({
      left: 670,
      top: 289,
      right: 722,
      bottom: 303,
    });
  });

  it("shows a footprint's plate when the Player is near any of its edges", () => {
    for (const player of [{ col: 43, row: 23 }, { col: 47, row: 20 }, { col: 82, row: 24 }, { col: 87, row: 21 }]) {
      const expected = player.col < 48 ? "Technical University of Munich" : "MTU Aero Engines";
      expect(titles(player, "up"), `${player.col},${player.row}`).toContain(expected);
    }
    expect(titles({ col: 43, row: 26 }, "up")).not.toContain("Technical University of Munich");
  });

  it("shows the plates within two tiles of the Player", () => {
    expect(titles({ col: 40, row: 23 }, "up")).toEqual(["Technical University of Munich"]);
    expect(titles({ col: 29, row: 24 }, "down")).toEqual([]);
  });

  it("shows only one of two plates that would overlap, the nearer one or else the one the Player faces", () => {
    expect(titles({ col: 21, row: 23 }, "left")).toEqual(["framewise"]);
    expect(titles({ col: 21, row: 23 }, "right")).toEqual(["Maker workshop"]);
  });

  it("never shows two name plates that overlap, wherever the Player stands and faces", () => {
    for (const tile of reachableTiles()) {
      for (const facing of DIRECTIONS) {
        const boxes = shownNamePlates(tile, facing).map(namePlateBox);
        for (const [index, a] of boxes.entries()) {
          for (const b of boxes.slice(index + 1)) expect(overlaps(a, b), `${tile.col},${tile.row} ${facing}`).toBe(false);
        }
      }
    }
  });

  it("keeps every plate below the Zone title, even at the top edge of the map", () => {
    for (const plate of NAME_PLATES) expect(namePlateBox(plate).top, plate.text).toBeGreaterThan(ZONE_TITLE_BOTTOM);
  });
});

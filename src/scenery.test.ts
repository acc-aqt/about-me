import { describe, expect, it } from "vitest";
import { content, type ZoneId } from "./content";
import { isWalkable, zoneAt } from "./overworld";
import { filmRollCover, SCENERY, sceneryAt } from "./scenery";

const themedZones: ZoneId[] = ["maker-workshop", "sport", "music-and-games"];
const zone = (id: ZoneId) => content.zones.find((candidate) => candidate.id === id)!;

describe("Scenery", () => {
  it("draws every Point of Interest in the Maker workshop, Sport and Music & games as a themed object", () => {
    for (const id of themedZones) {
      for (const poi of zone(id).pointsOfInterest) expect(sceneryAt(poi.placement), poi.id).toBeDefined();
    }
  });

  it("gives the Maker workshop workbenches and a 3D printer, and Sport and Music & games their own props", () => {
    const artIn = (id: ZoneId) => SCENERY.filter((piece) => zoneAt(piece.at) === id).map((piece) => piece.art);
    expect(artIn("maker-workshop")).toEqual(expect.arrayContaining(["workbench", "printer"]));
    expect(artIn("sport")).toEqual(expect.arrayContaining(["archery-target", "tennis-net"]));
    expect(artIn("music-and-games")).toEqual(expect.arrayContaining(["jukebox", "speaker", "arcade-cabinet"]));
  });

  it("only puts scenery on solid tiles, one piece per tile", () => {
    const keys = SCENERY.map(({ at }) => `${at.col},${at.row}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const piece of SCENERY) expect(isWalkable(piece.at), `${piece.art} at ${piece.at.col},${piece.at.row}`).toBe(false);
  });

  it("tucks each of these Zones' Film rolls behind a piece of scenery below or beside it", () => {
    for (const id of themedZones) expect(filmRollCover(zone(id).filmRoll!), id).toMatch(/^(down|left|right)$/);
  });

  it("leaves a Film roll with no scenery next to it uncovered", () => {
    expect(filmRollCover({ col: 30, row: 20 })).toBeUndefined();
  });
});

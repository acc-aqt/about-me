import { describe, expect, it } from "vitest";
import { SCENERY_PROPS, THEMED_PROPS, themedProp } from "./art";
import { content, zoneById, type ZoneId } from "./content";
import { MAP_COLUMNS, MAP_ROWS, tileKindAt, zoneAt } from "./overworld";

const themedZones: ZoneId[] = ["maker-workshop", "sport", "music-and-games"];

describe("Overworld art", () => {
  it("draws every trip on the Photography trail as a camera stand and the Darkroom as its door", () => {
    const trail = zoneById("photography-trail").pointsOfInterest;
    const props = trail.map((poi) => themedProp(poi.id));
    expect(props.slice(0, -1).every((prop) => prop === "camera stand")).toBe(true);
    expect(props.at(-1)).toBe("darkroom door");
  });

  it("draws the intro, the Career road stops and the Contact mailbox as themed objects", () => {
    const ids = content.zones
      .filter((zone) => ["start", "career-road", "contact"].includes(zone.id))
      .flatMap((zone) => zone.pointsOfInterest.map((poi) => poi.id));
    expect(Object.fromEntries(ids.map((id) => [id, themedProp(id)]))).toEqual({
      intro: "welcome board",
      tum: "university",
      "bmw-group": "office tower",
      "canberra-detour": "kangaroo sign",
      "forward-engineering": "composites works",
      "arrk-engineering": "office block",
      mtu: "jet engine",
      "contact-board": "mailbox",
    });
  });

  it("keys every themed object by the id of a real Point of Interest", () => {
    const ids = content.zones.flatMap((zone) => zone.pointsOfInterest.map((poi) => poi.id));
    expect(Object.keys(THEMED_PROPS).filter((id) => !ids.includes(id))).toEqual([]);
  });

  it("has no themed object for an unknown Point of Interest, which keeps the signpost", () => {
    expect(themedProp("no-such-point")).toBeUndefined();
  });

  it("draws every Point of Interest in the Maker workshop, Sport and Music & games as a themed object", () => {
    for (const id of themedZones) {
      for (const poi of zoneById(id).pointsOfInterest) expect(themedProp(poi.id), poi.id).toBeDefined();
    }
  });

  it("dresses the Maker workshop with workbenches and a 3D printer, and Sport and Music & games with their own props", () => {
    const propsIn = (id: ZoneId) => [
      ...zoneById(id).pointsOfInterest.map((poi) => themedProp(poi.id)),
      ...SCENERY_PROPS.filter(({ at }) => zoneAt(at) === id).map(({ prop }) => prop),
    ];
    expect(propsIn("maker-workshop")).toEqual(expect.arrayContaining(["workbench", "3D printer", "anvil"]));
    expect(propsIn("sport")).toEqual(expect.arrayContaining(["archery target", "tennis net", "skis", "life ring"]));
    expect(propsIn("music-and-games")).toEqual(expect.arrayContaining(["jukebox", "speaker", "arcade cabinet"]));
  });

  it("stands a scenery prop on every prop tile of the map, and nowhere else", () => {
    const propTiles: string[] = [];
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLUMNS; col++) if (tileKindAt({ col, row }) === "prop") propTiles.push(`${col},${row}`);
    }
    expect(SCENERY_PROPS.map(({ at }) => `${at.col},${at.row}`).sort()).toEqual(propTiles.sort());
  });
});

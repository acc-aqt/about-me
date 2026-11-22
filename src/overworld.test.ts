import { describe, expect, it } from "vitest";
import { content } from "./content";
import { DIRECTIONS, facedPointOfInterest, fastTravelLanding, isReachableFromSpawn, isWalkable, tileAhead, LEGEND, MAP_COLUMNS, OVERWORLD_MAP, SPAWN, tileKindAt, type Tile, ZONE_RECTS, zoneAt } from "./overworld";

const zoneIds = content.zones.map((zone) => zone.id);
const pointsOfInterest = content.zones.flatMap((zone) => zone.pointsOfInterest);
function neighbours(tile: Tile) {
  return DIRECTIONS.map((direction) => tileAhead(tile, direction));
}

/** Fewest steps from any walkable Hub tile to stand next to the target. */
function stepsFromHubTo(target: Tile) {
  const key = ({ col, row }: Tile) => `${col},${row}`;
  const goals = new Set(neighbours(target).map(key));
  const seen = new Set<string>();
  let frontier: Tile[] = [];
  for (const [row, line] of OVERWORLD_MAP.entries()) {
    for (const col of line.split("").keys()) {
      const tile = { col, row };
      if (zoneAt(tile) === "start" && isWalkable(tile)) {
        frontier.push(tile);
        seen.add(key(tile));
      }
    }
  }
  for (let steps = 0; frontier.length > 0; steps++) {
    if (frontier.some((tile) => goals.has(key(tile)))) return steps;
    frontier = frontier.flatMap(neighbours).filter((tile) => isWalkable(tile) && !seen.has(key(tile)));
    frontier.forEach((tile) => seen.add(key(tile)));
  }
  return Infinity;
}

describe("Overworld", () => {
  it("lets the Player walk on grass and paths but not into trees, water or off the map", () => {
    expect(isWalkable(SPAWN)).toBe(true);
    expect(isWalkable({ col: 30, row: 16 })).toBe(true);
    expect(isWalkable({ col: 0, row: 0 })).toBe(false);
    expect(isWalkable({ col: 40, row: 12 })).toBe(false);
    expect(isWalkable({ col: -1, row: 23 })).toBe(false);
    expect(isWalkable({ col: 60, row: 23 })).toBe(false);
  });

  it("is a rectangular text tilemap of about 60 by 50 tiles using only legend characters", () => {
    expect(MAP_COLUMNS).toBe(60);
    expect(OVERWORLD_MAP.length).toBe(50);
    for (const [row, line] of OVERWORLD_MAP.entries()) {
      expect(line.length, `row ${row}`).toBe(MAP_COLUMNS);
      expect([...line].filter((char) => !(char in LEGEND)), `row ${row}`).toEqual([]);
    }
    expect(tileKindAt({ col: 30, row: 16 })).toBe("path");
    expect(tileKindAt({ col: 40, row: 12 })).toBe("water");
  });

  it("spawns the Player in the Munich Hub", () => {
    expect(zoneAt(SPAWN)).toBe("start");
  });

  it("names the Zone that contains a tile, and none for tiles between Zones", () => {
    expect(zoneAt({ col: 30, row: 10 })).toBe("photography-trail");
    expect(zoneAt({ col: 50, row: 23 })).toBe("career-road");
    expect(zoneAt({ col: 10, row: 23 })).toBe("maker-workshop");
    expect(zoneAt({ col: 31, row: 31 })).toBeUndefined();
  });

  it("keeps Zone rectangles from overlapping", () => {
    for (const [index, a] of zoneIds.entries()) {
      for (const b of zoneIds.slice(index + 1)) {
        const ra = ZONE_RECTS[a];
        const rb = ZONE_RECTS[b];
        const overlaps = ra.left <= rb.right && rb.left <= ra.right && ra.top <= rb.bottom && rb.top <= ra.bottom;
        expect(overlaps, `${a} and ${b}`).toBe(false);
      }
    }
  });

  it("places every Point of Interest and Film roll inside its own Zone's rectangle", () => {
    for (const zone of content.zones) {
      for (const poi of zone.pointsOfInterest) expect(zoneAt(poi.placement), poi.id).toBe(zone.id);
      expect(zone.filmRoll && zoneAt(zone.filmRoll), `${zone.id} Film roll`).toBe(zone.id);
    }
  });

  it("finds the tile ahead in each direction, with up as north", () => {
    expect(tileAhead({ col: 10, row: 10 }, "up")).toEqual({ col: 10, row: 9 });
    expect(tileAhead({ col: 10, row: 10 }, "down")).toEqual({ col: 10, row: 11 });
    expect(tileAhead({ col: 10, row: 10 }, "left")).toEqual({ col: 9, row: 10 });
    expect(tileAhead({ col: 10, row: 10 }, "right")).toEqual({ col: 11, row: 10 });
  });

  it("makes Points of Interest solid", () => {
    for (const poi of pointsOfInterest) expect(isWalkable(poi.placement), poi.id).toBe(false);
  });

  it("does not reach tiles walled off from the spawn", () => {
    expect(isReachableFromSpawn(SPAWN)).toBe(true);
    expect(isReachableFromSpawn({ col: 0, row: 0 })).toBe(false);
  });

  it("gives every Point of Interest a walkable neighbour reachable from the spawn", () => {
    for (const poi of pointsOfInterest) {
      expect(neighbours(poi.placement).some(isReachableFromSpawn), poi.id).toBe(true);
    }
  });

  it("lets the Player walk onto every Film roll tile from the spawn", () => {
    for (const zone of content.zones) {
      expect(isReachableFromSpawn(zone.filmRoll!), zone.id).toBe(true);
    }
  });

  it("tucks every Film roll beside a tree, bush, building or fence so only a few pixels show", () => {
    for (const zone of content.zones) {
      const kinds = neighbours(zone.filmRoll!).map(tileKindAt);
      expect(kinds.some((kind) => kind && ["tree", "bush", "building", "fence"].includes(kind)), zone.id).toBe(true);
    }
  });

  it("puts each Zone's first Point of Interest within about 15 path tiles of the Hub", () => {
    for (const zone of content.zones) {
      expect(stepsFromHubTo(zone.pointsOfInterest[0].placement), zone.id).toBeLessThanOrEqual(15);
    }
  });

  it("lays the Career road out west to east in time order", () => {
    const cols = content.zones.find((zone) => zone.id === "career-road")!.pointsOfInterest.map((poi) => poi.placement.col);
    expect(cols).toEqual([40, 43, 46, 49, 52, 55]);
  });

  it("names the Point of Interest directly ahead of the Player, and none otherwise", () => {
    expect(facedPointOfInterest({ col: 40, row: 23 }, "up")?.id).toBe("tum");
    expect(facedPointOfInterest({ col: 43, row: 23 }, "down")?.id).toBe("bmw-group");
    expect(facedPointOfInterest({ col: 20, row: 2 }, "right")?.id).toBe("darkroom");
    expect(facedPointOfInterest({ col: 40, row: 23 }, "down")).toBeUndefined();
    expect(facedPointOfInterest({ col: 40, row: 24 }, "up")).toBeUndefined();
  });

  it("lands Fast-travel in front of a Zone's featured Point of Interest, facing it", () => {
    expect(fastTravelLanding("career-road")).toEqual({ tile: { col: 55, row: 23 }, facing: "up" });
    for (const zone of content.zones) {
      if (zone.fastTravelTo === undefined) continue;
      const landing = fastTravelLanding(zone.id);
      expect(isReachableFromSpawn(landing.tile), zone.id).toBe(true);
      expect(facedPointOfInterest(landing.tile, landing.facing)?.id, zone.id).toBe(zone.fastTravelTo);
    }
  });

  it("lands Fast-travel to a Zone without a featured Point of Interest where its path leaves the Hub, facing into the Zone", () => {
    expect(fastTravelLanding("photography-trail")).toEqual({ tile: { col: 30, row: 16 }, facing: "up" });
    expect(fastTravelLanding("maker-workshop")).toEqual({ tile: { col: 21, row: 23 }, facing: "left" });
    expect(fastTravelLanding("sport")).toEqual({ tile: { col: 30, row: 35 }, facing: "left" });
    expect(fastTravelLanding("music-and-games")).toEqual({ tile: { col: 31, row: 34 }, facing: "down" });
  });
});

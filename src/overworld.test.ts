import { describe, expect, it } from "vitest";
import { content, zoneById } from "./content";
import { DIRECTIONS, facedPointOfInterest, filmRollCover, fastTravelLanding, HUB_SIGNPOSTS, isReachableFromSpawn, isWalkable, tileAhead, tileKey as key, LEGEND, MAP_COLUMNS, OVERWORLD_MAP, SPAWN, tileKindAt, type Tile, type TileKind, ZONE_RECTS, zoneAt } from "./overworld";

const zoneIds = content.zones.map((zone) => zone.id);
const pointsOfInterest = content.zones.flatMap((zone) => zone.pointsOfInterest);
function tilesOfKind(kind: TileKind): Tile[] {
  return OVERWORLD_MAP.flatMap((line, row) => [...line].map((_, col) => ({ col, row }))).filter((tile) => tileKindAt(tile) === kind);
}

function neighbours(tile: Tile) {
  return DIRECTIONS.map((direction) => tileAhead(tile, direction));
}

/** Fewest steps from any walkable Hub tile to stand next to the target. */
function stepsFromHubTo(target: Tile) {
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
    frontier = frontier.flatMap(neighbours).filter((tile) => {
      if (!isWalkable(tile) || seen.has(key(tile))) return false;
      seen.add(key(tile));
      return true;
    });
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

  it("dresses the Munich Hub with a maypole and a well that the Player walks around", () => {
    for (const kind of ["maypole", "well"] as const) {
      const tiles = tilesOfKind(kind);
      expect(tiles.length, kind).toBeGreaterThan(0);
      for (const tile of tiles) {
        expect(zoneAt(tile), kind).toBe("start");
        expect(isWalkable(tile), kind).toBe(false);
      }
    }
  });

  it("puts a signpost at each Hub exit, naming the Zones its path leads to", () => {
    const named = HUB_SIGNPOSTS.flatMap((signpost) => signpost.leadsTo).sort();
    expect(named).toEqual(zoneIds.filter((id) => id !== "start" && id !== "contact").sort());
    for (const { tile, leadsTo } of HUB_SIGNPOSTS) {
      expect(zoneAt(tile), leadsTo.join()).toBe("start");
      expect(isWalkable(tile), leadsTo.join()).toBe(false);
      expect(neighbours(tile).some(isReachableFromSpawn), leadsTo.join()).toBe(true);
    }
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

  it("keeps Zone rectangles from overlapping, apart from Contact's corner inside the Hub", () => {
    for (const [index, a] of zoneIds.entries()) {
      for (const b of zoneIds.slice(index + 1)) {
        if ([a, b].includes("start") && [a, b].includes("contact")) continue;
        const ra = ZONE_RECTS[a];
        const rb = ZONE_RECTS[b];
        const overlaps = ra.left <= rb.right && rb.left <= ra.right && ra.top <= rb.bottom && rb.top <= ra.bottom;
        expect(overlaps, `${a} and ${b}`).toBe(false);
      }
    }
  });

  it("puts the Contact mailbox inside the Hub's clearing, a few steps from the spawn", () => {
    const hub = ZONE_RECTS.start;
    const contact = ZONE_RECTS.contact;
    expect(contact.left >= hub.left && contact.right <= hub.right && contact.top >= hub.top && contact.bottom <= hub.bottom).toBe(true);
    const [mailbox] = zoneById("contact").pointsOfInterest;
    expect(zoneAt(mailbox.placement)).toBe("contact");
    expect(zoneAt({ col: mailbox.placement.col, row: hub.top })).toBe("start");
    const landing = fastTravelLanding("contact").tile;
    expect(Math.abs(landing.col - SPAWN.col) + Math.abs(landing.row - SPAWN.row)).toBeLessThanOrEqual(8);
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

  it("hides each Film roll behind the cover beside it, preferring cover to the south, in front of it", () => {
    expect(filmRollCover({ col: 56, row: 9 })).toBe("down");
    expect(filmRollCover({ col: 55, row: 7 })).toBe("up");
    expect(filmRollCover({ col: 30, row: 16 })).toBe("left");
    expect(filmRollCover(SPAWN)).toBeUndefined();
    for (const zone of content.zones) expect(filmRollCover(zone.filmRoll!), zone.id).toBeDefined();
  });

  it("hides the Maker workshop, Sport and Music & games Film rolls behind the props in front of them", () => {
    for (const zone of content.zones.filter(({ id }) => ["maker-workshop", "sport", "music-and-games"].includes(id))) {
      expect(filmRollCover(zone.filmRoll!), zone.id).toBe("down");
      expect(tileKindAt(tileAhead(zone.filmRoll!, "down")), zone.id).toBe("prop");
    }
  });

  it("puts each Zone's first Point of Interest within about 15 path tiles of the Hub", () => {
    for (const zone of content.zones) {
      expect(stepsFromHubTo(zone.pointsOfInterest[0].placement), zone.id).toBeLessThanOrEqual(15);
    }
  });

  it("winds the Photography trail north from the Hub, each trip farther along it, ending at the Darkroom", () => {
    const trail = zoneById("photography-trail").pointsOfInterest;
    const distances = trail.map((poi) => stepsFromHubTo(poi.placement));
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    expect(new Set(distances).size).toBe(trail.length);
    expect(trail.at(-1)!.id).toBe("darkroom");
    expect(Math.min(...trail.map((poi) => poi.placement.row))).toBe(trail.at(-1)!.placement.row);
    expect(trail.every((poi) => poi.placement.row < ZONE_RECTS.start.top)).toBe(true);
  });

  it("puts the Darkroom on the door of its building, faced from the end of the trail below it", () => {
    const darkroom = zoneById("photography-trail").pointsOfInterest.at(-1)!.placement;
    expect(tileKindAt(darkroom)).toBe("building");
    expect(tileKindAt(tileAhead(darkroom, "up"))).toBe("building");
    expect(tileKindAt(tileAhead(darkroom, "down"))).toBe("path");
    expect(isReachableFromSpawn(tileAhead(darkroom, "down"))).toBe(true);
    for (const side of ["left", "right"] as const) expect(tileKindAt(tileAhead(darkroom, side)), side).toBe("building");
  });

  it("lays the Career road out west to east in time order", () => {
    const cols = zoneById("career-road").pointsOfInterest.map((poi) => poi.placement.col);
    expect(cols).toEqual([40, 43, 46, 49, 52, 55]);
  });

  it("names the Point of Interest directly ahead of the Player, and none otherwise", () => {
    expect(facedPointOfInterest({ col: 40, row: 23 }, "up")?.id).toBe("tum");
    expect(facedPointOfInterest({ col: 43, row: 23 }, "down")?.id).toBe("bmw-group");
    expect(facedPointOfInterest({ col: 22, row: 4 }, "up")?.id).toBe("darkroom");
    expect(facedPointOfInterest({ col: 40, row: 23 }, "down")).toBeUndefined();
    expect(facedPointOfInterest({ col: 40, row: 24 }, "up")).toBeUndefined();
  });

  it("lands Fast-travel in front of a Zone's featured Point of Interest, facing it", () => {
    expect(fastTravelLanding("career-road")).toEqual({ tile: { col: 55, row: 23 }, facing: "up" });
    expect(fastTravelLanding("music-and-games")).toEqual({ tile: { col: 36, row: 35 }, facing: "up" });
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
  });
});

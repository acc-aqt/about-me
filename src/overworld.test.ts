import { describe, expect, it } from "vitest";
import { content, zoneById, type Footprint } from "./content";
import {
  DIRECTIONS,
  facedPointOfInterest,
  filmRollCover,
  fastTravelLanding,
  footprintRect,
  footprintTiles,
  HUB_SIGNPOSTS,
  isReachableFromSpawn,
  isWalkable,
  tileAhead,
  tileKey as key,
  LEGEND,
  MAP_COLUMNS,
  MAP_ROWS,
  OVERWORLD_MAP,
  SPAWN,
  tileKindAt,
  type Direction,
  type Tile,
  type TileKind,
  ZONE_RECTS,
  zoneAt,
} from "./overworld";

const zoneIds = content.zones.map((zone) => zone.id);
const pointsOfInterest = content.zones.flatMap((zone) => zone.pointsOfInterest);
function tilesOfKind(kind: TileKind): Tile[] {
  return OVERWORLD_MAP.flatMap((line, row) => [...line].map((_, col) => ({ col, row }))).filter((tile) => tileKindAt(tile) === kind);
}

function neighbours(tile: Tile) {
  return DIRECTIONS.map((direction) => tileAhead(tile, direction));
}

/** The tiles just outside a footprint's edges, each with the direction that faces back into the footprint. */
function tilesAround(footprint: Footprint): { tile: Tile; facing: Direction }[] {
  const inside = new Set(footprintTiles(footprint).map(key));
  const facingBack: Record<Direction, Direction> = { up: "down", down: "up", left: "right", right: "left" };
  return footprintTiles(footprint).flatMap((tile) =>
    DIRECTIONS.map((direction) => ({ tile: tileAhead(tile, direction), facing: facingBack[direction] })).filter(
      ({ tile }) => !inside.has(key(tile)),
    ),
  );
}

/** Fewest steps from any walkable Hub tile to stand next to the target. */
function stepsFromHubTo(target: Footprint) {
  const goals = new Set(tilesAround(target).map(({ tile }) => key(tile)));
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
    expect(isWalkable({ col: MAP_COLUMNS, row: 23 })).toBe(false);
  });

  it("is a rectangular text tilemap of about 90 by 64 tiles using only legend characters", () => {
    expect(MAP_COLUMNS).toBe(90);
    expect(OVERWORLD_MAP.length).toBe(64);
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

  it("places every tile of every Point of Interest's footprint, and every Film roll, inside its own Zone's rectangle", () => {
    for (const zone of content.zones) {
      for (const poi of zone.pointsOfInterest) {
        for (const tile of footprintTiles(poi.placement)) expect(zoneAt(tile), `${poi.id} ${key(tile)}`).toBe(zone.id);
      }
      expect(zone.filmRoll && zoneAt(zone.filmRoll), `${zone.id} Film roll`).toBe(zone.id);
    }
  });

  it("finds the tile ahead in each direction, with up as north", () => {
    expect(tileAhead({ col: 10, row: 10 }, "up")).toEqual({ col: 10, row: 9 });
    expect(tileAhead({ col: 10, row: 10 }, "down")).toEqual({ col: 10, row: 11 });
    expect(tileAhead({ col: 10, row: 10 }, "left")).toEqual({ col: 9, row: 10 });
    expect(tileAhead({ col: 10, row: 10 }, "right")).toEqual({ col: 11, row: 10 });
  });

  it("makes every tile of a Point of Interest's footprint solid", () => {
    for (const poi of pointsOfInterest) {
      for (const tile of footprintTiles(poi.placement)) expect(isWalkable(tile), `${poi.id} ${key(tile)}`).toBe(false);
    }
  });

  it("names the Point of Interest from any tile beside its footprint, facing it", () => {
    for (const poi of pointsOfInterest) {
      for (const { tile, facing } of tilesAround(poi.placement)) {
        expect(facedPointOfInterest(tile, facing)?.id, `${poi.id} from ${key(tile)}`).toBe(poi.id);
      }
    }
  });

  it("keeps footprints apart from each other, from paths, signposts and Film rolls", () => {
    const taken = new Map<string, string>();
    for (const poi of pointsOfInterest) {
      for (const tile of footprintTiles(poi.placement)) {
        expect(taken.get(key(tile)), `${poi.id} ${key(tile)}`).toBeUndefined();
        taken.set(key(tile), poi.id);
        expect(tileKindAt(tile), `${poi.id} ${key(tile)}`).not.toBe("path");
      }
    }
    for (const { tile } of HUB_SIGNPOSTS) expect(taken.has(key(tile)), key(tile)).toBe(false);
    for (const zone of content.zones) expect(taken.has(key(zone.filmRoll!)), zone.id).toBe(false);
  });

  it("does not reach tiles walled off from the spawn", () => {
    expect(isReachableFromSpawn(SPAWN)).toBe(true);
    expect(isReachableFromSpawn({ col: 0, row: 0 })).toBe(false);
  });

  it("gives every Point of Interest a tile beside its footprint reachable from the spawn", () => {
    for (const poi of pointsOfInterest) {
      expect(tilesAround(poi.placement).some(({ tile }) => isReachableFromSpawn(tile)), poi.id).toBe(true);
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

  it("makes the Darkroom a whole hut, faced from the end of the trail below its door", () => {
    const darkroom = zoneById("photography-trail").pointsOfInterest.at(-1)!.placement;
    const { left, right, bottom } = footprintRect(darkroom);
    expect(footprintTiles(darkroom).every((tile) => tileKindAt(tile) === "building")).toBe(true);
    const belowDoor = { col: (left + right) / 2, row: bottom + 1 };
    expect(tileKindAt(belowDoor)).toBe("path");
    expect(isReachableFromSpawn(belowDoor)).toBe(true);
    expect(facedPointOfInterest(belowDoor, "up")?.id).toBe("darkroom");
  });

  it("lays the Career road out along one street, west to east in time order", () => {
    const rects = zoneById("career-road").pointsOfInterest.map((poi) => footprintRect(poi.placement));
    for (const [index, rect] of rects.slice(1).entries()) expect(rect.left).toBeGreaterThan(rects[index].right);
    const street = ZONE_RECTS["career-road"];
    const streetRow = rects[0].bottom + 1;
    for (let col = street.left; col <= rects.at(-1)!.right; col++) expect(tileKindAt({ col, row: streetRow }), `${col}`).toBe("path");
  });

  it("builds every Career road workplace at least as large as the Overworld's other buildings", () => {
    const workplaces = zoneById("career-road").pointsOfInterest.filter((poi) => poi.id !== "canberra-detour");
    for (const { id, placement } of workplaces) {
      expect(placement.width ?? 1, id).toBeGreaterThanOrEqual(5);
      expect(placement.height ?? 1, id).toBeGreaterThanOrEqual(3);
    }
    const fiz = workplaces.find((poi) => poi.id === "bmw-group")!.placement;
    expect(footprintTiles(fiz).length).toBe(Math.max(...workplaces.map((poi) => footprintTiles(poi.placement).length)));
  });

  it("parks the cars beside the FIZ on its asphalt lot, each two tiles long", () => {
    const cars = tilesOfKind("car");
    expect(cars.length).toBeGreaterThanOrEqual(8);
    for (const car of cars) {
      expect(zoneAt(car), key(car)).toBe("career-road");
      const pair = ["up", "down"].map((direction) => tileKindAt(tileAhead(car, direction as Direction)));
      expect(pair.filter((kind) => kind === "car"), key(car)).toHaveLength(1);
      expect(neighbours(car).some((tile) => tileKindAt(tile) === "asphalt"), key(car)).toBe(true);
    }
    const fiz = footprintRect(zoneById("career-road").pointsOfInterest.find((poi) => poi.id === "bmw-group")!.placement);
    expect(cars.every((car) => car.col >= fiz.left - 1 && car.col <= fiz.right + 1)).toBe(true);
  });

  it("sizes the tennis court and pool against the Player, who stands 1.5 tiles tall (about 1.2 m a tile)", () => {
    const [pool, court] = ["swimming-pool", "tennis-court"].map((id) => pointsOfInterest.find((poi) => poi.id === id)!.placement);
    expect([court.width, court.height]).toEqual([12, 5]);
    expect([pool.width, pool.height]).toEqual([13, 6]);
    const sport = ZONE_RECTS.sport;
    const water = tilesOfKind("water").filter((tile) => tile.col >= sport.left && tile.col <= sport.right && tile.row >= sport.top);
    expect(water).toEqual([]);
  });

  it("runs the mountain off the southern edge of the map, with a skin track from the Sport Zone up to the summit cross", () => {
    const bottomRow = [...OVERWORLD_MAP[MAP_ROWS - 1]].map((_, col) => tileKindAt({ col, row: MAP_ROWS - 1 }));
    expect(bottomRow.filter((kind) => kind === "snow" || kind === "rock").length).toBeGreaterThan(20);
    const summit = pointsOfInterest.find((poi) => poi.id === "ski-touring-slope")!.placement;
    const approaches = tilesAround(summit).filter(({ tile }) => isReachableFromSpawn(tile));
    expect(approaches.length).toBeGreaterThan(0);
    expect(approaches.every(({ tile }) => tileKindAt(tile) === "track")).toBe(true);
    const track = tilesOfKind("track");
    expect(track.every(isReachableFromSpawn)).toBe(true);
    expect(track.every((tile) => zoneAt(tile) === "sport")).toBe(true);
  });

  it("names the Point of Interest directly ahead of the Player, and none otherwise", () => {
    expect(facedPointOfInterest({ col: 40, row: 23 }, "up")?.id).toBe("tum");
    expect(facedPointOfInterest({ col: 46, row: 23 }, "up")?.id).toBe("tum");
    expect(facedPointOfInterest({ col: 49, row: 23 }, "up")?.id).toBe("bmw-group");
    expect(facedPointOfInterest({ col: 22, row: 4 }, "up")?.id).toBe("darkroom");
    expect(facedPointOfInterest({ col: 47, row: 23 }, "up")).toBeUndefined();
    expect(facedPointOfInterest({ col: 40, row: 23 }, "down")).toBeUndefined();
    expect(facedPointOfInterest({ col: 40, row: 24 }, "up")).toBeUndefined();
  });

  it("lands Fast-travel in front of a Zone's featured Point of Interest, facing it", () => {
    expect(fastTravelLanding("career-road")).toEqual({ tile: { col: 82, row: 23 }, facing: "up" });
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

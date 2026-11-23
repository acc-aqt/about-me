import { describe, expect, it } from "vitest";
import { CATS, chooseCatStep, chooseRest, chooseWalkLength, directionTowards, isCatGround, type Random } from "./cats";
import { DIRECTIONS, fastTravelLanding, SPAWN, tileAhead, tileKey, tileKindAt, ZONE_RECTS, type Tile } from "./overworld";

const hub = ZONE_RECTS.start;

function sequence(...values: number[]): Random {
  return () => values.shift()!;
}

/** Every tile of Cat ground a Cat can wander to from a start tile. */
function roamFrom(start: Tile): Set<string> {
  const reached = new Set([tileKey(start)]);
  const queue = [start];
  for (let tile = queue.shift(); tile; tile = queue.shift()) {
    for (const direction of DIRECTIONS) {
      const next = tileAhead(tile, direction);
      if (!isCatGround(next) || reached.has(tileKey(next))) continue;
      reached.add(tileKey(next));
      queue.push(next);
    }
  }
  return reached;
}

describe("Cats", () => {
  it("start Berlioz and Manouche on ground a Cat may stand on", () => {
    expect(CATS.map((cat) => cat.name)).toEqual(["Berlioz", "Manouche"]);
    for (const cat of CATS) expect(isCatGround(cat.start), cat.name).toBe(true);
  });

  it("keeps Cats on the Hub's grass, off its paths, the spawn and the Fast-travel landing", () => {
    expect(isCatGround({ col: 25, row: 24 })).toBe(true);
    expect(isCatGround({ col: 30, row: 24 })).toBe(true);
    expect(isCatGround({ col: 31, row: 24 })).toBe(false);
    expect(isCatGround({ col: 25, row: 23 })).toBe(false);
    expect(isCatGround(SPAWN)).toBe(false);
    expect(isCatGround(fastTravelLanding("start").tile)).toBe(false);
    expect(isCatGround({ col: hub.left - 1, row: 24 })).toBe(false);
    expect(isCatGround({ col: hub.right + 1, row: 24 })).toBe(false);
  });

  it("never lets a Cat onto solid ground such as a sign or a tree", () => {
    const intro: Tile = { col: 26, row: 21 };
    expect(tileKindAt(intro)).toBe("grass");
    expect(isCatGround(intro)).toBe(false);
    expect(isCatGround({ col: 22, row: 24 })).toBe(false);
  });

  it("steps a Cat onto a random open neighbour, never a blocked one", () => {
    const beside: Tile = { col: 25, row: 24 };
    expect(chooseCatStep(beside, new Set(), () => 0)).toBe("down");
    expect(chooseCatStep(beside, new Set(), () => 0.99)).toBe("right");
    expect(chooseCatStep(beside, new Set(["25,25", "24,24"]), () => 0)).toBe("right");
  });

  it("keeps a Cat put when every neighbour is closed", () => {
    expect(chooseCatStep({ col: 25, row: 24 }, new Set(["25,25", "24,24", "26,24"]), () => 0)).toBeUndefined();
  });

  it("walks a Cat one to four tiles at a time", () => {
    expect(chooseWalkLength(() => 0)).toBe(1);
    expect(chooseWalkLength(() => 0.99)).toBe(4);
  });

  it("mostly sits a Cat down for two to six seconds", () => {
    expect(chooseRest(sequence(0.5, 0))).toEqual({ pose: "sit", seconds: 2 });
    expect(chooseRest(sequence(0.5, 0.5))).toEqual({ pose: "sit", seconds: 4 });
  });

  it("now and then curls a Cat up to sleep for longer", () => {
    expect(chooseRest(sequence(0.1, 0))).toEqual({ pose: "sleep", seconds: 8 });
    expect(chooseRest(sequence(0.1, 0.5))).toEqual({ pose: "sleep", seconds: 11 });
  });

  it("turns a Cat to face the Player beside it", () => {
    const cat: Tile = { col: 10, row: 10 };
    expect(directionTowards(cat, { col: 11, row: 10 })).toBe("right");
    expect(directionTowards(cat, { col: 9, row: 10 })).toBe("left");
    expect(directionTowards(cat, { col: 10, row: 9 })).toBe("up");
    expect(directionTowards(cat, { col: 10, row: 11 })).toBe("down");
  });

  it("turns a Cat along the longer way to a Player further off", () => {
    expect(directionTowards({ col: 10, row: 10 }, { col: 12, row: 11 })).toBe("right");
    expect(directionTowards({ col: 10, row: 10 }, { col: 9, row: 7 })).toBe("up");
  });

  it("gives each Cat a patch of grass to roam, not a single tile", () => {
    for (const cat of CATS) expect(roamFrom(cat.start).size, cat.name).toBeGreaterThanOrEqual(15);
  });
});

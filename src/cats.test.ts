import { describe, expect, it } from "vitest";
import {
  CAT_STEP_TIME,
  CATS,
  catPose,
  chooseCatStep,
  chooseRest,
  chooseWalkLength,
  createCats,
  directionTowards,
  isCatGround,
  isHeartShown,
  type Random,
} from "./cats";
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

describe("the Cats' wander", () => {
  /** Always 0: every rest is an eight-second sleep and every walk a single step, the first open way in `DIRECTIONS`. */
  const lowest: Random = () => 0;

  it("starts Berlioz and Manouche asleep or sitting on their start tiles", () => {
    const cats = createCats(lowest);
    expect(cats.all.map(({ name, tile }) => ({ name, tile }))).toEqual(CATS.map(({ name, start }) => ({ name, tile: start })));
    for (const cat of cats.all) expect(catPose(cat)).toBe("sleep");
  });

  const nobody: Tile[] = [];

  function berlioz(cats: ReturnType<typeof createCats>) {
    return cats.all.find((cat) => cat.name === "Berlioz")!;
  }

  it("wakes a Cat after its rest and walks it, step by step, onto neighbouring Cat ground", () => {
    const cats = createCats(lowest);
    const start = berlioz(cats).tile;

    cats.update(7.9, nobody);
    expect(catPose(berlioz(cats))).toBe("sleep");
    cats.update(0.2, nobody);
    cats.update(0.01, nobody);
    expect(catPose(berlioz(cats))).toBe("walk");
    cats.update(CAT_STEP_TIME, nobody);

    const { tile } = berlioz(cats);
    expect(Math.abs(tile.col - start.col) + Math.abs(tile.row - start.row)).toBe(1);
    expect(isCatGround(tile)).toBe(true);
  });

  it("never walks a Cat onto the Player", () => {
    const cats = createCats(lowest);
    const start = berlioz(cats).tile;
    const around = DIRECTIONS.map((direction) => tileAhead(start, direction));

    for (let second = 0; second < 60; second++) cats.update(1, around);

    expect(berlioz(cats).tile).toEqual(start);
  });

  it("turns a petted Cat to the Player, sits it down and shows a heart for two seconds", () => {
    const cats = createCats(lowest);
    const cat = berlioz(cats);
    const player = { col: cat.tile.col, row: cat.tile.row - 1 };

    cats.pet(cat, player);
    cats.update(0.01, [player]);
    expect(cat.facing).toBe("up");
    expect(catPose(cat)).toBe("sit");
    expect(isHeartShown(cat)).toBe(true);

    cats.update(2, [player]);
    expect(isHeartShown(cat)).toBe(false);
  });

  it("lets a Cat finish its step before it reacts to the Shutter", () => {
    const cats = createCats(lowest);
    const cat = berlioz(cats);
    cats.update(8, nobody);
    cats.update(0.01, nobody);
    const to = cat.step!.to;

    cats.pet(cat, SPAWN);
    cats.update(0.01, nobody);
    expect(isHeartShown(cat)).toBe(false);
    cats.update(CAT_STEP_TIME, nobody);

    expect(cat.tile).toEqual(to);
    expect(isHeartShown(cat)).toBe(true);
  });

  it("finds the Cat on a tile, including the one it is stepping onto", () => {
    const cats = createCats(lowest);
    const cat = berlioz(cats);
    expect(cats.catOn(cat.tile)).toBe(cat);
    cats.update(8, nobody);
    cats.update(0.01, nobody);
    expect(cats.catOn(cat.step!.to)).toBe(cat);
    expect(cats.catOn(SPAWN)).toBeUndefined();
  });
});

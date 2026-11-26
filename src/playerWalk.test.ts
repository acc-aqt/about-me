import { describe, expect, it } from "vitest";
import { createPlayerWalk, STEP_TIME } from "./playerWalk";

const openField = () => false;

describe("the Player's walk", () => {
  it("starts at the given tile and facing", () => {
    const walk = createPlayerWalk({ tile: { col: 40, row: 12 }, facing: "left" }, openField);

    expect(walk.position()).toEqual({ tile: { col: 40, row: 12 }, facing: "left" });
  });

  it("turns on a tap in a new direction, then steps onto the next tile on a tap the way it faces", () => {
    const walk = createPlayerWalk({ tile: { col: 40, row: 12 }, facing: "down" }, openField);

    walk.press("right");
    walk.release("right");
    walk.update(0.016);
    expect(walk.position()).toEqual({ tile: { col: 40, row: 12 }, facing: "right" });

    walk.press("right");
    walk.release("right");
    walk.update(0.016);
    walk.update(STEP_TIME);
    expect(walk.position()).toEqual({ tile: { col: 41, row: 12 }, facing: "right" });
  });

  it("keeps walking while a direction is held", () => {
    const walk = createPlayerWalk({ tile: { col: 40, row: 12 }, facing: "up" }, openField);

    walk.press("up");
    for (let frame = 0; frame < 60; frame++) walk.update(0.016);

    expect(walk.position().tile.row).toBeLessThan(11);
    expect(walk.position().tile.col).toBe(40);
  });

  it("bumps into a blocked tile and stays put", () => {
    const wallToTheRight = (tile: { col: number }) => tile.col === 41;
    const bumps: string[] = [];
    const walk = createPlayerWalk({ tile: { col: 40, row: 12 }, facing: "right" }, wallToTheRight, {
      onTurn() {},
      onStepStart() {},
      onArrive() {},
      onBump: () => bumps.push("bump"),
    });

    walk.press("right");
    walk.update(0.016);
    walk.update(STEP_TIME);

    expect(walk.position()).toEqual({ tile: { col: 40, row: 12 }, facing: "right" });
    expect(bumps).toEqual(["bump"]);
  });

  it("reports the landing after travelling, even from the middle of a step", () => {
    const walk = createPlayerWalk({ tile: { col: 40, row: 12 }, facing: "down" }, openField);
    walk.press("down");
    walk.update(0.016);

    walk.travelTo({ tile: { col: 5, row: 30 }, facing: "up" });
    walk.release("down");
    walk.update(STEP_TIME);

    expect(walk.position()).toEqual({ tile: { col: 5, row: 30 }, facing: "up" });
  });
});

import { describe, expect, it } from "vitest";
import { content } from "./content";
import {
  DIRECTIONS,
  footprintTiles,
  HUB_SIGNPOSTS,
  isReachableFromSpawn,
  isWalkable,
  MAP_COLUMNS,
  MAP_ROWS,
  SPAWN,
  tileAhead,
  type Direction,
  type Tile,
} from "./overworld";
import {
  createCheatDetector,
  directionToHeading,
  isSolid,
  PLAYER_RADIUS,
  snapToLanding,
  stepPlayer,
  tileToWorld,
  type MoveInput,
  type PlayerState,
  type WorldPosition,
} from "./thirdPersonWorld";

const allTiles: Tile[] = Array.from({ length: MAP_ROWS }, (_, row) =>
  Array.from({ length: MAP_COLUMNS }, (_, col) => ({ col, row })),
).flat();
const reachableTiles = allTiles.filter(isReachableFromSpawn);

const FORWARD: MoveInput = { forward: 1, right: 0, running: false };
const NO_INPUT: MoveInput = { forward: 0, right: 0, running: false };

function standingOn(tile: Tile, facing: Direction = "down"): PlayerState {
  return { position: tileToWorld(tile), heading: directionToHeading(facing) };
}

/** Walks for a number of seconds in small frames, as the render loop would. */
function walkFor(player: PlayerState, input: MoveInput, cameraYaw: number, seconds: number, onFrame?: (p: PlayerState) => void) {
  const frame = 1 / 60;
  for (let elapsed = 0; elapsed < seconds; elapsed += frame) {
    player = stepPlayer(player, input, cameraYaw, frame);
    onFrame?.(player);
  }
  return player;
}

/** How far a circle at this position reaches into the solid tile; zero or less when it stays outside. */
function overlap({ x, z }: WorldPosition, { col, row }: Tile) {
  const nearestX = Math.min(Math.max(x, col), col + 1);
  const nearestZ = Math.min(Math.max(z, row), row + 1);
  return PLAYER_RADIUS - Math.hypot(x - nearestX, z - nearestZ);
}

function solidTilesNear({ x, z }: WorldPosition): Tile[] {
  const tiles: Tile[] = [];
  for (let row = Math.floor(z) - 1; row <= Math.floor(z) + 1; row++)
    for (let col = Math.floor(x) - 1; col <= Math.floor(x) + 1; col++) if (isSolid({ col, row })) tiles.push({ col, row });
  return tiles;
}

function expectOutsideSolids(position: WorldPosition) {
  for (const tile of solidTilesNear(position)) expect(overlap(position, tile)).toBeLessThan(1e-6);
}

function find(predicate: (tile: Tile) => boolean) {
  const tile = reachableTiles.find(predicate);
  if (!tile) throw new Error("No such spot on the map");
  return tile;
}

const open = (tile: Tile) => isReachableFromSpawn(tile);
const solid = (tile: Tile) => isSolid(tile);

describe("Third-person world", () => {
  describe("grid and world conversion", () => {
    it("round-trips every reachable tile and every facing", () => {
      for (const tile of reachableTiles) {
        for (const facing of DIRECTIONS) {
          const { position, heading } = standingOn(tile, facing);
          expect(snapToLanding(position, heading)).toEqual({ tile, facing });
        }
      }
    });

    it("snaps a position off-centre in a tile to that tile, and a heading to the nearest of the four directions", () => {
      const { x, z } = tileToWorld(SPAWN);
      expect(snapToLanding({ x: x + 0.4, z: z - 0.4 }, directionToHeading("right") - 0.6)).toEqual({ tile: SPAWN, facing: "right" });
      expect(snapToLanding({ x, z }, directionToHeading("up") + 0.7)).toEqual({ tile: SPAWN, facing: "up" });
      expect(snapToLanding({ x, z }, directionToHeading("down") + 4 * Math.PI)).toEqual({ tile: SPAWN, facing: "down" });
    });

    it("always snaps to a walkable tile reachable from the spawn, even from inside solid tiles or off the map", () => {
      for (let z = -3; z < MAP_ROWS + 3; z += 1.37) {
        for (let x = -3; x < MAP_COLUMNS + 3; x += 1.37) {
          const { tile } = snapToLanding({ x, z }, 0);
          expect(isWalkable(tile)).toBe(true);
          expect(isReachableFromSpawn(tile)).toBe(true);
        }
      }
    });
  });

  describe("free movement", () => {
    const yawRight = directionToHeading("right");
    const yawDown = directionToHeading("down");

    it("walks where the camera looks and turns the Player to face the way it goes", () => {
      const start = standingOn(SPAWN);
      const moved = stepPlayer(start, FORWARD, yawRight, 0.1);
      expect(moved.position.x).toBeGreaterThan(start.position.x);
      expect(moved.position.z).toBeCloseTo(start.position.z);
      expect(snapToLanding(moved.position, moved.heading).facing).toBe("right");
    });

    it("strafes relative to the camera: right of a camera looking south is west", () => {
      const start = standingOn(SPAWN);
      const moved = stepPlayer(start, { forward: 0, right: 1, running: false }, yawDown, 0.1);
      expect(moved.position.x).toBeLessThan(start.position.x);
      expect(moved.position.z).toBeCloseTo(start.position.z);
    });

    it("moves in any direction, not only the four of the grid", () => {
      const start = standingOn(SPAWN);
      const moved = stepPlayer(start, { forward: 1, right: -1, running: false }, yawDown, 0.1);
      const dx = moved.position.x - start.position.x;
      const dz = moved.position.z - start.position.z;
      expect(dx).toBeGreaterThan(0);
      expect(dz).toBeCloseTo(dx);
    });

    it("runs twice as far with Shift as walking", () => {
      const start = standingOn(SPAWN);
      const walked = stepPlayer(start, FORWARD, yawRight, 0.1);
      const ran = stepPlayer(start, { ...FORWARD, running: true }, yawRight, 0.1);
      expect(ran.position.x - start.position.x).toBeCloseTo(2 * (walked.position.x - start.position.x));
    });

    it("stays put, keeping its heading, without input", () => {
      const start = standingOn(SPAWN, "left");
      expect(stepPlayer(start, NO_INPUT, yawRight, 0.5)).toEqual(start);
    });
  });

  describe("collision", () => {
    it("treats Footprints and Signposts as solid", () => {
      for (const { tile } of HUB_SIGNPOSTS) expect(isSolid(tile)).toBe(true);
      for (const poi of content.zones.flatMap((zone) => zone.pointsOfInterest))
        for (const tile of footprintTiles(poi.placement)) expect(isSolid(tile), poi.id).toBe(true);
    });

    it("can't walk into a Signpost", () => {
      const signpost = HUB_SIGNPOSTS[0].tile;
      const facing = DIRECTIONS.find((direction) => open(tileAhead(signpost, direction)))!;
      const from = tileAhead(signpost, facing);
      const towards = directionToHeading(({ up: "down", down: "up", left: "right", right: "left" } as const)[facing]);
      const player = walkFor(standingOn(from), FORWARD, towards, 2, (p) => expectOutsideSolids(p.position));
      expect(snapToLanding(player.position, player.heading).tile).toEqual(from);
    });

    it("slides along a straight wall when walking into it at an angle", () => {
      const tile = find((t) => solid(tileAhead(t, "up")) && [1, 2, 3].every((i) => {
        const along = { col: t.col + i, row: t.row };
        return open(along) && solid(tileAhead(along, "up"));
      }));
      const start = standingOn(tile);
      const northEast = (directionToHeading("up") + directionToHeading("right")) / 2;
      const player = walkFor(start, FORWARD, northEast, 0.4, (p) => expectOutsideSolids(p.position));
      expect(player.position.x - start.position.x).toBeGreaterThan(0.5);
      expect(player.position.z).toBeGreaterThanOrEqual(tile.row + PLAYER_RADIUS - 1e-6);
    });

    it("never clips through a corner where two solid tiles touch diagonally", () => {
      const diagonals = (["up", "down"] as const).flatMap((across) => (["left", "right"] as const).map((side) => ({ across, side })));
      const corners = diagonals.flatMap(({ across, side }) =>
        reachableTiles
          .filter((t) => solid(tileAhead(t, side)) && solid(tileAhead(t, across)) && open(tileAhead(tileAhead(t, side), across)))
          .map((tile) => ({ tile, across, side })),
      );
      expect(corners.length).toBeGreaterThan(0);
      for (const { tile, across, side } of corners) {
        const diagonal = Math.atan2(Math.sin(directionToHeading(side)), Math.cos(directionToHeading(across)));
        const player = walkFor(standingOn(tile), FORWARD, diagonal, 1, (p) => expectOutsideSolids(p.position));
        expect(snapToLanding(player.position, player.heading).tile).toEqual(tile);
      }
    });

    it("never overlaps a solid tile, whichever way the Player walks or runs", () => {
      const starts = reachableTiles.filter((_, index) => index % 23 === 0);
      for (const [index, tile] of starts.entries()) {
        let player = standingOn(tile);
        for (let turn = 0; turn < 8; turn++) {
          const yaw = (index * 1.7 + turn * 2.3) % (2 * Math.PI);
          player = walkFor(player, { forward: 1, right: turn % 3 - 1, running: turn % 2 === 0 }, yaw, 0.5, (p) =>
            expectOutsideSolids(p.position),
          );
        }
      }
    });
  });
});

const CHEAT = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

/** Feeds keys to a fresh detector and returns the indices of the keys that completed the cheat. */
function completions(keys: string[]) {
  const cheat = createCheatDetector();
  return keys.flatMap((key, index) => (cheat.type(key) ? [index] : []));
}

describe("cheat detection", () => {
  it("recognises the exact sequence on its last key", () => {
    expect(completions(CHEAT)).toEqual([CHEAT.length - 1]);
  });

  it("tolerates leading noise, even a false start of the sequence itself", () => {
    const noise = ["w", "ArrowUp", "ArrowUp", "ArrowUp", "Shift", " "];
    expect(completions([...noise, "ArrowUp", ...CHEAT])).toEqual([noise.length + CHEAT.length]);
  });

  it("rejects the keys in a wrong order or with a stray key inside", () => {
    const swapped = [...CHEAT.slice(0, 8), "a", "b"];
    const interrupted = [...CHEAT.slice(0, 5), "x", ...CHEAT.slice(5)];
    expect(completions(swapped)).toEqual([]);
    expect(completions(interrupted)).toEqual([]);
    expect(completions(CHEAT.slice(0, -1))).toEqual([]);
  });

  it("accepts B and A typed in capitals", () => {
    expect(completions([...CHEAT.slice(0, 8), "B", "A"])).toEqual([CHEAT.length - 1]);
  });

  it("recognises the cheat again each time it is typed", () => {
    expect(completions([...CHEAT, ...CHEAT])).toEqual([CHEAT.length - 1, 2 * CHEAT.length - 1]);
  });
});

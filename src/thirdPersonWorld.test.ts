import { describe, expect, it } from "vitest";
import { content, type Footprint, type PointOfInterest } from "./content";
import {
  DIRECTIONS,
  fastTravelLanding,
  footprintTiles,
  HUB_SIGNPOSTS,
  isReachableFromSpawn,
  isWalkable,
  LEGEND,
  MAP_COLUMNS,
  MAP_ROWS,
  SPAWN,
  tileAhead,
  tileKey,
  tileKindAt,
  type Direction,
  type Tile,
} from "./overworld";
import {
  buildingBlocks,
  createCheatDetector,
  directionToHeading,
  FLOATING_NAME_PLATES,
  forestDepth,
  groundHeight,
  isNamePlateShown,
  isSolid,
  layoutAt,
  playerAnimation,
  PLAYER_RADIUS,
  pointOfInterestModel,
  snapToLanding,
  stepPlayer,
  targetedPointOfInterest,
  TILE_LAYOUTS,
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

  describe("targeting", () => {
    function poi(id: string, placement: Footprint): PointOfInterest {
      return { id, title: id, body: "", placement };
    }

    /** A Player standing at a point, looking along a heading. */
    function at(x: number, z: number, facing: Direction | number): PlayerState {
      return { position: { x, z }, heading: typeof facing === "number" ? facing : directionToHeading(facing) };
    }

    const north = poi("north", { col: 10, row: 8 });

    it("targets a Point of Interest right in front of the Player", () => {
      expect(targetedPointOfInterest([north], at(10.5, 9.5, "up"))).toBe(north);
    });

    it("ignores a Point of Interest behind the Player", () => {
      expect(targetedPointOfInterest([north], at(10.5, 9.5, "down"))).toBeUndefined();
    });

    it("ignores a Point of Interest right beside the Player", () => {
      expect(targetedPointOfInterest([north], at(10.5, 9.5, "left"))).toBeUndefined();
      expect(targetedPointOfInterest([north], at(10.5, 9.5, "right"))).toBeUndefined();
      expect(targetedPointOfInterest([north], at(9.5, 8.5, "up"))).toBeUndefined();
    });

    it("targets a Point of Interest about a tile and a half ahead, but not further", () => {
      expect(targetedPointOfInterest([north], at(10.5, 10.4, "up"))).toBe(north);
      expect(targetedPointOfInterest([north], at(10.5, 10.6, "up"))).toBeUndefined();
    });

    it("targets a Point of Interest slightly off to one side of straight ahead", () => {
      expect(targetedPointOfInterest([north], at(10.5, 9.5, directionToHeading("up") + 0.4))).toBe(north);
    });

    it("targets a wide Footprint the Player looks at obliquely, though its nearest edge is beside the Player", () => {
      const wall = poi("wall", { col: 8, row: 8, width: 6 });
      const towardsNorthEast = directionToHeading("up") - 0.9;
      expect(targetedPointOfInterest([wall], at(9.5, 9.5, towardsNorthEast))).toBe(wall);
    });

    it("targets the nearest of several Points of Interest in the cone", () => {
      const near = poi("near", { col: 10, row: 8 });
      const far = poi("far", { col: 9, row: 7, width: 3 });
      const player = at(10.5, 9.5, "up");
      expect(targetedPointOfInterest([far], player)).toBe(far);
      expect(targetedPointOfInterest([far, near], player)).toBe(near);
      expect(targetedPointOfInterest([near, far], player)).toBe(near);
    });

    it("targets each Zone's landing Point of Interest straight after Fast-travel", () => {
      const pointsOfInterest = content.zones.flatMap((zone) => zone.pointsOfInterest);
      for (const zone of content.zones.filter((z) => z.fastTravelTo)) {
        const player = standingOn(fastTravelLanding(zone.id).tile, fastTravelLanding(zone.id).facing);
        expect(targetedPointOfInterest(pointsOfInterest, player)?.id, zone.id).toBe(zone.fastTravelTo);
      }
    });
  });

  describe("Point of Interest models", () => {
    const pointsOfInterest = content.zones.flatMap((zone) => zone.pointsOfInterest);
    const byId = (id: string) => pointsOfInterest.find((poi) => poi.id === id)!;

    it("gives every Point of Interest in the Content file a 3D model standing above the ground", () => {
      for (const poi of pointsOfInterest) expect(pointOfInterestModel(poi).height, poi.id).toBeGreaterThan(0);
    });

    it("stands a model on its whole Footprint", () => {
      expect(pointOfInterestModel(byId("tum")).base).toEqual({ left: 40, top: 19, right: 47, bottom: 23 });
      expect(pointOfInterestModel(byId("intro")).base).toEqual({ left: 26, top: 21, right: 27, bottom: 22 });
    });
  });

  describe("Name plates", () => {
    const plate = (text: string) => FLOATING_NAME_PLATES.find((p) => p.text === text)!;
    const tum = plate("Technical University of Munich");

    it("names every Point of Interest and every Hub Signpost", () => {
      const texts = FLOATING_NAME_PLATES.map((p) => p.text);
      expect(texts).toHaveLength(content.zones.flatMap((zone) => zone.pointsOfInterest).length + HUB_SIGNPOSTS.length);
      expect(texts).toEqual(expect.arrayContaining(["framewise", "Darkroom", "Maker workshop", "Sport / Music & games"]));
    });

    it("floats centred above the top of its Point of Interest's model", () => {
      expect(tum.anchor).toMatchObject({ x: 43.5, z: 21 });
      expect(tum.anchor.y).toBeGreaterThan(7);
    });

    it("floats above a Signpost's tile", () => {
      expect(plate("Career road").anchor).toMatchObject({ x: 36.5, z: 22.5 });
      expect(plate("Career road").anchor.y).toBeGreaterThan(1);
    });

    it("rises with the mountain under the summit cross", () => {
      const summit = content.zones.flatMap((zone) => zone.pointsOfInterest).find((poi) => poi.id === "ski-touring-slope")!;
      const anchor = FLOATING_NAME_PLATES.find((p) => p.at === summit.placement)!.anchor;
      const ground = groundHeight(anchor);
      expect(ground).toBeGreaterThan(6);
      expect(anchor.y).toBeCloseTo(ground + pointOfInterestModel(summit).height + 0.3);
    });

    it("shows while the Player is near any edge of the Footprint, and hides once the Player walks away", () => {
      expect(isNamePlateShown(tum.at, { x: 43.5, z: 23.5 })).toBe(true);
      expect(isNamePlateShown(tum.at, { x: 48.9, z: 20.5 })).toBe(true);
      expect(isNamePlateShown(tum.at, { x: 43.5, z: 26.5 })).toBe(false);
      expect(isNamePlateShown(tum.at, tileToWorld(SPAWN))).toBe(false);
    });
  });

  describe("Player animation", () => {
    it("idles while no direction is held, even with Shift down", () => {
      expect(playerAnimation(NO_INPUT)).toBe("idle");
      expect(playerAnimation({ ...NO_INPUT, running: true })).toBe("idle");
    });

    it("walks while any direction is held", () => {
      expect(playerAnimation(FORWARD)).toBe("walk");
      expect(playerAnimation({ forward: -1, right: 0, running: false })).toBe("walk");
      expect(playerAnimation({ forward: 0, right: 1, running: false })).toBe("walk");
    });

    it("runs while a direction and Shift are held", () => {
      expect(playerAnimation({ ...FORWARD, running: true })).toBe("run");
      expect(playerAnimation({ forward: 0, right: -1, running: true })).toBe("run");
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

describe("scene layout", () => {
  it("maps every tile kind of the map to a layout entry", () => {
    for (const { kind } of Object.values(LEGEND)) expect(TILE_LAYOUTS[kind], kind).toBeDefined();
    for (const tile of allTiles) expect(layoutAt(tile), tileKey(tile)).toBeDefined();
  });

  it("draws something solid on every solid tile and nothing on open ground", () => {
    for (const tile of allTiles) {
      const { ground, scenery } = layoutAt(tile);
      if (isSolid(tile)) expect(scenery !== null || ground === "water" || ground === "snow", tileKey(tile)).toBe(true);
      else expect(scenery, tileKey(tile)).toBeNull();
    }
  });

  it("leaves Points of Interest and Signposts to their models, even where they stand on building ground", () => {
    const pois = content.zones.flatMap((zone) => zone.pointsOfInterest).flatMap((poi) => footprintTiles(poi.placement));
    for (const tile of [...pois, ...HUB_SIGNPOSTS.map(({ tile }) => tile)]) {
      expect(layoutAt(tile).scenery, tileKey(tile)).toBe("model");
    }
    expect(layoutAt({ col: 40, row: 19 }).scenery).toBe("model");
    expect(layoutAt({ col: 3, row: 26 }).scenery).toBe("building");
  });

  it("measures how deep a tree stands inside the forest, counting diagonals", () => {
    expect(forestDepth(SPAWN)).toBe(0);
    expect(forestDepth({ col: 7, row: 4 })).toBe(1);
    expect(forestDepth({ col: 0, row: 0 })).toBe(6);
  });

  it("groups building tiles into whole blocks, one per house", () => {
    const covered = buildingBlocks().flatMap(({ left, top, right, bottom }) =>
      footprintTiles({ col: left, row: top, width: right - left + 1, height: bottom - top + 1 }),
    );
    const buildingTiles = allTiles.filter((tile) => layoutAt(tile).scenery === "building");
    expect(covered.map(tileKey).sort()).toEqual(buildingTiles.map(tileKey).sort());
    expect(buildingBlocks()).toContainEqual({ left: 3, top: 26, right: 8, bottom: 28 });
  });
});

/** The mountain's rocky foot is map row 47, and its last rocks to the east are in column 46. */
const MOUNTAIN_FOOT_ROW = 47;
const EAST_OF_MOUNTAIN_COL = 47;

describe("ground height", () => {
  it("is flat everywhere north of the mountain's foot and east of its flank", () => {
    const outside = allTiles.filter(({ col, row }) => row < MOUNTAIN_FOOT_ROW || col >= EAST_OF_MOUNTAIN_COL);
    for (const { col, row } of outside) {
      for (const [dx, dz] of [[0.5, 0.5], [0, 0], [1, 0], [0, 1], [1, 1]]) {
        expect(groundHeight({ x: col + dx, z: row + dz })).toBe(0);
      }
    }
  });

  /** The skin track's tiles in walking order, from where it leaves the Sport meadow to its end. */
  function skinTrack(): Tile[] {
    const track = [{ col: 16, row: MOUNTAIN_FOOT_ROW }];
    const onTrack = (tile: Tile) => tileKindAt(tile) === "track" && !track.some((t) => t.col === tile.col && t.row === tile.row);
    for (let next = track[0]; next; ) {
      const onward = DIRECTIONS.map((direction) => tileAhead(next, direction)).filter(onTrack);
      expect(onward.length).toBeLessThanOrEqual(1);
      next = onward[0];
      if (next) track.push(next);
    }
    return track;
  }

  it("climbs steadily along the skin track to the summit cross", () => {
    const track = skinTrack();
    expect(track.at(-1)).toEqual({ col: 14, row: 60 });

    let previous = groundHeight(tileToWorld(track[0]));
    for (let index = 1; index < track.length; index++) {
      const from = tileToWorld(track[index - 1]);
      const to = tileToWorld(track[index]);
      for (let t = 0.25; t <= 1; t += 0.25) {
        const height = groundHeight({ x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t });
        expect(height).toBeGreaterThanOrEqual(previous);
        previous = height;
      }
    }
    expect(previous - groundHeight(tileToWorld(track[0]))).toBeGreaterThan(4);
  });
});

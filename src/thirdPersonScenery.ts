import * as THREE from "three";
import { MAP_COLUMNS, MAP_ROWS, type Tile, type TileRect } from "./overworld";
import {
  buildingBlocks,
  forestDepth,
  groundHeight,
  layoutAt,
  MAP_TILES,
  tileToWorld,
  type GroundKind,
  type SceneryKind,
} from "./thirdPersonWorld";

/** Low-poly scenery built from Three.js primitives, laid out tile by tile from the pure Third-person world. */

const GROUND_COLORS: Record<GroundKind, number> = {
  grass: 0x6dbb4f,
  path: 0xd8c08a,
  asphalt: 0x5b5d66,
  track: 0xc9d4dc,
  snow: 0xf4f7fb,
  water: 0x2f6fb8,
};
const FOREST_FLOOR = 0x3f7a35;
/** Trees are drawn this many tiles deep into the forest walls; further in, the floor takes the canopy's colour. */
const FOREST_EDGE_DEPTH = 3;
const DEEP_FOREST = 0x2a5530;
const OUTER_GROUND = 0x356b30;

const WALL_COLORS = [0xf1e3c8, 0xe8c9a6, 0xd9e2e8, 0xf3d2c1];
const ROOF_COLORS = [0xb5483a, 0x8a4b3c, 0x5a6f8c, 0x9c5b3b];
const CAR_COLORS = [0xc0393b, 0x2f6db5, 0xf2f2f2, 0x2b2b2b, 0xe6b43c];

/** A stable pseudo-random number in [0, 1) per tile, so the scenery looks the same on every visit. */
function noise({ col, row }: Tile, salt = 0) {
  const value = Math.sin(col * 127.1 + row * 311.7 + salt * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function material(color = 0xffffff) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true });
}

/** One draw call for every copy of a shape, each with its own transform and colour. */
function instanced(
  geometry: THREE.BufferGeometry,
  transforms: { matrix: THREE.Matrix4; color: number }[],
  look: THREE.Material = material(),
) {
  const mesh = new THREE.InstancedMesh(geometry, look, transforms.length);
  const color = new THREE.Color();
  transforms.forEach((transform, index) => {
    mesh.setMatrixAt(index, transform.matrix);
    mesh.setColorAt(index, color.setHex(transform.color));
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function placed(tile: Tile, { dx = 0, dy = 0, dz = 0, scale = new THREE.Vector3(1, 1, 1), turn = 0 } = {}) {
  const { x, z } = tileToWorld(tile);
  const position = new THREE.Vector3(x + dx, groundHeight({ x: x + dx, z: z + dz }) + dy, z + dz);
  const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turn);
  return new THREE.Matrix4().compose(position, rotation, scale);
}

function shade(hex: number, amount: number) {
  return new THREE.Color(hex).offsetHSL(0, 0, amount).getHex();
}

function isForestEdge(tile: Tile) {
  return forestDepth(tile) <= FOREST_EDGE_DEPTH;
}

function tilesWith(scenery: SceneryKind) {
  return MAP_TILES.filter((tile) => layoutAt(tile).scenery === scenery);
}

/** The terrain: one vertex per tile corner raised to the ground height, one texel per tile coloured by its ground. */
function createTerrain() {
  const data = new Uint8Array(MAP_COLUMNS * MAP_ROWS * 4);
  const color = new THREE.Color();
  for (const tile of MAP_TILES) {
    const { ground, scenery } = layoutAt(tile);
    color.setHex(scenery === "tree" ? (isForestEdge(tile) ? FOREST_FLOOR : DEEP_FOREST) : GROUND_COLORS[ground]);
    const texel = ((MAP_ROWS - 1 - tile.row) * MAP_COLUMNS + tile.col) * 4;
    data.set([color.r * 255, color.g * 255, color.b * 255, 255], texel);
  }
  const texture = new THREE.DataTexture(data, MAP_COLUMNS, MAP_ROWS);
  texture.magFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const geometry = new THREE.PlaneGeometry(MAP_COLUMNS, MAP_ROWS, MAP_COLUMNS, MAP_ROWS);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(MAP_COLUMNS / 2, 0, MAP_ROWS / 2);
  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index++) {
    positions.setY(index, groundHeight({ x: positions.getX(index), z: positions.getZ(index) }));
  }
  geometry.computeVertexNormals();
  const terrain = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ map: texture }));
  terrain.receiveShadow = true;
  return terrain;
}

/** Ground beyond the map's edge, so the forest doesn't end at the sky. */
function createOuterGround() {
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color: OUTER_GROUND }));
  outer.rotation.x = -Math.PI / 2;
  outer.position.set(MAP_COLUMNS / 2, -0.02, MAP_ROWS / 2);
  return outer;
}

/** The forest walls: every tree tile gets a pine or a broadleaf, jittered so the edge doesn't look gridded. */
function createForest() {
  const pines: THREE.Matrix4[] = [];
  const broadleaves: THREE.Matrix4[] = [];
  const trunks: { matrix: THREE.Matrix4; color: number }[] = [];
  const pineColors: number[] = [];
  const leafColors: number[] = [];
  for (const tile of tilesWith("tree").filter(isForestEdge)) {
    const size = 0.85 + noise(tile, 1) * 0.5;
    const offset = { dx: (noise(tile, 2) - 0.5) * 0.4, dz: (noise(tile, 3) - 0.5) * 0.4, turn: noise(tile, 4) * Math.PI };
    trunks.push({ matrix: placed(tile, { ...offset, dy: 0.3 * size, scale: new THREE.Vector3(size, size, size) }), color: 0x6b4a2f });
    const isPine = noise(tile, 5) < 0.55;
    const canopy = placed(tile, { ...offset, dy: (isPine ? 1.5 : 1.35) * size, scale: new THREE.Vector3(size, size, size) });
    const tint = (noise(tile, 6) - 0.5) * 0.08;
    if (isPine) {
      pines.push(canopy);
      pineColors.push(shade(0x2f6e3d, tint));
    } else {
      broadleaves.push(canopy);
      leafColors.push(shade(0x4c9a3c, tint));
    }
  }
  return [
    instanced(new THREE.CylinderGeometry(0.08, 0.12, 0.6, 5), trunks),
    instanced(
      new THREE.ConeGeometry(0.55, 1.9, 6),
      pines.map((matrix, index) => ({ matrix, color: pineColors[index] })),
    ),
    instanced(
      new THREE.IcosahedronGeometry(0.6, 0),
      broadleaves.map((matrix, index) => ({ matrix, color: leafColors[index] })),
    ),
  ];
}

function createBushes() {
  return instanced(
    new THREE.IcosahedronGeometry(0.45, 0),
    tilesWith("bush").map((tile) => ({
      matrix: placed(tile, { dy: 0.3, scale: new THREE.Vector3(1, 0.75, 1), turn: noise(tile, 1) * Math.PI }),
      color: shade(0x3f8f3c, (noise(tile, 2) - 0.5) * 0.08),
    })),
  );
}

function createRocks() {
  return instanced(
    new THREE.DodecahedronGeometry(0.5, 0),
    tilesWith("rock").map((tile) => {
      const size = 0.7 + noise(tile, 1) * 0.6;
      return {
        matrix: placed(tile, { dy: 0.2 * size, scale: new THREE.Vector3(size, size * 0.8, size), turn: noise(tile, 2) * Math.PI }),
        color: shade(0x7d7a74, (noise(tile, 3) - 0.5) * 0.1),
      };
    }),
  );
}

/** Cars on the Career road car park, parked nose to tail along the rows. */
function createCars() {
  const cars = tilesWith("car");
  const body = (tile: Tile) => CAR_COLORS[Math.floor(noise(tile, 1) * CAR_COLORS.length)];
  return [
    instanced(
      new THREE.BoxGeometry(0.6, 0.3, 0.95),
      cars.map((tile) => ({ matrix: placed(tile, { dy: 0.27 }), color: body(tile) })),
    ),
    instanced(
      new THREE.BoxGeometry(0.5, 0.25, 0.5),
      cars.map((tile) => ({ matrix: placed(tile, { dy: 0.54, dz: 0.05 }), color: 0xbfd9ea })),
    ),
    instanced(
      new THREE.BoxGeometry(0.66, 0.2, 0.7),
      cars.map((tile) => ({ matrix: placed(tile, { dy: 0.1 }), color: 0x222222 })),
    ),
  ];
}

function isFence(tile: Tile) {
  return layoutAt(tile).scenery === "fence";
}

/** Fence posts on every fence tile, with rails running towards neighbouring fence tiles. */
function createFences() {
  const fences = tilesWith("fence");
  const rails = fences.map((tile) => {
    const alongZ = isFence({ ...tile, row: tile.row - 1 }) || isFence({ ...tile, row: tile.row + 1 });
    return { matrix: placed(tile, { dy: 0.45, turn: alongZ ? Math.PI / 2 : 0 }), color: 0x8a6440 };
  });
  return [
    instanced(new THREE.BoxGeometry(0.12, 0.7, 0.12), fences.map((tile) => ({ matrix: placed(tile, { dy: 0.35 }), color: 0x7a5636 }))),
    instanced(new THREE.BoxGeometry(1, 0.08, 0.06), rails),
  ];
}

function createWater() {
  const water = instanced(
    new THREE.BoxGeometry(1, 0.05, 1),
    MAP_TILES.filter((tile) => layoutAt(tile).ground === "water").map((tile) => ({
      matrix: placed(tile, { dy: 0.03 }),
      color: 0xffffff,
    })),
    new THREE.MeshPhongMaterial({ color: 0x4a90d9, shininess: 90, transparent: true, opacity: 0.85 }),
  );
  water.castShadow = false;
  return water;
}

/** A house per building block: walls, a gabled roof along its longer side, and a door facing south. */
function createHouse(block: TileRect) {
  const width = block.right - block.left + 1;
  const depth = block.bottom - block.top + 1;
  const centre = { x: block.left + width / 2, z: block.top + depth / 2 };
  const base = groundHeight(centre);
  const tile = { col: block.left, row: block.top };
  const wallHeight = 1.8 + Math.min(width, depth) * 0.3;
  const house = new THREE.Group();

  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.1, wallHeight, depth - 0.1),
    material(WALL_COLORS[Math.floor(noise(tile, 1) * WALL_COLORS.length)]),
  );
  walls.position.y = wallHeight / 2;

  const ridgeAlongX = width >= depth;
  const span = (ridgeAlongX ? depth : width) + 0.3;
  const roofHeight = span * 0.45;
  const roofShape = new THREE.Shape([
    new THREE.Vector2(-span / 2, 0),
    new THREE.Vector2(span / 2, 0),
    new THREE.Vector2(0, roofHeight),
  ]);
  const length = (ridgeAlongX ? width : depth) + 0.2;
  const roofGeometry = new THREE.ExtrudeGeometry(roofShape, { depth: length, bevelEnabled: false });
  roofGeometry.translate(0, 0, -length / 2);
  const roof = new THREE.Mesh(roofGeometry, material(ROOF_COLORS[Math.floor(noise(tile, 2) * ROOF_COLORS.length)]));
  roof.position.y = wallHeight;
  roof.rotation.y = ridgeAlongX ? Math.PI / 2 : 0;

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.05), material(0x6b4a2f));
  door.position.set(0, 0.45, depth / 2 - 0.03);

  house.add(walls, roof, door);
  house.position.set(centre.x, base, centre.z);
  house.traverse((part) => {
    part.castShadow = true;
    part.receiveShadow = true;
  });
  return house;
}

/** The whole Overworld as low-poly scenery on its terrain. */
export function createScenery() {
  const scenery = new THREE.Group();
  scenery.add(
    createOuterGround(),
    createTerrain(),
    createWater(),
    ...createForest(),
    createBushes(),
    createRocks(),
    ...createCars(),
    ...createFences(),
    ...buildingBlocks().map(createHouse),
  );
  return scenery;
}

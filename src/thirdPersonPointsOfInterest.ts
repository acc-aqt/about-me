import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { SCENERY_PROPS } from "./art";
import type { PointOfInterest } from "./content";
import { HUB_SIGNPOSTS } from "./overworld";
import {
  footprintWorldRect,
  groundHeight,
  HUB_SET_PIECES,
  pointOfInterestModel,
  SCENERY_PROP_HEIGHT,
  SIGNPOST_HEIGHT,
  type PoiShape,
  type WorldRect,
} from "./thirdPersonWorld";

/**
 * Points of Interest, Signposts and the Hub's set pieces, built in code from Three.js primitives. Each model is laid
 * out around its Footprint's centre on the ground, x across its width, z across its depth (+z is south, the front),
 * then all of them are merged into one vertex-coloured mesh so they cost a single draw call.
 */

type Part = { geometry: THREE.BufferGeometry; color: number };
type Place = { x?: number; y?: number; z?: number; turnX?: number; turnY?: number; turnZ?: number };
type Size = { width: number; depth: number; height: number };
/** Builds a model from its width (x), depth (z) and height (y). */
type Builder = (size: Size) => Part[];

const WOOD = 0x9b6b43;
const DARK_WOOD = 0x6b4a2f;
const METAL = 0x8d929a;
const DARK = 0x2b2b31;
const WHITE = 0xf4f4f0;
const GLASS = 0x4f7fa8;
const STONE = 0x9c978e;

function part(geometry: THREE.BufferGeometry, color: number, { x = 0, y = 0, z = 0, turnX = 0, turnY = 0, turnZ = 0 }: Place = {}): Part {
  geometry.rotateX(turnX).rotateZ(turnZ).rotateY(turnY).translate(x, y, z);
  return { geometry, color };
}

/** A box resting on `y` (its bottom), centred on x and z. */
function box(width: number, height: number, depth: number, color: number, place: Place = {}): Part {
  return part(new THREE.BoxGeometry(width, height, depth), color, { ...place, y: (place.y ?? 0) + height / 2 });
}

/** An upright cylinder resting on `y`. */
function cylinder(radius: number, height: number, color: number, place: Place = {}, radiusTop = radius, segments = 12): Part {
  return part(new THREE.CylinderGeometry(radiusTop, radius, height, segments), color, { ...place, y: (place.y ?? 0) + height / 2 });
}

/** A cylinder lying along x, centred at the place. */
function roller(radius: number, length: number, color: number, place: Place = {}, segments = 16): Part {
  return part(new THREE.CylinderGeometry(radius, radius, length, segments), color, { turnZ: Math.PI / 2, ...place });
}

/** A gabled roof along x: a triangular prism of the given span (z), rise and length (x), resting on `y`. */
function gable(length: number, span: number, rise: number, color: number, place: Place = {}): Part {
  const shape = new THREE.Shape([new THREE.Vector2(-span / 2, 0), new THREE.Vector2(span / 2, 0), new THREE.Vector2(0, rise)]);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  geometry.translate(0, 0, -length / 2).rotateY(Math.PI / 2);
  return part(geometry, color, place);
}

/** One sawtooth: a prism with its steep face to the north, as factory roofs turn their glazing away from the sun. */
function sawtooth(length: number, span: number, rise: number, color: number, place: Place = {}): Part {
  const shape = new THREE.Shape([new THREE.Vector2(-span / 2, 0), new THREE.Vector2(span / 2, 0), new THREE.Vector2(-span / 2, rise)]);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  geometry.translate(0, 0, -length / 2).rotateY(Math.PI / 2);
  return part(geometry, color, place);
}

function windowRows(width: number, front: number, floors: number[], color = GLASS): Part[] {
  const panes = Math.max(1, Math.floor(width / 0.8));
  return floors.flatMap((y) =>
    Array.from({ length: panes }, (_, i) => box(0.45, 0.5, 0.06, color, { x: -width / 2 + (i + 0.5) * (width / panes), y, z: front })),
  );
}

const cameraStand: Builder = () => [
  ...[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((turn) =>
    part(new THREE.CylinderGeometry(0.03, 0.03, 1.25), DARK, {
      x: Math.sin(turn) * 0.15,
      y: 0.6,
      z: Math.cos(turn) * 0.15,
      turnX: -0.25,
      turnY: turn,
    }),
  ),
  box(0.42, 0.28, 0.2, DARK, { y: 1.2 }),
  box(0.14, 0.08, 0.1, METAL, { x: -0.1, y: 1.48 }),
  part(new THREE.CylinderGeometry(0.09, 0.1, 0.22, 12), METAL, { y: 1.33, z: 0.2, turnX: Math.PI / 2 }),
];

const welcomeBoard: Builder = ({ width }) => [
  box(0.12, 1.5, 0.12, DARK_WOOD, { x: -width * 0.38 }),
  box(0.12, 1.5, 0.12, DARK_WOOD, { x: width * 0.38 }),
  box(width * 0.85, 0.85, 0.08, 0xfbf8f0, { y: 0.55 }),
  box(width * 0.9, 0.08, 0.14, WOOD, { y: 1.4 }),
  box(width * 0.9, 0.06, 0.12, WOOD, { y: 0.5 }),
];

/** The TUM main building on Arcisstraße: a long pale hall with the Thiersch clock tower rising at one end. */
const universityHall: Builder = ({ width, depth, height }) => {
  const hallHeight = 3.2;
  const tower = 1.5;
  const towerX = -width / 2 + tower / 2 + 0.2;
  return [
    box(width, hallHeight, depth * 0.8, 0xe9e5db, { z: -depth * 0.1 }),
    box(width, 0.25, depth * 0.8 + 0.1, 0x0065bd, { y: hallHeight, z: -depth * 0.1 }),
    ...windowRows(width - tower - 0.6, depth * 0.3 + 0.02, [0.5, 1.7], 0x3d4b5c).map((p) => {
      p.geometry.translate(tower / 2 + 0.3, 0, 0);
      return p;
    }),
    box(1.2, 1.6, 0.3, 0x0065bd, { x: tower, z: depth * 0.33 }),
    box(tower, height - 1.6, tower, 0xd9d1c2, { x: towerX, z: depth * 0.5 - tower / 2 - 0.05 }),
    part(new THREE.ConeGeometry(tower * 0.78, 1.6, 4), 0x5e6e64, {
      x: towerX,
      y: height - 0.8,
      z: depth * 0.5 - tower / 2 - 0.05,
      turnY: Math.PI / 4,
    }),
    part(new THREE.CircleGeometry(0.4, 16), WHITE, { x: towerX, y: height - 2.4, z: depth * 0.5 - 0.04 }),
    box(0.05, 0.3, 0.02, DARK, { x: towerX, y: height - 2.45, z: depth * 0.5 - 0.02 }),
  ];
};

/** BMW's Four-Cylinder tower, four silver cylinders around a core, beside the museum's bowl. */
const fourCylinderTower: Builder = ({ width, depth, height }) => {
  const towerX = -width / 2 + 2.1;
  const radius = 0.78;
  const offset = 0.72;
  const cylinders = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].flatMap(([dx, dz]) => [
    cylinder(radius, height - 0.6, 0xc9ced4, { x: towerX + dx * offset, z: dz * offset }, radius, 20),
    cylinder(radius + 0.05, 0.6, 0x9aa1aa, { x: towerX + dx * offset, y: height - 0.6, z: dz * offset }, radius + 0.15, 20),
  ]);
  const bands = [2, 4, 6].map((y) => cylinder(1.25, 0.12, 0x5d6672, { x: towerX, y }, 1.25, 20));
  return [
    box(width, 0.3, depth, 0xbfc3c8),
    ...cylinders,
    ...bands,
    cylinder(1.1, 2.4, 0xe6e8ea, { x: width / 2 - 2.2, y: 0.3 }, 1.75, 24),
    cylinder(1.7, 0.1, 0x2f6db5, { x: width / 2 - 2.2, y: 2.7 }, 1.7, 24),
    box(2.2, 1.4, 1.6, 0x9aa1aa, { x: 0.6, y: 0.3, z: 0.6 }),
  ];
};

const kangarooSign: Builder = () => [
  box(0.1, 1.2, 0.1, METAL),
  box(0.85, 0.85, 0.06, 0xf2c230, { y: 1.05, turnZ: Math.PI / 4 }),
  box(0.3, 0.16, 0.08, DARK, { x: 0.02, y: 1.38 }),
  box(0.08, 0.16, 0.08, DARK, { x: 0.18, y: 1.5 }),
  box(0.22, 0.05, 0.08, DARK, { x: -0.22, y: 1.36, turnZ: -0.5 }),
  box(0.05, 0.16, 0.08, DARK, { x: -0.02, y: 1.25, turnZ: 0.4 }),
];

const factoryShed: Builder = ({ width, depth }) => {
  const wall = 2.4;
  const teeth = 3;
  return [
    box(width, wall, depth, 0xb7b9b5),
    box(1.6, 1.8, 0.05, 0x6f7d83, { x: -width / 4, z: depth / 2 }),
    ...windowRows(width / 2 - 0.4, depth / 2 + 0.02, [1.4]).map((p) => {
      p.geometry.translate(width / 4, 0, 0);
      return p;
    }),
    ...Array.from({ length: teeth }, (_, i) =>
      sawtooth(width, depth / teeth, 1.2, 0x7f8c93, { y: wall, z: -depth / 2 + (i + 0.5) * (depth / teeth) }),
    ),
  ];
};

const officeBlock: Builder = ({ width, depth, height }) => {
  const floors = 4;
  const floorHeight = height / floors;
  return [
    box(width, height, depth, 0xe4e6ea),
    ...Array.from({ length: floors }, (_, i) => box(width + 0.04, floorHeight * 0.45, depth + 0.04, GLASS, { y: i * floorHeight + floorHeight * 0.35 })),
    box(width * 0.4, 0.3, depth * 0.4, METAL, { y: height }),
  ];
};

/** An aero-engine works: an arched hall with a turbofan on a stand. */
const engineWorks: Builder = ({ width, depth, height }) => {
  const hallWidth = width - 3.2;
  const hallX = -width / 2 + hallWidth / 2;
  const engineX = width / 2 - 1.6;
  const wall = height - depth / 2;
  const arch = new THREE.CylinderGeometry(depth / 2, depth / 2, hallWidth, 16, 1, false, 0, Math.PI);
  return [
    box(hallWidth, wall, depth, 0xc8ccd0, { x: hallX }),
    part(arch, 0x7e8a96, { x: hallX, y: wall, turnZ: Math.PI / 2 }),
    box(2, 2, 0.05, 0x5d6672, { x: hallX - 1, z: depth / 2 }),
    box(1.6, 0.6, 0.8, DARK, { x: engineX }),
    part(new THREE.CylinderGeometry(1, 0.85, 2.6, 20, 1, true), 0xd9dde2, { x: engineX, y: 1.6, turnX: Math.PI / 2 }),
    part(new THREE.CircleGeometry(0.95, 20), DARK, { x: engineX, y: 1.6, z: 1.25 }),
    part(new THREE.ConeGeometry(0.3, 0.5, 12), METAL, { x: engineX, y: 1.6, z: 1.45, turnX: Math.PI / 2 }),
  ];
};

const mailbox: Builder = () => [
  box(0.1, 0.9, 0.1, DARK),
  box(0.5, 0.42, 0.55, 0xc0393b, { y: 0.85 }),
  roller(0.25, 0.5, 0xc0393b, { y: 1.27, turnY: Math.PI / 2 }),
  box(0.3, 0.04, 0.02, DARK, { y: 1.05, z: 0.28 }),
  box(0.04, 0.3, 0.04, 0xf2c230, { x: 0.27, y: 1.1, z: 0.15 }),
];

const desk = (color = WOOD): Part[] => [
  box(0.9, 0.06, 0.6, color, { y: 0.7 }),
  ...[
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].map(([dx, dz]) => box(0.06, 0.7, 0.06, color, { x: dx * 0.4, z: dz * 0.25 })),
];

const computer: Builder = () => [
  ...desk(),
  box(0.6, 0.38, 0.05, DARK, { y: 0.88, z: -0.15 }),
  box(0.52, 0.3, 0.02, 0x6fb3e0, { y: 0.92, z: -0.12 }),
  box(0.06, 0.12, 0.06, DARK, { y: 0.76, z: -0.15 }),
  box(0.45, 0.03, 0.15, 0x55565e, { y: 0.76, z: 0.12 }),
];

const printer3d: Builder = () => [
  box(0.9, 0.12, 0.8, DARK),
  box(0.7, 0.04, 0.6, 0x2f2f2f, { y: 0.28 }),
  ...[-0.4, 0.4].map((x) => box(0.06, 1.05, 0.06, 0xe8712b, { x, y: 0.12 })),
  box(0.86, 0.08, 0.08, 0xe8712b, { y: 1.12 }),
  box(0.8, 0.05, 0.05, METAL, { y: 0.72 }),
  box(0.16, 0.18, 0.14, 0xe8712b, { x: 0.05, y: 0.62 }),
  part(new THREE.ConeGeometry(0.04, 0.08, 8), 0xd4a63a, { x: 0.05, y: 0.58, turnX: Math.PI }),
  cylinder(0.05, 0.05, 0x1b1b1f, { x: 0.05, y: 0.32 }),
  roller(0.14, 0.08, 0x4a9a54, { y: 1.3, z: -0.1 }),
];

const workbench: Builder = () => [
  ...desk(DARK_WOOD),
  box(0.15, 0.12, 0.12, METAL, { x: 0.33, y: 0.76, z: 0.2 }),
  cylinder(0.18, 0.03, DARK, { x: -0.15, y: 0.76 }),
  cylinder(0.05, 0.04, METAL, { x: -0.15, y: 0.76 }),
  box(0.3, 0.02, 0.06, METAL, { x: 0.15, y: 0.76, z: -0.15 }),
];

const darkroomHut: Builder = ({ width, depth, height }) => {
  const wall = height - 1.2;
  return [
    box(width * 0.9, wall, depth * 0.9, 0x3a3236),
    gable(width * 0.95, depth, 1.2, 0x222024, { y: wall }),
    box(0.8, 1.5, 0.05, 0x1b1517, { z: depth * 0.45 }),
    part(new THREE.SphereGeometry(0.14, 10, 8), 0xff3b2f, { y: 1.75, z: depth * 0.45 + 0.08 }),
  ];
};

const swimmingPool: Builder = ({ width, depth, height }) => {
  const deck = height - 0.2;
  const water = { width: width - 1.2, depth: depth - 1.6 };
  const lanes = 5;
  return [
    box(width, deck, (depth - water.depth) / 2, 0xe8e2d4, { z: -(water.depth + depth) / 4 }),
    box(width, deck, (depth - water.depth) / 2, 0xe8e2d4, { z: (water.depth + depth) / 4 }),
    box((width - water.width) / 2, deck, water.depth, 0xe8e2d4, { x: -(water.width + width) / 4 }),
    box((width - water.width) / 2, deck, water.depth, 0xe8e2d4, { x: (water.width + width) / 4 }),
    box(water.width, deck - 0.12, water.depth, 0x3d9ad8),
    ...Array.from({ length: lanes - 1 }, (_, i) =>
      box(water.width, 0.05, 0.06, i % 2 ? 0xc0393b : WHITE, { y: deck - 0.1, z: -water.depth / 2 + ((i + 1) * water.depth) / lanes }),
    ),
    ...Array.from({ length: lanes }, (_, i) =>
      box(0.4, 0.4, 0.4, WHITE, { x: -water.width / 2 - 0.3, y: deck, z: -water.depth / 2 + ((i + 0.5) * water.depth) / lanes }),
    ),
    ...[-0.2, 0.2].map((dz) => box(0.05, 0.8, 0.05, METAL, { x: water.width / 2 - 0.1, y: deck - 0.3, z: dz })),
  ];
};

const tennisCourt: Builder = ({ width, depth, height }) => {
  const court = { width: width - 0.6, depth: depth - 0.6 };
  const line = (w: number, d: number, place: Place) => box(w, 0.02, d, WHITE, { ...place, y: 0.06 });
  return [
    box(width, 0.05, depth, 0x5f8f4c),
    box(court.width, 0.06, court.depth, 0xc4683e),
    line(court.width, 0.06, { z: -court.depth / 2 + 0.03 }),
    line(court.width, 0.06, { z: court.depth / 2 - 0.03 }),
    line(court.width, 0.06, { z: -court.depth * 0.38 }),
    line(court.width, 0.06, { z: court.depth * 0.38 }),
    line(0.06, court.depth, { x: -court.width / 2 + 0.03 }),
    line(0.06, court.depth, { x: court.width / 2 - 0.03 }),
    line(court.width * 0.5, 0.06, { z: 0 }),
    line(0.06, court.depth * 0.76, { x: -court.width / 4 }),
    line(0.06, court.depth * 0.76, { x: court.width / 4 }),
    ...[-1, 1].map((side) => box(0.08, height, 0.08, METAL, { z: side * (depth / 2 - 0.1) })),
    box(0.03, height * 0.8, depth - 0.2, 0x2b2b2b, { y: 0.06 }),
    box(0.06, 0.08, depth - 0.2, WHITE, { y: height * 0.8 }),
  ];
};

const summitCross: Builder = ({ width, height }) => [
  part(new THREE.DodecahedronGeometry(0.55), STONE, { y: 0.25 }),
  part(new THREE.DodecahedronGeometry(0.35), 0x85817a, { x: width * 0.25, y: 0.15, z: 0.1 }),
  box(0.14, height - 0.4, 0.14, DARK_WOOD, { y: 0.4 }),
  box(1, 0.14, 0.14, DARK_WOOD, { y: height - 0.75 }),
];

const jukebox: Builder = ({ height }) => {
  const body = height - 0.4;
  return [
    box(0.8, body, 0.55, 0x7a2f3a),
    roller(0.4, 0.55, 0x7a2f3a, { y: body, turnY: Math.PI / 2 }),
    part(new THREE.CylinderGeometry(0.33, 0.33, 0.04, 20, 1, false, Math.PI / 2, Math.PI), 0xf2c230, {
      y: body,
      z: 0.27,
      turnX: Math.PI / 2,
    }),
    box(0.6, 0.35, 0.03, 0x93d1e6, { y: body - 0.5, z: 0.27 }),
    box(0.6, 0.4, 0.03, DARK, { y: 0.15, z: 0.27 }),
    ...[-0.36, 0.36].map((x) => box(0.06, body, 0.04, 0xe8712b, { x, z: 0.27 })),
  ];
};

const SHAPE_BUILDERS: Record<PoiShape, Builder> = {
  "camera stand": cameraStand,
  "welcome board": welcomeBoard,
  "university hall": universityHall,
  "four-cylinder tower": fourCylinderTower,
  "kangaroo sign": kangarooSign,
  "factory shed": factoryShed,
  "office block": officeBlock,
  "engine works": engineWorks,
  mailbox,
  computer,
  "3D printer": printer3d,
  workbench,
  "darkroom hut": darkroomHut,
  "swimming pool": swimmingPool,
  "tennis court": tennisCourt,
  "summit cross": summitCross,
  jukebox,
};

const speaker: Builder = () => [
  box(0.6, 1.1, 0.5, DARK),
  roller(0.2, 0.04, 0x55565e, { y: 0.4, z: 0.26, turnY: Math.PI / 2 }),
  roller(0.1, 0.04, 0x55565e, { y: 0.85, z: 0.26, turnY: Math.PI / 2 }),
];

const arcadeCabinet: Builder = () => [
  box(0.7, 1.7, 0.7, 0x2c3e8f),
  box(0.6, 0.45, 0.04, 0x63d2a0, { y: 1.05, z: 0.3, turnX: -0.2 }),
  box(0.72, 0.18, 0.3, 0xf2c230, { y: 1.55, z: 0.25 }),
  box(0.7, 0.08, 0.3, DARK, { y: 0.78, z: 0.45 }),
  cylinder(0.04, 0.12, 0xc0393b, { x: -0.15, y: 0.86, z: 0.45 }),
];

const SCENERY_PROP_BUILDERS: Record<string, Builder> = {
  workbench,
  anvil: () => [box(0.3, 0.35, 0.3, DARK_WOOD), box(0.55, 0.18, 0.22, 0x4a4d55, { y: 0.35 })],
  wheelbarrow: () => [box(0.5, 0.25, 0.7, 0x4a7f3a, { y: 0.3 }), roller(0.15, 0.06, DARK, { y: 0.15, z: 0.35 })],
  barrel: () => [cylinder(0.3, 0.75, WOOD, {}, 0.28), cylinder(0.31, 0.05, METAL, { y: 0.6 })],
  "archery target": () => [
    box(0.08, 1, 0.08, WOOD, { z: -0.15 }),
    roller(0.4, 0.1, WHITE, { y: 0.9, turnY: Math.PI / 2 }),
    roller(0.27, 0.12, 0xc0393b, { y: 0.9, turnY: Math.PI / 2 }),
    roller(0.12, 0.14, 0xf2c230, { y: 0.9, turnY: Math.PI / 2 }),
  ],
  "kit chest": () => [box(0.8, 0.45, 0.5, WOOD), box(0.82, 0.06, 0.52, METAL, { y: 0.3 })],
  speaker,
  "arcade cabinet": arcadeCabinet,
};

/** Munich's blue-and-white maypole, with crossbars of guild boards and a green crown. */
const maypole: Builder = ({ height }) => {
  const bands = 16;
  return [
    cylinder(0.3, 0.3, STONE),
    ...Array.from({ length: bands }, (_, i) =>
      cylinder(0.12, height / bands, i % 2 ? WHITE : 0x3b6fc4, { y: 0.3 + (i * height) / bands }, 0.11, 8),
    ),
    ...[4.2, 6].flatMap((y, row) => [
      box(1.8 - row * 0.4, 0.06, 0.06, DARK_WOOD, { y }),
      ...[-1, 1].map((side) => box(0.28, 0.38, 0.03, row ? 0x3b6fc4 : 0xc0393b, { x: side * (0.7 - row * 0.2), y: y - 0.45 })),
    ]),
    part(new THREE.TorusGeometry(0.35, 0.1, 6, 16), 0x3f8f3c, { y: height + 0.1, turnX: Math.PI / 2 }),
    part(new THREE.ConeGeometry(0.2, 0.6, 8), 0x3f8f3c, { y: height + 0.5 }),
  ];
};

const well: Builder = () => [
  part(new THREE.CylinderGeometry(0.42, 0.45, 0.6, 14, 1, true), STONE, { y: 0.3 }),
  cylinder(0.38, 0.45, 0x2c5f99),
  ...[-0.4, 0.4].map((x) => box(0.08, 1.3, 0.08, DARK_WOOD, { x })),
  gable(1.1, 0.9, 0.4, 0xb5483a, { y: 1.3 }),
  roller(0.05, 0.8, DARK_WOOD, { y: 0.95 }),
];

const signpost: Builder = ({ height }) => [
  box(0.12, height, 0.12, DARK_WOOD),
  box(0.9, 0.3, 0.06, WOOD, { y: height - 0.4, z: 0.08 }),
  part(new THREE.ConeGeometry(0.15, 0.2, 3), WOOD, { x: 0.52, y: height - 0.25, z: 0.08, turnZ: -Math.PI / 2 }),
];

/** Moves a model's parts from its local layout onto the ground at a rectangle's centre. */
function placedOn({ left, top, right, bottom }: WorldRect, height: number, build: Builder): Part[] {
  const parts = build({ width: right - left, depth: bottom - top, height });
  const centre = { x: (left + right) / 2, z: (top + bottom) / 2 };
  const ground = groundHeight(centre);
  for (const { geometry } of parts) geometry.translate(centre.x, ground, centre.z);
  return parts;
}

function withVertexColor({ geometry, color }: Part) {
  const plain = geometry.index ? geometry.toNonIndexed() : geometry;
  plain.deleteAttribute("uv");
  const rgb = new THREE.Color(color);
  const count = plain.getAttribute("position").count;
  plain.setAttribute("color", new THREE.Float32BufferAttribute(Array.from({ length: count }, () => [rgb.r, rgb.g, rgb.b]).flat(), 3));
  if (plain !== geometry) geometry.dispose();
  return plain;
}

/** Every Point of Interest's model, the Signposts, the Hub's maypole and well, and the scenery props, as one mesh. */
export function createPointsOfInterest(pointsOfInterest: readonly PointOfInterest[]): THREE.Mesh {
  const parts = [
    ...pointsOfInterest.flatMap((poi) => {
      const { shape, height, base } = pointOfInterestModel(poi);
      return placedOn(base, height, SHAPE_BUILDERS[shape]);
    }),
    ...HUB_SIGNPOSTS.flatMap(({ tile }) => placedOn(footprintWorldRect(tile), SIGNPOST_HEIGHT, signpost)),
    ...SCENERY_PROPS.flatMap(({ at, prop }) =>
      placedOn(footprintWorldRect(at), SCENERY_PROP_HEIGHT, SCENERY_PROP_BUILDERS[prop] ?? SCENERY_PROP_BUILDERS["kit chest"]),
    ),
    ...placedOn(HUB_SET_PIECES.maypole.base, HUB_SET_PIECES.maypole.height, maypole),
    ...HUB_SET_PIECES.wells.flatMap(({ base, height }) => placedOn(base, height, well)),
  ];
  const geometries = parts.map(withVertexColor);
  const merged = mergeGeometries(geometries);
  for (const geometry of geometries) geometry.dispose();
  const mesh = new THREE.Mesh(merged, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

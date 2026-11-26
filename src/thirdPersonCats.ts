import * as THREE from "three";
import { CAT_COATS, paintHeart, type Rgb } from "./art";
import { catPose, isHeartShown, type Cat, type CatAnimPose } from "./cats";
import { createNamePlate, createPixelSprite, disposePixelSprite } from "./thirdPersonNamePlates";
import {
  angleDifference,
  catWorldPosition,
  directionToHeading,
  groundHeight,
  isNamePlateShown,
  worldToTile,
  type WorldPosition,
} from "./thirdPersonWorld";

/**
 * Berlioz and Manouche as low-poly cats built in code from Three.js primitives, posed by code for walking, standing,
 * sitting and sleeping. A model faces +z (south), the way a Three.js object with heading 0 looks.
 */

const BODY = { width: 0.2, height: 0.18, length: 0.42 };
const LEG = { width: 0.06, length: 0.16 };
const HIP_HEIGHT = LEG.length;
const HEAD_SIZE = 0.18;
/** A touch larger than life, so a Cat reads beside the chunky Player. */
const CAT_SCALE = 1.3;
/** Where the Name plate (or the heart) floats above a standing Cat. */
const STANDING_HEIGHT = 0.55 * CAT_SCALE;
const SLEEPING_HEIGHT = 0.3 * CAT_SCALE;
const PLATE_GAP = 0.05;
const HEART_SIZE = 0.2;
const WALK_STRIDE = 0.6;
/** Leg swings per second while walking. */
const WALK_CADENCE = 9;
const TURN_RATE = 10;

type CatMeshes = {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  tail: THREE.Group;
  legs: { pivot: THREE.Group; front: boolean; side: number }[];
};

function material(color: Rgb) {
  const [r, g, b] = color;
  return new THREE.MeshLambertMaterial({ color: new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace) });
}

function mesh(geometry: THREE.BufferGeometry, coat: THREE.Material, x = 0, y = 0, z = 0) {
  const part = new THREE.Mesh(geometry, coat);
  part.position.set(x, y, z);
  part.castShadow = true;
  return part;
}

function buildCat(coat: Record<string, Rgb>): CatMeshes {
  const fur = material(coat.f);
  const shade = material(coat.F);
  const patch = material(coat.o);
  const eye = material(coat.e);
  const nose = material(coat.n);

  const root = new THREE.Group();
  const figure = new THREE.Group();
  figure.scale.setScalar(CAT_SCALE);
  root.add(figure);
  const body = new THREE.Group();
  body.position.y = HIP_HEIGHT;
  body.add(mesh(new THREE.BoxGeometry(BODY.width, BODY.height, BODY.length), fur, 0, BODY.height / 2, 0));
  body.add(mesh(new THREE.BoxGeometry(BODY.width * 0.8, 0.02, BODY.length * 0.5), patch, 0, BODY.height + 0.005, -0.04));

  const head = new THREE.Group();
  head.position.set(0, BODY.height * 0.8, BODY.length / 2);
  head.add(mesh(new THREE.BoxGeometry(HEAD_SIZE, HEAD_SIZE * 0.9, HEAD_SIZE * 0.9), fur, 0, HEAD_SIZE * 0.4, HEAD_SIZE * 0.3));
  for (const side of [-1, 1]) {
    const ear = mesh(new THREE.ConeGeometry(0.035, 0.07, 4), side < 0 ? shade : patch, side * 0.055, HEAD_SIZE * 0.95, HEAD_SIZE * 0.25);
    ear.rotation.y = Math.PI / 4;
    head.add(ear);
    head.add(mesh(new THREE.BoxGeometry(0.03, 0.03, 0.01), eye, side * 0.045, HEAD_SIZE * 0.5, HEAD_SIZE * 0.76));
  }
  head.add(mesh(new THREE.BoxGeometry(0.03, 0.02, 0.02), nose, 0, HEAD_SIZE * 0.32, HEAD_SIZE * 0.77));
  body.add(head);

  const tail = new THREE.Group();
  tail.position.set(0, BODY.height * 0.8, -BODY.length / 2);
  tail.add(mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.28, 6), fur, 0, 0.14, 0));
  tail.add(mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.06, 6), patch, 0, 0.29, 0));
  body.add(tail);

  const legs = [true, false].flatMap((front) =>
    [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * (BODY.width / 2 - LEG.width / 2), HIP_HEIGHT, ((front ? 1 : -1) * BODY.length) / 2.6);
      pivot.add(mesh(new THREE.BoxGeometry(LEG.width, LEG.length, LEG.width), shade, 0, -LEG.length / 2, 0));
      figure.add(pivot);
      return { pivot, front, side };
    }),
  );
  figure.add(body);
  return { root, body, head, tail, legs };
}

/** Puts the Cat's parts in a pose; `time` drives the walk cycle, the swish of the tail and a sleeper's breathing. */
function pose(cat: CatMeshes, current: CatAnimPose, time: number) {
  const swing = current === "walk" ? Math.sin(time * WALK_CADENCE) * WALK_STRIDE : 0;
  cat.body.position.y = HIP_HEIGHT + (current === "walk" ? Math.abs(Math.sin(time * WALK_CADENCE)) * 0.015 : 0);
  cat.body.rotation.set(0, 0, 0);
  cat.body.scale.set(1, 1, 1);
  cat.head.rotation.set(0, 0, 0);
  cat.tail.rotation.set(-0.5 + Math.sin(time * 2) * 0.15, Math.sin(time * 1.3) * 0.3, 0);
  for (const { pivot, front, side } of cat.legs) {
    pivot.visible = true;
    pivot.position.y = HIP_HEIGHT;
    pivot.rotation.set((front === side > 0 ? 1 : -1) * swing, 0, 0);
  }

  if (current === "sit") {
    // Rear on the ground, chest up, front legs straight.
    cat.body.position.y = 0.12;
    cat.body.rotation.x = -0.75;
    cat.head.rotation.x = 0.6;
    cat.tail.rotation.set(-1.9, 0, 0);
    for (const leg of cat.legs) {
      if (leg.front) leg.pivot.rotation.x = 0.15;
      else leg.pivot.visible = false;
    }
  } else if (current === "sleep") {
    // Curled up on the ground: legs tucked away, head down on its side, tail wrapped round, slowly breathing.
    cat.body.position.y = 0;
    cat.body.scale.y = 0.8 + Math.sin(time * 1.5) * 0.04;
    cat.body.rotation.y = 0.3;
    cat.head.rotation.set(0.5, -0.9, 0.4);
    cat.tail.rotation.set(-Math.PI / 2, 0, 1.4);
    for (const leg of cat.legs) leg.pivot.visible = false;
  }
}


function createHeart() {
  return createPixelSprite(paintHeart(), { width: HEART_SIZE * (7 / 6), height: HEART_SIZE }, { minFilter: THREE.NearestFilter });
}

/** The Cats' models, kept in step with their wander each frame; `update` with 0 seconds stills them. */
export function createThirdPersonCats(cats: readonly Cat[]) {
  const group = new THREE.Group();
  const drawn = cats.map((cat) => {
    const model = buildCat(CAT_COATS[cat.name]);
    const plate = createNamePlate(cat.name);
    const heart = createHeart();
    model.root.add(plate, heart);
    model.root.rotation.y = directionToHeading(cat.facing);
    group.add(model.root);
    return { cat, model, plate, heart };
  });
  let time = 0;

  return {
    group,
    update(seconds: number, player: WorldPosition) {
      time += seconds;
      for (const { cat, model, plate, heart } of drawn) {
        const position = catWorldPosition(cat);
        model.root.position.set(position.x, groundHeight(position), position.z);
        const turn = angleDifference(directionToHeading(cat.facing), model.root.rotation.y);
        model.root.rotation.y += turn * (1 - Math.exp(-TURN_RATE * seconds));
        const current = catPose(cat);
        pose(model, current, time);

        const top = current === "sleep" ? SLEEPING_HEIGHT : STANDING_HEIGHT;
        heart.visible = isHeartShown(cat);
        heart.position.y = top;
        plate.position.y = heart.visible ? top + HEART_SIZE + PLATE_GAP : top;
        plate.visible = isNamePlateShown(worldToTile(position), player);
      }
    },
    dispose() {
      for (const { model, plate, heart } of drawn) {
        disposePixelSprite(plate);
        disposePixelSprite(heart);
        model.root.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            (object.material as THREE.Material).dispose();
          }
        });
      }
    },
  };
}

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { PlayerAnimation } from "./thirdPersonWorld";

/** Kenney's Mini Characters "character-male-c", trimmed and recoloured to Alexander (see CREDITS.md). */
const MODEL_PATH = "models/player.glb";
/** The model is 0.79 units tall; this makes the Player about 1.35 units (≈ 1.6 m). */
const MODEL_SCALE = 1.7;
/** Where the hand sits along the right arm bone, which points sideways (-x) in the bind pose. */
const HAND_OFFSET = new THREE.Vector3(-0.3, -0.02, 0.07);
const CROSS_FADE_SECONDS = 0.2;
/** How quickly the model turns to its travel direction, per second. */
const TURN_RATE = 14;

export type PlayerPose = PlayerAnimation | "raise";

const CLIPS: Record<PlayerPose, string> = {
  idle: "idle",
  walk: "walk",
  run: "sprint",
  raise: "holding-both",
};

export type PlayerModel = {
  object: THREE.Object3D;
  /** Cross-fades to a pose; raising the camera holds until another pose is chosen. */
  pose(pose: PlayerPose): void;
  /** Turns the model to `heading` at once, as after Fast-travel. */
  face(heading: number): void;
  /** Advances the animation and turns the model towards `heading`. */
  update(heading: number, seconds: number): void;
};

function angleDifference(to: number, from: number) {
  return ((((to - from) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
}

/** A small code-built camera: dark body, grey lens pointing along the arm, a yellow shutter button. */
function createCamera() {
  const camera = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.09, 0.14),
    new THREE.MeshLambertMaterial({ color: 0x2b2b33 }),
  );
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.04, 0.06, 12),
    new THREE.MeshLambertMaterial({ color: 0xc4c8d0 }),
  );
  lens.rotation.z = Math.PI / 2;
  lens.position.x = -0.07;
  const button = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.02, 0.03),
    new THREE.MeshLambertMaterial({ color: 0xe6b43c }),
  );
  button.position.set(0.01, 0.055, 0.03);
  camera.add(body, lens, button);
  camera.position.copy(HAND_OFFSET);
  return camera;
}

/** Loads the Player's rigged character, with a camera in its right hand and its idle, walk, run and raise animations. */
export async function loadPlayerModel(): Promise<PlayerModel> {
  const gltf = await new GLTFLoader().loadAsync(import.meta.env.BASE_URL + MODEL_PATH);
  const object = gltf.scene;
  object.scale.setScalar(MODEL_SCALE);
  object.traverse((child) => {
    child.castShadow = true;
  });
  object.getObjectByName("arm-right")!.add(createCamera());

  const mixer = new THREE.AnimationMixer(object);
  const actions = Object.fromEntries(
    Object.entries(CLIPS).map(([pose, clip]) => [
      pose,
      mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, clip)!),
    ]),
  ) as Record<PlayerPose, THREE.AnimationAction>;

  let current = actions.idle;
  current.play();
  let heading = 0;

  return {
    object,
    pose(pose) {
      const next = actions[pose];
      if (next === current) return;
      next.reset().play();
      current.crossFadeTo(next, CROSS_FADE_SECONDS, false);
      current = next;
    },
    face(target) {
      heading = target;
      object.rotation.y = heading;
    },
    update(target, seconds) {
      heading += angleDifference(target, heading) * (1 - Math.exp(-TURN_RATE * seconds));
      object.rotation.y = heading;
      mixer.update(seconds);
    },
  };
}

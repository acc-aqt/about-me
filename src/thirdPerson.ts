import * as THREE from "three";
import type { Content, PointOfInterest } from "./content";
import { SPAWN_LANDING, type GameButton, type GameControls, type GameEvents } from "./game";
import { fastTravelLanding, type Landing } from "./overworld";
import { createScenery } from "./thirdPersonScenery";
import {
  directionToHeading,
  groundHeight,
  snapToLanding,
  stepPlayer,
  targetedPointOfInterest,
  tileToWorld,
  type MoveInput,
  type PlayerState,
} from "./thirdPersonWorld";

const SKY = 0x9fd3f2;
const FOG_NEAR = 30;
const FOG_FAR = 75;
/** Where the sun shines from, relative to the Player it follows so shadows stay sharp nearby. */
const SUN_OFFSET = new THREE.Vector3(-14, 24, 10);
const SHADOW_REACH = 22;
const PLAYER_HEIGHT = 1.5;
const CAMERA_TARGET_HEIGHT = 1.2;
/** The camera never dips closer than this to the mountain's slope. */
const CAMERA_CLEARANCE = 0.5;
const MIN_ZOOM = 3;
const MAX_ZOOM = 14;
const MIN_PITCH = 0.12;
const MAX_PITCH = 1.3;
const ORBIT_SPEED = 0.006;
const ZOOM_SPEED = 0.0015;
/** How quickly the camera swings back behind the walking Player, per second. */
const EASE_BACK_RATE = 2;

const KEY_BUTTONS: Record<string, GameButton> = {
  arrowup: "up",
  w: "up",
  arrowdown: "down",
  s: "down",
  arrowleft: "left",
  a: "left",
  arrowright: "right",
  d: "right",
  " ": "shutter",
};

function createCapsule() {
  const capsule = new THREE.Group();
  const radius = 0.3;
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, PLAYER_HEIGHT - 2 * radius),
    new THREE.MeshLambertMaterial({ color: 0x2a2f86 }),
  );
  body.position.y = PLAYER_HEIGHT / 2;
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.3), new THREE.MeshLambertMaterial({ color: 0xe6b43c }));
  nose.position.set(0, PLAYER_HEIGHT * 0.75, radius);
  body.castShadow = true;
  capsule.add(body, nose);
  return capsule;
}

/** Sunny daytime light casting soft shadows around the Player. */
function createSun() {
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {
    left: -SHADOW_REACH,
    right: SHADOW_REACH,
    top: SHADOW_REACH,
    bottom: -SHADOW_REACH,
    near: 1,
    far: 80,
  });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 3;
  return sun;
}

function angleDifference(to: number, from: number) {
  return ((((to - from) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function standingAt({ tile, facing }: Landing): PlayerState {
  return { position: tileToWorld(tile), heading: directionToHeading(facing) };
}

function addCanvas(container: HTMLElement) {
  const canvas = document.createElement("canvas");
  canvas.id = "third-person";
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "application");
  canvas.setAttribute("aria-label", "Third-person world");
  canvas.setAttribute("aria-describedby", "hint");
  container.prepend(canvas);
  return canvas;
}

/** Third-person mode: the same contract as the 2D game, rendering the Overworld in 3D with Three.js. */
export function startThirdPerson(
  container: HTMLElement,
  content: Content,
  events: GameEvents,
  start = SPAWN_LANDING,
): GameControls {
  const pointsOfInterest = content.zones.flatMap((zone) => zone.pointsOfInterest);
  const canvas = addCanvas(container);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, FOG_NEAR, FOG_FAR);
  scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x5d7a3a, 1.3));
  const sun = createSun();
  scene.add(sun, sun.target, createScenery());

  const capsule = createCapsule();
  scene.add(capsule);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, FOG_FAR + 10);
  let player = standingAt(start);
  const orbit = { yaw: player.heading, pitch: 0.45, distance: 7 };

  const held = new Set<GameButton>();
  let running = false;
  let dragging: { x: number; y: number } | null = null;
  let target: PointOfInterest | undefined;

  function updateTarget() {
    const next = targetedPointOfInterest(pointsOfInterest, player);
    if (next === target) return;
    target = next;
    events.onFacingChange(target ?? null);
  }

  function input(): MoveInput {
    return {
      forward: Number(held.has("up")) - Number(held.has("down")),
      right: Number(held.has("right")) - Number(held.has("left")),
      running,
    };
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = canvas;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function placeCamera(ground: number) {
    const { x, z } = player.position;
    const across = orbit.distance * Math.cos(orbit.pitch);
    const cameraX = x - Math.sin(orbit.yaw) * across;
    const cameraZ = z - Math.cos(orbit.yaw) * across;
    const height = ground + CAMERA_TARGET_HEIGHT + orbit.distance * Math.sin(orbit.pitch);
    camera.position.set(cameraX, Math.max(height, groundHeight({ x: cameraX, z: cameraZ }) + CAMERA_CLEARANCE), cameraZ);
    camera.lookAt(x, ground + CAMERA_TARGET_HEIGHT, z);
  }

  const clock = new THREE.Clock();
  function frame() {
    const seconds = Math.min(clock.getDelta(), 0.1);
    if (!events.isPaused()) {
      const move = input();
      player = stepPlayer(player, move, orbit.yaw, seconds);
      const walking = move.forward !== 0 || move.right !== 0;
      if (walking && move.forward >= 0 && !dragging) {
        orbit.yaw += angleDifference(player.heading, orbit.yaw) * (1 - Math.exp(-EASE_BACK_RATE * seconds));
      }
      updateTarget();
    }
    const ground = groundHeight(player.position);
    capsule.position.set(player.position.x, ground, player.position.z);
    capsule.rotation.y = player.heading;
    sun.target.position.copy(capsule.position);
    sun.position.copy(capsule.position).add(SUN_OFFSET);
    placeCamera(ground);
    renderer.render(scene, camera);
  }

  function press(button: GameButton) {
    if (button !== "shutter") held.add(button);
    else if (target && events.canFireShutter()) events.onShutter(target);
  }

  function release(button: GameButton) {
    held.delete(button);
  }

  canvas.addEventListener("keydown", (event) => {
    running = event.shiftKey;
    const button = KEY_BUTTONS[event.key.toLowerCase()];
    if (!button) return;
    event.preventDefault();
    if (button !== "shutter" || !event.repeat) press(button);
  });
  canvas.addEventListener("keyup", (event) => {
    running = event.shiftKey;
    const button = KEY_BUTTONS[event.key.toLowerCase()];
    if (button) release(button);
  });
  canvas.addEventListener("blur", () => {
    held.clear();
    running = false;
  });

  canvas.addEventListener("pointerdown", (event) => {
    dragging = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
    canvas.focus();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    orbit.yaw -= (event.clientX - dragging.x) * ORBIT_SPEED;
    orbit.pitch = clamp(orbit.pitch + (event.clientY - dragging.y) * ORBIT_SPEED, MIN_PITCH, MAX_PITCH);
    dragging = { x: event.clientX, y: event.clientY };
  });
  for (const type of ["pointerup", "pointercancel"]) canvas.addEventListener(type, () => (dragging = null));
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      orbit.distance = clamp(orbit.distance * Math.exp(event.deltaY * ZOOM_SPEED), MIN_ZOOM, MAX_ZOOM);
    },
    { passive: false },
  );

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();
  renderer.setAnimationLoop(frame);
  updateTarget();

  return {
    press,
    release,
    travelTo(zoneId) {
      player = standingAt(fastTravelLanding(zoneId));
      orbit.yaw = player.heading;
      updateTarget();
    },
    position: () => snapToLanding(player.position, player.heading),
    focus: () => canvas.focus(),
    stop() {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}

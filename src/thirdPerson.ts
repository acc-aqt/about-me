import * as THREE from "three";
import type { Cats } from "./cats";
import type { Content, PointOfInterest } from "./content";
import type { GameButton, GameControls, GameEvents } from "./game";
import { fastTravelLanding, type Landing } from "./overworld";
import { createThirdPersonCats } from "./thirdPersonCats";
import { createNamePlate, disposeNamePlate } from "./thirdPersonNamePlates";
import { createPointsOfInterest } from "./thirdPersonPointsOfInterest";
import { loadPlayerModel, type PlayerModel } from "./thirdPersonPlayer";
import { createScenery } from "./thirdPersonScenery";
import {
  directionToHeading,
  FLOATING_NAME_PLATES,
  groundHeight,
  isNamePlateShown,
  playerAnimation,
  snapToLanding,
  stepPlayer,
  targetedCat,
  targetedPointOfInterest,
  tileToWorld,
  type MoveInput,
  PLAYER_RADIUS,
  type PlayerState,
  type WorldPosition,
} from "./thirdPersonWorld";

const SKY = 0x9fd3f2;
const FOG_NEAR = 30;
const FOG_FAR = 75;
/** Where the sun shines from, relative to the Player it follows so shadows stay sharp nearby. */
const SUN_OFFSET = new THREE.Vector3(-14, 24, 10);
const SHADOW_REACH = 22;
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
/** The Shutter raises the camera, flashes, then opens the Viewfinder. */
const RAISE_SECONDS = 0.35;
const FLASH_SECONDS = 0.15;
/** The flash keeps fading as the Viewfinder opens. */
const FLASH_FADE_MS = 500;

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

/** The tiles the Player's circle covers, its centre's tile first, so a Cat never walks into it. */
function tilesUnder({ x, z }: WorldPosition) {
  const centre = { col: Math.floor(x), row: Math.floor(z) };
  const tiles = [centre];
  for (const col of [Math.floor(x - PLAYER_RADIUS), Math.floor(x + PLAYER_RADIUS)]) {
    for (const row of [Math.floor(z - PLAYER_RADIUS), Math.floor(z + PLAYER_RADIUS)]) {
      if (!tiles.some((tile) => tile.col === col && tile.row === row)) tiles.push({ col, row });
    }
  }
  return tiles;
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

/** A white full-window flash, as the photo is taken. */
function addFlash(container: HTMLElement) {
  const flash = document.createElement("div");
  flash.className = "shutter-flash";
  flash.setAttribute("aria-hidden", "true");
  container.append(flash);
  return {
    fire: () => flash.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: FLASH_FADE_MS, easing: "ease-out" }),
    remove: () => flash.remove(),
  };
}

export { loadPlayerModel };

/**
 * Third-person mode: the same contract as the 2D game, rendering the Overworld in 3D with Three.js. The Player's model
 * is loaded beforehand, so a failed load leaves the running renderer untouched.
 */
export function startThirdPerson(
  container: HTMLElement,
  content: Content,
  events: GameEvents,
  start: Landing,
  cats: Cats,
  playerModel: PlayerModel,
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
  scene.add(createPointsOfInterest(pointsOfInterest));

  const namePlates = FLOATING_NAME_PLATES.map((namePlate) => {
    const sprite = createNamePlate(namePlate.text);
    sprite.position.set(namePlate.anchor.x, namePlate.anchor.y, namePlate.anchor.z);
    scene.add(sprite);
    return { namePlate, sprite };
  });

  function showNearbyNamePlates() {
    for (const { namePlate, sprite } of namePlates) sprite.visible = isNamePlateShown(namePlate.at, player.position);
  }

  const catModels = createThirdPersonCats(cats.all);
  scene.add(catModels.group);

  scene.add(playerModel.object);
  const flash = addFlash(container);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, FOG_FAR + 10);
  let player = standingAt(start);
  playerModel.face(player.heading);
  const orbit = { yaw: player.heading, pitch: 0.45, distance: 7 };

  const held = new Set<GameButton>();
  let running = false;
  let dragging: { x: number; y: number } | null = null;
  let target: PointOfInterest | undefined;
  /** While the Shutter plays: the photographed Point of Interest and the seconds since Space. */
  let shot: { poi: PointOfInterest; seconds: number } | null = null;

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
      if (shot) advanceShot(seconds);
      else walk(seconds);
      playerModel.update(player.heading, seconds);
      cats.update(seconds, tilesUnder(player.position));
    }
    catModels.update(events.isPaused() ? 0 : seconds, player.position);
    showNearbyNamePlates();
    const ground = groundHeight(player.position);
    playerModel.object.position.set(player.position.x, ground, player.position.z);
    sun.target.position.copy(playerModel.object.position);
    sun.position.copy(playerModel.object.position).add(SUN_OFFSET);
    placeCamera(ground);
    renderer.render(scene, camera);
  }

  function walk(seconds: number) {
    const move = input();
    player = stepPlayer(player, move, orbit.yaw, seconds);
    playerModel.pose(playerAnimation(move));
    const walking = move.forward !== 0 || move.right !== 0;
    if (walking && move.forward >= 0 && !dragging) {
      orbit.yaw += angleDifference(player.heading, orbit.yaw) * (1 - Math.exp(-EASE_BACK_RATE * seconds));
    }
    updateTarget();
  }

  function advanceShot(seconds: number) {
    const { poi, seconds: before } = shot!;
    const now = before + seconds;
    if (before < RAISE_SECONDS && now >= RAISE_SECONDS) flash.fire();
    if (now < RAISE_SECONDS + FLASH_SECONDS) {
      shot = { poi, seconds: now };
      return;
    }
    shot = null;
    if (events.canFireShutter()) events.onShutter(poi);
  }

  function press(button: GameButton) {
    if (button !== "shutter") held.add(button);
    else if (shot || !events.canFireShutter()) return;
    else if (target) {
      shot = { poi: target, seconds: 0 };
      playerModel.pose("raise");
    } else petTargetedCat();
  }

  function petTargetedCat() {
    const cat = targetedCat(cats.all, player);
    if (cat) cats.pet(cat, tilesUnder(player.position)[0]);
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
      shot = null;
      playerModel.face(player.heading);
      orbit.yaw = player.heading;
      updateTarget();
    },
    position: () => snapToLanding(player.position, player.heading),
    focus: () => canvas.focus(),
    stop() {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      for (const { sprite } of namePlates) disposeNamePlate(sprite);
      catModels.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      flash.remove();
    },
  };
}

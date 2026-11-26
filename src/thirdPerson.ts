import * as THREE from "three";
import type { Content, PointOfInterest } from "./content";
import { SPAWN_LANDING, type GameButton, type GameControls, type GameEvents } from "./game";
import {
  fastTravelLanding,
  footprintTiles,
  tileKey,
  LEGEND,
  mapCharAt,
  MAP_COLUMNS,
  MAP_ROWS,
  type Landing,
  type Tile,
  type TileKind,
} from "./overworld";
import { createNamePlate, disposeNamePlate } from "./thirdPersonNamePlates";
import { createPointsOfInterest, MODELLED_TILE_KINDS } from "./thirdPersonPointsOfInterest";
import {
  directionToHeading,
  FLOATING_NAME_PLATES,
  isNamePlateShown,
  isSolid,
  snapToLanding,
  stepPlayer,
  targetedPointOfInterest,
  tileToWorld,
  type MoveInput,
  type PlayerState,
} from "./thirdPersonWorld";

/** Placeholder colours and heights per tile kind until real scenery replaces the boxes. */
const TILE_LOOKS: Record<TileKind, { color: number; height: number }> = {
  grass: { color: 0x6dbb4f, height: 0 },
  path: { color: 0xd8c08a, height: 0 },
  asphalt: { color: 0x5b5d66, height: 0 },
  track: { color: 0xe9eef2, height: 0 },
  tree: { color: 0x2f6e35, height: 2.4 },
  bush: { color: 0x3f8f3c, height: 0.8 },
  water: { color: 0x3d7ccf, height: 0.15 },
  building: { color: 0xc9a27a, height: 3.5 },
  fence: { color: 0x8a6440, height: 0.7 },
  maypole: { color: 0x4a7fd0, height: 6 },
  well: { color: 0x8d8d96, height: 0.8 },
  prop: { color: 0x9b6b43, height: 0.9 },
  landmark: { color: 0xb0b4bc, height: 2 },
  car: { color: 0xc0393b, height: 1.2 },
  rock: { color: 0x7d7a74, height: 1.5 },
  snow: { color: 0xf4f7fb, height: 1.5 },
};

const SKY = 0x9fd3f2;
const PLAYER_HEIGHT = 1.5;
const CAMERA_TARGET_HEIGHT = 1.2;
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

function lookOf(tile: Tile) {
  return TILE_LOOKS[LEGEND[mapCharAt(tile)!].kind];
}

/** Whether a solid tile has a Point of Interest, Signpost or set piece model standing on it, rather than a box. */
function isModelled(tile: Tile, footprints: ReadonlySet<string>) {
  const { kind, walkable } = LEGEND[mapCharAt(tile)!];
  return walkable || MODELLED_TILE_KINDS.has(kind) || footprints.has(tileKey(tile));
}

function allTiles(): Tile[] {
  return Array.from({ length: MAP_ROWS }, (_, row) => Array.from({ length: MAP_COLUMNS }, (_, col) => ({ col, row }))).flat();
}

/** One texel per tile, coloured by the ground's kind. */
function createGround() {
  const data = new Uint8Array(MAP_COLUMNS * MAP_ROWS * 4);
  const color = new THREE.Color();
  for (const tile of allTiles()) {
    const { kind, walkable } = LEGEND[mapCharAt(tile)!];
    color.setHex(walkable ? TILE_LOOKS[kind].color : TILE_LOOKS.grass.color);
    const texel = ((MAP_ROWS - 1 - tile.row) * MAP_COLUMNS + tile.col) * 4;
    data.set([color.r * 255, color.g * 255, color.b * 255, 255], texel);
  }
  const texture = new THREE.DataTexture(data, MAP_COLUMNS, MAP_ROWS);
  texture.magFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(MAP_COLUMNS, MAP_ROWS), new THREE.MeshLambertMaterial({ map: texture }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(MAP_COLUMNS / 2, 0, MAP_ROWS / 2);
  return ground;
}

/** A box on every solid tile without a model, so the layout matches the 2D map tile for tile. */
function createSolidBoxes(pointsOfInterest: readonly PointOfInterest[]) {
  const footprints = new Set(pointsOfInterest.flatMap((poi) => footprintTiles(poi.placement)).map(tileKey));
  const solids = allTiles().filter((tile) => isSolid(tile) && !isModelled(tile, footprints));
  const boxes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), solids.length);
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  solids.forEach((tile, index) => {
    const { color: hex, height } = lookOf(tile);
    const { x, z } = tileToWorld(tile);
    matrix.makeScale(1, height, 1).setPosition(x, height / 2, z);
    boxes.setMatrixAt(index, matrix);
    boxes.setColorAt(index, color.setHex(hex));
  });
  return boxes;
}

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
  capsule.add(body, nose);
  return capsule;
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

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x4a6b3a, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(-0.6, 1, 0.4);
  scene.add(sun, createGround(), createSolidBoxes(pointsOfInterest), createPointsOfInterest(pointsOfInterest));

  const namePlates = FLOATING_NAME_PLATES.map((namePlate) => {
    const sprite = createNamePlate(namePlate.text);
    sprite.position.set(namePlate.anchor.x, namePlate.anchor.y, namePlate.anchor.z);
    scene.add(sprite);
    return { namePlate, sprite };
  });

  function showNearbyNamePlates() {
    for (const { namePlate, sprite } of namePlates) sprite.visible = isNamePlateShown(namePlate.at, player.position);
  }

  const capsule = createCapsule();
  scene.add(capsule);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
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

  function placeCamera() {
    const { x, z } = player.position;
    const across = orbit.distance * Math.cos(orbit.pitch);
    camera.position.set(
      x - Math.sin(orbit.yaw) * across,
      CAMERA_TARGET_HEIGHT + orbit.distance * Math.sin(orbit.pitch),
      z - Math.cos(orbit.yaw) * across,
    );
    camera.lookAt(x, CAMERA_TARGET_HEIGHT, z);
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
    showNearbyNamePlates();
    capsule.position.set(player.position.x, 0, player.position.z);
    capsule.rotation.y = player.heading;
    placeCamera();
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
      for (const { sprite } of namePlates) disposeNamePlate(sprite);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}

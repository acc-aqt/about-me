import { createAudio } from "./audio";
import { content, type PointOfInterest } from "./content";
import { createFastTravel } from "./fastTravel";
import { startGame, type GameButton, type GameControls } from "./game";
import { createInventory, isInventoryKey } from "./inventory";
import { createViewfinder } from "./viewfinder";
import { query } from "./dom";

const isTouch = window.matchMedia("(pointer: coarse)").matches;
const portrait = window.matchMedia("(orientation: portrait)");

function controlsHint() {
  if (!isTouch) return "Walk with the arrow keys or WASD. Face a sign and press Space to take a photo. Press I for the Inventory.";
  if (portrait.matches) return "Face a sign and press A to take a photo. Press B for the Inventory.";
  return "Walk with the d-pad. Face a sign and tap the Shutter to take a photo. Tap ▤ for the Inventory.";
}

function shutterPrompt() {
  if (!isTouch) return "press Space";
  return portrait.matches ? "press A" : "tap the Shutter";
}

const canvas = query<HTMLCanvasElement>(document, "#game");
const hint = query<HTMLElement>(document, "#hint");
const dialog = query<HTMLDialogElement>(document, "#viewfinder");
const filmRollCounter = query<HTMLElement>(document, "#film-rolls");

let facing: PointOfInterest | null = null;

function showHint() {
  hint.textContent = facing ? `Facing ${facing.title} — ${shutterPrompt()}` : controlsHint();
}

portrait.addEventListener("change", showHint);

const totalFilmRolls = content.zones.filter((zone) => zone.filmRoll).length;
let collectedFilmRolls = 0;

function showFilmRollCount() {
  filmRollCounter.textContent = `Film rolls: ${collectedFilmRolls}/${totalFilmRolls}`;
}

const fastTravelToggle = query<HTMLButtonElement>(document, ".fast-travel-toggle");
const fastTravelZones = query<HTMLUListElement>(document, "#fast-travel-zones");
const soundToggle = query<HTMLButtonElement>(document, "#sound-toggle");
const soundToggleState = query<HTMLElement>(soundToggle, ".sound-toggle-state");

const audio = createAudio();

soundToggle.addEventListener("click", (event) => {
  audio.setMuted(!audio.isMuted());
  soundToggle.setAttribute("aria-pressed", String(!audio.isMuted()));
  soundToggleState.textContent = audio.isMuted() ? "off" : "on";
  // A mouse or tap click hands focus back to the game so walking keeps working.
  if (event.detail > 0) canvas.focus();
});

const inventoryDialog = query<HTMLDialogElement>(document, "#inventory");

const viewfinder = createViewfinder(dialog, () => canvas.focus());
const inventory = createInventory(inventoryDialog, content.inventory, () => canvas.focus());

canvas.addEventListener("keydown", (event) => {
  if (isInventoryKey(event) && !viewfinder.isOpen()) {
    event.preventDefault();
    inventory.toggle();
  }
});

const controls = startGame(canvas, content, {
  onFacingChange(poi) {
    facing = poi;
    showHint();
  },
  onShutter(poi) {
    audio.playShutter();
    viewfinder.open(poi);
  },
  canFireShutter: () => !viewfinder.isOpen() && !inventory.isOpen(),
  onFilmRollCollected() {
    collectedFilmRolls++;
    showFilmRollCount();
    if (collectedFilmRolls === totalFilmRolls) viewfinder.open(content.filmRollBonus);
  },
  onFootstep: () => audio.playFootstep(),
  onBump: () => audio.playBump(),
});

function bindTouchButton(element: HTMLButtonElement, controls: GameControls) {
  const button = element.dataset.gameButton as GameButton;
  element.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    controls.press(button);
  });
  for (const type of ["pointerup", "pointercancel", "pointerleave"]) {
    element.addEventListener(type, () => controls.release(button));
  }
  element.addEventListener("contextmenu", (event) => event.preventDefault());
}

document
  .querySelectorAll<HTMLButtonElement>("[data-game-button]")
  .forEach((element) => bindTouchButton(element, controls));

query<HTMLButtonElement>(document, ".touch-button-inventory").addEventListener("click", () => {
  if (!viewfinder.isOpen()) inventory.toggle();
});

createFastTravel(fastTravelToggle, fastTravelZones, content.zones, (zoneId) => {
  controls.travelTo(zoneId);
  canvas.focus();
});

showHint();
showFilmRollCount();

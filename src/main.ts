import { createAudio } from "./audio";
import { content } from "./content";
import { createFastTravel } from "./fastTravel";
import { startGame, type GameButton, type GameControls } from "./game";
import { createInventory, isInventoryKey } from "./inventory";
import { createViewfinder } from "./viewfinder";
import { query } from "./dom";

const isTouch = window.matchMedia("(pointer: coarse)").matches;

const CONTROLS_HINT = isTouch
  ? "Walk with the d-pad. Face a sign and tap the Shutter to take a photo. Tap ▤ for the Inventory."
  : "Walk with the arrow keys or WASD. Face a sign and press Space to take a photo. Press I for the Inventory.";
const SHUTTER_PROMPT = isTouch ? "tap the Shutter" : "press Space";

const canvas = query<HTMLCanvasElement>(document, "#game");
const hint = query<HTMLElement>(document, "#hint");
const dialog = query<HTMLDialogElement>(document, "#viewfinder");
const filmRollCounter = query<HTMLElement>(document, "#film-rolls");

const totalFilmRolls = content.zones.filter((zone) => zone.filmRoll).length;
let collectedFilmRolls = 0;

function showFilmRollCount() {
  filmRollCounter.textContent = `Film rolls: ${collectedFilmRolls}/${totalFilmRolls}`;
}

const fastTravelNav = query<HTMLElement>(document, ".fast-travel");
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
    hint.textContent = poi ? `Facing ${poi.title} — ${SHUTTER_PROMPT}` : CONTROLS_HINT;
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

createFastTravel(fastTravelNav, content.zones, (zoneId) => {
  controls.travelTo(zoneId);
  canvas.focus();
});

hint.textContent = CONTROLS_HINT;
showFilmRollCount();

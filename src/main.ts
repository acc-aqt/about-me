import { createAudio } from "./audio";
import { content } from "./content";
import { createFastTravel } from "./fastTravel";
import { startGame, type GameButton, type GameControls } from "./game";
import { createInventory, isInventoryKey } from "./inventory";
import { createViewfinder } from "./viewfinder";

const isTouch = window.matchMedia("(pointer: coarse)").matches;

const CONTROLS_HINT = isTouch
  ? "Walk with ◀ ▶. Tap the Shutter near a sign to take a photo. Tap ▤ for the Inventory."
  : "Walk with ← → or A D. Press Space near a sign to take a photo. Press I for the Inventory.";
const SHUTTER_PROMPT = isTouch ? "Tap the Shutter to photograph" : "Press Space to photograph";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const hint = document.querySelector<HTMLElement>("#hint")!;
const dialog = document.querySelector<HTMLDialogElement>("#viewfinder")!;
const fastTravelNav = document.querySelector<HTMLElement>(".fast-travel")!;
const soundToggle = document.querySelector<HTMLButtonElement>("#sound-toggle")!;
const soundToggleState = soundToggle.querySelector<HTMLElement>(".sound-toggle-state")!;

const audio = createAudio();

soundToggle.addEventListener("click", (event) => {
  audio.setMuted(!audio.isMuted());
  soundToggle.setAttribute("aria-pressed", String(!audio.isMuted()));
  soundToggleState.textContent = audio.isMuted() ? "off" : "on";
  // A mouse or tap click hands focus back to the game so walking keeps working.
  if (event.detail > 0) canvas.focus();
});

const inventoryDialog = document.querySelector<HTMLDialogElement>("#inventory")!;

const viewfinder = createViewfinder(dialog, () => canvas.focus());
const inventory = createInventory(inventoryDialog, content.inventory, () => canvas.focus());

canvas.addEventListener("keydown", (event) => {
  if (isInventoryKey(event) && !viewfinder.isOpen()) {
    event.preventDefault();
    inventory.toggle();
  }
});

const controls = startGame(canvas, content, {
  onNearbyChange(poi) {
    hint.textContent = poi ? `${SHUTTER_PROMPT} ${poi.title}` : CONTROLS_HINT;
  },
  onShutter(poi) {
    audio.playShutter();
    viewfinder.open(poi);
  },
  canFireShutter: () => !viewfinder.isOpen() && !inventory.isOpen(),
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

document.querySelector<HTMLButtonElement>(".touch-button-inventory")!.addEventListener("click", () => {
  if (!viewfinder.isOpen()) inventory.toggle();
});

createFastTravel(fastTravelNav, content.zones, (zoneId) => {
  controls.travelTo(zoneId);
  canvas.focus();
});

hint.textContent = CONTROLS_HINT;

import { content } from "./content";
import { startGame, type GameButton, type GameControls } from "./game";
import { createInventory, isInventoryKey } from "./inventory";
import { createViewfinder } from "./viewfinder";

const isTouch = window.matchMedia("(pointer: coarse)").matches;

const CONTROLS_HINT = isTouch
  ? "Walk with ◀ ▶. Tap the Shutter near a sign to take a photo."
  : "Walk with ← → or A D. Press Space near a sign to take a photo. Press I for the Inventory.";
const SHUTTER_PROMPT = isTouch ? "Tap the Shutter to photograph" : "Press Space to photograph";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const hint = document.querySelector<HTMLElement>("#hint")!;
const dialog = document.querySelector<HTMLDialogElement>("#viewfinder")!;
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
  onShutter: (poi) => viewfinder.open(poi),
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

hint.textContent = CONTROLS_HINT;

import { content } from "./content";
import { startGame } from "./game";
import { createInventory, isInventoryKey } from "./inventory";
import { createViewfinder } from "./viewfinder";

const CONTROLS_HINT = "Walk with ← → or A D. Press Space near a sign to take a photo. Press I for the Inventory.";

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

startGame(canvas, content, {
  onNearbyChange(poi) {
    hint.textContent = poi ? `Press Space to photograph ${poi.title}` : CONTROLS_HINT;
  },
  onShutter: (poi) => viewfinder.open(poi),
  canFireShutter: () => !viewfinder.isOpen() && !inventory.isOpen(),
});

hint.textContent = CONTROLS_HINT;

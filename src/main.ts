import { content } from "./content";
import { startGame } from "./game";
import { createViewfinder } from "./viewfinder";

const CONTROLS_HINT = "Walk with ← → or A D. Press Space near a sign to take a photo.";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const hint = document.querySelector<HTMLElement>("#hint")!;
const dialog = document.querySelector<HTMLDialogElement>("#viewfinder")!;

const viewfinder = createViewfinder(dialog, () => canvas.focus());

startGame(canvas, content, {
  onNearbyChange(poi) {
    hint.textContent = poi ? `Press Space to photograph ${poi.title}` : CONTROLS_HINT;
  },
  onShutter: (poi) => viewfinder.open(poi),
  canFireShutter: () => !viewfinder.isOpen(),
});

hint.textContent = CONTROLS_HINT;

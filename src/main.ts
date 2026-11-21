import { content } from "./content";
import { createFastTravel } from "./fastTravel";
import { startGame } from "./game";
import { createViewfinder } from "./viewfinder";

const CONTROLS_HINT = "Walk with ← → or A D. Press Space near a sign to take a photo.";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const hint = document.querySelector<HTMLElement>("#hint")!;
const dialog = document.querySelector<HTMLDialogElement>("#viewfinder")!;
const fastTravelNav = document.querySelector<HTMLElement>(".fast-travel")!;

const viewfinder = createViewfinder(dialog, () => canvas.focus());

const game = startGame(canvas, content, {
  onNearbyChange(poi) {
    hint.textContent = poi ? `Press Space to photograph ${poi.title}` : CONTROLS_HINT;
  },
  onShutter: (poi) => viewfinder.open(poi),
  canFireShutter: () => !viewfinder.isOpen(),
});

createFastTravel(fastTravelNav, content.zones, (zoneId) => {
  game.travelTo(zoneId);
  canvas.focus();
});

hint.textContent = CONTROLS_HINT;

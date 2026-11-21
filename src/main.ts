import { createAudio } from "./audio";
import { content } from "./content";
import { startGame } from "./game";
import { createViewfinder } from "./viewfinder";

const CONTROLS_HINT = "Walk with ← → or A D. Press Space near a sign to take a photo.";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const hint = document.querySelector<HTMLElement>("#hint")!;
const dialog = document.querySelector<HTMLDialogElement>("#viewfinder")!;
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

const viewfinder = createViewfinder(dialog, () => canvas.focus());

startGame(canvas, content, {
  onNearbyChange(poi) {
    hint.textContent = poi ? `Press Space to photograph ${poi.title}` : CONTROLS_HINT;
  },
  onShutter(poi) {
    audio.playShutter();
    viewfinder.open(poi);
  },
  canFireShutter: () => !viewfinder.isOpen(),
});

hint.textContent = CONTROLS_HINT;

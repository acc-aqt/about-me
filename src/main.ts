import { createAudio } from "./audio";
import { createCats } from "./cats";
import { content, type PointOfInterest, type ZoneId } from "./content";
import { createFastTravel } from "./fastTravel";
import { SPAWN_LANDING, startGame, type GameButton, type GameEvents } from "./game";
import { createInventory, isInventoryKey } from "./inventory";
import type { Landing } from "./overworld";
import { createCheatDetector } from "./thirdPersonWorld";
import { createViewfinder } from "./viewfinder";
import { query } from "./dom";

const isTouch = window.matchMedia("(pointer: coarse)").matches;
const startsInThirdPerson = !isTouch && new URLSearchParams(location.search).get("view") === "third-person";
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

const screenWindow = query<HTMLElement>(document, ".screen-window");
const hint = query<HTMLElement>(document, "#hint");
const dialog = query<HTMLDialogElement>(document, "#viewfinder");
const filmRollCounter = query<HTMLElement>(document, "#film-rolls");
const loadingScreen = query<HTMLElement>(document, ".loading-screen");

let facing: PointOfInterest | null = null;

function showHint() {
  hint.textContent = facing ? `Facing ${facing.title} — ${shutterPrompt()}` : controlsHint();
}

portrait.addEventListener("change", showHint);

const totalFilmRolls = content.zones.filter((zone) => zone.filmRoll).length;
const collectedFilmRolls = new Set<ZoneId>();
/** Shared by both renderers, so the Cats carry on where they were after a switch. */
const cats = createCats(Math.random);

function showFilmRollCount() {
  filmRollCounter.textContent = `Film rolls: ${collectedFilmRolls.size}/${totalFilmRolls}`;
}

const fastTravelToggle = query<HTMLButtonElement>(document, ".fast-travel-toggle");
const fastTravelZones = query<HTMLUListElement>(document, `#${fastTravelToggle.getAttribute("aria-controls")}`);

const audio = createAudio();

const inventoryDialog = query<HTMLDialogElement>(document, "#inventory");

const viewfinder = createViewfinder(dialog, () => controls.focus());
const inventory = createInventory(inventoryDialog, content.inventory, () => controls.focus());

screenWindow.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLCanvasElement && isInventoryKey(event) && !viewfinder.isOpen()) {
    event.preventDefault();
    inventory.toggle();
  }
});

const events: GameEvents = {
  onFacingChange(poi) {
    facing = poi;
    showHint();
  },
  onShutter(poi) {
    audio.playShutter();
    viewfinder.open(poi);
  },
  canFireShutter: () => !viewfinder.isOpen() && !inventory.isOpen(),
  onFilmRollCollected(zone) {
    collectedFilmRolls.add(zone.id);
    showFilmRollCount();
    if (collectedFilmRolls.size === totalFilmRolls) viewfinder.open(content.filmRollBonus);
  },
  onFootstep: () => audio.playFootstep(),
  onBump: () => audio.playBump(),
  isPaused: () => viewfinder.isOpen() || inventory.isOpen() || fastTravel.isOpen(),
};

async function startThirdPersonMode(start: Landing) {
  loadingScreen.hidden = false;
  try {
    const { startThirdPerson } = await import("./thirdPerson");
    return startThirdPerson(screenWindow, content, events, start, cats);
  } finally {
    loadingScreen.hidden = true;
  }
}

let inThirdPerson = startsInThirdPerson;
let controls = inThirdPerson ? await startThirdPersonMode(SPAWN_LANDING) : startGame(screenWindow, content, events, SPAWN_LANDING, collectedFilmRolls, cats);
let switching = false;

/** Hands the Player's spot over to the other renderer; Third-person mode snaps it to a tile and a direction. */
async function switchMode() {
  switching = true;
  const landing = controls.position();
  controls.stop();
  events.onFacingChange(null);
  inThirdPerson = !inThirdPerson;
  controls = inThirdPerson ? await startThirdPersonMode(landing) : startGame(screenWindow, content, events, landing, collectedFilmRolls, cats);
  controls.focus();
  switching = false;
}

const cheat = createCheatDetector();
if (!isTouch) {
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.repeat || !cheat.type(event.key) || switching || events.isPaused()) return;
      event.preventDefault();
      event.stopPropagation();
      void switchMode();
    },
    { capture: true },
  );
}

const fastTravel = createFastTravel(fastTravelToggle, fastTravelZones, content.zones, (zoneId) => {
  controls.travelTo(zoneId);
  controls.focus();
});

function pressInFastTravel(button: GameButton) {
  if (button === "up") fastTravel.moveSelection(-1);
  else if (button === "down") fastTravel.moveSelection(1);
  else if (button === "shutter") fastTravel.chooseSelection();
}

function bindTouchButton(element: HTMLButtonElement) {
  const button = element.dataset.gameButton as GameButton;
  element.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (fastTravel.isOpen()) pressInFastTravel(button);
    else controls.press(button);
  });
  for (const type of ["pointerup", "pointercancel", "pointerleave"]) {
    element.addEventListener(type, () => controls.release(button));
  }
  element.addEventListener("contextmenu", (event) => event.preventDefault());
}

document
  .querySelectorAll<HTMLButtonElement>("[data-game-button]")
  .forEach(bindTouchButton);

query<HTMLButtonElement>(document, ".touch-button-inventory").addEventListener("click", () => {
  if (fastTravel.isOpen()) {
    fastTravel.close();
    controls.focus();
  } else if (!viewfinder.isOpen()) inventory.toggle();
});

showHint();
showFilmRollCount();

import type { PointOfInterest, Zone, ZoneId } from "./content";
import type { Direction, Landing } from "./overworld";

/** The contract both renderers, the 2D game and Third-person mode, keep with the app shell. */

export type GameButton = Direction | "shutter";

export type GameControls = {
  press(button: GameButton): void;
  release(button: GameButton): void;
  travelTo(zoneId: ZoneId): void;
  /** Where the Player stands and which way it faces; mid-step, the tile it is leaving. */
  position(): Landing;
  focus(): void;
  /** Frees the game's canvas, input and loop, so another renderer can take over the container. */
  stop(): void;
};

export type GameEvents = {
  onFacingChange(poi: PointOfInterest | null): void;
  onShutter(poi: PointOfInterest): void;
  canFireShutter(): boolean;
  onFilmRollCollected(zone: Zone): void;
  onFootstep(): void;
  onBump(): void;
  /** True while an overlay such as the Viewfinder covers the game, which stills the Cats. */
  isPaused(): boolean;
};

/** The keyboard's game buttons, by lower-cased KeyboardEvent key. */
export const KEY_BUTTONS: Readonly<Record<string, GameButton>> = {
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

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** A fresh, focusable canvas at the front of the container; a renderer never reuses one after stopping. */
export function addCanvas(container: HTMLElement, id: string, label: string) {
  const canvas = document.createElement("canvas");
  canvas.id = id;
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "application");
  canvas.setAttribute("aria-label", label);
  canvas.setAttribute("aria-describedby", "hint");
  container.prepend(canvas);
  return canvas;
}

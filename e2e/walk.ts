import { expect, type Locator, type Page } from "@playwright/test";
import { content, zoneById, type Footprint, type ZoneId } from "../src/content.ts";
import {
  DIRECTIONS,
  fastTravelLanding,
  footprintTiles,
  isWalkable,
  tileAhead,
  tileKey as key,
  type Direction,
  type Landing,
  type Tile,
} from "../src/overworld.ts";

export const ARROW_KEYS: Record<Direction, string> = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
export const DPAD_BUTTONS: Record<Direction, string> = { up: "Walk up", down: "Walk down", left: "Walk left", right: "Walk right" };

export { SPAWN_LANDING } from "../src/overworld.ts";

export function zoneTitle(zoneId: ZoneId) {
  return zoneById(zoneId).title;
}

export function pointOfInterest(id: string) {
  return content.zones.flatMap((zone) => zone.pointsOfInterest).find((poi) => poi.id === id)!;
}

/**
 * A fixed low roll curls the Cats up asleep for several seconds, then moves them the same way every run, so they never
 * wander into a test's walk by chance.
 */
export async function openGame(page: Page) {
  await page.addInitScript(() => {
    Math.random = () => 0.1;
  });
  await page.goto("./");
  await expect(page.getByRole("status")).toContainText("Face a sign");
}

export async function openGameWithKeyboard(page: Page) {
  await openGame(page);
  await page.getByRole("application", { name: /game/i }).focus();
}

export async function fastTravel(page: Page, zoneId: ZoneId) {
  await page.getByRole("button", { name: "Fast-travel" }).click();
  await page.getByRole("navigation", { name: "Fast-travel" }).getByRole("button", { name: zoneTitle(zoneId) }).click();
  return fastTravelLanding(zoneId);
}

/** Shortest walk from a tile to any of the goal tiles, as the direction of each step. */
function shortestWalk(from: Tile, goals: Tile[]): Direction[] {
  const goalKeys = new Set(goals.map(key));
  const cameFrom = new Map<string, { previous: Tile; direction: Direction } | null>([[key(from), null]]);
  const queue = [from];
  for (let tile = queue.shift(); tile; tile = queue.shift()) {
    if (goalKeys.has(key(tile))) {
      const steps: Direction[] = [];
      for (let link = cameFrom.get(key(tile)); link; link = cameFrom.get(key(link.previous))) steps.unshift(link.direction);
      return steps;
    }
    for (const direction of DIRECTIONS) {
      const next = tileAhead(tile, direction);
      if (!isWalkable(next) || cameFrom.has(key(next))) continue;
      cameFrom.set(key(next), { previous: tile, direction });
      queue.push(next);
    }
  }
  throw new Error(`No walk from ${key(from)} to ${[...goalKeys].join(" | ")}`);
}

/**
 * The direction taps that walk from a landing onto a target tile, or up to the nearest edge of a target's footprint
 * and then face it. A tap in a new direction only turns the Player; a tap in the direction it faces takes one step.
 */
export function tapsTo(from: Landing, target: Footprint, { face = false } = {}): Direction[] {
  const inside = new Set(footprintTiles(target).map(key));
  const around = footprintTiles(target)
    .flatMap((tile) => DIRECTIONS.map((direction) => tileAhead(tile, direction)))
    .filter((tile) => !inside.has(key(tile)));
  const goals = face ? around : [{ col: target.col, row: target.row }];
  const steps = shortestWalk(from.tile, goals);
  const taps: Direction[] = [];
  let facing = from.facing;
  let tile = from.tile;
  for (const direction of steps) {
    if (direction !== facing) taps.push(direction);
    taps.push(direction);
    facing = direction;
    tile = tileAhead(tile, direction);
  }
  if (face) {
    const toTarget = DIRECTIONS.find((direction) => inside.has(key(tileAhead(tile, direction))))!;
    if (toTarget !== facing) taps.push(toTarget);
  }
  return taps;
}

/** Long enough to wait for the Player to finish a walk of these taps, each step taking a fraction of a second. */
export function walkTimeout(taps: Direction[]) {
  return 5_000 + taps.length * 250;
}

export async function tapKeys(page: Page, taps: Direction[]) {
  for (const direction of taps) await page.keyboard.press(ARROW_KEYS[direction]);
}

export async function holdButton(button: Locator, ms: number) {
  await button.dispatchEvent("pointerdown", { pointerType: "touch", isPrimary: true });
  if (ms > 0) await button.page().waitForTimeout(ms);
  await button.dispatchEvent("pointerup", { pointerType: "touch", isPrimary: true });
}

export async function tapDpad(page: Page, taps: Direction[]) {
  for (const direction of taps) await holdButton(page.getByRole("button", { name: DPAD_BUTTONS[direction] }), 0);
}

export function facingStatus(title: string) {
  return new RegExp(`^Facing ${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} — `);
}

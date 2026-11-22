import { expect, type Locator, type Page } from "@playwright/test";
import { content, type ZoneId } from "../src/content.ts";
import { DIRECTIONS, fastTravelLanding, isWalkable, SPAWN, tileAhead, type Direction, type Landing, type Tile } from "../src/overworld.ts";

export const ARROW_KEYS: Record<Direction, string> = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
export const DPAD_BUTTONS: Record<Direction, string> = { up: "Walk up", down: "Walk down", left: "Walk left", right: "Walk right" };

/** The Player spawns in the Hub facing down. */
export const SPAWN_LANDING: Landing = { tile: SPAWN, facing: "down" };

export function zoneTitle(zoneId: ZoneId) {
  return content.zones.find((zone) => zone.id === zoneId)!.title;
}

export function pointOfInterest(id: string) {
  return content.zones.flatMap((zone) => zone.pointsOfInterest).find((poi) => poi.id === id)!;
}

export async function openGame(page: Page) {
  await page.goto("./");
  await page.getByRole("application", { name: /game/i }).focus();
  await expect(page.getByRole("status")).toContainText("Face a sign");
}

export async function fastTravel(page: Page, zoneId: ZoneId) {
  await page.getByRole("button", { name: "Fast-travel" }).click();
  await page.getByRole("navigation", { name: "Fast-travel" }).getByRole("button", { name: zoneTitle(zoneId) }).click();
  return fastTravelLanding(zoneId);
}

const key = ({ col, row }: Tile) => `${col},${row}`;

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
 * The direction taps that walk from a landing onto a target tile, or up to a target and then face it.
 * A tap in a new direction only turns the Player; a tap in the direction it faces takes one step.
 */
export function tapsTo(from: Landing, target: Tile, { face = false } = {}): Direction[] {
  const goals = face ? DIRECTIONS.map((direction) => tileAhead(target, direction)) : [target];
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
    const toTarget = DIRECTIONS.find((direction) => key(tileAhead(tile, direction)) === key(target))!;
    if (toTarget !== facing) taps.push(toTarget);
  }
  return taps;
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

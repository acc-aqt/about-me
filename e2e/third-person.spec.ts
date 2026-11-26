import { expect, test, type Page } from "@playwright/test";
import { content, zoneById } from "../src/content.ts";
import { facedPointOfInterest, type Direction } from "../src/overworld.ts";
import { facingStatus, fastTravel, openGame, openGameWithKeyboard, tapKeys, tapsTo, zoneTitle } from "./walk";

const totalFilmRolls = content.zones.filter((zone) => zone.filmRoll).length;
const OPPOSITE: Record<Direction, Direction> = { up: "down", down: "up", left: "right", right: "left" };

test.skip(({ isMobile }) => isMobile, "Third-person mode is for desktop only");
// Headless Chromium renders WebGL in software, so frames and screenshots are slow, more so beside other suites.
test.slow();

const CHEAT = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

function thirdPersonWorld(page: Page) {
  return page.getByRole("application", { name: "Third-person world" });
}

async function openThirdPerson(page: Page) {
  await page.goto("./?view=third-person");
  await expect(page.getByRole("status")).toContainText("Face a sign", { timeout: 20_000 });
  await thirdPersonWorld(page).focus();
}

function game2d(page: Page) {
  return page.getByRole("application", { name: "Portfolio game" });
}

async function typeCheat(page: Page) {
  for (const key of CHEAT) await page.keyboard.press(key);
}

/** With nothing focused, so the cheat's arrow keys don't walk the Player. */
async function typeCheatOutsideTheGame(page: Page) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await typeCheat(page);
}

async function scriptsRequestedBy(page: Page, open: () => Promise<void>) {
  const scripts = new Set<string>();
  page.on("request", (request) => {
    if (request.resourceType() === "script") scripts.add(new URL(request.url()).pathname);
  });
  await open();
  return scripts;
}

/** A snapshot of what the camera shows, to tell whether the view changed; the world fills the window. */
async function view(page: Page) {
  return (await page.screenshot()).toString("base64");
}

test("?view=third-person shows the full-window Third-person world instead of the 2D game", async ({ page }) => {
  await openThirdPerson(page);

  await expect(thirdPersonWorld(page)).toBeVisible();
  await expect(page.getByRole("application", { name: "Portfolio game" })).toBeHidden();
  const box = (await thirdPersonWorld(page).boundingBox())!;
  expect(box).toEqual({ x: 0, y: 0, ...page.viewportSize()! });
});

test("a normal page load requests none of the Third-person mode's code", async ({ browser }) => {
  const normalPage = await browser.newPage();
  const normal = await scriptsRequestedBy(normalPage, () => openGame(normalPage));
  const thirdPersonPage = await browser.newPage();
  const thirdPerson = await scriptsRequestedBy(thirdPersonPage, () => openThirdPerson(thirdPersonPage));

  const thirdPersonOnly = [...thirdPerson].filter((script) => !normal.has(script));
  expect(thirdPersonOnly.length).toBeGreaterThan(0);
  await expect(normalPage.getByRole("application", { name: "Third-person world" })).toHaveCount(0);
});

test("dragging the mouse orbits the camera and the scroll wheel zooms it", async ({ page }) => {
  await openThirdPerson(page);
  const box = (await thirdPersonWorld(page).boundingBox())!;
  const centre = { x: box.width / 2, y: box.height / 2 };

  const before = await view(page);
  await page.mouse.move(centre.x, centre.y);
  await page.mouse.down();
  await page.mouse.move(centre.x + 200, centre.y, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => view(page)).not.toBe(before);

  const orbited = await view(page);
  await page.mouse.wheel(0, -400);
  await expect.poll(() => view(page)).not.toBe(orbited);
});

test("Fast-travel moves the Player to the chosen Zone, and the world keeps the keyboard", async ({ page }) => {
  await openThirdPerson(page);
  const hub = await view(page);

  await page.getByRole("button", { name: "Fast-travel" }).click();
  await page.getByRole("navigation", { name: "Fast-travel" }).getByRole("button", { name: zoneTitle("career-road") }).click();

  await expect.poll(() => view(page)).not.toBe(hub);
  await expect(thirdPersonWorld(page)).toBeFocused();
});

test("walking with the keyboard moves the view", async ({ page }) => {
  await openThirdPerson(page);
  const before = await view(page);

  await page.keyboard.down("s");
  await page.waitForTimeout(300);
  await page.keyboard.up("s");

  await expect.poll(() => view(page)).not.toBe(before);
});

test("typing the cheat in the 2D game switches to the Third-person world", async ({ page }) => {
  await openGameWithKeyboard(page);

  await typeCheat(page);

  await expect(thirdPersonWorld(page)).toBeVisible({ timeout: 20_000 });
  await expect(thirdPersonWorld(page)).toBeFocused();
  await expect(game2d(page)).toHaveCount(0);
});

test("typing the cheat again returns to the 2D game at the same spot and facing", async ({ page }) => {
  await openGameWithKeyboard(page);
  const landing = await fastTravel(page, "career-road");
  const faced = facedPointOfInterest(landing.tile, landing.facing)!;
  await expect(page.getByRole("status")).toHaveText(facingStatus(faced.title));

  await typeCheatOutsideTheGame(page);
  await expect(thirdPersonWorld(page)).toBeVisible({ timeout: 20_000 });
  await typeCheatOutsideTheGame(page);

  await expect(game2d(page)).toBeFocused();
  await expect(thirdPersonWorld(page)).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText(facingStatus(faced.title));
});

test("a Film roll picked up before a round trip through the Third-person world stays picked up", async ({ page }) => {
  await openGameWithKeyboard(page);
  const landing = await fastTravel(page, "contact");
  const taps = tapsTo(landing, zoneById("contact").filmRoll!);
  await tapKeys(page, taps);
  await expect(page.getByText(`Film rolls: 1/${totalFilmRolls}`)).toBeVisible();

  await typeCheatOutsideTheGame(page);
  await expect(thirdPersonWorld(page)).toBeVisible({ timeout: 20_000 });
  await typeCheatOutsideTheGame(page);
  await expect(game2d(page)).toBeVisible();
  await game2d(page).focus();
  const away = OPPOSITE[taps.at(-1)!];
  await tapKeys(page, [away, away, taps.at(-1)!, taps.at(-1)!]);
  await page.waitForTimeout(1_000);

  await expect(page.getByText(`Film rolls: 1/${totalFilmRolls}`)).toBeVisible();
});

test("typing the cheat in the Third-person world switches back to the 2D game", async ({ page }) => {
  await openThirdPerson(page);

  await typeCheat(page);

  await expect(game2d(page)).toBeFocused();
  await expect(thirdPersonWorld(page)).toHaveCount(0);
});

test("a reload without the URL flag brings back the 2D game", async ({ page }) => {
  await openGameWithKeyboard(page);
  await typeCheat(page);
  await expect(thirdPersonWorld(page)).toBeVisible({ timeout: 20_000 });

  await page.reload();

  await expect(game2d(page)).toBeVisible();
  await expect(thirdPersonWorld(page)).toHaveCount(0);
});

test("a Handheld loading screen shows until the Third-person world is ready", async ({ page }) => {
  let releaseScripts = () => {};
  const scriptsHeld = new Promise<void>((resolve) => (releaseScripts = resolve));
  await openGameWithKeyboard(page);
  await page.route(/\.js$/, async (route) => {
    await scriptsHeld;
    await route.continue();
  });

  await typeCheat(page);

  const loading = page.getByText("Loading…");
  await expect(loading).toBeVisible();
  await expect(thirdPersonWorld(page)).toHaveCount(0);
  releaseScripts();
  await expect(thirdPersonWorld(page)).toBeVisible({ timeout: 20_000 });
  await expect(loading).toBeHidden();
});

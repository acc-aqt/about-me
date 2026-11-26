import { expect, test, type Page } from "@playwright/test";
import { content } from "../src/content";
import { facingStatus, fastTravel, openGame, pointOfInterest } from "./walk";

test.skip(({ isMobile }) => isMobile, "Third-person mode is for desktop only");
// Headless Chromium renders WebGL in software, so frames and screenshots are slow, more so beside other suites.
test.slow();

function thirdPersonWorld(page: Page) {
  return page.getByRole("application", { name: "Third-person world" });
}

async function openThirdPerson(page: Page) {
  await page.goto("./?view=third-person");
  await expect(page.getByRole("status")).toContainText("Face a sign", { timeout: 20_000 });
  await thirdPersonWorld(page).focus();
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

for (const zone of content.zones.filter((z) => z.fastTravelTo)) {
  test(`Fast-travel to ${zone.title}, then Space, opens the Viewfinder at ${zone.fastTravelTo}`, async ({ page }) => {
    const landingPoi = pointOfInterest(zone.fastTravelTo!);
    await openThirdPerson(page);

    await fastTravel(page, zone.id);
    await expect(thirdPersonWorld(page)).toBeFocused();
    await expect(page.getByRole("status")).toHaveText(facingStatus(landingPoi.title));

    await page.keyboard.press("Space");
    await expect(page.getByRole("dialog", { name: landingPoi.title })).toBeVisible();
  });
}

test("turning away from the targeted Point of Interest brings back the controls hint", async ({ page }) => {
  await openThirdPerson(page);
  await fastTravel(page, "career-road");
  await expect(page.getByRole("status")).toHaveText(facingStatus(pointOfInterest("mtu").title));

  await page.keyboard.down("s");
  await expect(page.getByRole("status")).toContainText("Face a sign");
  await page.keyboard.up("s");
});

test("Space with no Point of Interest in front of the Player doesn't open the Viewfinder", async ({ page }) => {
  await openThirdPerson(page);

  await page.keyboard.press("Space");
  await page.waitForTimeout(500);

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Face a sign");
});

test("I opens the Inventory and closes it again", async ({ page }) => {
  await openThirdPerson(page);
  const inventory = page.getByRole("dialog", { name: "Inventory" });

  await page.keyboard.press("i");
  await expect(inventory).toBeVisible();
  await page.keyboard.press("i");
  await expect(inventory).toBeHidden();
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

import { expect, test, type Page } from "@playwright/test";
import { facingStatus, fastTravel, openGameWithKeyboard, pointOfInterest, SPAWN_LANDING, tapKeys, tapsTo } from "./walk";

async function fastTravelToMtuAndFireShutter(page: Page) {
  await openGameWithKeyboard(page);
  await fastTravel(page, "career-road");
  await expect(page.getByRole("status")).toHaveText(facingStatus("MTU Aero Engines"));

  await page.keyboard.press("Space");
  return page.getByRole("dialog", { name: "MTU Aero Engines" });
}

test("walking from the spawn to face the intro sign and firing the Shutter opens its Viewfinder", async ({ page, isMobile }) => {
  const intro = pointOfInterest("intro");
  await openGameWithKeyboard(page);

  await tapKeys(page, tapsTo(SPAWN_LANDING, intro.placement, { face: true }));
  await expect(page.getByRole("status")).toHaveText(facingStatus(intro.title));
  await expect(page.getByRole("status")).toContainText(isMobile ? "tap the Shutter" : "press Space");
  await page.keyboard.press("Space");

  const viewfinder = page.getByRole("dialog", { name: intro.title });
  await expect(viewfinder).toBeVisible();
  await expect(viewfinder).toContainText("photographer");
});

test("firing the Shutter at MTU opens the Viewfinder with MTU content", async ({ page }) => {
  const viewfinder = await fastTravelToMtuAndFireShutter(page);

  await expect(viewfinder).toBeVisible();
  await expect(viewfinder).toContainText("2020–now");
  await expect(viewfinder).toContainText("engineering design processes and workflows");
});

test("Escape closes the Viewfinder", async ({ page }) => {
  const viewfinder = await fastTravelToMtuAndFireShutter(page);
  await expect(viewfinder).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(viewfinder).toBeHidden();
});

test("Space closes the Viewfinder", async ({ page }) => {
  const viewfinder = await fastTravelToMtuAndFireShutter(page);
  await expect(viewfinder).toBeVisible();

  await page.keyboard.press("Space");
  await expect(viewfinder).toBeHidden();
});

test("the close button closes the Viewfinder and the Shutter reopens it", async ({ page }) => {
  const viewfinder = await fastTravelToMtuAndFireShutter(page);
  await expect(viewfinder).toBeVisible();

  await viewfinder.getByRole("button", { name: /close/i }).click();
  await expect(viewfinder).toBeHidden();

  await page.keyboard.press("Space");
  await expect(viewfinder).toBeVisible();
});

test("the Shutter does nothing away from a Point of Interest", async ({ page }) => {
  await openGameWithKeyboard(page);

  await page.keyboard.press("Space");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("the Shutter does nothing next to a Point of Interest the Player is not facing", async ({ page }) => {
  await openGameWithKeyboard(page);
  await fastTravel(page, "career-road");
  await expect(page.getByRole("status")).toHaveText(facingStatus("MTU Aero Engines"));

  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("status")).toContainText("Face a sign");
  await page.keyboard.press("Space");

  await expect(page.getByRole("dialog")).toHaveCount(0);
});

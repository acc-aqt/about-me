import { expect, test, type Locator, type Page } from "@playwright/test";
import { DPAD_BUTTONS, facingStatus, holdButton, tapDpad } from "./walk";
import type { Direction } from "../src/overworld.ts";

const PORTRAIT = { width: 412, height: 839 };
const LANDSCAPE = { width: 839, height: 412 };
const ON_SCREEN_BUTTONS = [...Object.values(DPAD_BUTTONS), "Shutter", "Inventory"];

/** From MTU's landing tile: a loop through all 4 directions that ends back in front of MTU, facing it. */
const LOOP_BACK_TO_MTU: Direction[] = ["down", "down", "right", "right", "up", "up", "left", "left", "up"];

async function openGame(page: Page) {
  await page.goto("./");
  await expect(page.getByRole("status")).toContainText("Face a sign");
}

async function fastTravelToMtuByTouch(page: Page) {
  await page.getByRole("button", { name: "Fast-travel" }).tap();
  await page.getByRole("navigation", { name: "Fast-travel" }).getByRole("button", { name: "Career road" }).tap();
  await expect(page.getByRole("status")).toHaveText(facingStatus("MTU Aero Engines"));
}

async function expectInsideViewport(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 0.5);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 0.5);
}

test.describe("on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "On-screen buttons are for touch devices");

  test("the d-pad walks in all 4 directions and the Shutter opens the faced Point of Interest", async ({ page }) => {
    await openGame(page);
    await fastTravelToMtuByTouch(page);

    await tapDpad(page, ["down"]);
    await expect(page.getByRole("status")).toContainText("Face a sign");
    await tapDpad(page, LOOP_BACK_TO_MTU.slice(1));
    await expect(page.getByRole("status")).toHaveText(facingStatus("MTU Aero Engines"));
    await expect(page.getByRole("status")).toContainText("tap the Shutter");

    await page.getByRole("button", { name: "Shutter" }).tap();
    const viewfinder = page.getByRole("dialog", { name: "MTU Aero Engines" });
    await expect(viewfinder).toBeVisible();
    await expect(viewfinder).toContainText("2020–now");
  });

  test("holding a d-pad direction keeps walking", async ({ page }) => {
    await openGame(page);
    await fastTravelToMtuByTouch(page);

    await holdButton(page.getByRole("button", { name: "Walk left" }), 900);
    await tapDpad(page, ["up"]);

    await expect(page.getByRole("status")).not.toHaveText(facingStatus("MTU Aero Engines"));
  });

  for (const [orientation, viewport] of [
    ["portrait", PORTRAIT],
    ["landscape", LANDSCAPE],
  ] as const) {
    test(`the game, d-pad, Shutter and Viewfinder fit and work in ${orientation}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openGame(page);

      await expectInsideViewport(page, page.getByRole("application", { name: /game/i }));
      for (const name of ON_SCREEN_BUTTONS) {
        await expectInsideViewport(page, page.getByRole("button", { name }));
      }

      await fastTravelToMtuByTouch(page);
      await tapDpad(page, LOOP_BACK_TO_MTU);
      await expect(page.getByRole("status")).toHaveText(facingStatus("MTU Aero Engines"));
      await page.getByRole("button", { name: "Shutter" }).tap();
      const viewfinder = page.getByRole("dialog", { name: "MTU Aero Engines" });
      await expect(viewfinder).toBeVisible();
      await expectInsideViewport(page, viewfinder);
    });
  }
});

test("on a desktop the on-screen buttons are not shown", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop only");
  await openGame(page);

  for (const name of ON_SCREEN_BUTTONS) {
    await expect(page.getByRole("button", { name })).toBeHidden();
  }
});

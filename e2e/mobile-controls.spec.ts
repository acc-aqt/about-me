import { expect, test, type Locator, type Page } from "@playwright/test";
import { DPAD_BUTTONS, facingStatus, fastTravel, holdButton, openGame as openGameWithKeyboard, tapDpad, tapKeys } from "./walk";
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

async function expectInside(outer: Locator, inner: Locator) {
  const outerBox = (await outer.boundingBox())!;
  const innerBox = (await inner.boundingBox())!;
  expect(innerBox.x).toBeGreaterThanOrEqual(outerBox.x);
  expect(innerBox.y).toBeGreaterThanOrEqual(outerBox.y);
  expect(innerBox.x + innerBox.width).toBeLessThanOrEqual(outerBox.x + outerBox.width + 0.5);
  expect(innerBox.y + innerBox.height).toBeLessThanOrEqual(outerBox.y + outerBox.height + 0.5);
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

  test("in portrait the game runs inside the Handheld", async ({ page }) => {
    await page.setViewportSize(PORTRAIT);
    await openGame(page);

    const handheld = page.getByTestId("handheld");
    const game = page.getByRole("application", { name: /game/i });
    await expect(handheld).toBeVisible();
    await expectInsideViewport(page, handheld);
    await expectInside(handheld, game);
    const gameBox = (await game.boundingBox())!;
    expect(gameBox.width / gameBox.height).toBeCloseTo(16 / 9, 1);
  });

  test("in portrait the Handheld's printed labels are hidden from assistive technology and carry no Nintendo marks", async ({ page }) => {
    await page.setViewportSize(PORTRAIT);
    await openGame(page);

    await expect(page.getByText("DOT MATRIX PORTFOLIO")).toBeVisible();
    await expect(page.getByText("ALEXANDER CARRELS")).toBeVisible();
    const accessibilityTree = await page.locator("body").ariaSnapshot();
    expect(accessibilityTree).not.toContain("DOT MATRIX PORTFOLIO");
    expect(accessibilityTree).not.toContain("ALEXANDER CARRELS");
    await expect(page.locator("body")).not.toContainText(/nintendo|game ?boy/i);
  });

  test("in portrait the hint and Film roll counter show under the game, not over it", async ({ page }) => {
    await page.setViewportSize(PORTRAIT);
    await openGame(page);

    const gameBox = (await page.getByRole("application", { name: /game/i }).boundingBox())!;
    for (const label of [page.getByRole("status"), page.getByText(/^Film rolls:/)]) {
      await expect(label).toBeVisible();
      expect((await label.boundingBox())!.y).toBeGreaterThanOrEqual(gameBox.y + gameBox.height);
    }
  });

  test("in portrait the d-pad is drawn as one cross", async ({ page }) => {
    await page.setViewportSize(PORTRAIT);
    await openGame(page);

    const [up, down, left, right] = await Promise.all(
      (["up", "down", "left", "right"] as const).map(async (direction) => (await page.getByRole("button", { name: DPAD_BUTTONS[direction] }).boundingBox())!),
    );
    expect(up.x).toBeCloseTo(down.x, 0);
    expect(left.y).toBeCloseTo(right.y, 0);
    expect(up.y + up.height).toBeCloseTo(left.y, 0);
    expect(left.y + left.height).toBeCloseTo(down.y, 0);
    expect(left.x + left.width).toBeCloseTo(up.x, 0);
    expect(up.x + up.width).toBeCloseTo(right.x, 0);
  });

  test("in portrait the Shutter is printed A and the Inventory B, for sighted visitors only", async ({ page }) => {
    await page.setViewportSize(PORTRAIT);
    await openGame(page);

    const shutter = page.getByRole("button", { name: "Shutter" });
    const inventory = page.getByRole("button", { name: "Inventory" });
    await expectInside(page.getByTestId("handheld"), page.getByText("A", { exact: true }));
    await expect(page.getByText("A", { exact: true })).toBeVisible();
    await expect(page.getByText("B", { exact: true })).toBeVisible();
    await expect(shutter).toMatchAriaSnapshot('- button "Shutter"');
    await expect(inventory).toMatchAriaSnapshot('- button "Inventory"');
    const shutterBox = (await shutter.boundingBox())!;
    const inventoryBox = (await inventory.boundingBox())!;
    expect(shutterBox.x).toBeGreaterThan(inventoryBox.x);
    expect(shutterBox.y).toBeLessThan(inventoryBox.y);

    await inventory.tap();
    await expect(page.getByRole("dialog", { name: "Inventory" })).toBeVisible();
  });

  test("in portrait the Handheld has speaker slots in its bottom-right corner, hidden from assistive technology", async ({ page }) => {
    await page.setViewportSize(PORTRAIT);
    await openGame(page);

    const handheld = page.getByTestId("handheld");
    const speaker = page.getByTestId("speaker");
    await expect(speaker).toBeVisible();
    await expectInside(handheld, speaker);
    const handheldBox = (await handheld.boundingBox())!;
    const speakerBox = (await speaker.boundingBox())!;
    expect(speakerBox.x).toBeGreaterThan(handheldBox.x + handheldBox.width / 2);
    expect(speakerBox.y).toBeGreaterThan((await page.getByRole("button", { name: "Inventory" }).boundingBox())!.y);
    expect(await speaker.ariaSnapshot()).toBe("");
  });

  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test(`in portrait a held button visibly presses in (reduced motion: ${reducedMotion})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion });
      await page.setViewportSize(PORTRAIT);
      await openGame(page);

      for (const name of ["Walk up", "Inventory"]) {
        const button = page.getByRole("button", { name });
        const released = (await button.boundingBox())!;
        const releasedLook = await page.screenshot({ clip: released });
        await page.mouse.move(released.x + released.width / 2, released.y + released.height / 2);
        await page.mouse.down();
        const held = (await button.boundingBox())!;
        expect(await page.screenshot({ clip: released })).not.toEqual(releasedLook);
        if (reducedMotion === "reduce") expect(held).toEqual(released);
        else expect(held.y).toBeGreaterThan(released.y);
        await page.mouse.up();
        await page.keyboard.press("Escape");
      }
    });
  }

  test("in landscape there is no Handheld and the game fills the screen", async ({ page }) => {
    await page.setViewportSize(LANDSCAPE);
    await openGame(page);

    await expect(page.getByRole("application", { name: /game/i })).toHaveJSProperty("offsetWidth", LANDSCAPE.width);
    await expect(page.getByRole("application", { name: /game/i })).toHaveJSProperty("offsetHeight", LANDSCAPE.height);
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

test("a portrait-shaped desktop window shows the Handheld, and the arrow keys still walk", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop only");
  await page.setViewportSize({ width: 600, height: 1000 });
  await openGameWithKeyboard(page);

  const handheld = page.getByTestId("handheld");
  await expect(handheld).toBeVisible();
  await expectInsideViewport(page, handheld);
  await expectInside(handheld, page.getByRole("application", { name: /game/i }));

  await fastTravel(page, "career-road");
  await expect(page.getByRole("status")).toHaveText(facingStatus("MTU Aero Engines"));
  await tapKeys(page, LOOP_BACK_TO_MTU);
  await expect(page.getByRole("status")).toHaveText(facingStatus("MTU Aero Engines"));
});

test("on a desktop the on-screen buttons are not shown", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop only");
  await openGame(page);

  for (const name of ON_SCREEN_BUTTONS) {
    await expect(page.getByRole("button", { name })).toBeHidden();
  }
});

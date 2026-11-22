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

  test("in portrait Fast-travel and Sound sit on the Handheld as START and SELECT, below the d-pad and A/B", async ({ page }) => {
    await page.setViewportSize(PORTRAIT);
    await openGame(page);

    const handheld = page.getByTestId("handheld");
    const lowestFaceButton = Math.max(
      ...(await Promise.all(
        ["Walk down", "Shutter", "Inventory"].map(async (name) => {
          const box = (await page.getByRole("button", { name }).boundingBox())!;
          return box.y + box.height;
        }),
      )),
    );
    for (const name of ["Fast-travel", "Sound"]) {
      const button = page.getByRole("button", { name, exact: true });
      await expectInsideViewport(page, button);
      await expectInside(handheld, button);
      expect((await button.boundingBox())!.y).toBeGreaterThanOrEqual(lowestFaceButton);
    }

    for (const label of ["START", "SELECT", "TRAVEL", "SOUND"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    const accessibilityTree = await page.locator("body").ariaSnapshot();
    for (const label of ["START", "SELECT", "TRAVEL", "SOUND"]) {
      expect(accessibilityTree).not.toContain(label);
    }
  });

  test("in portrait START opens the Zone list over the screen, and choosing a Zone lands there", async ({ page }) => {
    await page.setViewportSize(PORTRAIT);
    await openGame(page);

    await page.getByRole("button", { name: "Fast-travel" }).tap();
    const zoneList = page.getByRole("navigation", { name: "Fast-travel" }).getByRole("list");
    await expect(zoneList).toBeVisible();
    await expectInside(page.getByRole("application", { name: /game/i }), zoneList);

    await zoneList.getByRole("button", { name: "Career road" }).tap();
    await expect(zoneList).toBeHidden();
    await expect(page.getByRole("status")).toHaveText(facingStatus("MTU Aero Engines"));
  });

  test("in portrait SELECT toggles Sound", async ({ page }) => {
    await page.setViewportSize(PORTRAIT);
    await openGame(page);

    const sound = page.getByRole("button", { name: "Sound", exact: true });
    await sound.tap();
    await expect(sound).toHaveAttribute("aria-pressed", "true");
    await sound.tap();
    await expect(sound).toHaveAttribute("aria-pressed", "false");
  });

  test("in landscape Fast-travel and Sound stay in the top-left corner", async ({ page }) => {
    await page.setViewportSize(LANDSCAPE);
    await openGame(page);

    for (const name of ["Fast-travel", "Sound"]) {
      const box = (await page.getByRole("button", { name, exact: true }).boundingBox())!;
      expect(box.x).toBeLessThan(LANDSCAPE.width / 2);
      expect(box.y).toBeLessThan(LANDSCAPE.height / 4);
    }
    await expect(page.getByText("START", { exact: true })).toBeHidden();
    await page.getByRole("button", { name: "Fast-travel" }).tap();
    await page.getByRole("navigation", { name: "Fast-travel" }).getByRole("button", { name: "Career road" }).tap();
    await expect(page.getByRole("status")).toHaveText(facingStatus("MTU Aero Engines"));
  });

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

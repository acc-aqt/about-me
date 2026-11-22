import { expect, test, type Locator, type Page } from "@playwright/test";
import { DPAD_BUTTONS, facingStatus, fastTravel, holdButton, openGame, openGameWithKeyboard, tapDpad, tapKeys } from "./walk";
import type { Direction } from "../src/overworld.ts";

const PORTRAIT = { width: 412, height: 839 };
const LANDSCAPE = { width: 839, height: 412 };
const ON_SCREEN_BUTTONS = [...Object.values(DPAD_BUTTONS), "Shutter", "Inventory"];

/** From MTU's landing tile: a loop through all 4 directions that ends back in front of MTU, facing it. */
const LOOP_BACK_TO_MTU: Direction[] = ["down", "down", "right", "right", "up", "up", "left", "left", "up"];

async function fastTravelToMtuByTouch(page: Page) {
  await page.getByRole("button", { name: "Fast-travel" }).tap();
  await page.getByRole("navigation", { name: "Fast-travel" }).getByRole("button", { name: "Career road" }).tap();
  await expect(page.getByRole("status")).toHaveText(facingStatus("MTU Aero Engines"));
}

type Box = { x: number; y: number; width: number; height: number };

async function expectInside(outer: Locator | Box, inner: Locator) {
  const outerBox = "boundingBox" in outer ? (await outer.boundingBox())! : outer;
  const innerBox = (await inner.boundingBox())!;
  expect(innerBox.x).toBeGreaterThanOrEqual(outerBox.x);
  expect(innerBox.y).toBeGreaterThanOrEqual(outerBox.y);
  expect(innerBox.x + innerBox.width).toBeLessThanOrEqual(outerBox.x + outerBox.width + 0.5);
  expect(innerBox.y + innerBox.height).toBeLessThanOrEqual(outerBox.y + outerBox.height + 0.5);
}

async function lowestEdge(page: Page, buttonNames: string[]) {
  const boxes = await Promise.all(buttonNames.map(async (name) => (await page.getByRole("button", { name, exact: true }).boundingBox())!));
  return Math.max(...boxes.map((box) => box.y + box.height));
}

function overlaps(a: Box, b: Box) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

async function expectInsideViewport(page: Page, locator: Locator) {
  await expectInside({ x: 0, y: 0, ...page.viewportSize()! }, locator);
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

  test.describe("in portrait", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(PORTRAIT);
      await openGame(page);
    });

    test("the game runs inside the Handheld", async ({ page }) => {
      const handheld = page.getByTestId("handheld");
      const game = page.getByRole("application", { name: /game/i });
      await expect(handheld).toBeVisible();
      await expectInsideViewport(page, handheld);
      await expectInside(handheld, game);
      const gameBox = (await game.boundingBox())!;
      expect(gameBox.width / gameBox.height).toBeCloseTo(16 / 9, 1);
    });

    test("the Handheld's printed labels are hidden from assistive technology and carry no Nintendo marks", async ({ page }) => {
      await expect(page.getByText("DOT MATRIX PORTFOLIO")).toBeVisible();
      await expect(page.getByText("ALEXANDER CARRELS")).toBeVisible();
      const accessibilityTree = await page.locator("body").ariaSnapshot();
      expect(accessibilityTree).not.toContain("DOT MATRIX PORTFOLIO");
      expect(accessibilityTree).not.toContain("ALEXANDER CARRELS");
      await expect(page.locator("body")).not.toContainText(/nintendo|game ?boy/i);
    });

    test("the hint and Film roll counter show under the game, not over it", async ({ page }) => {
      const gameBox = (await page.getByRole("application", { name: /game/i }).boundingBox())!;
      for (const label of [page.getByRole("status"), page.getByText(/^Film rolls:/)]) {
        await expect(label).toBeVisible();
        expect((await label.boundingBox())!.y).toBeGreaterThanOrEqual(gameBox.y + gameBox.height);
      }
    });

    test("the d-pad is drawn as one cross", async ({ page }) => {
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

    test("the Shutter is printed A and the Inventory B, for sighted visitors only", async ({ page }) => {
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

    test("the Handheld has speaker slots in its bottom-right corner, hidden from assistive technology", async ({ page }) => {
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
      test(`a held button visibly presses in (reduced motion: ${reducedMotion})`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion });

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

    test("Fast-travel and Sound sit on the Handheld as START and SELECT, below the d-pad and A/B", async ({ page }) => {
      const handheld = page.getByTestId("handheld");
      const lowestFaceButton = await lowestEdge(page, ["Walk down", "Shutter", "Inventory"]);
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

    test("START opens the Zone list over the screen, and choosing a Zone lands there", async ({ page }) => {
      await page.getByRole("button", { name: "Fast-travel" }).tap();
      const zoneList = page.getByRole("navigation", { name: "Fast-travel" }).getByRole("list");
      await expect(zoneList).toBeVisible();
      await expectInside(page.getByRole("application", { name: /game/i }), zoneList);

      await zoneList.getByRole("button", { name: "Career road" }).tap();
      await expect(zoneList).toBeHidden();
      await expect(page.getByRole("status")).toHaveText(facingStatus("MTU Aero Engines"));
    });

    test("SELECT toggles Sound", async ({ page }) => {
      const sound = page.getByRole("button", { name: "Sound", exact: true });
      await sound.tap();
      await expect(sound).toHaveAttribute("aria-pressed", "true");
      await sound.tap();
      await expect(sound).toHaveAttribute("aria-pressed", "false");
    });

    test("the d-pad and A/B sit just below the logo, with START and SELECT just below them", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 1000 });

      const logo = (await page.getByText("ALEXANDER CARRELS").boundingBox())!;
      const dpadTop = (await page.getByRole("button", { name: "Walk up" }).boundingBox())!.y;
      expect(dpadTop - (logo.y + logo.height)).toBeLessThan(80);
      const pillsTop = Math.min(
        ...(await Promise.all(["Fast-travel", "Sound"].map(async (name) => (await page.getByRole("button", { name, exact: true }).boundingBox())!.y))),
      );
      expect(pillsTop - (await lowestEdge(page, ["Shutter", "Inventory"]))).toBeLessThan(48);
    });

    test("the speaker slots stay clear of SELECT on a small phone", async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 640 });

      const speaker = (await page.getByTestId("speaker").boundingBox())!;
      const select = (await page.getByRole("button", { name: "Sound", exact: true }).boundingBox())!;
      expect(overlaps(speaker, select)).toBe(false);
    });

    test("the Handheld fits the smallest phone without scrolling", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });

      const { scrollWidth, scrollHeight } = await page.evaluate(() => {
        const { scrollWidth, scrollHeight } = document.documentElement;
        return { scrollWidth, scrollHeight };
      });
      expect(scrollWidth).toBeLessThanOrEqual(320);
      expect(scrollHeight).toBeLessThanOrEqual(568);
    });
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

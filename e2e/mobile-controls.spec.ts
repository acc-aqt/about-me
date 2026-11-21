import { expect, test, type Locator, type Page } from "@playwright/test";

const PORTRAIT = { width: 412, height: 839 };
const LANDSCAPE = { width: 839, height: 412 };

async function openGame(page: Page) {
  await page.goto("./");
  await expect(page.getByRole("status")).toContainText("near a sign");
}

async function holdButton(button: Locator, ms: number) {
  await button.dispatchEvent("pointerdown", { pointerType: "touch", isPrimary: true });
  await button.page().waitForTimeout(ms);
  await button.dispatchEvent("pointerup", { pointerType: "touch", isPrimary: true });
}

async function walkRightUntilNear(page: Page, title: string) {
  const status = page.getByRole("status");
  const walkRight = page.getByRole("button", { name: "Walk right" });
  for (let step = 0; step < 100; step++) {
    if ((await status.textContent())?.includes(title)) return;
    await holdButton(walkRight, 100);
  }
  throw new Error(`Never got near ${title}`);
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

  test("walking to MTU with the on-screen buttons and tapping the Shutter opens the Viewfinder", async ({ page }) => {
    await openGame(page);
    await walkRightUntilNear(page, "MTU Aero Engines");

    await page.getByRole("button", { name: "Shutter" }).tap();

    const viewfinder = page.getByRole("dialog", { name: "MTU Aero Engines" });
    await expect(viewfinder).toBeVisible();
    await expect(viewfinder).toContainText("2020–now");
  });

  test("the on-screen Walk left button walks back away from MTU", async ({ page }) => {
    await openGame(page);
    await walkRightUntilNear(page, "MTU Aero Engines");

    await holdButton(page.getByRole("button", { name: "Walk left" }), 600);

    await expect(page.getByRole("status")).not.toContainText("MTU Aero Engines");
  });

  for (const [orientation, viewport] of [
    ["portrait", PORTRAIT],
    ["landscape", LANDSCAPE],
  ] as const) {
    test(`the game, on-screen buttons and Viewfinder fit the screen in ${orientation}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openGame(page);

      await expectInsideViewport(page, page.getByRole("application", { name: /game/i }));
      for (const name of ["Walk left", "Walk right", "Shutter"]) {
        await expectInsideViewport(page, page.getByRole("button", { name }));
      }

      await walkRightUntilNear(page, "MTU Aero Engines");
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

  for (const name of ["Walk left", "Walk right", "Shutter"]) {
    await expect(page.getByRole("button", { name })).toBeHidden();
  }
});

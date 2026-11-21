import { expect, test, type Page } from "@playwright/test";

async function openGame(page: Page) {
  await page.goto("./");
  await page.getByRole("application", { name: /game/i }).focus();
  await expect(page.getByRole("status")).toContainText("near a sign");
}

async function walkRightUntilNear(page: Page, title: string) {
  const status = page.getByRole("status");
  for (let step = 0; step < 100; step++) {
    if ((await status.textContent())?.includes(title)) return;
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(100);
    await page.keyboard.up("ArrowRight");
  }
  throw new Error(`Never got near ${title}`);
}

async function walkToMtuAndFireShutter(page: Page) {
  await openGame(page);
  await walkRightUntilNear(page, "MTU Aero Engines");

  await page.keyboard.press("Space");
  return page.getByRole("dialog", { name: "MTU Aero Engines" });
}

test("walking to MTU and firing the Shutter opens the Viewfinder with MTU content", async ({ page }) => {
  const viewfinder = await walkToMtuAndFireShutter(page);

  await expect(viewfinder).toBeVisible();
  await expect(viewfinder).toContainText("2020–now");
  await expect(viewfinder).toContainText("engineering design processes and workflows");
});

test("Escape closes the Viewfinder", async ({ page }) => {
  const viewfinder = await walkToMtuAndFireShutter(page);
  await expect(viewfinder).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(viewfinder).toBeHidden();
});

test("Space closes the Viewfinder", async ({ page }) => {
  const viewfinder = await walkToMtuAndFireShutter(page);
  await expect(viewfinder).toBeVisible();

  await page.keyboard.press("Space");
  await expect(viewfinder).toBeHidden();
});

test("the close button closes the Viewfinder and the Shutter reopens it", async ({ page }) => {
  const viewfinder = await walkToMtuAndFireShutter(page);
  await expect(viewfinder).toBeVisible();

  await viewfinder.getByRole("button", { name: /close/i }).click();
  await expect(viewfinder).toBeHidden();

  await page.keyboard.press("Space");
  await expect(viewfinder).toBeVisible();
});

test("the Shutter does nothing away from a Point of Interest", async ({ page }) => {
  await openGame(page);

  await page.keyboard.press("Space");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

import { expect, test, type Page } from "@playwright/test";

async function openViewfinderAtFirstSign(page: Page) {
  await page.goto("./");
  await page.getByRole("application", { name: /game/i }).focus();
  const status = page.getByRole("status");
  for (let step = 0; step < 60; step++) {
    if ((await status.textContent())?.includes("Technical University of Munich")) break;
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(100);
    await page.keyboard.up("ArrowRight");
  }
  await page.keyboard.press("Space");
  const viewfinder = page.getByRole("dialog", { name: "Technical University of Munich" });
  await expect(viewfinder).toBeVisible();
  return viewfinder;
}

function animationName(viewfinder: ReturnType<Page["getByRole"]>) {
  return viewfinder.evaluate((element) => getComputedStyle(element).animationName);
}

test("the Viewfinder opens with a shutter transition", async ({ page }) => {
  const viewfinder = await openViewfinderAtFirstSign(page);

  expect(await animationName(viewfinder)).not.toBe("none");
});

test("prefers-reduced-motion drops the Viewfinder transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const viewfinder = await openViewfinderAtFirstSign(page);

  expect(await animationName(viewfinder)).toBe("none");
});

test("the game loads its pixel-art tiles", async ({ page }) => {
  const tiles = page.waitForResponse((response) => /\/art\/.*\.png$/.test(response.url()));
  await page.goto("./");

  expect((await tiles).status()).toBe(200);
});

test.describe("Plain view without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("credits the CC0 tiles and the original art", async ({ page }) => {
    await page.goto("./plain/");
    const credits = page.getByRole("contentinfo");

    await expect(credits).toContainText("Kenney");
    await expect(credits).toContainText("CC0");
    await expect(credits.getByRole("link", { name: /CC0/ })).toHaveAttribute(
      "href",
      "https://creativecommons.org/publicdomain/zero/1.0/",
    );
  });
});

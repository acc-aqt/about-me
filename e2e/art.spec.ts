import { expect, test, type Page } from "@playwright/test";
import { facingStatus, openGameWithKeyboard, pointOfInterest, SPAWN_LANDING, tapKeys, tapsTo } from "./walk";

async function openViewfinderAtFirstSign(page: Page) {
  const intro = pointOfInterest("intro");
  await openGameWithKeyboard(page);
  await tapKeys(page, tapsTo(SPAWN_LANDING, intro.placement, { face: true }));
  await expect(page.getByRole("status")).toHaveText(facingStatus(intro.title));
  await page.keyboard.press("Space");
  const viewfinder = page.getByRole("dialog", { name: intro.title });
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

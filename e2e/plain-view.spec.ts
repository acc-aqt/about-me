import { expect, test } from "@playwright/test";
import { content } from "../src/content";

test.describe("Plain view without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("shows every Zone and Point of Interest from the Content file", async ({ page }) => {
    await page.goto("./plain/");
    const main = page.getByRole("main");

    for (const zone of content.zones) {
      const zoneSection = main.getByRole("region", { name: zone.title, exact: true });
      await expect(zoneSection.getByRole("heading", { level: 2, name: zone.title, exact: true })).toBeVisible();

      for (const poi of zone.pointsOfInterest) {
        const poiArticle = zoneSection.getByRole("article", { name: poi.title, exact: true });
        await expect(poiArticle.getByRole("heading", { level: 3, name: poi.title, exact: true })).toBeVisible();
        await expect(poiArticle).toContainText(poi.body);
        if (poi.subtitle) await expect(poiArticle).toContainText(poi.subtitle);
        if (poi.dates) await expect(poiArticle).toContainText(poi.dates);
        for (const link of poi.links ?? []) {
          await expect(poiArticle.getByRole("link", { name: link.label, exact: true })).toHaveAttribute("href", link.url);
        }
        for (const photo of poi.photos ?? []) {
          await expect(poiArticle.getByRole("img", { name: photo.alt, exact: true })).toHaveAttribute("src", photo.src);
        }
      }
    }
  });
});

test("every link in the Plain view is reachable with the keyboard", async ({ page }) => {
  await page.goto("./plain/");
  const expectedLinks = [
    "Back to the game",
    ...content.zones.flatMap((zone) => zone.pointsOfInterest.flatMap((poi) => (poi.links ?? []).map((link) => link.label))),
  ];

  const focusedLinks: string[] = [];
  for (let step = 0; step < expectedLinks.length; step++) {
    await page.keyboard.press("Tab");
    focusedLinks.push(await page.evaluate(() => document.activeElement?.textContent?.trim() ?? ""));
  }
  expect(focusedLinks).toEqual(expectedLinks);
});

test("the game always shows a 'skip the game' link to the Plain view, which links back", async ({ page }) => {
  await page.goto("./");
  const skipLink = page.getByRole("link", { name: /skip the game/i });
  await expect(skipLink).toBeVisible();

  await page.getByRole("application", { name: /game/i }).focus();
  for (let step = 0; step < 5; step++) {
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(100);
    await page.keyboard.up("ArrowRight");
  }
  await expect(skipLink).toBeVisible();

  await skipLink.click();
  await expect(page).toHaveURL(/\/plain\/$/);
  await expect(page.getByRole("heading", { level: 2, name: content.zones[0].title })).toBeVisible();

  await page.getByRole("link", { name: /back to the game/i }).click();
  await expect(page.getByRole("application", { name: /game/i })).toBeVisible();
});

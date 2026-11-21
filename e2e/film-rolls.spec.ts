import { expect, test, type Page } from "@playwright/test";
import { content } from "../src/content";

const totalFilmRolls = content.zones.filter((zone) => zone.filmRoll).length;

async function openGame(page: Page) {
  await page.goto("./");
  await page.getByRole("application", { name: /game/i }).focus();
  await expect(page.getByRole("status")).toContainText("near a sign");
}

test("the Film roll counter starts empty", async ({ page }) => {
  await openGame(page);

  await expect(page.getByText(`Film rolls: 0/${totalFilmRolls}`)).toBeVisible();
});

test("walking over a Film roll picks it up and updates the counter", async ({ page }) => {
  await openGame(page);
  const collectedOne = page.getByText(`Film rolls: 1/${totalFilmRolls}`);

  for (let step = 0; step < 50 && !(await collectedOne.isVisible()); step++) {
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(100);
    await page.keyboard.up("ArrowRight");
  }

  await expect(collectedOne).toBeVisible();
});

test("collecting every Film roll shows the bonus in the Viewfinder", async ({ page }) => {
  test.setTimeout(120_000);
  await openGame(page);
  const bonus = page.getByRole("dialog", { name: content.filmRollBonus.title });

  await page.keyboard.down("ArrowRight");
  await expect(bonus).toBeVisible({ timeout: 100_000 });
  await page.keyboard.up("ArrowRight");

  await expect(bonus).toContainText("Analog gallery");
  await expect(page.getByText(`Film rolls: ${totalFilmRolls}/${totalFilmRolls}`)).toBeVisible();
});

import { expect, test } from "@playwright/test";
import { content, zoneById } from "../src/content";
import { ARROW_KEYS, fastTravel, openGameWithKeyboard, tapKeys, tapsTo } from "./walk";

const totalFilmRolls = content.zones.filter((zone) => zone.filmRoll).length;
const contactRoll = zoneById("contact").filmRoll!;

test("the Film roll counter starts empty", async ({ page }) => {
  await openGameWithKeyboard(page);

  await expect(page.getByText(`Film rolls: 0/${totalFilmRolls}`)).toBeVisible();
});

test("stepping onto a Film roll's tile picks it up and updates the counter", async ({ page }) => {
  await openGameWithKeyboard(page);
  const landing = await fastTravel(page, "contact");

  await tapKeys(page, tapsTo(landing, contactRoll));

  await expect(page.getByText(`Film rolls: 1/${totalFilmRolls}`)).toBeVisible();
});

test("holding a direction keeps walking, onto a Film roll two tiles away", async ({ page }) => {
  await openGameWithKeyboard(page);
  const landing = await fastTravel(page, "contact");
  const [turn, ...steps] = tapsTo(landing, contactRoll);
  expect(steps).toEqual([turn, turn]);

  await page.keyboard.down(ARROW_KEYS[turn]);
  await expect(page.getByText(`Film rolls: 1/${totalFilmRolls}`)).toBeVisible();
  await page.keyboard.up(ARROW_KEYS[turn]);
});

test("collecting every Film roll shows the bonus in the Viewfinder", async ({ page }) => {
  test.setTimeout(120_000);
  await openGameWithKeyboard(page);
  const bonus = page.getByRole("dialog", { name: content.filmRollBonus.title });

  for (const [index, zone] of content.zones.entries()) {
    const landing = await fastTravel(page, zone.id);
    await tapKeys(page, tapsTo(landing, zone.filmRoll!));
    await expect(page.getByText(`Film rolls: ${index + 1}/${totalFilmRolls}`)).toBeVisible({ timeout: 30_000 });
  }

  await expect(bonus).toBeVisible();
  await expect(bonus).toContainText("Analog gallery");
  await expect(page.getByText(`Film rolls: ${totalFilmRolls}/${totalFilmRolls}`)).toBeVisible();
});

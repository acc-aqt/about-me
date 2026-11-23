import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { CATS } from "../src/cats";
import { openGameWithKeyboard, SPAWN_LANDING, tapKeys, tapsTo } from "./walk";

type Rgb = [number, number, number];

const BERLIOZ_FUR: Rgb = [0x34, 0x34, 0x3f];
const MANOUCHE_FUR: Rgb = [0x9a, 0x9c, 0xa6];
const HEART_RED: Rgb = [0xe0, 0x4a, 0x5a];

/** Pixels of the game canvas in exactly this colour; the Cats' and the heart's colours appear nowhere else. */
async function pixelsOf(page: Page, [r, g, b]: Rgb) {
  const png = await page.getByRole("application", { name: /game/i }).screenshot();
  const { data } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let count = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i] === r && data[i + 1] === g && data[i + 2] === b) count++;
  return count;
}

test("Berlioz and Manouche are in the Hub", async ({ page }) => {
  await openGameWithKeyboard(page);

  await expect.poll(() => pixelsOf(page, BERLIOZ_FUR)).toBeGreaterThan(0);
  await expect.poll(() => pixelsOf(page, MANOUCHE_FUR)).toBeGreaterThan(0);
});

test("the Shutter at a Cat shows a heart instead of opening the Viewfinder", async ({ page }) => {
  const manouche = CATS.find((cat) => cat.name === "Manouche")!;
  await openGameWithKeyboard(page);
  await tapKeys(page, tapsTo(SPAWN_LANDING, manouche.start, { face: true }));
  expect(await pixelsOf(page, HEART_RED)).toBe(0);

  // The Shutter only reaches the Cat once the walk there has finished.
  await expect(async () => {
    await page.keyboard.press("Space");
    expect(await pixelsOf(page, HEART_RED)).toBeGreaterThan(0);
  }).toPass();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

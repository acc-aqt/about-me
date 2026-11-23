import { expect, test } from "@playwright/test";
import { facingStatus, fastTravel, openGameWithKeyboard, pointOfInterest, tapKeys, tapsTo, walkTimeout } from "./walk";

for (const id of ["tennis-court", "swimming-pool"]) {
  test(`walking up to the ${id} from its nearest edge photographs it`, async ({ page }) => {
    await openGameWithKeyboard(page);
    const poi = pointOfInterest(id);
    const landing = await fastTravel(page, "sport");

    const taps = tapsTo(landing, poi.placement, { face: true });
    await tapKeys(page, taps);
    await expect(page.getByRole("status")).toHaveText(facingStatus(poi.title), { timeout: walkTimeout(taps) });
    await page.keyboard.press("Space");

    await expect(page.getByRole("dialog", { name: poi.title })).toBeVisible();
  });
}

test("the skin track climbs the mountain to the summit cross, which photographs the ski-touring slope", async ({ page }) => {
  test.setTimeout(60_000);
  await openGameWithKeyboard(page);
  const summit = pointOfInterest("ski-touring-slope");
  const landing = await fastTravel(page, "sport");

  const taps = tapsTo(landing, summit.placement, { face: true });
  await tapKeys(page, taps);
  await expect(page.getByRole("status")).toHaveText(facingStatus(summit.title), { timeout: walkTimeout(taps) });
  await page.keyboard.press("Space");

  await expect(page.getByRole("dialog", { name: summit.title })).toBeVisible();
  await expect(page.getByRole("dialog", { name: summit.title })).toContainText("ski touring");
});

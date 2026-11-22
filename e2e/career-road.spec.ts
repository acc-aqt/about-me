import { expect, test, type Page } from "@playwright/test";
import { facingStatus, fastTravel, openGameWithKeyboard, pointOfInterest, tapKeys, tapsTo } from "./walk";

async function walkUpToFace(page: Page, poiId: string) {
  const poi = pointOfInterest(poiId);
  const landing = await fastTravel(page, "career-road");
  await tapKeys(page, tapsTo(landing, poi.placement, { face: true }));
  await expect(page.getByRole("status")).toHaveText(facingStatus(poi.title));
}

test("the status names a Career road stop while the Player faces it and clears on walking on", async ({ page, isMobile }) => {
  await openGameWithKeyboard(page);
  const status = page.getByRole("status");

  await walkUpToFace(page, "tum");
  await expect(status).toHaveText(`Facing Technical University of Munich — ${isMobile ? "press A" : "press Space"}`);

  await tapKeys(page, ["down", "down"]);
  await expect(status).toContainText("Face a sign");
});

test("photographing the BMW Group stop shows its role and summary in the Viewfinder", async ({ page }) => {
  await openGameWithKeyboard(page);
  await walkUpToFace(page, "bmw-group");

  await page.keyboard.press("Space");
  const viewfinder = page.getByRole("dialog", { name: "BMW Group" });

  await expect(viewfinder).toBeVisible();
  await expect(viewfinder).toContainText("Chassis engineering intern");
  await expect(viewfinder).toContainText("CFRP");
});

test("the Canberra detour shows research at the Australian National University, 2014–2015", async ({ page }) => {
  await openGameWithKeyboard(page);
  await walkUpToFace(page, "canberra-detour");

  await page.keyboard.press("Space");
  const viewfinder = page.getByRole("dialog", { name: "Canberra detour" });

  await expect(viewfinder).toContainText("Australian National University");
  await expect(viewfinder).toContainText("2014–2015");
});

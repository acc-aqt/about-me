import { expect, test, type Page } from "@playwright/test";
import { facingStatus, fastTravel, openGameWithKeyboard, pointOfInterest, tapKeys, tapsTo, walkTimeout } from "./walk";

async function walkUpToFace(page: Page, poiId: string) {
  const poi = pointOfInterest(poiId);
  const landing = await fastTravel(page, "career-road");
  const taps = tapsTo(landing, poi.placement, { face: true });
  await tapKeys(page, taps);
  await expect(page.getByRole("status")).toHaveText(facingStatus(poi.title), { timeout: walkTimeout(taps) });
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

test("the FIZ can be photographed from its side as well as from the street", async ({ page }) => {
  await openGameWithKeyboard(page);
  const landing = await fastTravel(page, "career-road");
  const fiz = pointOfInterest("bmw-group").placement;
  const besideFiz = { col: fiz.col + fiz.width!, row: fiz.row + 1 };

  const taps = [...tapsTo(landing, besideFiz), "left" as const];
  await tapKeys(page, taps);
  await expect(page.getByRole("status")).toHaveText(facingStatus("BMW Group"), { timeout: walkTimeout(taps) });
  await page.keyboard.press("Space");

  await expect(page.getByRole("dialog", { name: "BMW Group" })).toBeVisible();
});

test("facing the aircraft engine beside the MTU shed photographs MTU Aero Engines", async ({ page }) => {
  await openGameWithKeyboard(page);
  const landing = await fastTravel(page, "career-road");
  const mtu = pointOfInterest("mtu").placement;
  const besideEngine = { col: mtu.col + mtu.width!, row: mtu.row + 1 };

  // The landing already faces MTU, so wait for the walk away to clear the status before turning back to the engine.
  const taps = tapsTo(landing, besideEngine);
  await tapKeys(page, taps);
  await expect(page.getByRole("status")).toContainText("Face a sign");
  await tapKeys(page, ["left"]);
  await expect(page.getByRole("status")).toHaveText(facingStatus("MTU Aero Engines"), { timeout: walkTimeout(taps) });
  await page.keyboard.press("Space");

  await expect(page.getByRole("dialog", { name: "MTU Aero Engines" })).toBeVisible();
});

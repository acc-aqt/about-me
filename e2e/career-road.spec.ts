import { expect, test, type Page } from "@playwright/test";

test.skip(({ isMobile }) => isMobile, "On-screen buttons for phones arrive in a later ticket");

async function openGame(page: Page) {
  await page.goto("./");
  await page.getByRole("application", { name: /game/i }).focus();
  await expect(page.getByRole("status")).toContainText("Press Space near a sign");
}

async function walkRightUntilStatus(page: Page, matches: (status: string) => boolean) {
  const status = page.getByRole("status");
  for (let step = 0; step < 150; step++) {
    if (matches((await status.textContent()) ?? "")) return;
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(100);
    await page.keyboard.up("ArrowRight");
  }
  throw new Error("Status never matched while walking");
}

test("a proximity cue appears near a Career road stop and clears when walking on", async ({ page }) => {
  await openGame(page);
  const status = page.getByRole("status");

  await walkRightUntilStatus(page, (text) => text.includes("Technical University of Munich"));
  await expect(status).toHaveText("Press Space to photograph Technical University of Munich");

  await walkRightUntilStatus(page, (text) => !text.includes("Technical University of Munich"));
  await expect(status).toContainText("Press Space near a sign");
});

test("photographing the BMW Group stop shows its role and summary in the Viewfinder", async ({ page }) => {
  await openGame(page);
  await walkRightUntilStatus(page, (text) => text.includes("BMW Group"));

  await page.keyboard.press("Space");
  const viewfinder = page.getByRole("dialog", { name: "BMW Group" });

  await expect(viewfinder).toBeVisible();
  await expect(viewfinder).toContainText("Chassis engineering intern");
  await expect(viewfinder).toContainText("CFRP");
});

test("the Canberra detour shows research at the Australian National University, 2014–2015", async ({ page }) => {
  await openGame(page);
  await walkRightUntilStatus(page, (text) => text.includes("Canberra detour"));

  await page.keyboard.press("Space");
  const viewfinder = page.getByRole("dialog", { name: "Canberra detour" });

  await expect(viewfinder).toContainText("Australian National University");
  await expect(viewfinder).toContainText("2014–2015");
});

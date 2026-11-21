import { expect, test, type Page } from "@playwright/test";
import { content } from "../src/content";

test.skip(({ isMobile }) => isMobile, "On-screen buttons for phones arrive in a later ticket");

async function openGame(page: Page) {
  await page.goto("./");
  await expect(page.getByRole("status")).toContainText("Press Space near a sign");
}

async function fastTravelByClick(page: Page, zoneTitle: string | RegExp) {
  await page.getByRole("button", { name: "Fast-travel" }).click();
  await page.getByRole("navigation", { name: "Fast-travel" }).getByRole("button", { name: zoneTitle }).click();
}

test("Fast-travel to the Career road lands at MTU, and the Shutter opens its Viewfinder", async ({ page }) => {
  await openGame(page);

  await fastTravelByClick(page, "Career road");
  await expect(page.getByRole("status")).toContainText("MTU Aero Engines");

  await page.keyboard.press("Space");
  const viewfinder = page.getByRole("dialog", { name: "MTU Aero Engines" });
  await expect(viewfinder).toBeVisible();
  await expect(viewfinder).toContainText("engineering design processes and workflows");
});

test("Fast-travel to Contact shows LinkedIn, GitHub, Instagram and carrels.photography, opening in a new tab", async ({
  page,
}) => {
  await openGame(page);

  await fastTravelByClick(page, "Contact");
  await page.keyboard.press("Space");

  const links = page.getByRole("dialog").getByRole("link");
  await expect(links).toHaveText(["LinkedIn", "GitHub", "Instagram", "carrels.photography"]);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute("target", "_blank");
  }
});

test("Fast-travel lists every Zone from the Content file", async ({ page }) => {
  await openGame(page);

  await page.getByRole("button", { name: "Fast-travel" }).click();

  await expect(page.getByRole("navigation", { name: "Fast-travel" }).getByRole("listitem")).toHaveText(
    content.zones.map((zone) => zone.title),
  );
});

test("Fast-travel works with the keyboard alone", async ({ page }) => {
  await openGame(page);
  const toggle = page.getByRole("button", { name: "Fast-travel" });

  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();

  await page.keyboard.press("Enter");
  for (let i = 1; i < content.zones.length; i++) await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Contact" })).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("status")).toContainText("Say hello");
  await page.keyboard.press("Space");
  await expect(page.getByRole("dialog", { name: "Say hello" })).toBeVisible();
});

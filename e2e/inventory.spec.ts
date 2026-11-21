import { expect, test, type Page } from "@playwright/test";
import { content } from "../src/content";

async function openInventory(page: Page, isMobile: boolean) {
  await page.goto("./");
  await page.getByRole("application", { name: /game/i }).focus();
  if (isMobile) await page.getByRole("button", { name: "Inventory" }).tap();
  else await page.keyboard.press("i");
  return page.getByRole("dialog", { name: "Inventory" });
}

test("I opens the Inventory showing every item from the Content file", async ({ page, isMobile }) => {
  const inventory = await openInventory(page, isMobile);

  await expect(inventory).toBeVisible();
  await expect(inventory.getByRole("listitem").filter({ hasText: "LS-DYNA" })).toBeVisible();
  for (const item of content.inventory) {
    await expect(inventory.getByRole("listitem").filter({ hasText: item.name })).toContainText(item.description);
  }
});

test("I closes the Inventory again", async ({ page, isMobile }) => {
  const inventory = await openInventory(page, isMobile);
  await expect(inventory).toBeVisible();

  await page.keyboard.press("i");
  await expect(inventory).toBeHidden();
});

test("Escape closes the Inventory", async ({ page, isMobile }) => {
  const inventory = await openInventory(page, isMobile);
  await expect(inventory).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(inventory).toBeHidden();
});

test("on a phone the on-screen Inventory button opens it and its close button closes it", async ({ page, isMobile }) => {
  test.skip(!isMobile, "On-screen buttons are for touch devices");
  const inventory = await openInventory(page, isMobile);
  await expect(inventory).toBeVisible();

  await inventory.getByRole("button", { name: /close/i }).tap();
  await expect(inventory).toBeHidden();
});

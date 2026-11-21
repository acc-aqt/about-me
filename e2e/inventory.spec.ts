import { expect, test, type Page } from "@playwright/test";
import { content } from "../src/content";

test.skip(({ isMobile }) => isMobile, "The Inventory key needs a keyboard; phones get the list in the Plain view");

async function openInventory(page: Page) {
  await page.goto("./");
  await page.getByRole("application", { name: /game/i }).focus();
  await page.keyboard.press("i");
  return page.getByRole("dialog", { name: "Inventory" });
}

test("I opens the Inventory showing every item from the Content file", async ({ page }) => {
  const inventory = await openInventory(page);

  await expect(inventory).toBeVisible();
  await expect(inventory.getByRole("listitem").filter({ hasText: "LS-DYNA" })).toBeVisible();
  for (const item of content.inventory) {
    await expect(inventory.getByRole("listitem").filter({ hasText: item.name })).toContainText(item.description);
  }
});

test("I closes the Inventory again", async ({ page }) => {
  const inventory = await openInventory(page);
  await expect(inventory).toBeVisible();

  await page.keyboard.press("i");
  await expect(inventory).toBeHidden();
});

test("Escape closes the Inventory", async ({ page }) => {
  const inventory = await openInventory(page);
  await expect(inventory).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(inventory).toBeHidden();
});

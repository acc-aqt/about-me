import { expect, test, type Page } from "@playwright/test";
import { content } from "../src/content";

async function openGame(page: Page) {
  await page.goto("./");
  await expect(page.getByRole("status")).toContainText("near a sign");
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

test("on a phone, Fast-travel to the Career road and the on-screen Shutter open the MTU Viewfinder", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "On-screen Shutter is for touch devices");
  await openGame(page);

  await page.getByRole("button", { name: "Fast-travel" }).tap();
  await page.getByRole("navigation", { name: "Fast-travel" }).getByRole("button", { name: "Career road" }).tap();
  await expect(page.getByRole("status")).toContainText("MTU Aero Engines");
  await page.getByRole("button", { name: "Shutter" }).tap();

  await expect(page.getByRole("dialog", { name: "MTU Aero Engines" })).toBeVisible();
});

test("Fast-travel to Contact shows LinkedIn, GitHub, Instagram and carrels.photography, opening in a new tab", async ({
  page,
}) => {
  await openGame(page);

  await fastTravelByClick(page, "Contact");
  await expect(page.getByRole("status")).toContainText("Say hello");
  await page.keyboard.press("Space");

  const links = page.getByRole("dialog").getByRole("link");
  await expect(links).toHaveText(["LinkedIn", "GitHub", "Instagram", "carrels.photography"]);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute("target", "_blank");
  }
});

test("Fast-travel lists every Zone from the Content file, naming where it lands", async ({ page }) => {
  await openGame(page);

  await page.getByRole("button", { name: "Fast-travel" }).click();

  await expect(page.getByRole("navigation", { name: "Fast-travel" }).getByRole("listitem")).toHaveText(
    content.zones.map((zone) => {
      const landing = zone.pointsOfInterest.find((poi) => poi.id === zone.fastTravelTo);
      return landing ? `${zone.title} · ${landing.title}` : zone.title;
    }),
  );
  await expect(page.getByRole("button", { name: "Career road · MTU Aero Engines" })).toBeVisible();
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

test("the corner controls, skip link and Film roll counter do not overlap and each takes its own clicks", async ({ page }) => {
  await openGame(page);
  const controls = [
    page.getByRole("button", { name: "Fast-travel" }),
    page.getByRole("button", { name: "Sound" }),
    page.getByRole("link", { name: /skip the game/i }),
    page.getByText(/^Film rolls:/),
  ];
  const boxes = await Promise.all(controls.map(async (control) => (await control.boundingBox())!));
  for (const [i, a] of boxes.entries()) {
    for (const b of boxes.slice(i + 1)) {
      const overlaps = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      expect(overlaps).toBe(false);
    }
  }
  for (const [i, control] of controls.entries()) {
    const box = boxes[i];
    const isTopmost = await control.evaluate(
      (element, point) => element.contains(document.elementFromPoint(point.x, point.y)),
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    );
    expect(isTopmost).toBe(true);
  }
});

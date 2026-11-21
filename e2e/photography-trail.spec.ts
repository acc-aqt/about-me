import { expect, test, type Page } from "@playwright/test";
import { content } from "../src/content.ts";

const trail = content.zones.find((zone) => zone.id === "photography-trail")!;
const norway = trail.pointsOfInterest.find((poi) => poi.id === "norway")!;
const darkroom = trail.pointsOfInterest.find((poi) => poi.id === "darkroom")!;
const photos = norway.photos!;

async function walkRightUntilNear(page: Page, title: string) {
  const status = page.getByRole("status");
  for (let step = 0; step < 400; step++) {
    if ((await status.textContent())?.includes(title)) return;
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(100);
    await page.keyboard.up("ArrowRight");
  }
  throw new Error(`Never got near ${title}`);
}

async function openNorwayViewfinder(page: Page) {
  await page.goto("./");
  await page.getByRole("application", { name: /game/i }).focus();
  await walkRightUntilNear(page, norway.title);
  await page.keyboard.press("Space");
  const viewfinder = page.getByRole("dialog", { name: norway.title });
  await expect(viewfinder).toBeVisible();
  return viewfinder;
}

test("the Norway Viewfinder shows a full-resolution photo and steps through the trip", async ({ page }) => {
  const viewfinder = await openNorwayViewfinder(page);

  const photo = viewfinder.getByRole("img");
  await expect(photo).toHaveAccessibleName(photos[0].alt);
  await expect(viewfinder).toContainText(`Photo 1 of ${photos.length}`);
  await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(1000);

  await page.keyboard.press("ArrowRight");
  await expect(photo).toHaveAccessibleName(photos[1].alt);
  await expect(viewfinder).toContainText(`Photo 2 of ${photos.length}`);

  await viewfinder.getByRole("button", { name: "Next photo" }).click();
  await expect(photo).toHaveAccessibleName(photos[2].alt);

  await viewfinder.getByRole("button", { name: "Previous photo" }).click();
  await page.keyboard.press("ArrowLeft");
  await expect(photo).toHaveAccessibleName(photos[0].alt);

  await page.keyboard.press("ArrowLeft");
  await expect(photo).toHaveAccessibleName(photos[photos.length - 1].alt);
});

test("Space activates the focused photo button or link instead of closing the Viewfinder", async ({ page }) => {
  const viewfinder = await openNorwayViewfinder(page);

  await viewfinder.getByRole("button", { name: "Next photo" }).focus();
  await page.keyboard.press("Space");
  await expect(viewfinder).toContainText(`Photo 2 of ${photos.length}`);
  await expect(viewfinder).toBeVisible();

  await viewfinder.getByRole("link").first().focus();
  await page.keyboard.press("Space");
  await expect(viewfinder).toBeVisible();

  await viewfinder.getByRole("button", { name: /close/i }).focus();
  await page.keyboard.press("Space");
  await expect(viewfinder).toBeHidden();
});

test("the darkroom Viewfinder shows the Analog gallery with the film each frame was shot on", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Fast-travel" }).click();
  await page.getByRole("navigation", { name: "Fast-travel" }).getByRole("button", { name: trail.title }).click();
  await page.getByRole("application", { name: /game/i }).focus();
  await walkRightUntilNear(page, darkroom.title);
  await page.keyboard.press("Space");

  const viewfinder = page.getByRole("dialog", { name: darkroom.title });
  await expect(viewfinder).toBeVisible();
  await expect(viewfinder.getByRole("img")).toHaveAccessibleName(darkroom.photos![0].alt);
  await expect(viewfinder).toContainText(darkroom.photos![0].caption!);
  await page.keyboard.press("ArrowLeft");
  await expect(viewfinder).toContainText(darkroom.photos!.at(-1)!.caption!);
  await expect(viewfinder.getByRole("link", { name: darkroom.links![0].label })).toHaveAttribute("href", darkroom.links![0].url);
});

test("the site serves a pixelated thumbnail for every photo on the Photography trail", async ({ request }) => {
  for (const { src } of trail.pointsOfInterest.flatMap((poi) => poi.photos ?? [])) {
    const thumbnail = src.replace(/_med_q80\.jpg$/i, "-thumb.png");
    const response = await request.get(`photos/${thumbnail}`);
    expect(response.status(), thumbnail).toBe(200);
    expect(response.headers()["content-type"], thumbnail).toContain("image/png");
  }
});

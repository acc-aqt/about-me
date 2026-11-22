import { expect, test, type Page } from "@playwright/test";
import { zoneById, type PointOfInterest } from "../src/content.ts";
import { facingStatus, fastTravel, openGame, tapKeys, tapsTo } from "./walk";

const trail = zoneById("photography-trail");
const norway = trail.pointsOfInterest.find((poi) => poi.id === "norway")!;
const jordan = trail.pointsOfInterest.find((poi) => poi.id === "jordan")!;
const darkroom = trail.pointsOfInterest.find((poi) => poi.id === "darkroom")!;
const photos = norway.photos!;

async function fastTravelAndFace(page: Page, poi: PointOfInterest) {
  const landing = await fastTravel(page, "photography-trail");
  await tapKeys(page, tapsTo(landing, poi.placement, { face: true }));
  await expect(page.getByRole("status")).toHaveText(facingStatus(poi.title), { timeout: 60_000 });
}

async function openNorwayViewfinder(page: Page) {
  await openGame(page);
  await fastTravelAndFace(page, norway);
  await page.keyboard.press("Space");
  const viewfinder = page.getByRole("dialog", { name: norway.title });
  await expect(viewfinder).toBeVisible();
  return viewfinder;
}

test("Fast-travel to the Photography trail lands where its path leaves the Hub, a short walk from Jordan", async ({ page }) => {
  await openGame(page);
  const landing = await fastTravel(page, "photography-trail");
  const taps = tapsTo(landing, jordan.placement, { face: true });
  expect(taps.length).toBeLessThanOrEqual(20);

  await tapKeys(page, taps);
  await expect(page.getByRole("status")).toHaveText(facingStatus(jordan.title));
});

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

test("the darkroom Viewfinder at the end of the trail shows the Analog gallery with the film each frame was shot on", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await openGame(page);
  await fastTravelAndFace(page, darkroom);
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

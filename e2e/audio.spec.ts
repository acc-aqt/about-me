import { expect, test, type Page } from "@playwright/test";
import { ARROW_KEYS, facingStatus, fastTravel, tapDpad, tapKeys } from "./walk";
import type { Direction } from "../src/overworld.ts";

type AudioLog = { tones: number; samples: number };

declare global {
  interface Window {
    audioLog: AudioLog;
  }
}

async function recordAudio(page: Page) {
  await page.addInitScript(() => {
    window.audioLog = { tones: 0, samples: 0 };
    const startTone = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...args) {
      window.audioLog.tones++;
      return startTone.apply(this, args);
    };
    const startSample = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      window.audioLog.samples++;
      return startSample.apply(this, args);
    };
  });
}

const audioLog = (page: Page) => page.evaluate(() => ({ ...window.audioLog }));

async function openGame(page: Page) {
  await recordAudio(page);
  await page.goto("./");
  await expect(page.getByRole("status")).toContainText("Face a sign");
}

test("sound is muted on load with a visible toggle", async ({ page }) => {
  await openGame(page);

  const toggle = page.getByRole("button", { name: "Sound" });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");

  await page.waitForTimeout(500);
  expect(await audioLog(page)).toEqual({ tones: 0, samples: 0 });
});

test("the toggle turns the music on and off", async ({ page }) => {
  await openGame(page);
  const toggle = page.getByRole("button", { name: "Sound" });

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await audioLog(page)).tones).toBeGreaterThan(0);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  const tonesWhenMuted = (await audioLog(page)).tones;
  await page.waitForTimeout(1000);
  expect((await audioLog(page)).tones).toBe(tonesWhenMuted);
});

async function fireShutterAtMtu(page: Page, isMobile: boolean) {
  await page.getByRole("application", { name: /game/i }).focus();
  await fastTravel(page, "career-road");
  await expect(page.getByRole("status")).toHaveText(facingStatus("MTU Aero Engines"));
  if (isMobile) await page.getByRole("button", { name: "Shutter" }).tap();
  else await page.keyboard.press("Space");
  await expect(page.getByRole("dialog", { name: "MTU Aero Engines" })).toBeVisible();
}

test("the Shutter plays its sound when sound is on", async ({ page, isMobile }) => {
  await openGame(page);
  await page.getByRole("button", { name: "Sound" }).click();

  await fireShutterAtMtu(page, isMobile);
  await expect.poll(async () => (await audioLog(page)).samples).toBeGreaterThan(0);
});

test("the Shutter stays silent while muted", async ({ page, isMobile }) => {
  await openGame(page);

  await fireShutterAtMtu(page, isMobile);
  expect(await audioLog(page)).toEqual({ tones: 0, samples: 0 });
});

async function walk(page: Page, isMobile: boolean, taps: Direction[]) {
  if (isMobile) await tapDpad(page, taps);
  else await tapKeys(page, taps);
}

async function turnSoundOn(page: Page) {
  await page.getByRole("button", { name: "Sound" }).click();
  await page.getByRole("application", { name: /game/i }).focus();
}

test("each completed step plays a footstep", async ({ page, isMobile }) => {
  await openGame(page);
  await turnSoundOn(page);

  // The Player spawns facing down with open ground below.
  await walk(page, isMobile, ["down", "down", "down"]);
  await expect.poll(async () => (await audioLog(page)).samples).toBe(3);
});

test("a blocked step plays a bump and leaves the Player in place", async ({ page, isMobile }) => {
  await openGame(page);
  await turnSoundOn(page);
  await fastTravel(page, "career-road");
  await expect(page.getByRole("status")).toHaveText(facingStatus("MTU Aero Engines"));

  await walk(page, isMobile, ["up"]);
  await expect.poll(async () => (await audioLog(page)).samples).toBe(1);
  await expect(page.getByRole("status")).toHaveText(facingStatus("MTU Aero Engines"));
});

test("holding against a solid tile does not repeat the bump every frame", async ({ page, isMobile }) => {
  test.skip(isMobile, "Holding a key needs a keyboard");
  await openGame(page);
  await turnSoundOn(page);
  await fastTravel(page, "career-road");
  await expect(page.getByRole("status")).toHaveText(facingStatus("MTU Aero Engines"));

  await page.keyboard.down(ARROW_KEYS.up);
  await page.waitForTimeout(1000);
  await page.keyboard.up(ARROW_KEYS.up);
  const { samples } = await audioLog(page);
  expect(samples).toBeGreaterThanOrEqual(1);
  expect(samples).toBeLessThanOrEqual(3);
});

test("muting silences footsteps and bumps", async ({ page, isMobile }) => {
  await openGame(page);
  await page.getByRole("application", { name: /game/i }).focus();

  await walk(page, isMobile, ["down", "down"]);
  const landing = await fastTravel(page, "career-road");
  await expect(page.getByRole("status")).toHaveText(facingStatus("MTU Aero Engines"));
  await walk(page, isMobile, [landing.facing]);
  await page.waitForTimeout(500);
  expect(await audioLog(page)).toEqual({ tones: 0, samples: 0 });
});

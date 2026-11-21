import { expect, test, type Page } from "@playwright/test";

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
  await expect(page.getByRole("status")).toContainText("Press Space near a sign");
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

async function walkRightUntilNear(page: Page, title: string) {
  const status = page.getByRole("status");
  for (let step = 0; step < 100; step++) {
    if ((await status.textContent())?.includes(title)) return;
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(100);
    await page.keyboard.up("ArrowRight");
  }
  throw new Error(`Never got near ${title}`);
}

async function fireShutterAtMtu(page: Page) {
  await page.getByRole("application", { name: /game/i }).focus();
  await walkRightUntilNear(page, "MTU Aero Engines");
  await page.keyboard.press("Space");
  await expect(page.getByRole("dialog", { name: "MTU Aero Engines" })).toBeVisible();
}

test("the Shutter plays its sound when sound is on", async ({ page, isMobile }) => {
  test.skip(isMobile, "On-screen buttons for phones arrive in a later ticket");
  await openGame(page);
  await page.getByRole("button", { name: "Sound" }).click();

  await fireShutterAtMtu(page);
  await expect.poll(async () => (await audioLog(page)).samples).toBeGreaterThan(0);
});

test("the Shutter stays silent while muted", async ({ page, isMobile }) => {
  test.skip(isMobile, "On-screen buttons for phones arrive in a later ticket");
  await openGame(page);

  await fireShutterAtMtu(page);
  expect(await audioLog(page)).toEqual({ tones: 0, samples: 0 });
});

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp, { type Sharp } from "sharp";
import { content, type Photo } from "../src/content.ts";
import { PHOTO_SOURCE_COMMIT, photoPaths, photoSourceUrl } from "../src/photos.ts";

const ROOT = join(import.meta.dirname, "..");
const CACHE_DIR = join(ROOT, ".cache", "photos", PHOTO_SOURCE_COMMIT);
const OUTPUT_DIR = join(ROOT, "public");
const FULL_LONG_EDGE = 1600;
const THUMB_LONG_EDGE = 24;
const FETCH_ATTEMPTS = 3;

async function fetchWithRetry(url: string): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (attempt >= FETCH_ATTEMPTS) throw new Error(`Could not fetch ${url}: ${error}`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

async function loadSource(photo: Photo): Promise<Buffer> {
  const cached = join(CACHE_DIR, photo.src);
  if (existsSync(cached)) return readFile(cached);
  const source = await fetchWithRetry(photoSourceUrl(photo));
  await mkdir(dirname(cached), { recursive: true });
  await writeFile(cached, source);
  return source;
}

async function writeImage(path: string, image: Sharp) {
  await mkdir(dirname(path), { recursive: true });
  await image.toFile(path);
}

async function buildPhoto(photo: Photo): Promise<boolean> {
  const full = join(OUTPUT_DIR, photoPaths(photo).full);
  const thumb = join(OUTPUT_DIR, photoPaths(photo).thumb);
  if (existsSync(full) && existsSync(thumb)) return false;

  const source = await loadSource(photo);
  const fit = { fit: "inside", withoutEnlargement: true } as const;
  await writeImage(full, sharp(source).resize(FULL_LONG_EDGE, FULL_LONG_EDGE, fit).webp({ quality: 80 }));
  await writeImage(thumb, sharp(source).resize(THUMB_LONG_EDGE, THUMB_LONG_EDGE, fit).png());
  return true;
}

const photos = content.zones.flatMap((zone) => zone.pointsOfInterest).flatMap((poi) => poi.photos ?? []);
const built = await Promise.all(photos.map(buildPhoto));
console.log(`Photos: ${built.filter(Boolean).length} built, ${photos.length} total`);

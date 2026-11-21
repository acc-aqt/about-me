import type { Photo } from "./content.ts";

/** Pinned commit of acc-aqt/carrels-photography, so builds are reproducible and the download cache never goes stale. */
export const PHOTO_SOURCE_COMMIT = "4e7c308887bb9b8e08b85138462768fc923d6df1";

export function photoSourceUrl(photo: Photo): string {
  const [gallery, file] = photo.src.split("/");
  return `https://raw.githubusercontent.com/acc-aqt/carrels-photography/${PHOTO_SOURCE_COMMIT}/${gallery}/images/${file}`;
}

/** Paths of the derived images, relative to the site root (`public/` at build time, `BASE_URL` at runtime). */
export function photoPaths(photo: Photo): { full: string; thumb: string } {
  const stem = `photos/${photo.src.replace(/_med_q80\.jpg$/i, "")}`;
  return { full: `${stem}-full.webp`, thumb: `${stem}-thumb.png` };
}

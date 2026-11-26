import * as THREE from "three";
import { INK, LABEL_PLATE_COLOR, Pixels } from "./art";
import { LABEL_PADDING, namePlateLines } from "./namePlates";
import { PIXEL_FONT_CELL_HEIGHT, PIXEL_FONT_CELL_WIDTH, paintPixelText } from "./pixel-font";

/** World units per plate pixel, so a plate reads about as large as in 2D at the default camera distance. */
const WORLD_UNITS_PER_PIXEL = 0.028;
/** Each plate pixel is drawn this many texels wide, so it stays crisp when filtered. */
const TEXELS_PER_PIXEL = 4;

function paintPlate(text: string) {
  const lines = namePlateLines(text);
  const width = Math.max(...lines.map((line) => line.length)) * PIXEL_FONT_CELL_WIDTH + LABEL_PADDING * 2;
  const height = lines.length * PIXEL_FONT_CELL_HEIGHT + LABEL_PADDING * 2;
  const pixels = new Pixels(width, height);
  pixels.rect(0, 0, width, height, LABEL_PLATE_COLOR);
  lines.forEach((line, index) => {
    const x = Math.floor((width - line.length * PIXEL_FONT_CELL_WIDTH) / 2);
    paintPixelText(pixels, line, x, LABEL_PADDING + 1 + index * PIXEL_FONT_CELL_HEIGHT, INK);
  });
  const scaled = document.createElement("canvas");
  scaled.width = width * TEXELS_PER_PIXEL;
  scaled.height = height * TEXELS_PER_PIXEL;
  const context = scaled.getContext("2d")!;
  context.imageSmoothingEnabled = false;
  context.drawImage(pixels.canvas, 0, 0, scaled.width, scaled.height);
  return { canvas: scaled, width, height };
}

/**
 * A Name plate in the pixel font that always faces the camera. Its bottom centre sits at the sprite's position, so
 * add it to any object (a Point of Interest, a Signpost, a wandering Cat) and set `position.y` to float it on top.
 * Plates draw over the scenery so trees never hide them.
 */
export function createNamePlate(text: string): THREE.Sprite {
  const { canvas, width, height } = paintPlate(text);
  return createPixelSprite(canvas, { width: width * WORLD_UNITS_PER_PIXEL, height: height * WORLD_UNITS_PER_PIXEL }, { opacity: 0.9 });
}

type PixelSpriteOptions = { opacity?: number; minFilter?: THREE.MinificationTextureFilter };

/**
 * A camera-facing sprite of pixel art, sized in world units, with its bottom centre at its position. It draws over the
 * scenery and ignores the fog, like the 2D game's labels.
 */
export function createPixelSprite(
  canvas: HTMLCanvasElement,
  { width, height }: { width: number; height: number },
  { opacity = 1, minFilter }: PixelSpriteOptions = {},
): THREE.Sprite {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  if (minFilter) texture.minFilter = minFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, opacity, transparent: true, depthTest: false, fog: false }));
  sprite.center.set(0.5, 0);
  sprite.scale.set(width, height, 1);
  sprite.renderOrder = 1;
  return sprite;
}

export function disposePixelSprite(sprite: THREE.Sprite) {
  sprite.material.map?.dispose();
  sprite.material.dispose();
}

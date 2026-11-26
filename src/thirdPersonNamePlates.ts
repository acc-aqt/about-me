import * as THREE from "three";
import { INK, Pixels } from "./art";
import { LABEL_PLATE_COLOR } from "./game";
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
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  const material = new THREE.SpriteMaterial({ map: texture, opacity: 0.9, transparent: true, depthTest: false, fog: false });
  const plate = new THREE.Sprite(material);
  plate.center.set(0.5, 0);
  plate.scale.set(width * WORLD_UNITS_PER_PIXEL, height * WORLD_UNITS_PER_PIXEL, 1);
  plate.renderOrder = 1;
  return plate;
}

export function disposeNamePlate(plate: THREE.Sprite) {
  plate.material.map?.dispose();
  plate.material.dispose();
}

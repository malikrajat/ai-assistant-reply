// Generate the extension icons without a browser or native image dependency.
// Draws a rounded gradient tile, a white lens, and a red capture dot at 4x then
// box-filters down to the four sizes Chrome asks for.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pngjs from 'pngjs';

const { PNG } = pngjs;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = join(root, 'public', 'icons');
mkdirSync(outputDir, { recursive: true });

const SIZES = [16, 32, 48, 128];
const SUPERSAMPLE = 4;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function roundedRectAlpha(x, y, size, radius) {
  const left = radius;
  const right = size - radius;
  const top = radius;
  const bottom = size - radius;
  let dx = 0;
  let dy = 0;
  if (x < left) dx = left - x;
  else if (x > right) dx = x - right;
  if (y < top) dy = top - y;
  else if (y > bottom) dy = y - bottom;
  const distance = Math.hypot(dx, dy);
  return clamp(radius - distance + 0.5);
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  let t = lengthSquared === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lengthSquared;
  t = clamp(t);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function renderLarge(size) {
  const large = size * SUPERSAMPLE;
  const pixels = new Uint8ClampedArray(large * large * 4);
  const radius = large * 0.23;
  const centerX = large * 0.44;
  const centerY = large * 0.45;
  const ringRadius = large * 0.215;
  const ringWidth = large * 0.075;
  const handleStart = { x: large * 0.6, y: large * 0.61 };
  const handleEnd = { x: large * 0.78, y: large * 0.79 };
  const dot = { x: large * 0.72, y: large * 0.25, r: large * 0.075 };

  for (let y = 0; y < large; y += 1) {
    for (let x = 0; x < large; x += 1) {
      const index = (y * large + x) * 4;
      const alpha = roundedRectAlpha(x, y, large, radius);
      if (alpha <= 0) {
        pixels[index + 3] = 0;
        continue;
      }
      const gradient = clamp((x / large) * 0.65 + (y / large) * 0.35);
      const background = mix([79, 70, 229], [14, 165, 233], gradient);

      // Lens ring.
      const ringDistance = Math.abs(Math.hypot(x - centerX, y - centerY) - ringRadius);
      const ringAlpha = clamp(ringWidth / 2 - ringDistance + 0.5);
      // Handle.
      const handleDistance = distanceToSegment(
        x,
        y,
        handleStart.x,
        handleStart.y,
        handleEnd.x,
        handleEnd.y,
      );
      const handleAlpha = clamp(ringWidth * 0.42 - handleDistance + 0.5);
      const white = Math.max(ringAlpha, handleAlpha);

      // Red capture dot with a thin white separation ring.
      const dotDistance = Math.hypot(x - dot.x, y - dot.y);
      const dotRing = clamp(large * 0.014 - Math.abs(dotDistance - dot.r) + 0.5);
      const dotAlpha = clamp(dot.r - dotDistance + 0.5);

      let color = background;
      if (dotRing > 0) color = mix(color, [255, 255, 255], dotRing);
      if (dotAlpha > 0) color = mix(color, [248, 113, 113], dotAlpha);
      if (white > 0) color = mix(color, [255, 255, 255], white);

      pixels[index] = color[0];
      pixels[index + 1] = color[1];
      pixels[index + 2] = color[2];
      pixels[index + 3] = Math.round(alpha * 255);
    }
  }
  return { pixels, large };
}

function downsample(pixels, large, size) {
  const png = new PNG({ width: size, height: size });
  const scale = large / size;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let count = 0;
      for (let sy = 0; sy < scale; sy += 1) {
        for (let sx = 0; sx < scale; sx += 1) {
          const sourceX = Math.floor(x * scale + sx);
          const sourceY = Math.floor(y * scale + sy);
          const index = (sourceY * large + sourceX) * 4;
          const alpha = pixels[index + 3] / 255;
          r += pixels[index] * alpha;
          g += pixels[index + 1] * alpha;
          b += pixels[index + 2] * alpha;
          a += pixels[index + 3];
          count += 1;
        }
      }
      const target = (y * size + x) * 4;
      const alpha = a / count;
      const normalizer = alpha === 0 ? 1 : alpha / 255;
      png.data[target] = Math.round(r / count / normalizer);
      png.data[target + 1] = Math.round(g / count / normalizer);
      png.data[target + 2] = Math.round(b / count / normalizer);
      png.data[target + 3] = Math.round(alpha);
    }
  }
  return PNG.sync.write(png);
}

const cache = new Map();
for (const size of SIZES) {
  if (!cache.has(size)) cache.set(size, renderLarge(size));
  const { pixels, large } = cache.get(size);
  writeFileSync(join(outputDir, `icon${size}.png`), downsample(pixels, large, size));
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Log Lens">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4f46e5"/>
      <stop offset="1" stop-color="#0ea5e9"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="29" fill="url(#g)"/>
  <circle cx="56" cy="58" r="27" fill="none" stroke="#fff" stroke-width="10"/>
  <path d="M77 79l18 18" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
  <circle cx="92" cy="32" r="9.5" fill="#f87171" stroke="#fff" stroke-width="3"/>
</svg>
`;
writeFileSync(join(outputDir, 'icon.svg'), svg);
console.log(`Generated ${SIZES.length} PNG icons and icon.svg in ${outputDir}`);

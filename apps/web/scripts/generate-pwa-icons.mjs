import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const publicDir = resolve(root, 'public');
const iconsDir = resolve(publicDir, 'icons');
const sourceSvg = resolve(iconsDir, 'icon.svg');

const BG = '#0b1120';

async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

async function renderPng(svgBuffer, size, outPath, { padding = 0, background = BG } = {}) {
  const inner = size - padding * 2;
  const resized = await sharp(svgBuffer)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: resized, top: padding, left: padding }])
    .png();

  await canvas.toFile(outPath);
  console.log(`  generated ${outPath} (${size}x${size})`);
}

async function main() {
  await ensureDir(iconsDir);
  const svgBuffer = await readFile(sourceSvg);

  console.log('Generating PWA icons from', sourceSvg);

  await renderPng(svgBuffer, 192, resolve(iconsDir, 'icon-192.png'));
  await renderPng(svgBuffer, 512, resolve(iconsDir, 'icon-512.png'));
  await renderPng(svgBuffer, 512, resolve(iconsDir, 'maskable-512.png'), { padding: 51 });
  await renderPng(svgBuffer, 180, resolve(iconsDir, 'apple-touch-icon.png'));
  await renderPng(svgBuffer, 32, resolve(publicDir, 'favicon-32.png'));
  await renderPng(svgBuffer, 16, resolve(publicDir, 'favicon-16.png'));

  await writeFile(resolve(publicDir, 'favicon.svg'), svgBuffer);
  console.log('  copied icon.svg → public/favicon.svg');

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

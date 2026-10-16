import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT_DIR = process.cwd();
const SVG_PATH = path.join(ROOT_DIR, 'public', 'icon.svg');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

async function generateIcons() {
  const svgBuffer = fs.readFileSync(SVG_PATH);

  const targets = [
    { name: 'apple-touch-icon-180x180.png', size: 180 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'pwa-192x192.png', size: 192 },
    { name: 'pwa-512x512.png', size: 512 },
    { name: 'pwa-maskable-512x512.png', size: 512 },
  ];

  for (const target of targets) {
    const outputPath = path.join(PUBLIC_DIR, target.name);
    await sharp(svgBuffer)
      .resize(target.size, target.size)
      .png({ quality: 100 })
      .toFile(outputPath);
    console.log(`Generated ${target.name} (${target.size}x${target.size})`);
  }
}

generateIcons().catch((err) => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});

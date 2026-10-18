import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
const svgPath = path.join(publicDir, 'icon.svg');

async function generateIcons() {
  if (!fs.existsSync(svgPath)) {
    console.error('icon.svg tidak ditemukan di folder public');
    return;
  }

  const svgBuffer = fs.readFileSync(svgPath);

  const targets = [
    { name: 'apple-touch-icon-180x180.png', size: 180 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'pwa-192x192.png', size: 192 },
    { name: 'pwa-512x512.png', size: 512 },
    { name: 'pwa-maskable-512x512.png', size: 512 },
  ];

  for (const target of targets) {
    const outPath = path.join(publicDir, target.name);
    await sharp(svgBuffer)
      .resize(target.size, target.size)
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    console.log(`Generated ${target.name} (${target.size}x${target.size})`);
  }
}

generateIcons().catch((err) => {
  console.error('Gagal membuat ikon PNG:', err);
});

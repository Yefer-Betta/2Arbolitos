import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SOURCE = 'logo/logo 1.png';
const OUT_DIR = 'build';
const PUBLIC_DIR = 'public';

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function main() {
  const meta = await sharp(SOURCE).metadata();
  console.log(`Source: ${meta.width}x${meta.height}`);

  const sourceBuf = fs.readFileSync(SOURCE);

  const squareSize = Math.min(meta.width, meta.height);
  const left = Math.floor((meta.width - squareSize) / 2);
  const top = Math.floor((meta.height - squareSize) / 2);
  console.log(`Cropping square: ${squareSize}x${squareSize} from (${left},${top})`);

  const square = await sharp(sourceBuf)
    .extract({ left, top, width: squareSize, height: squareSize })
    .toBuffer();

  const treeCrop = await sharp(sourceBuf)
    .extract({ left: 0, top: 0, width: meta.width, height: meta.height - 80 })
    .toBuffer();
  const treeMeta = await sharp(treeCrop).metadata();

  const treeSquare = await sharp(treeCrop)
    .resize({ width: 1024, height: 1024, fit: 'cover', position: 'center' })
    .toBuffer();
  await sharp(treeSquare).toFile(path.join(OUT_DIR, 'icon.png'));
  await sharp(treeSquare).toFile(path.join(PUBLIC_DIR, 'icon.png'));
  console.log('Wrote icon.png (1024x1024)');

  const sizes = [16, 24, 32, 48, 64, 128, 256];
  for (const sz of sizes) {
    await sharp(treeSquare)
      .resize({ width: sz, height: sz, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(OUT_DIR, `icon-${sz}.png`));
  }
  console.log('Wrote icon-N.png for sizes:', sizes);

  await sharp(treeSquare)
    .resize({ width: 192, height: 192, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(path.join(PUBLIC_DIR, 'pwa-192x192.png'));
  await sharp(treeSquare)
    .resize({ width: 512, height: 512, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(path.join(PUBLIC_DIR, 'pwa-512x512.png'));
  console.log('Wrote pwa-192x192.png and pwa-512x512.png');

  await sharp(treeSquare)
    .resize({ width: 64, height: 64, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(OUT_DIR, 'tray.png'));
  console.log('Wrote tray.png (64x64)');

  await sharp(treeSquare)
    .resize({ width: 256, height: 256, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(OUT_DIR, 'icon-256.png'));

  const png256 = fs.readFileSync(path.join(OUT_DIR, 'icon-256.png'));
  const ico = await import('to-ico').catch(() => null);
  if (ico && ico.default) {
    const icoBuf = await ico.default([
      fs.readFileSync(path.join(OUT_DIR, 'icon-16.png')),
      fs.readFileSync(path.join(OUT_DIR, 'icon-32.png')),
      fs.readFileSync(path.join(OUT_DIR, 'icon-48.png')),
      fs.readFileSync(path.join(OUT_DIR, 'icon-64.png')),
      fs.readFileSync(path.join(OUT_DIR, 'icon-128.png')),
      fs.readFileSync(path.join(OUT_DIR, 'icon-256.png')),
    ]);
    fs.writeFileSync(path.join(OUT_DIR, 'icon.ico'), icoBuf);
    console.log('Wrote icon.ico');
  } else {
    console.log('to-ico not available, skipping .ico generation');
  }
}

main().catch(err => { console.error(err); process.exit(1); });

import sharp from 'sharp';
import fs from 'fs';

const SOURCE = 'logo/logo 1.png';
const OUT_LIGHT = 'public/logo-light.png';
const OUT_DARK = 'public/logo-dark.png';

async function main() {
  const buf = fs.readFileSync(SOURCE);
  const meta = await sharp(buf).metadata();
  console.log(`Source: ${meta.width}x${meta.height}`);

  const lightBuf = await sharp(buf)
    .resize({ width: 1408, withoutEnlargement: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data, info } = lightBuf;
  const w = info.width, h = info.height, ch = info.channels;

  const out = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const r = data[i*ch], g = data[i*ch+1], b = data[i*ch+2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    const creamDistance = Math.sqrt((r-250)*(r-250) + (g-245)*(g-245) + (b-235)*(b-235));
    const isBackground = creamDistance < 40 || luminance > 240;

    if (isBackground) {
      out[i*4] = 0;
      out[i*4+1] = 0;
      out[i*4+2] = 0;
      out[i*4+3] = 0;
    } else {
      out[i*4] = 255;
      out[i*4+1] = 255;
      out[i*4+2] = 255;
      out[i*4+3] = 255;
    }
  }
  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile(OUT_LIGHT);
  console.log('Wrote', OUT_LIGHT);

  const darkBuf = await sharp(buf)
    .resize({ width: 1408, withoutEnlargement: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const dd = darkBuf.data;
  const out2 = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const r = dd[i*ch], g = dd[i*ch+1], b = dd[i*ch+2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    const creamDistance = Math.sqrt((r-250)*(r-250) + (g-245)*(g-245) + (b-235)*(b-235));
    const isBackground = creamDistance < 40 || luminance > 240;

    if (isBackground) {
      out2[i*4] = 0;
      out2[i*4+1] = 0;
      out2[i*4+2] = 0;
      out2[i*4+3] = 0;
    } else {
      const tinted = { r: 26, g: 77, b: 46 };
      out2[i*4] = tinted.r;
      out2[i*4+1] = tinted.g;
      out2[i*4+2] = tinted.b;
      out2[i*4+3] = 255;
    }
  }
  await sharp(out2, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toFile(OUT_DARK);
  console.log('Wrote', OUT_DARK);
}

main().catch(err => { console.error(err); process.exit(1); });

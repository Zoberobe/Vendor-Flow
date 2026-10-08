import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const root = new URL('../../docs/', import.meta.url);
const names = ['login.png', 'dashboard.png', 'suppliers-filtered.png', 'status-history.png'];
const width = 640;
const height = 512;
const frames = await Promise.all(names.map(async (name) => {
  const png = await readFile(new URL(`screenshots/${name}`, root));
  return sharp(png).resize(width, height, { fit: 'contain', background: '#f7f8fa' })
    .ensureAlpha().raw().toBuffer();
}));
const gif = await sharp(Buffer.concat(frames), {
  raw: { width, height: height * frames.length, pageHeight: height, channels: 4 },
  animated: true,
}).gif({ delay: 1800, loop: 0 }).toBuffer();
await writeFile(new URL('demo.gif', root), gif);

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'icons');
mkdirSync(outDir, { recursive: true });

const BG = [0x5b, 0x4b, 0xff];
const BOLT = [0xff, 0xd4, 0x00];

const POLY = [
  [0.55, 0.08],
  [0.22, 0.55],
  [0.43, 0.55],
  [0.30, 0.94],
  [0.78, 0.40],
  [0.55, 0.40],
  [0.66, 0.08],
];

function inside(x, y) {
  let on = false;
  for (let i = 0, j = POLY.length - 1; i < POLY.length; j = i++) {
    const [xi, yi] = POLY[i];
    const [xj, yj] = POLY[j];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) on = !on;
  }
  return on;
}

function crc32(buf) {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function makePNG(size) {
  const ss = 4;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const rowBytes = 1 + size * 3;
  const raw = Buffer.alloc(rowBytes * size);

  for (let py = 0; py < size; py++) {
    raw[py * rowBytes] = 0;
    for (let px = 0; px < size; px++) {
      let hits = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const u = (px + (sx + 0.5) / ss) / size;
          const v = (py + (sy + 0.5) / ss) / size;
          if (inside(u, v)) hits++;
        }
      }
      const a = hits / (ss * ss);
      const r = Math.round(BG[0] * (1 - a) + BOLT[0] * a);
      const g = Math.round(BG[1] * (1 - a) + BOLT[1] * a);
      const b = Math.round(BG[2] * (1 - a) + BOLT[2] * a);
      const off = py * rowBytes + 1 + px * 3;
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b;
    }
  }

  const idat = deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

for (const size of [16, 48, 128]) {
  const png = makePNG(size);
  writeFileSync(resolve(outDir, `${size}.png`), png);
  console.log(`wrote icons/${size}.png (${png.length} bytes)`);
}

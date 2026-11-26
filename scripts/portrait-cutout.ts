// The Home photo (photo-align-cutout): the owner's portrait with its grey studio backdrop keyed out,
// so the page can sit it on the warm tint (`--warm`) with CSS.
//
//   pnpm exec tsx scripts/portrait-cutout.ts
//
// Reads only the committed stripped web master src/assets/profile/photo.jpg (600x894), never the
// original photo, and writes src/assets/profile/photo-cutout.png (600x894 RGBA). The earlier version
// keyed avatar.jpg into avatar-cutout.png (home-alt-6, v6.11-v6.19); that file stays on disk, unused.
// Nothing is drawn or generated: every kept pixel is from the photo, only its alpha is computed. The
// keying runs in Chromium's canvas (the recipe the Wall mock was approved with):
//   1. the backdrop colour is the median of samples along the top edge and the upper 45% of the
//      sides (the shirt fills the bottom);
//   2. a flood fill from the edges takes every pixel that is grey like it (distance below T);
//   2b. enclosed grey regions of 20+ pixels (the gap between sleeve and arm) go too;
//   3. the edge is pulled in by three pixels (no grey fringe) and softened by two box blurs;
//   4. alpha is scaled by 1.15 so the person stays fully opaque.
// sharp re-encodes the PNG (it attaches no EXIF/ICC) and libvips' pHYs chunk is dropped, so the file
// carries image chunks only. Gates (nothing is written when one fails):
//   - the kept person is 35-75% of the frame (the approved run kept about 43% of this photo);
//   - 10 backdrop probes (corners, upper sides, above the head, lower sides, the sleeve-arm gap) are
//     fully transparent;
//   - 3 person probes (face, torso, hair) are fully opaque;
//   - the kept person (alpha > 0.5) touches neither the left, right nor top edge (the shirt is cut by
//     the photo's own bottom edge, so the bottom may touch);
//   - halo: in the partly transparent edge band, at most 3% of the alpha weight sits on pixels whose
//     own colour is still within 1.5 T of the backdrop grey.
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { imageChunksOnly } from './lib/png';
import { loadSharp } from './lib/sharp';

const PHOTO = 'src/assets/profile/photo.jpg';
const OUT = 'src/assets/profile/photo-cutout.png';
const SIZE = { width: 600, height: 894 };
const KEPT = { min: 0.35, max: 0.75 };
const HALO_MAX = 0.03;
/** Normalised probe points: backdrop must be alpha 0, person alpha 255. */
const BACKDROP_PROBES = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
  [0.05, 0.3],
  [0.95, 0.3],
  [0.5, 0.03],
  [0.1, 0.95],
  [0.9, 0.95],
  [159 / 599, 622 / 893], // the gap between the left sleeve and arm
];
const PERSON_PROBES = [
  [0.5, 0.25],
  [0.5, 0.7],
  [0.45, 0.13],
];

/** The keying constants (see the header). */
const KEY = {
  T: 26,
  light: 0.55,
  chroma: 2.2,
  erode: 3,
  blur: 2,
  gain: 1.15,
  sides: 0.45,
  pocket: 20,
};

async function main() {
  const photo = `data:image/jpeg;base64,${(await readFile(PHOTO)).toString('base64')}`;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    // tsx (esbuild keepNames) wraps the named helpers below in `__name(...)`, which the page lacks.
    await page.evaluate('globalThis.__name = (f) => f');
    const out = await page.evaluate(
      async ({ url, key, backdropProbes, personProbes }) => {
        const img = new Image();
        img.src = url;
        await img.decode();
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const g = c.getContext('2d')!;
        g.drawImage(img, 0, 0);
        const im = g.getImageData(0, 0, w, h);
        const d = im.data;
        const at = (x: number, y: number) => (y * w + x) * 4;

        // 1. Backdrop colour: the top edge and the upper sides.
        const samples: number[] = [];
        for (let x = 0; x < w; x += 4) samples.push(at(x, 2));
        for (let y = 0; y < h * key.sides; y += 4) samples.push(at(2, y), at(w - 3, y));
        const mid = [0, 1, 2].map((k) => {
          const v = samples.map((i) => d[i + k]).sort((a, b) => a - b);
          return v[v.length >> 1];
        });

        // 2. A pixel is backdrop when it is grey like the samples (low chroma, similar lightness).
        const distance = (i: number) => {
          const dr = d[i] - mid[0];
          const dg = d[i + 1] - mid[1];
          const db = d[i + 2] - mid[2];
          const light = (dr + dg + db) / 3;
          const chroma = Math.max(Math.abs(dr - light), Math.abs(dg - light), Math.abs(db - light));
          return Math.abs(light) * key.light + chroma * key.chroma;
        };
        const bg = new Uint8Array(w * h);
        const stack: number[] = [];
        const push = (x: number, y: number) => {
          if (x < 0 || y < 0 || x >= w || y >= h) return;
          const p = y * w + x;
          if (bg[p]) return;
          if (distance(p * 4) > key.T) return;
          bg[p] = 1;
          stack.push(p);
        };
        for (let x = 0; x < w; x++) push(x, 0);
        for (let y = 0; y < h; y++) {
          push(0, y);
          push(w - 1, y);
        }
        while (stack.length) {
          const p = stack.pop()!;
          const x = p % w;
          const y = (p - x) / w;
          push(x + 1, y);
          push(x - 1, y);
          push(x, y + 1);
          push(x, y - 1);
        }

        // 2b. Backdrop seen through a gap (between the sleeve and the arm) is enclosed, so the fill
        // from the edges never reaches it. Take every enclosed grey region of key.pocket pixels or more;
        // single grey-ish pixels in the skin and shirt are smaller and stay.
        const seen = new Uint8Array(w * h);
        for (let s0 = 0; s0 < w * h; s0++) {
          if (bg[s0] || seen[s0] || distance(s0 * 4) > key.T) continue;
          const region = [s0];
          seen[s0] = 1;
          for (let k = 0; k < region.length; k++) {
            const x = region[k] % w;
            const y = (region[k] - x) / w;
            for (const [nx, ny] of [
              [x + 1, y],
              [x - 1, y],
              [x, y + 1],
              [x, y - 1],
            ]) {
              if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
              const q = ny * w + nx;
              if (bg[q] || seen[q] || distance(q * 4) > key.T) continue;
              seen[q] = 1;
              region.push(q);
            }
          }
          if (region.length >= key.pocket) for (const q of region) bg[q] = 1;
        }

        // 3. Alpha: 0 on the backdrop, 1 on the person; eroded, then softened over about 2px.
        let a = new Float32Array(w * h);
        for (let p = 0; p < w * h; p++) a[p] = bg[p] ? 0 : 1;
        const blur = (src: Float32Array) => {
          const o = new Float32Array(w * h);
          for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
              let s = 0;
              let n = 0;
              for (let j = -1; j <= 1; j++)
                for (let i = -1; i <= 1; i++) {
                  const xx = x + i;
                  const yy = y + j;
                  if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
                  s += src[yy * w + xx];
                  n++;
                }
              o[y * w + x] = s / n;
            }
          return o;
        };
        const erode = (src: Float32Array) => {
          const o = new Float32Array(w * h);
          for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
              let m = 1;
              for (let j = -1; j <= 1; j++)
                for (let i = -1; i <= 1; i++) {
                  const xx = Math.min(w - 1, Math.max(0, x + i));
                  const yy = Math.min(h - 1, Math.max(0, y + j));
                  m = Math.min(m, src[yy * w + xx]);
                }
              o[y * w + x] = m;
            }
          return o;
        };
        for (let k = 0; k < key.erode; k++) a = erode(a);
        for (let k = 0; k < key.blur; k++) a = blur(a);

        // 4. Write the alpha; the colour channels stay the photo's own.
        for (let p = 0; p < w * h; p++)
          d[p * 4 + 3] = Math.round(Math.min(1, a[p] * key.gain) * 255);
        g.putImageData(im, 0, 0);
        const kept = a.reduce((s, v) => s + (v > 0.5 ? 1 : 0), 0) / (w * h);

        // Gates' measurements, read from the alpha written above.
        const alphaAt = (nx: number, ny: number) =>
          d[at(Math.round(nx * (w - 1)), Math.round(ny * (h - 1))) + 3];
        const bgAlpha = backdropProbes.map(([x, y]) => alphaAt(x, y));
        const personAlpha = personProbes.map(([x, y]) => alphaAt(x, y));
        let minX = w;
        let maxX = -1;
        let minY = h;
        let maxY = -1;
        let band = 0;
        let grey = 0;
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const i = at(x, y);
            const al = d[i + 3] / 255;
            if (al > 0.5) {
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
            }
            if (al > 0.08 && al < 0.92) {
              band += al;
              if (distance(i) <= 1.5 * key.T) grey += al;
            }
          }
        return {
          png: c.toDataURL('image/png'),
          w,
          h,
          mid,
          kept,
          bgAlpha,
          personAlpha,
          bbox: { minX, maxX, minY, maxY },
          halo: band ? grey / band : 0,
        };
      },
      { url: photo, key: KEY, backdropProbes: BACKDROP_PROBES, personProbes: PERSON_PROBES },
    );
    if (out.w !== SIZE.width || out.h !== SIZE.height)
      throw new Error(`photo.jpg is ${out.w}x${out.h}, not ${SIZE.width}x${SIZE.height}`);
    if (out.kept < KEPT.min || out.kept > KEPT.max)
      throw new Error(
        `kept ${(out.kept * 100).toFixed(1)}% of the frame, outside 35-75%; not written`,
      );
    if (out.bgAlpha.some((v) => v !== 0))
      throw new Error(`backdrop probes not transparent (${out.bgAlpha.join(',')}); not written`);
    if (out.personAlpha.some((v) => v !== 255))
      throw new Error(`person probes not opaque (${out.personAlpha.join(',')}); not written`);
    if (out.halo > HALO_MAX)
      throw new Error(`grey halo ${(out.halo * 100).toFixed(1)}% > 3%; not written`);
    if (out.bbox.minX <= 0 || out.bbox.maxX >= out.w - 1 || out.bbox.minY <= 0)
      throw new Error(
        `the person touches the left, right or top edge (${JSON.stringify(out.bbox)}); not written`,
      );
    const sharp = await loadSharp();
    const png = await sharp(Buffer.from(out.png.split(',')[1], 'base64'))
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();
    const file = imageChunksOnly(png);
    await writeFile(OUT, file);
    console.log(
      `${OUT}  ${out.w}x${out.h}  ${Math.round(file.length / 1024)} KB  backdrop rgb ${out.mid.join(',')}  person ${(out.kept * 100).toFixed(1)}%  halo ${(out.halo * 100).toFixed(1)}%  bbox ${out.bbox.minX},${out.bbox.minY}-${out.bbox.maxX},${out.bbox.maxY}`,
    );
  } finally {
    await browser.close();
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

// Brand images (photo-logo U1): byte-level proof that the committed crops of the owner's photo carry
// only image data. Pure Node allowlist walkers, no sharp, so this runs anywhere the repo does.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, sep } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { PNG_SIG, walkPng, type Walk } from './png-walk';

const AVATAR = 'src/assets/profile/avatar.jpg';
const APPLE = 'public/apple-touch-icon.png';
const FAVICON = 'public/favicon-48.png';
const OG = 'public/og-default.png';
// owner, profile-image-full: the whole photo, one stripped web master (the 848x1264 original is never committed).
const PHOTO = 'src/assets/profile/photo.jpg';
// owner, photo-align-cutout: new. The Home portrait is photo.jpg keyed onto transparency (no grey backdrop).
const PHOTO_CUTOUT = 'src/assets/profile/photo-cutout.png';
// The Home wall's page captures (home-alt-6): 1280x800 by design, pinned exactly by wall.test.ts.
const WALL_DIR = 'src/assets/wall' + sep; // the folder itself, not wall-x.png or wallpaper/

// JPEG: SOI, APP0 (JFIF), DQT, SOFn, DHT, DRI, SOS, RSTn, EOI. Anything else (APP1 EXIF/XMP,
// APP2 ICC, APP11 C2PA/JUMBF, APP13 IPTC, COM, ...) is metadata and fails.
const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const JPEG_ALLOWED = new Set([0xd8, 0xe0, 0xdb, 0xc4, 0xdd, 0xda, 0xd9, ...SOF]);
const isRst = (m: number) => m >= 0xd0 && m <= 0xd7;

// owner, photo-align-cutout: new. Decodes an 8-bit non-interlaced RGBA PNG (what sharp writes) to raw pixels.
function decodeRgba(b: Buffer): { width: number; height: number; data: Buffer } {
  const { width, height, colorType } = walkPng(b);
  if (colorType !== 6 || b[24] !== 8 || b[28] !== 0)
    throw new Error('not 8-bit non-interlaced RGBA');
  const idat: Buffer[] = [];
  for (let i = 8; i < b.length;) {
    const len = b.readUInt32BE(i);
    if (b.toString('latin1', i + 4, i + 8) === 'IDAT') idat.push(b.subarray(i + 8, i + 8 + len));
    i += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const data = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= 4 ? data[y * stride + x - 4] : 0;
      const up = y ? data[(y - 1) * stride + x] : 0;
      const c = x >= 4 && y ? data[(y - 1) * stride + x - 4] : 0;
      let pred = 0;
      if (f === 1) pred = a;
      else if (f === 2) pred = up;
      else if (f === 3) pred = (a + up) >> 1;
      else if (f === 4) {
        const p = a + up - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - c);
        pred = pa <= pb && pa <= pc ? a : pb <= pc ? up : c;
      }
      data[y * stride + x] = (v + pred) & 255;
    }
  }
  return { width, height, data };
}

function walkJpeg(b: Buffer): Walk {
  if (b[0] !== 0xff || b[1] !== 0xd8) throw new Error('not a JPEG (no SOI)');
  const markers = [0xd8];
  let foreignApp0 = false; // an APP0 that is not a plain 16-byte JFIF header (JFXX, thumbnail)
  let width = 0;
  let height = 0;
  let i = 2;
  let ended = false;
  while (i < b.length) {
    if (b[i] !== 0xff) throw new Error(`expected a marker at byte ${i}`);
    while (b[i] === 0xff) i++; // fill bytes
    const m = b[i++];
    markers.push(m);
    if (m === 0xd9) {
      ended = true;
      break;
    }
    if (isRst(m)) continue;
    const len = b.readUInt16BE(i);
    if (SOF.has(m)) {
      height = b.readUInt16BE(i + 3);
      width = b.readUInt16BE(i + 5);
    }
    // A JFIF APP0 is exactly 16 bytes; a longer one carries an uncompressed thumbnail (a pre-crop image).
    if (m === 0xe0 && (b.toString('latin1', i + 2, i + 7) !== 'JFIF\0' || len !== 16))
      foreignApp0 = true;
    i += len;
    if (m === 0xda) {
      // Entropy-coded data runs to the next marker that is not a stuffed 0xFF00 or an RSTn.
      while (i < b.length && !(b[i] === 0xff && b[i + 1] !== 0x00 && !isRst(b[i + 1]))) i++;
    }
  }
  if (!ended) throw new Error('no EOI');
  if (i !== b.length) throw new Error(`${b.length - i} trailing bytes after EOI`);
  const hex = (m: number) => 'FF' + m.toString(16).toUpperCase().padStart(2, '0');
  const segments = [...new Set(markers.map(hex))];
  const disallowed = [...new Set(markers.filter((m) => !JPEG_ALLOWED.has(m)).map(hex))];
  if (foreignApp0) disallowed.push('FFE0 (not JFIF)');
  return { width, height, segments, disallowed };
}

/** Splices one extra segment/chunk in, to prove the walkers catch what they are meant to. */
function withJpegSegment(b: Buffer, marker: number, payload: string): Buffer {
  const data = Buffer.from(payload, 'latin1');
  const seg = Buffer.alloc(4 + data.length);
  seg.writeUInt16BE(0xff00 | marker, 0);
  seg.writeUInt16BE(2 + data.length, 2);
  data.copy(seg, 4);
  return Buffer.concat([b.subarray(0, 2), seg, b.subarray(2)]);
}
function withPngChunk(b: Buffer, type: string, payload: string): Buffer {
  const data = Buffer.from(payload, 'latin1');
  const chunk = Buffer.alloc(12 + data.length); // CRC left zero: the walker does not check it
  chunk.writeUInt32BE(data.length, 0);
  chunk.write(type, 4, 'latin1');
  data.copy(chunk, 8);
  const afterIhdr = 8 + 12 + b.readUInt32BE(8);
  return Buffer.concat([b.subarray(0, afterIhdr), chunk, b.subarray(afterIhdr)]);
}

const read = (p: string) => readFileSync(p);

describe('brand images carry no metadata', () => {
  it('avatar.jpg: only image-data segments, 600x600, <= 100 KB', () => {
    const b = read(AVATAR);
    const w = walkJpeg(b);
    expect(w.disallowed, `segments: ${w.segments.join(' ')}`).toEqual([]);
    expect([w.width, w.height]).toEqual([600, 600]);
    expect(b.length).toBeLessThanOrEqual(100 * 1024);
  });

  it('apple-touch-icon.png: only image chunks, 180x180 opaque RGB, <= 40 KB', () => {
    const b = read(APPLE);
    const w = walkPng(b);
    expect(w.disallowed, `chunks: ${w.segments.join(' ')}`).toEqual([]);
    expect([w.width, w.height, w.colorType]).toEqual([180, 180, 2]);
    expect(b.length).toBeLessThanOrEqual(40 * 1024);
  });

  it('favicon-48.png: only image chunks, 48x48 RGBA, <= 8 KB', () => {
    const b = read(FAVICON);
    const w = walkPng(b);
    expect(w.disallowed, `chunks: ${w.segments.join(' ')}`).toEqual([]);
    expect([w.width, w.height, w.colorType]).toEqual([48, 48, 6]);
    expect(b.length).toBeLessThanOrEqual(8 * 1024);
  });

  it('og-default.png: only image chunks, 1200x630 opaque RGB, 60-500 KB (the photo card, not the old gradient)', () => {
    const b = read(OG);
    const w = walkPng(b);
    expect(w.disallowed, `chunks: ${w.segments.join(' ')}`).toEqual([]);
    expect([w.width, w.height, w.colorType]).toEqual([1200, 630, 2]);
    // The old plain gradient was 17,799 B; a card with the photo is several times that.
    expect(b.length).toBeGreaterThanOrEqual(60 * 1024);
    expect(b.length).toBeLessThanOrEqual(500 * 1024);
  });

  it('the walkers flag EXIF, XMP, ICC, IPTC, C2PA, COM and PNG text/ICC chunks', () => {
    const jpg = read(AVATAR);
    for (const [marker, name] of [
      [0xe1, 'FFE1'],
      [0xe2, 'FFE2'],
      [0xeb, 'FFEB'],
      [0xed, 'FFED'],
      [0xfe, 'FFFE'],
      [0xe0, 'FFE0 (not JFIF)'],
    ] as const) {
      expect(walkJpeg(withJpegSegment(jpg, marker, 'Exif\0\0GPS')).disallowed).toEqual([name]);
    }
    // A JFIF APP0 longer than the plain 16-byte header (a thumbnail), and a plain one that passes.
    const jfif = (extra: number) => 'JFIF\0\x01\x01\0\0\x01\0\x01\0\0' + '\0'.repeat(extra);
    expect(walkJpeg(withJpegSegment(jpg, 0xe0, jfif(0))).disallowed).toEqual([]);
    expect(walkJpeg(withJpegSegment(jpg, 0xe0, jfif(12))).disallowed).toEqual(['FFE0 (not JFIF)']);
    const png = read(FAVICON);
    for (const type of ['eXIf', 'iCCP', 'tEXt', 'iTXt', 'zTXt', 'tIME', 'gAMA', 'pHYs']) {
      expect(walkPng(withPngChunk(png, type, 'GPS')).disallowed).toEqual([type]);
    }
  });

  // owner, profile-image-full: new. The Home portrait shows the whole photo, so one 600x894 master is committed.
  it('photo.jpg: only image-data segments, 600x894 (the whole 848x1264 photo), <= 80 KB', () => {
    const b = read(PHOTO);
    const w = walkJpeg(b);
    expect(w.disallowed, `segments: ${w.segments.join(' ')}`).toEqual([]);
    expect([w.width, w.height]).toEqual([600, 894]);
    expect(Math.abs(894 / 600 - 1264 / 848)).toBeLessThanOrEqual(0.005);
    expect(b.length).toBeLessThanOrEqual(80 * 1024);
  });

  // owner, ci-unit-tests: avatar-cutout.png is unused and not committed, so it is no longer tested here.

  // owner, photo-align-cutout: new.
  it('photo-cutout.png: only image chunks, 600x894 RGBA (the keyed photo.jpg), <= 320 KB', () => {
    const b = read(PHOTO_CUTOUT);
    const w = walkPng(b);
    expect(w.disallowed, `chunks: ${w.segments.join(' ')}`).toEqual([]);
    expect([w.width, w.height, w.colorType]).toEqual([600, 894, 6]);
    expect(b.length).toBeLessThanOrEqual(320 * 1024);
  });

  // owner, photo-align-cutout: the cut-out must be edge-clean (decoded in pure Node, no sharp).
  it('photo-cutout.png: backdrop fully transparent, person opaque, whole person inside the frame, no grey halo', () => {
    const { width: w, height: h, data } = decodeRgba(read(PHOTO_CUTOUT));
    const px = (nx: number, ny: number) => {
      const i = (Math.min(h - 1, Math.round(ny * (h - 1))) * w + Math.round(nx * (w - 1))) * 4;
      return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
    };
    // Backdrop probes (corners, upper sides, above the head, lower sides beside the arms, the sleeve-arm gap): alpha 0.
    for (const [x, y] of [
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
    ])
      expect(px(x, y).a, `backdrop at ${x},${y}`).toBe(0);
    // Person probes (face, torso, hair): alpha 255.
    for (const [x, y] of [
      [0.5, 0.25],
      [0.5, 0.7],
      [0.45, 0.13],
    ])
      expect(px(x, y).a, `person at ${x},${y}`).toBe(255);
    // The kept person (alpha > 50%) touches neither the left, right nor top edge (the shirt may run off the bottom).
    let minX = w;
    let maxX = -1;
    let minY = h;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (data[(y * w + x) * 4 + 3] > 127) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
        }
    expect(minX, 'left edge').toBeGreaterThan(0);
    expect(maxX, 'right edge').toBeLessThan(w - 1);
    expect(minY, 'top edge').toBeGreaterThan(0);
    // Halo: in the partly transparent edge band, the pixels still the backdrop's grey (within 1.5 T of
    // rgb 163,160,167 by the keying distance) carry at most 3% of the band's alpha weight.
    const mid = [163, 160, 167];
    let band = 0;
    let grey = 0;
    for (let p = 0; p < w * h; p++) {
      const a = data[p * 4 + 3] / 255;
      if (a <= 0.08 || a >= 0.92) continue;
      band += a;
      const dr = data[p * 4] - mid[0];
      const dg = data[p * 4 + 1] - mid[1];
      const db = data[p * 4 + 2] - mid[2];
      const light = (dr + dg + db) / 3;
      const chroma = Math.max(Math.abs(dr - light), Math.abs(dg - light), Math.abs(db - light));
      if (Math.abs(light) * 0.55 + chroma * 2.2 <= 1.5 * 26) grey += a;
    }
    expect(band, 'edge band exists').toBeGreaterThan(0);
    expect(grey / band, 'grey share of the edge band').toBeLessThanOrEqual(0.03);
  });

  // owner, profile-image-full: was "no full-resolution copy of the photo is committed under src/assets/profile/".
  it('no full-resolution copy of the photo is committed under src/assets/profile/ (the whole photo only at 600 x 894)', () => {
    const files = readdirSync('src/assets/profile');
    expect(files.filter((f) => /^portrait/i.test(f))).toEqual([]);
    for (const f of files.filter((f) => /\.(jpe?g)$/i.test(f))) {
      const { width, height } = walkJpeg(read(join('src/assets/profile', f)));
      // owner, profile-image-full: was Math.max(width, height) <= 600; the whole-photo master is 600 x 894.
      expect(width, f).toBeLessThanOrEqual(600);
      expect(height, f).toBeLessThanOrEqual(894);
    }
    // The only non-JPEG is the cut-out, pinned by its own test above.
    // owner, ci-unit-tests: was ['avatar-cutout.png', 'photo-cutout.png']; avatar-cutout.png is unused and not committed.
    // It may still sit untracked on the owner's disk, so it is ignored here; any other new image fails.
    expect(
      files.filter((f) => /\.(png|webp|avif|heic|tiff?)$/i.test(f) && f !== 'avatar-cutout.png'),
    ).toEqual(['photo-cutout.png']);
  });

  it('no JPEG/WebP/PNG over 600px outside the share card and logos, and no HEIC/TIFF, in public/ or src/assets/', () => {
    const all = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? all(join(dir, e.name)) : [join(dir, e.name)],
      );
    const files = [...all('public'), ...all('src/assets')];
    expect(files.filter((f) => /\.(heic|heif|tiff?)$/i.test(f))).toEqual([]);
    // Judged by content, not extension. Logos are line art, not photos, so they may be large; the
    // wall captures are screenshots of the site's own pages, each pinned to 1280x800 by wall.test.ts.
    const longest = (b: Buffer): number => {
      if (b.subarray(0, 8).equals(PNG_SIG)) return Math.max(b.readUInt32BE(16), b.readUInt32BE(20));
      if (b[0] === 0xff && b[1] === 0xd8) {
        const { width, height } = walkJpeg(b);
        return Math.max(width, height);
      }
      if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') {
        const kind = b.toString('latin1', 12, 16);
        if (kind === 'VP8X') return Math.max(b.readUIntLE(24, 3), b.readUIntLE(27, 3)) + 1;
        if (kind === 'VP8L') {
          const bits = b.readUInt32LE(21);
          return Math.max(bits & 0x3fff, (bits >> 14) & 0x3fff) + 1;
        }
        return Math.max(b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff);
      }
      return 0;
    };
    const tooBig = files
      .filter((f) => f !== OG && !f.startsWith(join('src/assets/logos', '')))
      .filter((f) => !f.startsWith(WALL_DIR))
      .filter((f) => f !== PHOTO) // owner, profile-image-full: 600 x 894, pinned by its own test above
      .filter((f) => f !== PHOTO_CUTOUT) // owner, photo-align-cutout: 600 x 894, pinned by its own test above
      .filter((f) => longest(read(f)) > 600);
    expect(tooBig).toEqual([]);
  });

  it('the scripts never ask sharp to keep metadata', () => {
    for (const script of [
      'scripts/brand-images.ts',
      'scripts/portrait-cutout.ts',
      'scripts/capture-wall.ts',
    ]) {
      const src = readFileSync(script, 'utf8');
      expect(src, script).not.toMatch(
        /withMetadata|withExif|withIccProfile|keep(Exif|Xmp|Iptc|IccProfile|Metadata)/,
      );
    }
  });
});

// The owner's original stays where it is; when it is on this machine, prove it is unchanged.
const ORIGINAL = process.env.BRAND_ORIGINAL ?? join(homedir(), 'Downloads/personal_image.jpg');
const ORIGINAL_SHA256 = '885b9ffc5bf993d82902667d3d1dc36081910d43a628fe01181ff73d1e146638';

describe.runIf(existsSync(ORIGINAL))('original photo (local only)', () => {
  it('is byte-identical to the one the crops were made from', () => {
    const sha = createHash('sha256').update(read(ORIGINAL)).digest('hex');
    expect(sha).toBe(ORIGINAL_SHA256);
  });
  it('does carry the metadata the walker strips (sanity check of the walker)', () => {
    const w = walkJpeg(read(ORIGINAL));
    expect(w.disallowed).toEqual(expect.arrayContaining(['FFE1', 'FFE2']));
  });
});

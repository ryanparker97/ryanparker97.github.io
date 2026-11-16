// Brand images (photo-logo U1): byte-level proof that the committed crops of the owner's photo carry
// only image data. Pure Node allowlist walkers, no sharp, so this runs anywhere the repo does.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const AVATAR = 'src/assets/profile/avatar.jpg';
const APPLE = 'public/apple-touch-icon.png';
const FAVICON = 'public/favicon-48.png';
const OG = 'public/og-default.png';

// JPEG: SOI, APP0 (JFIF), DQT, SOFn, DHT, DRI, SOS, RSTn, EOI. Anything else (APP1 EXIF/XMP,
// APP2 ICC, APP11 C2PA/JUMBF, APP13 IPTC, COM, ...) is metadata and fails.
const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const JPEG_ALLOWED = new Set([0xd8, 0xe0, 0xdb, 0xc4, 0xdd, 0xda, 0xd9, ...SOF]);
const isRst = (m: number) => m >= 0xd0 && m <= 0xd7;

// PNG: IHDR, PLTE, tRNS, IDAT, IEND. Anything else (iCCP, eXIf, tEXt, iTXt, zTXt, tIME, gAMA,
// pHYs, caBX, ...) fails.
const PNG_ALLOWED = new Set(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND']);
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

type Walk = { width: number; height: number; segments: string[]; disallowed: string[] };

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

function walkPng(b: Buffer): Walk & { colorType: number } {
  if (!b.subarray(0, 8).equals(PNG_SIG)) throw new Error('not a PNG (bad signature)');
  const types: string[] = [];
  let i = 8;
  let width = 0;
  let height = 0;
  let colorType = -1;
  while (i < b.length) {
    const len = b.readUInt32BE(i);
    const type = b.toString('latin1', i + 4, i + 8);
    types.push(type);
    if (type === 'IHDR') {
      width = b.readUInt32BE(i + 8);
      height = b.readUInt32BE(i + 12);
      colorType = b[i + 17];
    }
    i += 12 + len;
    if (type === 'IEND') break;
  }
  if (types[0] !== 'IHDR' || types.at(-1) !== 'IEND') throw new Error('IHDR/IEND misplaced');
  if (i !== b.length) throw new Error(`${b.length - i} trailing bytes after IEND`);
  const segments = [...new Set(types)];
  const disallowed = segments.filter((t) => !PNG_ALLOWED.has(t));
  return { width, height, segments, disallowed, colorType };
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

  it('no full-resolution copy of the photo is committed under src/assets/profile/', () => {
    const files = readdirSync('src/assets/profile');
    expect(files.filter((f) => /^portrait/i.test(f))).toEqual([]);
    for (const f of files.filter((f) => /\.(jpe?g)$/i.test(f))) {
      const { width, height } = walkJpeg(read(join('src/assets/profile', f)));
      expect(Math.max(width, height), f).toBeLessThanOrEqual(600);
    }
    expect(files.filter((f) => /\.(png|webp|avif|heic|tiff?)$/i.test(f))).toEqual([]);
  });

  it('no JPEG/WebP/PNG over 600px outside the share card and logos, and no HEIC/TIFF, in public/ or src/assets/', () => {
    const all = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? all(join(dir, e.name)) : [join(dir, e.name)],
      );
    const files = [...all('public'), ...all('src/assets')];
    expect(files.filter((f) => /\.(heic|heif|tiff?)$/i.test(f))).toEqual([]);
    // Judged by content, not extension. Logos are line art, not photos, so they may be large.
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
      .filter((f) => longest(read(f)) > 600);
    expect(tooBig).toEqual([]);
  });

  it('the script never asks sharp to keep metadata', () => {
    const src = readFileSync('scripts/brand-images.ts', 'utf8');
    expect(src).not.toMatch(
      /withMetadata|withExif|withIccProfile|keep(Exif|Xmp|Iptc|IccProfile|Metadata)/,
    );
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

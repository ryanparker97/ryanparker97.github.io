// Brand images from the owner's portrait (photo-logo).
//
//   pnpm exec tsx scripts/brand-images.ts --import <photo.jpg>
//     Reads the photo (read-only, into memory) and writes the one committed master,
//     src/assets/profile/avatar.jpg: a 600x600 head-and-shoulders crop, face centred, with no EXIF,
//     XMP, IPTC, GPS or ICC (sharp converts to sRGB and attaches nothing). Only needed to re-crop.
//   pnpm exec tsx scripts/brand-images.ts --photo <photo.jpg>
//     Reads the photo (read-only, into memory) and writes the whole-photo master,
//     src/assets/profile/photo.jpg: the entire 848x1264 photo scaled to 600x894 (no crop), same
//     metadata rule as avatar.jpg. The Home portrait shows it (owner, profile-image-full).
//   pnpm exec tsx scripts/brand-images.ts
//     Reads only avatar.jpg and writes public/apple-touch-icon.png (180x180, opaque) and
//     public/favicon-48.png (48x48, round, transparent corners).
//
// The original is never committed. The committed copies are avatar.jpg (600x600 crop) and photo.jpg
// (the whole photo, 600x894; owner, profile-image-full), both without EXIF, XMP, IPTC, GPS or ICC.
// Never pass sips -s/-z/-c on the original:
// they edit in place. Tune a crop by changing its constant, re-running and opening the outputs.
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { loadSharp } from './lib/sharp';

const AVATAR = 'src/assets/profile/avatar.jpg';
const PHOTO = 'src/assets/profile/photo.jpg';
const APPLE_TOUCH = 'public/apple-touch-icon.png';
const FAVICON = 'public/favicon-48.png';

/** The photo the crops were tuned on; another photo needs new crop boxes. */
const SOURCE_SIZE = { width: 848, height: 1264 };
/** The whole photo at web size: 848x1264 scaled by 600/848 is 600 x 894.3, so 894. */
const PHOTO_SIZE = { width: 600, height: 894 };
/** In the photo: face (hair to chin) is about x 295-580, y 105-470; centred on x 437. */
const AVATAR_CROP = { left: 137, top: 30, width: 600, height: 600 };
/** In avatar.jpg: the face, hair to chin with a small margin, centred on x 300. */
const ICON_CROP = { left: 90, top: 55, width: 420, height: 420 };

const circle = (d: number) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${d}" height="${d}"><circle cx="${d / 2}" cy="${d / 2}" r="${d / 2}"/></svg>`,
  );

/** The PNG chunks that hold the image. libvips always adds pHYs (pixel density); it and any text,
 * time, gamma or ICC chunk are dropped, so the published PNGs carry image data and nothing else.
 * Chunks are copied whole, so their CRCs stay valid. */
const PNG_IMAGE_CHUNKS = new Set(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND']);

function imageChunksOnly(png: Buffer): Buffer {
  const parts = [png.subarray(0, 8)];
  for (let i = 8; i < png.length;) {
    const end = i + 12 + png.readUInt32BE(i);
    if (PNG_IMAGE_CHUNKS.has(png.toString('latin1', i + 4, i + 8)))
      parts.push(png.subarray(i, end));
    i = end;
  }
  return Buffer.concat(parts);
}

async function write(path: string, data: Buffer) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);
  console.log(`${path}  ${data.length} B`);
}

async function importPhoto(input: string) {
  const source = await realpath(input);
  if (source === resolve(AVATAR)) throw new Error('--import input is the output; refusing');
  const sharp = await loadSharp();
  const photo = await readFile(source); // the only access to the original: a read
  const { width, height } = await sharp(photo).metadata();
  if (width !== SOURCE_SIZE.width || height !== SOURCE_SIZE.height) {
    throw new Error(
      `expected a ${SOURCE_SIZE.width}x${SOURCE_SIZE.height} photo, got ${width}x${height}; retune AVATAR_CROP`,
    );
  }
  const avatar = await sharp(photo)
    .rotate()
    .extract(AVATAR_CROP)
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  await write(AVATAR, avatar);
}

async function importWhole(input: string) {
  const source = await realpath(input);
  if (source === resolve(PHOTO) || source === resolve(AVATAR))
    throw new Error('--photo input is an output; refusing');
  const sharp = await loadSharp();
  const photo = await readFile(source); // the only access to the original: a read
  const { width, height } = await sharp(photo).metadata();
  if (width !== SOURCE_SIZE.width || height !== SOURCE_SIZE.height) {
    throw new Error(
      `expected a ${SOURCE_SIZE.width}x${SOURCE_SIZE.height} photo, got ${width}x${height}; retune PHOTO_SIZE`,
    );
  }
  const whole = await sharp(photo)
    .rotate()
    .resize(PHOTO_SIZE.width)
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  const out = await sharp(whole).metadata();
  if (out.width !== PHOTO_SIZE.width || out.height !== PHOTO_SIZE.height) {
    throw new Error(
      `expected ${PHOTO_SIZE.width}x${PHOTO_SIZE.height} output, got ${out.width}x${out.height}`,
    );
  }
  await write(PHOTO, whole);
}

async function icons() {
  const sharp = await loadSharp();
  const avatar = await readFile(AVATAR);
  await write(
    APPLE_TOUCH,
    imageChunksOnly(
      await sharp(avatar)
        .extract(ICON_CROP)
        .resize(180)
        .flatten()
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer(),
    ),
  );
  await write(
    FAVICON,
    imageChunksOnly(
      await sharp(avatar)
        .extract(ICON_CROP)
        .resize(48)
        .composite([{ input: circle(48), blend: 'dest-in' }])
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer(),
    ),
  );
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--import') {
    if (!args[1]) throw new Error('usage: brand-images.ts --import <photo.jpg>');
    await importPhoto(args[1]);
  } else if (args[0] === '--photo') {
    if (!args[1]) throw new Error('usage: brand-images.ts --photo <photo.jpg>');
    await importWhole(args[1]);
  } else if (args.length) {
    throw new Error(`unknown arguments: ${args.join(' ')}`);
  } else {
    await icons();
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

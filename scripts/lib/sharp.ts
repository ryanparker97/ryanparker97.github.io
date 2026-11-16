import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

/**
 * The part of sharp's API the brand scripts use. It deliberately has no `withMetadata`,
 * `keepExif`, `keepXmp`, `keepIccProfile` or `withIccProfile`, so a script that tried to carry
 * the photo's metadata into an output would not type-check. sharp's default output already drops
 * EXIF, XMP, IPTC and the ICC profile (converting to sRGB).
 */
export interface SharpImage {
  rotate(): SharpImage;
  extract(region: { left: number; top: number; width: number; height: number }): SharpImage;
  resize(width: number, height?: number): SharpImage;
  flatten(options?: { background?: string }): SharpImage;
  composite(images: { input: Buffer; blend: 'dest-in' }[]): SharpImage;
  jpeg(options: { quality: number; mozjpeg?: boolean }): SharpImage;
  png(options?: { compressionLevel?: number; adaptiveFiltering?: boolean }): SharpImage;
  metadata(): Promise<{ width?: number; height?: number; format?: string }>;
  toBuffer(): Promise<Buffer>;
}
export type Sharp = (input: Buffer) => SharpImage;

/**
 * Loads sharp through Astro, which depends on it, so package.json and the lockfile need no new entry.
 * Fails loudly if Astro stops shipping it (then: `pnpm add -D sharp`).
 */
export async function loadSharp(): Promise<Sharp> {
  const fromAstro = createRequire(createRequire(import.meta.url).resolve('astro/package.json'));
  const mod = (await import(pathToFileURL(fromAstro.resolve('sharp')).href)) as { default: Sharp };
  return mod.default;
}

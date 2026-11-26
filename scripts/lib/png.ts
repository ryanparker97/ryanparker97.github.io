/** Keeps only the chunks that hold the image (libvips adds pHYs). Chunks are copied whole. */
const KEEP = new Set(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND']);
export function imageChunksOnly(png: Buffer): Buffer {
  const parts = [png.subarray(0, 8)];
  for (let i = 8; i < png.length;) {
    const end = i + 12 + png.readUInt32BE(i);
    if (KEEP.has(png.toString('latin1', i + 4, i + 8))) parts.push(png.subarray(i, end));
    i = end;
  }
  return Buffer.concat(parts);
}

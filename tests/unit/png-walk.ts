// PNG allowlist walker shared by the brand-image and wall tests. Pure Node, no sharp.

// PNG: IHDR, PLTE, tRNS, IDAT, IEND. Anything else (iCCP, eXIf, tEXt, iTXt, zTXt, tIME, gAMA,
// pHYs, caBX, ...) fails.
export const PNG_ALLOWED = new Set(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND']);
export const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export type Walk = { width: number; height: number; segments: string[]; disallowed: string[] };

export function walkPng(b: Buffer): Walk & { colorType: number } {
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

/** The IHDR colour type: 2 = RGB, 6 = RGBA, 3 = palette. */
export const colorType = (b: Buffer): number => walkPng(b).colorType;

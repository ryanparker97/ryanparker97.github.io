export type BandTone = 'bg' | 'surface';

/** Touching bands alternate from the white hero: surface, bg, surface, ... (spec §4.1, §4.6.1). */
export function bandTones(ids: readonly string[]): Record<string, BandTone> {
  const tones: Record<string, BandTone> = {};
  ids.forEach((id, i) => {
    tones[id] = i % 2 === 0 ? 'surface' : 'bg';
  });
  return tones;
}

export interface Footnote {
  n: number;
  text: string;
}

export interface NoteRef {
  n: number;
  label: string;
}

export function numberNotes<T extends { note?: string }>(
  items: T[],
  label: (n: number) => string,
): { items: (T & { ref?: NoteRef })[]; notes: Footnote[] } {
  const notes: Footnote[] = [];
  const out = items.map((item) => {
    if (!item.note) return item as T & { ref?: NoteRef };
    const n = notes.length + 1;
    notes.push({ n, text: item.note });
    return { ...item, ref: { n, label: label(n) } };
  });
  return { items: out, notes };
}

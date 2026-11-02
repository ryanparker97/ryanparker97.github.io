export interface CreditPart {
  text: string;
  href?: string;
}

/** Split `text [label](https://…) text` into parts; only http(s) links become hrefs. */
export function creditParts(s: string): CreditPart[] {
  const out: CreditPart[] = [];
  const push = (p: CreditPart) => {
    const last = out[out.length - 1];
    if (!p.href && last && !last.href) last.text += p.text;
    else if (p.href || p.text) out.push(p);
  };
  let i = 0;
  for (const m of s.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)) {
    push({ text: s.slice(i, m.index) });
    push(/^https?:\/\//i.test(m[2]) ? { text: m[1], href: m[2] } : { text: m[0] });
    i = m.index + m[0].length;
  }
  push({ text: s.slice(i) });
  return out.filter((p) => p.text);
}

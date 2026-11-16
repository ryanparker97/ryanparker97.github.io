// Words the public "Next." group must never contain: job-hunt phrases, year counts and employer or
// target-company names. Owner follow-up: the two role titles and the two target years below are shown on
// purpose, so exactly those strings are removed before the check (any other title or year still fails).
// The allow-list applies only to a card title or eyebrow (withoutAllowed); goal and link text is checked raw.
export const NEXT_ALLOWED: string[] = [
  'Enterprise Data Architect',
  'Forward Deployed Engineer (FDE)',
  'by 2029',
  'by 2031',
  'đến năm 2029',
  'đến năm 2031',
];

export const NEXT_FORBIDDEN: RegExp[] = [
  /\d{4}/,
  /\b\d+\s*\+?\s*-?\s*(years?|yrs?)\b/i,
  /\d+\s*\+?\s*-?\s*năm/i,
  /\b(thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty)(-\w+)?[\s-]+(years?|yrs?)\b/i,
  /(mươi|lăm)\s+năm/iu,
  /ứng tuyển|tuyển dụng/i,
  /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(years?|yrs?)\b/i,
  /(?<![\p{L}])(một|hai|ba|bốn|sáu|bảy|tám|chín|mười)\s+năm(?![\p{L}])/iu,
  /(?<![\p{L}])năm\s+năm(?![\p{L}])/iu,
  /looking for/i,
  /\bavailable\b/i,
  /\bhir(e|es|ed|ing)\b/i,
  /sẵn sàng/i,
  /tìm việc/i,
  /enterprise/i,
  /seeking/i,
  /open to/i,
  /opportunit/i,
  /aspiring/i,
  /\bfuture\b/i,
  /\barchitect\b/i,
  /\bengineer\b/i,
  /\bFDE\b/,
  /kiến trúc sư/i,
  /kỹ sư/i,
  /trở thành/i,
  /cơ hội/i,
  /đang tìm/i,
  /FPT|Security Bank|TymeX|Datum|Hitachi|Palantir|OpenAI|Anthropic|Databricks|Scale AI/i,
];

/** NFC, no-break and narrow no-break spaces to a plain space, non-breaking hyphen to "-". Apply to every field before matching. */
export const norm = (s: string): string =>
  s.normalize('NFC').replace(/[  ]/g, ' ').replace(/‑/g, '-');

/** A card title or eyebrow with the allowed title and year strings taken out, ready for the NEXT_FORBIDDEN check. Never use it on goal or link text. */
export const withoutAllowed = (s: string): string =>
  NEXT_ALLOWED.reduce((acc, a) => acc.split(a).join(' '), norm(s));

/** An aria-label with its " (<allowed title>)" suffix removed by exact text (the title may hold its own parentheses); the rest is returned raw and normalised. */
export const withoutTitleSuffix = (s: string): string =>
  NEXT_ALLOWED.reduce((acc, a) => acc.split(` (${a})`).join(''), norm(s));

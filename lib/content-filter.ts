export type TextFilterReason = 'profanity' | 'slur';

export type TextFilterMatch = {
  start: number;
  end: number;
  text: string;
  reason: TextFilterReason;
};

export type TextFilterSegment =
  | { type: 'text'; text: string }
  | { type: 'masked'; text: string; reason: TextFilterReason };

type FilterRule = {
  pattern: RegExp;
  reason: TextFilterReason;
};

const FILTER_RULES: FilterRule[] = [
  { pattern: /\b(fuck(?:er|ers|ing|ed|s)?)\b/gi, reason: 'profanity' },
  { pattern: /\b(shit(?:ty|ting|s|head|heads)?)\b/gi, reason: 'profanity' },
  { pattern: /\b(bitch(?:es|y)?)\b/gi, reason: 'profanity' },
  { pattern: /\b(asshole|assholes)\b/gi, reason: 'profanity' },
  { pattern: /\b(bastard|bastards)\b/gi, reason: 'profanity' },
  { pattern: /\b(cunt|cunts)\b/gi, reason: 'profanity' },
  { pattern: /\b(motherfucker|motherfuckers)\b/gi, reason: 'profanity' },
  { pattern: /\b(nigg(?:er|ers|a|as))\b/gi, reason: 'slur' },
  { pattern: /\b(fag(?:got|gots|gy|gies|s)?)\b/gi, reason: 'slur' },
  { pattern: /\b(retard(?:ed|s)?)\b/gi, reason: 'slur' },
  { pattern: /\b(trann(?:y|ies))\b/gi, reason: 'slur' },
  { pattern: /\b(kike|kikes)\b/gi, reason: 'slur' },
  { pattern: /\b(spic|spics)\b/gi, reason: 'slur' },
  { pattern: /\b(chink|chinks)\b/gi, reason: 'slur' },
  { pattern: /\b(wetback|wetbacks)\b/gi, reason: 'slur' },
  { pattern: /\b(paki|pakis)\b/gi, reason: 'slur' },
  { pattern: /\b(dyke|dykes)\b/gi, reason: 'slur' },
];

export function textFilterReasonLabel(reason: TextFilterReason) {
  return reason === 'slur' ? 'slur' : 'profanity';
}

export function formatTextFilterReasons(reasons: TextFilterReason[]) {
  const labels = [...new Set(reasons.map(textFilterReasonLabel))];
  if (!labels.length) return '';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

export function findTextFilterMatches(value: string): TextFilterMatch[] {
  const text = String(value ?? '');
  if (!text.trim()) return [];

  const rawMatches: TextFilterMatch[] = [];
  for (const rule of FILTER_RULES) {
    rule.pattern.lastIndex = 0;
    let match: RegExpExecArray | null = null;
    while ((match = rule.pattern.exec(text)) !== null) {
      const matched = match[0];
      const start = match.index;
      const end = start + matched.length;
      if (start >= 0 && end > start) rawMatches.push({ start, end, text: matched, reason: rule.reason });
      if (matched.length === 0) break;
    }
  }

  rawMatches.sort((a, b) => a.start - b.start || b.end - a.end);
  const resolved: TextFilterMatch[] = [];
  for (const match of rawMatches) {
    const last = resolved[resolved.length - 1];
    if (!last || match.start >= last.end) {
      resolved.push(match);
      continue;
    }

    const lastLength = last.end - last.start;
    const nextLength = match.end - match.start;
    if (nextLength > lastLength) resolved[resolved.length - 1] = match;
  }

  return resolved;
}

export function buildTextFilterSegments(value: string): TextFilterSegment[] {
  const text = String(value ?? '');
  const matches = findTextFilterMatches(text);
  if (!matches.length) return [{ type: 'text', text }];

  const segments: TextFilterSegment[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start > cursor) segments.push({ type: 'text', text: text.slice(cursor, match.start) });
    segments.push({ type: 'masked', text: text.slice(match.start, match.end), reason: match.reason });
    cursor = match.end;
  }
  if (cursor < text.length) segments.push({ type: 'text', text: text.slice(cursor) });
  return segments.filter((segment) => segment.text.length > 0);
}

export function getTextFilterSummary(value: string) {
  const matches = findTextFilterMatches(value);
  const reasons = [...new Set(matches.map((match) => match.reason))];
  return {
    containsFilteredText: matches.length > 0,
    maskedWordCount: matches.length,
    reasons,
    reasonLabel: formatTextFilterReasons(reasons),
  };
}

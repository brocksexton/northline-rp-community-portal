export type TextFilterReason = 'profanity' | 'slur';
export type TextFilterMatchMode = 'word' | 'contains';

export type TextFilterRule = {
  id: string;
  term: string;
  reason: TextFilterReason;
  matchMode?: TextFilterMatchMode;
};

export type TextFilterMatch = {
  start: number;
  end: number;
  text: string;
  reason: TextFilterReason;
};

export type TextFilterSegment =
  | { type: 'text'; text: string }
  | { type: 'masked'; text: string; reason: TextFilterReason };

export const DEFAULT_TEXT_FILTER_RULES: TextFilterRule[] = [
  { id: 'default-profanity-001', term: 'fuck', reason: 'profanity', matchMode: 'word' },
  { id: 'default-profanity-002', term: 'fucker', reason: 'profanity', matchMode: 'word' },
  { id: 'default-profanity-003', term: 'fucking', reason: 'profanity', matchMode: 'word' },
  { id: 'default-profanity-004', term: 'shit', reason: 'profanity', matchMode: 'word' },
  { id: 'default-profanity-005', term: 'shitty', reason: 'profanity', matchMode: 'word' },
  { id: 'default-profanity-006', term: 'bitch', reason: 'profanity', matchMode: 'word' },
  { id: 'default-profanity-007', term: 'bitches', reason: 'profanity', matchMode: 'word' },
  { id: 'default-profanity-008', term: 'asshole', reason: 'profanity', matchMode: 'word' },
  { id: 'default-profanity-009', term: 'bastard', reason: 'profanity', matchMode: 'word' },
  { id: 'default-profanity-010', term: 'cunt', reason: 'profanity', matchMode: 'word' },
  { id: 'default-profanity-011', term: 'motherfucker', reason: 'profanity', matchMode: 'word' },
  { id: 'default-slur-001', term: 'nigger', reason: 'slur', matchMode: 'word' },
  { id: 'default-slur-002', term: 'nigga', reason: 'slur', matchMode: 'word' },
  { id: 'default-slur-003', term: 'fag', reason: 'slur', matchMode: 'word' },
  { id: 'default-slur-004', term: 'faggot', reason: 'slur', matchMode: 'word' },
  { id: 'default-slur-005', term: 'retard', reason: 'slur', matchMode: 'word' },
  { id: 'default-slur-006', term: 'retarded', reason: 'slur', matchMode: 'word' },
  { id: 'default-slur-007', term: 'tranny', reason: 'slur', matchMode: 'word' },
  { id: 'default-slur-008', term: 'kike', reason: 'slur', matchMode: 'word' },
  { id: 'default-slur-009', term: 'spic', reason: 'slur', matchMode: 'word' },
  { id: 'default-slur-010', term: 'chink', reason: 'slur', matchMode: 'word' },
  { id: 'default-slur-011', term: 'wetback', reason: 'slur', matchMode: 'word' },
  { id: 'default-slur-012', term: 'paki', reason: 'slur', matchMode: 'word' },
  { id: 'default-slur-013', term: 'dyke', reason: 'slur', matchMode: 'word' },
];

function normalizeRules(rules?: TextFilterRule[] | null): TextFilterRule[] {
  const working = Array.isArray(rules) && rules.length ? rules : DEFAULT_TEXT_FILTER_RULES;
  const seen = new Set<string>();
  return working
    .map((rule) => ({
      id: String(rule.id || '').trim(),
      term: String(rule.term || '').trim(),
      reason: rule.reason === 'slur' ? 'slur' as const : 'profanity' as const,
      matchMode: rule.matchMode === 'contains' ? 'contains' as const : 'word' as const,
    }))
    .filter((rule) => {
      const key = `${rule.term.toLowerCase()}::${rule.reason}::${rule.matchMode}`;
      if (!rule.id || !rule.term || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compileRule(rule: TextFilterRule) {
  const escaped = escapeRegex(rule.term);
  const body = rule.matchMode === 'contains' ? escaped : `\\b${escaped}\\b`;
  try {
    return new RegExp(body, 'gi');
  } catch {
    return null;
  }
}

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

export function findTextFilterMatches(value: string, rules?: TextFilterRule[] | null): TextFilterMatch[] {
  const text = String(value ?? '');
  if (!text.trim()) return [];

  const rawMatches: TextFilterMatch[] = [];
  for (const rule of normalizeRules(rules)) {
    const pattern = compileRule(rule);
    if (!pattern) continue;
    let match: RegExpExecArray | null = null;
    while ((match = pattern.exec(text)) !== null) {
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

export function buildTextFilterSegments(value: string, rules?: TextFilterRule[] | null): TextFilterSegment[] {
  const text = String(value ?? '');
  const matches = findTextFilterMatches(text, rules);
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

export function getTextFilterSummary(value: string, rules?: TextFilterRule[] | null) {
  const matches = findTextFilterMatches(value, rules);
  const reasons = [...new Set(matches.map((match) => match.reason))];
  return {
    containsFilteredText: matches.length > 0,
    maskedWordCount: matches.length,
    reasons,
    reasonLabel: formatTextFilterReasons(reasons),
  };
}

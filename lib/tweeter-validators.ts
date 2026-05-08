export function cleanSteamId(value: unknown): string | null {
  const clean = String(value ?? '').trim();
  return /^\d{15,20}$/.test(clean) ? clean : null;
}

export function cleanTweetId(value: unknown): string | null {
  const clean = String(value ?? '').trim();
  if (!clean || clean.length > 120) return null;
  return /^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/.test(clean) ? clean : null;
}

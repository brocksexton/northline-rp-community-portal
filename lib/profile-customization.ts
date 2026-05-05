export type ProfileCoverKind = 'gradient' | 'icon' | 'image';
export type ProfileTheme = 'clean' | 'arcade' | 'sunset' | 'noir';

export type ProfileCoverPreset = {
  id: string;
  label: string;
  description: string;
  kind: ProfileCoverKind;
  gradient: string;
  imageUrl?: string;
  sourceUrl?: string;
  sourceLabel?: string;
};

export const DEFAULT_PROFILE_COVER_PRESET = 'northbound-downtown';
export const DEFAULT_PROFILE_THEME: ProfileTheme = 'clean';

export const PROFILE_COVER_PRESETS: ProfileCoverPreset[] = [
  {
    id: 'northbound-downtown',
    label: 'Downtown Roleplay',
    description: 'A Northbound RP gameplay screenshot for a clean city profile cover.',
    kind: 'image',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #123c69 50%, #1e293b 100%)',
    imageUrl: 'https://cdn.sbox.game/upload/i/b5028a97/f2db/4976/a31c/1deb23f4f14e',
    sourceUrl: 'https://sbox.game/',
    sourceLabel: 'sbox.game',
  },
  {
    id: 'northbound-street-shift',
    label: 'Street Shift',
    description: 'Street-level game imagery with a warmer RP profile mood.',
    kind: 'image',
    gradient: 'linear-gradient(135deg, #172033 0%, #4a1735 55%, #7c2d12 100%)',
    imageUrl: 'https://cdn.sbox.game/upload/i/6aeff7d1/71e7/4457/a234/5bfd03182f3e',
    sourceUrl: 'https://sbox.game/',
    sourceLabel: 'sbox.game',
  },
  {
    id: 'northbound-civic-core',
    label: 'Civic Core',
    description: 'A clean in-game civic banner for official-looking profiles.',
    kind: 'image',
    gradient: 'linear-gradient(135deg, #102016 0%, #064e3b 50%, #0f172a 100%)',
    imageUrl: 'https://cdn.sbox.game/upload/i/dee77496/6f6d/4de9/aaac/bdb990bbe953',
    sourceUrl: 'https://sbox.game/',
    sourceLabel: 'sbox.game',
  },
  {
    id: 'northbound-neon-night',
    label: 'Neon Night',
    description: 'A darker game-image profile cover with stronger contrast.',
    kind: 'image',
    gradient: 'linear-gradient(135deg, #14213d 0%, #123c69 48%, #2f1b45 100%)',
    imageUrl: 'https://cdn.sbox.game/upload/i/d026779a/8104/460b/9d6a/bf3dfca54601',
    sourceUrl: 'https://sbox.game/',
    sourceLabel: 'sbox.game',
  },
  {
    id: 'northbound-alley-route',
    label: 'Alley Route',
    description: 'Grittier city gameplay art for low-key profiles.',
    kind: 'image',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1f2937 48%, #4c0519 100%)',
    imageUrl: 'https://cdn.sbox.game/upload/i/61498aee/862e/4824/81b2/064984446368',
    sourceUrl: 'https://sbox.game/',
    sourceLabel: 'sbox.game',
  },
  {
    id: 'northbound-city-lights',
    label: 'City Lights',
    description: 'A brighter Northbound RP screenshot with a social profile feel.',
    kind: 'image',
    gradient: 'linear-gradient(135deg, #082f49 0%, #075985 54%, #0f172a 100%)',
    imageUrl: 'https://cdn.sbox.game/upload/i/f586da86/7a14/4f20/81d4/ff5fa325e653',
    sourceUrl: 'https://sbox.game/',
    sourceLabel: 'sbox.game',
  },
  {
    id: 'northbound-shoreline',
    label: 'Shoreline',
    description: 'A cooler gameplay banner for calm, scenic profiles.',
    kind: 'image',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #164e63 55%, #0f766e 100%)',
    imageUrl: 'https://cdn.sbox.game/upload/i/732dc9d8/25ba/4d99/9273/45da94fd0bba',
    sourceUrl: 'https://sbox.game/',
    sourceLabel: 'sbox.game',
  },
  {
    id: 'northbound-after-hours',
    label: 'After Hours',
    description: 'Late-night gameplay imagery for noir or criminal-profile styling.',
    kind: 'image',
    gradient: 'linear-gradient(135deg, #020617 0%, #111827 54%, #312e81 100%)',
    imageUrl: 'https://cdn.sbox.game/upload/i/d6a36a84/d6e5/4438/862e/e1771615fc7e',
    sourceUrl: 'https://sbox.game/',
    sourceLabel: 'sbox.game',
  },
];

export const PROFILE_THEMES: Array<{ id: ProfileTheme; label: string; description: string }> = [
  { id: 'clean', label: 'Clean', description: 'Default Tweeter profile styling with your chosen cover.' },
  { id: 'arcade', label: 'Arcade', description: 'Brighter edges, playful glow, and a little extra pop.' },
  { id: 'sunset', label: 'Sunset', description: 'Warmer profile cards with a soft evening feel.' },
  { id: 'noir', label: 'Noir', description: 'A darker, low-key profile frame with sharper contrast.' },
];

export function normalizeProfileCoverPreset(value: unknown): string {
  const raw = String(value ?? '').trim();
  return PROFILE_COVER_PRESETS.some((preset) => preset.id === raw) ? raw : DEFAULT_PROFILE_COVER_PRESET;
}

export function normalizeProfileTheme(value: unknown): ProfileTheme {
  return value === 'arcade' || value === 'sunset' || value === 'noir' ? value : DEFAULT_PROFILE_THEME;
}

export function getProfileCoverPreset(value: unknown): ProfileCoverPreset {
  const id = normalizeProfileCoverPreset(value);
  return PROFILE_COVER_PRESETS.find((preset) => preset.id === id) ?? PROFILE_COVER_PRESETS[0];
}

export function canUseCustomProfileCover(role: string | null | undefined): boolean {
  const normalized = String(role ?? '').trim().toLowerCase();
  if (!normalized || normalized === 'guest' || normalized === 'user') return false;
  return true;
}

export function isLikelyImageUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    if (/\.(png|jpe?g|webp|gif|avif|svg)$/i.test(parsed.pathname)) return true;
    return parsed.hostname === 'cdn.sbox.game' && parsed.pathname.startsWith('/upload/i/');
  } catch {
    return false;
  }
}

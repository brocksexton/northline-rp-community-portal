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

export const DEFAULT_PROFILE_COVER_PRESET = 'northline-night';
export const DEFAULT_PROFILE_THEME: ProfileTheme = 'clean';

export const PROFILE_COVER_PRESETS: ProfileCoverPreset[] = [
  {
    id: 'northline-night',
    label: 'Northline Night',
    description: 'A clean blue city-night banner that fits any profile.',
    kind: 'gradient',
    gradient: 'radial-gradient(circle at 18% 28%, rgba(29,155,240,.62), transparent 16rem), linear-gradient(135deg, #0f172a 0%, #102a43 45%, #15202b 100%)',
  },
  {
    id: 'northline-sunset',
    label: 'Sunset Shift',
    description: 'Warm pinks and oranges for a softer profile header.',
    kind: 'gradient',
    gradient: 'radial-gradient(circle at 18% 18%, rgba(251,146,60,.58), transparent 16rem), radial-gradient(circle at 82% 20%, rgba(236,72,153,.46), transparent 18rem), linear-gradient(135deg, #172033 0%, #4a1735 55%, #7c2d12 100%)',
  },
  {
    id: 'sbox-play',
    label: 'S&box Play',
    description: 'Official s&box play icon over a bright game-night gradient.',
    kind: 'icon',
    gradient: 'radial-gradient(circle at 20% 20%, rgba(56,189,248,.55), transparent 18rem), linear-gradient(135deg, #0f172a 0%, #075985 52%, #1e293b 100%)',
    imageUrl: 'https://sbox.game/img/icons/icon_play-games.svg',
    sourceUrl: 'https://sbox.game/',
    sourceLabel: 'sbox.game',
  },
  {
    id: 'sbox-create',
    label: 'S&box Create',
    description: 'A builder-themed cover using the official create icon.',
    kind: 'icon',
    gradient: 'radial-gradient(circle at 24% 24%, rgba(34,197,94,.42), transparent 18rem), linear-gradient(135deg, #102016 0%, #064e3b 50%, #0f172a 100%)',
    imageUrl: 'https://sbox.game/img/icons/icon_create-games.svg',
    sourceUrl: 'https://sbox.game/',
    sourceLabel: 'sbox.game',
  },
  {
    id: 'sbox-share',
    label: 'S&box Share',
    description: 'A lighter community-share banner from the official site art.',
    kind: 'icon',
    gradient: 'radial-gradient(circle at 26% 22%, rgba(125,211,252,.5), transparent 16rem), radial-gradient(circle at 80% 24%, rgba(244,114,182,.38), transparent 18rem), linear-gradient(135deg, #14213d 0%, #123c69 48%, #2f1b45 100%)',
    imageUrl: 'https://sbox.game/img/icons/icon_share.svg',
    sourceUrl: 'https://sbox.game/',
    sourceLabel: 'sbox.game',
  },
  {
    id: 'sbox-release',
    label: 'S&box Release',
    description: 'A larger Facepunch news image from the s&box release post.',
    kind: 'image',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1f2937 48%, #4c0519 100%)',
    imageUrl: 'https://cdn.sbox.game/upload/b/946bf950/0f32/4346/960b/f7df0f17a7ef.png',
    sourceUrl: 'https://sbox.game/news/release-26-04-28',
    sourceLabel: 's&box release post',
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
    return /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

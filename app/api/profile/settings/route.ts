import { NextRequest, NextResponse } from 'next/server';
import {
  normalizeTweeterColorMode,
  normalizeTweeterThemeEra,
  upsertCommunityProfile,
} from '@/lib/community-data';
import { getSessionSteamId, getSessionSteamIdFromRequest, noStoreHeaders } from '@/lib/session';

export const dynamic = 'force-dynamic';

function cleanUrl(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.toString();
  } catch {
    return '';
  }
  return '';
}

function cleanShowcase(value: unknown) {
  const raw = typeof value === 'object' && value ? value as Record<string, unknown> : {};
  return {
    economy: Boolean(raw.economy),
    inventory: Boolean(raw.inventory),
    stats: Boolean(raw.stats),
    properties: Boolean(raw.properties),
    activity: Boolean(raw.activity),
  };
}

export async function POST(request: NextRequest) {
  const steamId = getSessionSteamIdFromRequest(request) ?? await getSessionSteamId();
  if (!steamId) {
    return NextResponse.json({ error: 'Steam sign-in required.' }, { status: 401, headers: noStoreHeaders() });
  }

  const body = await request.json().catch(() => ({}));
  const privacy = body.privacy === 'private' ? 'private' : 'public';
  const profile = await upsertCommunityProfile(steamId, {
    privacy,
    bio: String(body.bio ?? '').trim().slice(0, 280),
    location: String(body.location ?? '').trim().slice(0, 80),
    websiteUrl: cleanUrl(body.websiteUrl),
    customAvatarUrl: cleanUrl(body.customAvatarUrl),
    bannerColor: /^#[0-9a-f]{6}$/i.test(String(body.bannerColor ?? '')) ? String(body.bannerColor) : '#1d9bf0',
    showcase: cleanShowcase(body.showcase),
    tweeterTheme: normalizeTweeterThemeEra(body.tweeterTheme),
    tweeterMode: normalizeTweeterColorMode(body.tweeterMode),
  });

  return NextResponse.json({ profile }, { headers: noStoreHeaders() });
}

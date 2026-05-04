import { NextRequest, NextResponse } from 'next/server';
import {
  normalizeProfileCoverPreset,
  normalizeProfileTheme,
  normalizeTweeterColorMode,
  normalizeTweeterThemeEra,
  normalizeWebsiteStyle,
  upsertCommunityProfile,
} from '@/lib/community-data';
import { getRoleForSteamId } from '@/lib/ape-data';
import { canUseCustomProfileCover, isLikelyImageUrl } from '@/lib/profile-customization';
import { getSessionSteamId, getSessionSteamIdFromRequest, jsonWithSession, noStoreHeaders, verifyProfileEditToken } from '@/lib/session';

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

function cleanImageUrl(value: unknown): string {
  const cleaned = cleanUrl(value);
  return cleaned && isLikelyImageUrl(cleaned) ? cleaned : '';
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
  const body = await request.json().catch(() => ({}));
  const steamIdFromCookie = getSessionSteamIdFromRequest(request) ?? await getSessionSteamId();
  const steamIdFromEditToken = verifyProfileEditToken(body.profileEditToken);
  const steamId = steamIdFromCookie ?? steamIdFromEditToken;

  if (!steamId) {
    return NextResponse.json({ error: 'Steam sign-in required.' }, { status: 401, headers: noStoreHeaders() });
  }

  const privacy = body.privacy === 'private' ? 'private' : 'public';
  const role = await getRoleForSteamId(steamId);
  const customCoverUrl = canUseCustomProfileCover(role) ? cleanImageUrl(body.customCoverUrl) : '';

  const profile = await upsertCommunityProfile(steamId, {
    privacy,
    bio: String(body.bio ?? '').trim().slice(0, 280),
    location: String(body.location ?? '').trim().slice(0, 80),
    websiteUrl: cleanUrl(body.websiteUrl),
    customAvatarUrl: cleanUrl(body.customAvatarUrl),
    customCoverUrl,
    coverPreset: normalizeProfileCoverPreset(body.coverPreset),
    profileTheme: normalizeProfileTheme(body.profileTheme),
    bannerColor: /^#[0-9a-f]{6}$/i.test(String(body.bannerColor ?? '')) ? String(body.bannerColor) : '#1d9bf0',
    showcase: cleanShowcase(body.showcase),
    tweeterTheme: normalizeTweeterThemeEra(body.tweeterTheme),
    tweeterMode: normalizeTweeterColorMode(body.tweeterMode),
    websiteStyle: normalizeWebsiteStyle(body.websiteStyle),
  });

  return jsonWithSession({ profile }, undefined, steamId, request);
}

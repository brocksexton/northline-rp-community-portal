import { NextRequest, NextResponse } from 'next/server';
import { noStoreHeaders } from '@/lib/session';
import { safeTimingEqual } from '@/lib/security';

function configuredSecret() {
  return process.env.NORTHLINE_BOT_API_SECRET?.trim() || process.env.DISCORD_BOT_API_SECRET?.trim() || '';
}

export function requireBotApiSecret(request: NextRequest): NextResponse | null {
  const secret = configuredSecret();
  if (!secret || secret.length < 24) {
    return NextResponse.json({ error: 'Bot API secret is not configured. Set NORTHLINE_BOT_API_SECRET to a long random value.' }, { status: 503, headers: noStoreHeaders() });
  }

  const headerSecret = request.headers.get('x-northline-bot-secret')?.trim() || '';
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || '';
  if (!safeTimingEqual(headerSecret, secret) && !safeTimingEqual(bearer, secret)) {
    return NextResponse.json({ error: 'Unauthorized bot request.' }, { status: 401, headers: noStoreHeaders() });
  }

  return null;
}

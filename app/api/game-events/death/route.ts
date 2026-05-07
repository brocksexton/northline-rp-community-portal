import { appendFile, mkdir } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { notifyDeathEventToDiscord } from '@/lib/discord-webhooks';
import { noStoreHeaders } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type DeathPayload = {
  victimName?: unknown;
  victimSteamId?: unknown;
  killerName?: unknown;
  killerSteamId?: unknown;
  cause?: unknown;
  occurredAt?: unknown;
  source?: unknown;
};

function configured(value: string | undefined): string {
  return String(value ?? '').trim();
}

function dataPath() {
  return configured(process.env.NORTHLINE_DATA_PATH) || path.join(process.cwd(), '.northline-data');
}

function deathEventsPath() {
  return configured(process.env.NORTHLINE_BOT_DEATH_EVENTS_PATH) || path.join(dataPath(), 'death-events.jsonl');
}

function clean(value: unknown, max = 160): string | null {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1))}…` : text;
}

function steamId(value: unknown): string | null {
  const text = clean(value, 32);
  return text && /^\d{15,20}$/.test(text) ? text : null;
}

function validSecret(request: NextRequest): boolean {
  const expected = configured(process.env.NORTHLINE_GAME_EVENT_SECRET) || configured(process.env.NORTHLINE_BOT_API_SECRET);
  if (!expected || expected.length < 24) return false;
  const provided = request.headers.get('x-northline-game-event-secret')
    || request.headers.get('x-northline-bot-secret')
    || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    || '';
  return provided === expected;
}

export async function POST(request: NextRequest) {
  if (!validSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized game event request.' }, { status: 401, headers: noStoreHeaders() });
  }

  const body = await request.json().catch(() => ({} as DeathPayload));
  const event = {
    victimName: clean(body.victimName, 80),
    victimSteamId: steamId(body.victimSteamId),
    killerName: clean(body.killerName, 80),
    killerSteamId: steamId(body.killerSteamId),
    cause: clean(body.cause, 120) || 'Unknown',
    occurredAt: clean(body.occurredAt, 64) || new Date().toISOString(),
    source: clean(body.source, 80) || 'game-event-api',
  };

  if (!event.victimName && !event.victimSteamId) {
    return NextResponse.json({ error: 'victimName or victimSteamId is required.' }, { status: 400, headers: noStoreHeaders() });
  }

  const file = deathEventsPath();
  await mkdir(path.dirname(file), { recursive: true });
  await appendFile(file, `${JSON.stringify({ ...event, createdAt: new Date().toISOString() })}\n`, 'utf8');
  await notifyDeathEventToDiscord(event);

  return NextResponse.json({ ok: true, event }, { headers: noStoreHeaders() });
}

import { NextResponse } from 'next/server';
import { buildTweeterPayload } from '@/lib/tweeter-view';
import { isSiteFeatureEnabled } from '@/lib/site-features-data';
import { noStoreHeaders } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isSiteFeatureEnabled('tweeter'))) {
    return NextResponse.json({ ok: false, message: 'Tweeter is not enabled.' }, { status: 404, headers: noStoreHeaders() });
  }
  const payload = await buildTweeterPayload(null);
  return NextResponse.json({ tweets: payload.tweets, generatedAt: payload.generatedAt }, { headers: noStoreHeaders() });
}

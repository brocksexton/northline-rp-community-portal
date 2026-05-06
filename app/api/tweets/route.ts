import { NextResponse } from 'next/server';
import { getTweets } from '@/lib/ape-data';
import { isSiteFeatureEnabled } from '@/lib/site-features-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isSiteFeatureEnabled('tweeter'))) return NextResponse.json({ ok: false, message: 'Tweeter is not enabled.' }, { status: 404 });
  const tweets = await getTweets();
  return NextResponse.json({ tweets });
}

import { NextResponse } from 'next/server';
import { getTweets } from '@/lib/ape-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  const tweets = await getTweets();
  return NextResponse.json({ tweets });
}

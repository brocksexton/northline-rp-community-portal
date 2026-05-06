import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/lib/embed-metadata';

export default function LeaderboardRedirectPage() {
  redirect('/leaderboards');
}

import { notFound, redirect } from 'next/navigation';
import { isSiteFeatureEnabled } from '@/lib/site-features-data';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ steamId: string }> };

export default async function PublicProfileAliasPage({ params }: Props) {
  if (!(await isSiteFeatureEnabled('players'))) notFound();

  const { steamId } = await params;
  if (!/^\d{15,20}$/.test(steamId)) notFound();
  redirect(`/tweeter/profile/${steamId}`);
}

import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ steamId: string }> };

export default async function PublicProfileAliasPage({ params }: Props) {
  const { steamId } = await params;
  if (!/^\d{15,20}$/.test(steamId)) notFound();
  redirect(`/tweeter/profile/${steamId}`);
}

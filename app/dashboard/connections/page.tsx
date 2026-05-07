import Link from 'next/link';
import { DiscordLinkPanel } from '@/components/DiscordLinkPanel';
import { getSessionSteamId } from '@/lib/session';
import { getDiscordLinkForSteamId } from '@/lib/forum-data';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Account Connections' };

export default async function ConnectionsPage() {
  const steamId = await getSessionSteamId();
  if (!steamId) return <main className="page-shell"><section className="card auth-panel"><span className="eyebrow">Connections</span><h1>Sign in required</h1><p>Sign in to manage account connections.</p><a className="button button-primary" href="/api/auth/steam?returnTo=/dashboard/connections"><i className="fa-brands fa-steam" /> Sign in with Steam</a></section></main>;
  const link = await getDiscordLinkForSteamId(steamId);
  return <main className="page-shell dashboard-page account-command-page"><section className="card account-subpage-heading"><span className="eyebrow">Connections</span><h1>Linked accounts and community bridges</h1><p>Connect Discord so forum posts, Discord sync, and future community features can identify you cleanly.</p><Link className="button button-soft" href="/dashboard"><i className="fa-solid fa-arrow-left" /> Back to profile hub</Link></section><DiscordLinkPanel initialLink={link} /><section className="layout-three"><article className="card"><span className="kicker">How it works</span><h2>Temporary key</h2><p>Generate a five-minute key, then run <code>/link your-code</code> in Discord or DM the bot.</p></article><article className="card"><span className="kicker">Forum sync</span><h2>Identity match</h2><p>Linked accounts let website posts and Discord forum activity resolve to the same citizen.</p></article><article className="card"><span className="kicker">Security</span><h2>One-time use</h2><p>Codes expire quickly and are consumed after linking.</p></article></section></main>;
}

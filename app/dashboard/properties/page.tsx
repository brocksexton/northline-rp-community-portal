import Link from 'next/link';
import { CharacterCard } from '@/components/CharacterCard';
import { getPhoneMessageSummary, getPlayer, getPropertyLayoutsForSteamId } from '@/lib/ape-data';
import { getSessionSteamId } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Character Data' };

export default async function PropertiesPage() {
  const steamId = await getSessionSteamId();
  if (!steamId) return <main className="page-shell"><section className="card auth-panel"><span className="eyebrow">Character data</span><h1>Sign in required</h1><p>Sign in to review your private character summaries.</p><a className="button button-primary" href="/api/auth/steam?returnTo=/dashboard/properties"><i className="fa-brands fa-steam" /> Sign in with Steam</a></section></main>;
  const [player, layouts, phoneSummary] = await Promise.all([getPlayer(steamId), getPropertyLayoutsForSteamId(steamId), getPhoneMessageSummary(steamId)]);
  return <main className="page-shell dashboard-page account-command-page"><section className="card account-subpage-heading"><span className="eyebrow">Character data</span><h1>Private summaries and saved layouts</h1><p>Owner-only information that helps you understand what the site knows about your character save.</p><Link className="button button-soft" href="/dashboard"><i className="fa-solid fa-arrow-left" /> Back to profile hub</Link></section><section className="layout-two"><CharacterCard player={player} steamId={steamId} layouts={layouts} /><article className="card"><div className="section-heading"><span className="kicker">Phone summary</span><h2>Private comms</h2><p>Only aggregate counts are shown here. Message bodies are not published on your profile.</p></div><dl className="metric-grid compact"><div><dt>Messages</dt><dd>{phoneSummary.messageCount}</dd></div><div><dt>Contacts</dt><dd>{phoneSummary.contactCount}</dd></div><div><dt>Unread-ish</dt><dd>{phoneSummary.unreadConversationCount}</dd></div><div><dt>Visibility</dt><dd>Owner</dd></div></dl></article></section><section className="card"><div className="section-heading"><span className="kicker">Properties</span><h2>Saved layouts</h2><p>Public profiles only show safe summaries when you choose to publish property sections.</p></div><div className="stack-list">{layouts.length ? layouts.map((layout) => <div key={`${layout.PropertyName}-${layout.LayoutName}`}><strong>{layout.LayoutName || 'Saved layout'}</strong><span>{layout.PropertyName || 'Unknown property'}</span><small>{(layout.Items?.length ?? 0).toLocaleString()} placed props</small></div>) : <div><strong>No layouts found</strong><span>Saved property layouts will appear here.</span></div>}</div></section></main>;
}

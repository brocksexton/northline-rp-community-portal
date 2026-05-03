import Link from 'next/link';
import { GUIDE_CATALOG, getGuideProgress } from '@/lib/ape-data';
import { getSessionSteamId } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Guides' };

const policyGuides = [
  { title: 'Roleplay standard', body: 'Play characters with believable motivations. Keep conflict grounded, give others room to respond, and avoid using outside information in-character.' },
  { title: 'Economy approach', body: 'The economy is meant to create stories, not just optimized grinding. Shops, property layouts, and jobs should create reasons for interaction.' },
  { title: 'Staff interaction', body: 'Staff tools exist to protect the city. Use tickets and appeals with context, timestamps, screenshots, and calm explanations.' },
  { title: 'Future web bridge', body: 'Website write features such as Tweeter posting should be bridge-backed, audited, and rate-limited before becoming public.' },
];

export default async function GuidesPage() {
  const steamId = await getSessionSteamId();
  const progress = steamId ? await getGuideProgress(steamId) : null;

  return (
    <main className="page-shell guides-page">
      <section className="hero split-hero">
        <div><span className="eyebrow">Onboarding</span><h1>Learn the city before you need staff help.</h1><p>Guides combine website explanations with Northbound RP guide progress written by the game server.</p></div>
        <aside className="card compact-card"><span>Your progress</span><strong>{progress ? `${progress.percent}%` : 'Sign in'}</strong><small>{progress ? `${progress.completed}/${progress.total} guides seen` : 'Connect Steam to track guides'}</small></aside>
      </section>

      <section className="guide-grid">
        {GUIDE_CATALOG.map((guide) => {
          const seen = progress?.seen.includes(guide.id) ?? false;
          return (
            <article className="card guide-card" key={guide.id}>
              <span className={`pill ${seen ? 'success' : 'neutral'}`}>{seen ? 'Seen in-game' : guide.category}</span>
              <h2>{guide.title}</h2>
              <p>{guide.body}</p>
              <small>Guide ID: <code>{guide.id}</code></small>
            </article>
          );
        })}
      </section>

      <section className="layout-two">
        <article className="card large-card">
          <span className="kicker">New player path</span>
          <h2>The recommended first session</h2>
          <ol className="step-list">
            <li><strong>Join Discord first.</strong><span>Read announcements, rules, and any active testing notes before connecting.</span></li>
            <li><strong>Connect to Northline RP in s&box.</strong><span>The game save becomes the source of truth for your profile.</span></li>
            <li><strong>Finish first_join and shop/property guides.</strong><span>These unlock the basics of social RP, economy, and storefront gameplay.</span></li>
            <li><strong>Return to the website.</strong><span>Use the dashboard to review your character, profile privacy, and next guide cards.</span></li>
          </ol>
        </article>
        <article className="card">
          <span className="kicker">Community principles</span>
          <div className="stack-list">
            {policyGuides.map((guide) => <div key={guide.title}><strong>{guide.title}</strong><span>{guide.body}</span></div>)}
          </div>
        </article>
      </section>

      <section className="card deployment-card">
        <div><span className="kicker">Need rules?</span><h2>Rules deserve their own page.</h2><p>The rules page is structured so you can replace the starter policy with your exact Discord/server policy later.</p></div>
        <Link className="button button-primary" href="/rules">Open rules</Link>
      </section>
    </main>
  );
}

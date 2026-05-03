export const metadata = { title: 'Support Northline' };

const allowed = ['Profile supporter badge', 'Cosmetic website themes', 'Extra public showcase slots', 'Opt-in supporter wall', 'Discord supporter role', 'Early access to website beta pages'];
const blocked = ['Money, items, XP, or weapons', 'Job, police, EMS, or government access', 'Property advantage', 'Combat or health advantage', 'Queue advantage that blocks free players', 'Moderation preference or reduced punishments'];

export default function SupportPage() {
  return (
    <main className="page-shell support-page">
      <section className="hero split-hero">
        <div><span className="eyebrow">Future support model</span><h1>Support without pay-to-win.</h1><p>This page is intentionally policy-first. It prepares the website for eventual donations without enabling checkout or selling gameplay power.</p></div>
        <aside className="card compact-card"><span>Status</span><strong>Not selling yet</strong><small>Build trust first, monetize later.</small></aside>
      </section>

      <section className="layout-two">
        <article className="card"><span className="kicker">Allowed supporter perks</span><h2>Cosmetic and community-facing</h2><div className="check-list">{allowed.map((item) => <p key={item}>✓ {item}</p>)}</div></article>
        <article className="card"><span className="kicker">Hard line</span><h2>Never sell gameplay power</h2><div className="check-list blocked">{blocked.map((item) => <p key={item}>✕ {item}</p>)}</div></article>
      </section>

      <section className="card large-card"><span className="kicker">Suggested public promise</span><h2>Donation policy copy</h2><p>Supporter perks are cosmetic and community-facing only. Donations help pay hosting and development costs; they do not buy in-game power, money, police access, property advantage, or moderation preference.</p></section>
    </main>
  );
}

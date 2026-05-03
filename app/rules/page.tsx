import Link from 'next/link';

export const metadata = { title: 'Rules' };

const rules = [
  { title: 'Respect roleplay boundaries', body: 'Stay in character where expected, avoid harassment, and do not use roleplay as a cover for targeted toxicity.' },
  { title: 'No metagaming or powergaming', body: 'Do not act on information your character could not know. Do not force outcomes without giving other players a fair chance to respond.' },
  { title: 'Value lives and consequences', body: 'Conflict should have escalation, stakes, and context. Treat combat and crime as story drivers, not default interactions.' },
  { title: 'Use staff channels properly', body: 'Bring evidence, timestamps, names, and clear descriptions. Do not turn OOC disputes into public drama.' },
  { title: 'No exploitation', body: 'Do not abuse bugs, economy loopholes, duplication, unsafe web endpoints, or file/state inconsistencies.' },
  { title: 'No pay-to-win expectations', body: 'Donations or supporter perks, if added later, will not buy in-game power, money, items, jobs, police access, property advantage, or moderation preference.' },
];

export default function RulesPage() {
  return (
    <main className="page-shell rules-page">
      <section className="hero split-hero">
        <div><span className="eyebrow">Community policy</span><h1>Northline RP rules starter.</h1><p>This page gives the website a professional rules destination. Replace or expand this with your final Discord/server rulebook when ready.</p></div>
        <aside className="card compact-card"><span>Appeals</span><strong>Use Discord</strong><small>Keep evidence and timestamps ready.</small></aside>
      </section>

      <section className="rule-list">
        {rules.map((rule, index) => <article className="card rule-card" key={rule.title}><span>{String(index + 1).padStart(2, '0')}</span><div><h2>{rule.title}</h2><p>{rule.body}</p></div></article>)}
      </section>

      <section className="card deployment-card"><div><span className="kicker">Moderation transparency</span><h2>Public bans are shown separately.</h2><p>The public ban list is intentionally sanitized. Staff evidence and private notes should remain staff-only.</p></div><Link className="button button-soft" href="/bans">View ban list</Link></section>
    </main>
  );
}

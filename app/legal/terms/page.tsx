import { getSiteConfig } from '@/lib/site-config';

export const metadata = { title: 'Terms of Conditions' };

export default async function TermsPage() {
  const config = await getSiteConfig();
  return (
    <main className="page-shell legal-page">
      <section className="legal-hero glass-card">
        <span className="eyebrow">Legal</span>
        <h1>{config.legal.termsTitle}</h1>
        <p>Last modified {config.legal.lastModified}. Edit this page from <code>config/site.config.json</code>.</p>
      </section>
      <section className="legal-section-list">
        {config.legal.termsSections.map((section) => (
          <article className="glass-card legal-section" key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </article>
        ))}
        <article className="glass-card legal-section">
          <h2>Contact</h2>
          <p>Questions about these terms can be sent to {config.legal.contactEmail}.</p>
        </article>
      </section>
    </main>
  );
}

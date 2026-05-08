import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildPageMetadata } from '@/lib/embed-metadata';
import { isSiteFeatureEnabled } from '@/lib/site-features-data';

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Shop',
    description: 'Northline RP supporter shop placeholder for future cosmetic or community-facing perks.',
    path: '/shop',
  });
}

export default async function ShopPage() {
  if (!(await isSiteFeatureEnabled('shop'))) notFound();
  const supportVisible = await isSiteFeatureEnabled('support');

  return (
    <main className="page-shell shop-page">
      <section className="card shop-placeholder-card">
        <span className="eyebrow">Shop</span>
        <h1>The shop is not ready yet.</h1>
        <p>This page is reserved for a future supporter shop. Any perks should stay cosmetic or community-facing.</p>
        <div className="staff-hero-actions">
          {supportVisible ? <Link className="button button-primary" href="/support"><i className="fa-solid fa-life-ring" aria-hidden="true" /> Support</Link> : null}
          <Link className="button button-soft" href="/"><i className="fa-solid fa-house" aria-hidden="true" /> Back home</Link>
        </div>
      </section>
    </main>
  );
}

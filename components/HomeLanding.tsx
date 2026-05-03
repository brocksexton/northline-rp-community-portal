import Link from 'next/link';

export function HomeLanding() {
  return (
    <section className="card">
      <span className="eyebrow">Northline RP</span>
      <h1>Northline community portal</h1>
      <p>The main homepage now renders directly from app/page.tsx.</p>
      <Link className="button button-primary" href="/">Open home</Link>
    </section>
  );
}

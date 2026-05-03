'use client';

import Link from 'next/link';

export function ErrorShell({ title = 'Something went wrong', message = 'The portal hit an unexpected error.', reset }: { title?: string; message?: string; reset?: () => void }) {
  return (
    <main className="page-shell">
      <section className="card auth-panel">
        <span className="eyebrow">Northline RP</span>
        <h1>{title}</h1>
        <p>{message}</p>
        <div className="button-row">
          {reset ? <button className="button button-primary" onClick={reset}>Try again</button> : null}
          <Link className="button button-soft" href="/">Return home</Link>
        </div>
      </section>
    </main>
  );
}

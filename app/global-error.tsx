'use client';

import './globals.css';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="page-shell">
          <section className="card auth-panel">
            <span className="eyebrow">Fatal error</span>
            <h1>Northline failed to load.</h1>
            <p>The app shell could not render. Try again, then check the server logs if this continues.</p>
            <button className="button button-primary" type="button" onClick={reset}>Try again</button>
          </section>
        </main>
      </body>
    </html>
  );
}

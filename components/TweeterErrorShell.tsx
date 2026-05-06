'use client';

import Link from 'next/link';

type Props = {
  statusCode?: string;
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  reset?: () => void;
};

export function TweeterErrorShell({
  statusCode = '404',
  title,
  message,
  actionLabel = 'Back to Tweeter',
  actionHref = '/tweeter',
  secondaryLabel = 'Northline home',
  secondaryHref = '/',
  reset,
}: Props) {
  return (
    <main className="tweeter-shell tweeter-error-shell">
      <section className="tweeter-error-card" aria-labelledby="tweeter-error-title">
        <div className="tweeter-error-mark" aria-hidden="true">
          <i className="fa-brands fa-twitter" />
        </div>
        <span className="tweeter-error-code">Tweeter · {statusCode}</span>
        <h1 id="tweeter-error-title">{title}</h1>
        <p>{message}</p>
        <div className="tweeter-error-search" aria-hidden="true">
          <i className="fa-solid fa-magnifying-glass" />
          <span>Search Tweeter</span>
        </div>
        <div className="tweeter-error-actions">
          {reset ? <button type="button" onClick={reset}>Try again</button> : <Link href={actionHref}>{actionLabel}</Link>}
          <Link href={secondaryHref}>{secondaryLabel}</Link>
        </div>
        <small>Posts, profiles, and messages keep their own Tweeter look even when a route is missing.</small>
      </section>
    </main>
  );
}

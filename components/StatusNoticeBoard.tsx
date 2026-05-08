'use client';

import { useEffect, useMemo, useState } from 'react';
import type { StatusUpdate } from '@/lib/community-data';
import { relativeFromDate } from '@/lib/format';

type Props = {
  updates: StatusUpdate[];
  supportHref?: string | null;
};

function noticeTone(tone: string) {
  if (tone === 'maintenance') return 'maintenance';
  if (tone === 'warning') return 'warning';
  if (tone === 'event') return 'event';
  return 'info';
}

function storageKey(id: string) {
  return `northline.status.notice.dismissed.${id}`;
}

export function StatusNoticeBoard({ updates, supportHref }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const hidden = new Set<string>();
    for (const update of updates) {
      try {
        if (window.localStorage.getItem(storageKey(update.id)) === '1') hidden.add(update.id);
      } catch {}
    }
    setDismissed(hidden);
  }, [updates]);

  const visibleUpdates = useMemo(() => updates.filter((update) => !dismissed.has(update.id)), [updates, dismissed]);

  function dismiss(id: string) {
    setDismissed((current) => new Set([...current, id]));
    try { window.localStorage.setItem(storageKey(id), '1'); } catch {}
  }

  return (
    <section className="status-command-notices" aria-label="Server notices and announcements">
      <div className="status-command-section-head">
        <div>
          <span className="kicker">Notices first</span>
          <h2>City board</h2>
        </div>
        <div className="status-command-head-actions">
          {dismissed.size > 0 ? <button type="button" onClick={() => {
            for (const update of updates) {
              try { window.localStorage.removeItem(storageKey(update.id)); } catch {}
            }
            setDismissed(new Set());
          }}>Show hidden</button> : null}
          {supportHref ? <a href={supportHref}>Need help?</a> : null}
        </div>
      </div>

      <div className="status-command-notice-stack">
        {visibleUpdates.length ? visibleUpdates.map((update) => (
          <article className={`status-command-notice tone-${noticeTone(update.tone)}`} key={update.id}>
            <div className="status-command-notice-icon"><i className={update.tone === 'maintenance' ? 'fa-solid fa-screwdriver-wrench' : update.tone === 'warning' ? 'fa-solid fa-triangle-exclamation' : update.tone === 'event' ? 'fa-solid fa-calendar-days' : 'fa-solid fa-circle-info'} aria-hidden="true" /></div>
            <div>
              <span>{update.tone}</span>
              <strong>{update.title}</strong>
              <p>{update.body}</p>
              <small>{relativeFromDate(update.createdAt)} · {update.createdByName}</small>
            </div>
            <button type="button" aria-label={`Dismiss ${update.title}`} onClick={() => dismiss(update.id)}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
          </article>
        )) : (
          <article className="status-command-notice tone-info is-empty">
            <div className="status-command-notice-icon"><i className="fa-solid fa-circle-check" aria-hidden="true" /></div>
            <div>
              <span>Clear</span>
              <strong>No active notices</strong>
              <p>No maintenance windows, incidents, or city-wide alerts are posted right now.</p>
              <small>Dismissed notices stay hidden on this device until they are restored.</small>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

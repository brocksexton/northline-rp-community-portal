'use client';

import { useMemo, useState } from 'react';
import type { ApeStaffState } from '@/lib/ape-staff-shared';

type Props = {
  initialState: ApeStaffState;
  canManage: boolean;
};

function idsToText(ids: string[]) {
  return ids.join('\n');
}

function normalizeText(value: string) {
  return value
    .split(/[\n,]/g)
    .map((item) => item.replace(/\D+/g, '').trim())
    .filter(Boolean);
}

export function ApeStaffAdminPanel({ initialState, canManage }: Props) {
  const [steamIdsText, setSteamIdsText] = useState(() => idsToText(initialState.staffSteamIds));
  const [state, setState] = useState(initialState);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const parsedIds = useMemo(() => {
    const seen = new Set<string>();
    return normalizeText(steamIdsText).filter((steamId) => {
      if (!/^\d{15,20}$/.test(steamId) || seen.has(steamId)) return false;
      seen.add(steamId);
      return true;
    });
  }, [steamIdsText]);

  async function save() {
    if (!canManage || busy) return;
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch('/api/staff/ape-staff', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ staffSteamIds: parsedIds }),
      });
      const data = await response.json().catch(() => ({})) as { ok?: boolean; state?: ApeStaffState; message?: string };
      if (!response.ok || !data.state) throw new Error(data.message || 'Could not save the Ape Tavern staff list.');
      setState(data.state);
      setSteamIdsText(idsToText(data.state.staffSteamIds));
      setNotice(`Saved ${data.state.staffSteamIds.length} Ape Tavern staff IDs.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save the Ape Tavern staff list.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="staff-panel ape-staff-panel">
      <div className="section-heading">
        <span className="kicker">Identity + security</span>
        <h2>Ape Tavern staff badge</h2>
        <p>Trusted SteamIDs in this list get the custom badge on Tweeter/profile pages and developer-level website access for protected staff tools.</p>
      </div>

      <div className="ape-staff-panel-body">
        <div className="ape-staff-badge-preview">
          <img src={state.badgeImagePath} alt="Ape Tavern staff badge" />
          <div>
            <strong>{state.badgeLabel}</strong>
            <small>Used instead of the normal verified check.</small>
          </div>
        </div>

        <label className="field-label">
          <span>Trusted SteamID64 list</span>
          <textarea
            value={steamIdsText}
            onChange={(event) => setSteamIdsText(event.target.value)}
            disabled={!canManage || busy}
            rows={10}
            spellCheck={false}
            placeholder="One SteamID64 per line"
          />
        </label>

        <div className="ape-staff-panel-meta">
          <span>{parsedIds.length} trusted IDs</span>
          <small>Updated {state.updatedAt ? new Date(state.updatedAt).toLocaleString() : 'Not yet'}{state.updatedBy ? ` by ${state.updatedBy}` : ''}</small>
        </div>

        {notice ? <p className={`notice ${notice.startsWith('Saved') ? 'success' : 'warning'}`}>{notice}</p> : null}

        <div className="staff-hero-actions">
          <button type="button" className="button button-primary" onClick={save} disabled={!canManage || busy}>{busy ? 'Saving…' : 'Save staff list'}</button>
          {!canManage ? <span className="muted-inline-note">Only Ape Tavern staff can edit this list.</span> : null}
        </div>
      </div>
    </article>
  );
}

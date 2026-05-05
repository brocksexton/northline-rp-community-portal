'use client';

import { useState } from 'react';
import type { getCasesState } from '@/lib/cases-data';
import { relativeFromDate } from '@/lib/format';

type CasesState = Awaited<ReturnType<typeof getCasesState>>;

type Props = {
  initialState: CasesState | null;
  signedIn: boolean;
};

function rarityLabel(value: string | undefined) {
  return value ? value[0]?.toUpperCase() + value.slice(1) : 'Reward';
}

export function CasesHub({ initialState, signedIn }: Props) {
  const [state, setState] = useState<CasesState | null>(initialState);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [lastRewardId, setLastRewardId] = useState<string | null>(null);

  async function mutate(action: 'claim' | 'open', caseItemId?: string) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, caseItemId }),
      });
      const payload = await response.json();
      if (payload.state) setState(payload.state);
      if (payload.reward) setLastRewardId(payload.reward.id);
      setMessage(payload.ok ? (action === 'claim' ? 'Case claimed. Open it now or save it for later.' : 'Case opened. Reward saved to your website inventory.') : payload.message ?? 'That did not work. Try again.');
    } catch {
      setMessage('Could not reach the case system. Try again in a minute.');
    } finally {
      setBusy(false);
    }
  }

  if (!signedIn || !state) {
    return (
      <section className="cases-guest-card">
        <div className="cases-guest-icon"><i className="fa-solid fa-gift" aria-hidden="true" /></div>
        <h2>Sign in to claim your daily case.</h2>
        <p>Every 24 hours, you can claim a free case and keep it in your website inventory until you feel like opening it.</p>
        <a className="button button-primary" href="/api/auth/steam?returnTo=/cases"><i className="fa-brands fa-steam" aria-hidden="true" /> Steam sign-in</a>
      </section>
    );
  }

  const unopened = state.inventory.filter((item) => !item.openedAt);
  const opened = state.inventory.filter((item) => item.openedAt);

  return (
    <>
      <section className="cases-hero">
        <div className="cases-hero-copy">
          <span className="kicker">Daily cases</span>
          <h1>A free check-in reward every 24 hours.</h1>
          <p>
            Claim your daily case, save it in your site inventory, or open it for a small reward. Nothing here is paid or pay-to-win;
            rewards wait for staff or a safe game bridge before they touch the live server.
          </p>
          <div className="cases-hero-actions">
            <button className="button button-primary" disabled={busy || !state.canClaim} type="button" onClick={() => mutate('claim')}>
              <i className="fa-solid fa-box-open" aria-hidden="true" /> {state.canClaim ? 'Claim daily case' : 'Daily case claimed'}
            </button>
            {!state.canClaim && state.claimAvailableAt ? <span>Next claim {relativeFromDate(state.claimAvailableAt)}</span> : null}
          </div>
          {message ? <p className="cases-message">{message}</p> : null}
        </div>
        <aside className="cases-summary-card">
          <div><strong>{state.unopenedCount}</strong><span>unopened</span></div>
          <div><strong>{state.openedCount}</strong><span>opened</span></div>
          <div><strong>{state.definitions.length}</strong><span>case type</span></div>
        </aside>
      </section>

      <section className="cases-layout">
        <div className="cases-main-panel">
          <header>
            <span className="kicker">Inventory</span>
            <h2>Your cases</h2>
            <p>Claiming and opening are separate, so you can stack cases and open them later.</p>
          </header>
          {unopened.length ? (
            <div className="case-inventory-grid">
              {unopened.map((item) => (
                <article className="case-card unopened" key={item.id}>
                  <span className="case-card-icon"><i className="fa-solid fa-box" aria-hidden="true" /></span>
                  <h3>{state.definitions.find((entry) => entry.id === item.caseId)?.label ?? 'Daily case'}</h3>
                  <p>Claimed {relativeFromDate(item.claimedAt)}</p>
                  <button className="button button-soft" disabled={busy} type="button" onClick={() => mutate('open', item.id)}>
                    Open case
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="cases-empty-box"><strong>No unopened cases.</strong><span>Claim one when your daily timer is ready.</span></div>
          )}
        </div>

        <aside className="cases-side-panel">
          <span className="kicker">Reward pool</span>
          <h2>{state.dailyCase.label}</h2>
          <p>{state.dailyCase.description}</p>
          <div className="case-reward-list">
            {state.dailyCase.rewards.map((reward) => (
              <div className={`case-reward-row rarity-${reward.rarity} ${lastRewardId === reward.id ? 'just-won' : ''}`} key={reward.id}>
                <i className={reward.icon} aria-hidden="true" />
                <span><strong>{reward.label}</strong><small>{rarityLabel(reward.rarity)} · {reward.description}</small></span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="cases-history-panel">
        <header>
          <span className="kicker">Reward history</span>
          <h2>Opened rewards</h2>
        </header>
        {opened.length ? (
          <div className="case-history-list">
            {opened.slice(0, 20).map((item) => (
              <article key={item.id}>
                <i className={item.reward?.icon ?? 'fa-solid fa-gift'} aria-hidden="true" />
                <span><strong>{item.reward?.label ?? 'Unknown reward'}</strong><small>{item.openedAt ? `Opened ${relativeFromDate(item.openedAt)}` : 'Opened recently'}</small></span>
                <em>{rarityLabel(item.reward?.rarity)}</em>
              </article>
            ))}
          </div>
        ) : <p>No opened rewards yet.</p>}
      </section>
    </>
  );
}

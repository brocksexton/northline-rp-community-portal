'use client';

import { useMemo, useState } from 'react';
import type { CaseRewardDefinition, getCasesState } from '@/lib/cases-data';
import { relativeFromDate } from '@/lib/format';

type CasesState = Awaited<ReturnType<typeof getCasesState>>;

type Props = {
  initialState: CasesState | null;
  signedIn: boolean;
};

type OpeningPhase = 'idle' | 'rolling' | 'revealed';

function rarityLabel(value: string | undefined) {
  return value ? value[0]?.toUpperCase() + value.slice(1) : 'Reward';
}

function rewardStripe(pool: CaseRewardDefinition[], winningReward?: CaseRewardDefinition | null) {
  if (!pool.length) return [] as CaseRewardDefinition[];
  const repeated: CaseRewardDefinition[] = Array.from({ length: 30 }, (_, index) => pool[index % pool.length]);
  if (winningReward && repeated.length > 18) repeated[18] = winningReward;
  return repeated;
}

export function CasesHub({ initialState, signedIn }: Props) {
  const [state, setState] = useState<CasesState | null>(initialState);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [lastRewardId, setLastRewardId] = useState<string | null>(null);
  const [openingPhase, setOpeningPhase] = useState<OpeningPhase>('idle');
  const [openingCaseName, setOpeningCaseName] = useState('Daily case');
  const [revealReward, setRevealReward] = useState<CaseRewardDefinition | null>(null);

  const reelRewards = useMemo(() => rewardStripe(state?.dailyCase.rewards ?? [], revealReward), [state?.dailyCase.rewards, revealReward]);

  async function claimCase() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'claim' }),
      });
      const payload = await response.json();
      if (payload.state) setState(payload.state);
      setMessage(payload.ok ? 'Case claimed. Open it now or save it for later.' : payload.message ?? 'That did not work. Try again.');
    } catch {
      setMessage('Could not reach the case system. Try again in a minute.');
    } finally {
      setBusy(false);
    }
  }

  async function openCase(caseItemId: string, caseName: string) {
    setBusy(true);
    setMessage('');
    setOpeningCaseName(caseName);
    setRevealReward(null);
    setOpeningPhase('rolling');
    const startedAt = Date.now();
    try {
      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'open', caseItemId }),
      });
      const payload = await response.json();
      const minimumSpinMs = 2400;
      const waitMs = Math.max(0, minimumSpinMs - (Date.now() - startedAt));
      window.setTimeout(() => {
        if (payload.state) setState(payload.state);
        if (payload.reward) {
          setRevealReward(payload.reward);
          setLastRewardId(payload.reward.id);
          setOpeningPhase('revealed');
          setMessage('Case opened. Reward saved to your website inventory.');
        } else {
          setOpeningPhase('idle');
          setMessage(payload.message ?? 'Could not open that case.');
        }
        setBusy(false);
      }, waitMs);
    } catch {
      window.setTimeout(() => {
        setOpeningPhase('idle');
        setBusy(false);
        setMessage('Could not reach the case system. Try again in a minute.');
      }, 900);
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
      {openingPhase !== 'idle' ? (
        <div className="case-opening-overlay" role="dialog" aria-modal="true" aria-labelledby="case-opening-title">
          <div className={`case-opening-modal ${openingPhase === 'revealed' ? 'revealed' : 'rolling'}`}>
            <button className="case-opening-close" type="button" disabled={openingPhase === 'rolling'} onClick={() => setOpeningPhase('idle')} aria-label="Close case reveal"><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
            <span className="kicker">Opening</span>
            <h2 id="case-opening-title">{openingCaseName}</h2>
            <div className="case-reel-window" aria-hidden="true">
              <div className="case-reel-marker" />
              <div className="case-reel-track">
                {reelRewards.map((reward, index) => (
                  <div className={`case-reel-prize rarity-${reward.rarity}`} key={`${reward.id}-${index}`}>
                    <i className={reward.icon} aria-hidden="true" />
                    <strong>{reward.label}</strong>
                    <span>{rarityLabel(reward.rarity)}</span>
                  </div>
                ))}
              </div>
            </div>
            {openingPhase === 'rolling' ? (
              <p className="case-opening-hint"><i className="fa-solid fa-dice" aria-hidden="true" /> Rolling your reward…</p>
            ) : revealReward ? (
              <div className={`case-reveal-card rarity-${revealReward.rarity}`}>
                <i className={revealReward.icon} aria-hidden="true" />
                <span>You got</span>
                <strong>{revealReward.label}</strong>
                <p>{revealReward.description}</p>
                <button className="button button-primary" type="button" onClick={() => setOpeningPhase('idle')}>Nice</button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <section className="cases-hero">
        <div className="cases-hero-copy">
          <span className="kicker">Daily cases</span>
          <h1>A free check-in reward every 24 hours.</h1>
          <p>
            Claim your daily case, save it in your site inventory, or open it for a small reward. Nothing here is paid or pay-to-win;
            rewards wait for staff or a safe game bridge before they touch the live server.
          </p>
          <div className="cases-hero-actions">
            <button className="button button-primary" disabled={busy || !state.canClaim} type="button" onClick={claimCase}>
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
              {unopened.map((item) => {
                const caseName = state.definitions.find((entry) => entry.id === item.caseId)?.label ?? 'Daily case';
                return (
                  <article className="case-card unopened" key={item.id}>
                    <span className="case-card-icon"><i className="fa-solid fa-box" aria-hidden="true" /></span>
                    <h3>{caseName}</h3>
                    <p>Claimed {relativeFromDate(item.claimedAt)}</p>
                    <button className="button button-soft" disabled={busy} type="button" onClick={() => openCase(item.id, caseName)}>
                      <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Open case
                    </button>
                  </article>
                );
              })}
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

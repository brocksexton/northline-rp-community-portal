'use client';

import { useMemo, useState } from 'react';
import type { CaseDefinition, CaseRewardDefinition, getCasesState } from '@/lib/cases-data';
import { relativeFromDate } from '@/lib/format';

type CasesState = Awaited<ReturnType<typeof getCasesState>>;

type Props = {
  initialState: CasesState | null;
  signedIn: boolean;
};

type OpeningPhase = 'idle' | 'rolling' | 'revealed';
type CaseTab = 'overview' | 'inventory' | 'shop' | 'rewards';

function rarityLabel(value: string | undefined) {
  return value ? value[0]?.toUpperCase() + value.slice(1) : 'Reward';
}

function rarityRank(value: string | undefined) {
  return value === 'legendary' ? 4 : value === 'rare' ? 3 : value === 'uncommon' ? 2 : 1;
}

function rewardStripe(pool: CaseRewardDefinition[], winningReward?: CaseRewardDefinition | null) {
  if (!pool.length) return [] as CaseRewardDefinition[];
  const sorted = [...pool].sort((a, b) => rarityRank(a.rarity) - rarityRank(b.rarity));
  const repeated: CaseRewardDefinition[] = Array.from({ length: 42 }, (_, index) => sorted[index % sorted.length]);
  if (winningReward && repeated.length > 30) repeated[30] = winningReward;
  return repeated;
}

function rewardOdds(reward: CaseRewardDefinition, pool: CaseRewardDefinition[]) {
  const total = pool.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  if (!total) return '0%';
  const value = Math.max(0, reward.weight) / total * 100;
  return value >= 10 ? `${Math.round(value)}%` : `${value.toFixed(1)}%`;
}

function caseLabelFor(itemCaseId: string, definitions: CaseDefinition[]) {
  return definitions.find((entry) => entry.id === itemCaseId)?.label ?? 'Daily case';
}

function caseDefinitionFor(itemCaseId: string, definitions: CaseDefinition[], fallback: CaseDefinition | null) {
  return definitions.find((entry) => entry.id === itemCaseId) ?? fallback;
}

function ShopCaseCard({ definition, primary }: { definition: CaseDefinition; primary?: boolean }) {
  const totalWeight = definition.rewards.reduce((sum, reward) => sum + Math.max(0, reward.weight), 0);
  const rareCount = definition.rewards.filter((reward) => reward.rarity === 'rare' || reward.rarity === 'legendary').length;
  return (
    <article className={`case-shop-card ${primary ? 'primary' : ''}`} style={{ ['--case-accent' as string]: definition.accent }}>
      <div className="case-shop-art" aria-hidden="true">
        <i className="fa-solid fa-box-open" />
      </div>
      <div className="case-shop-copy">
        <span>{primary ? 'Daily drop' : 'Configured case'}</span>
        <h3>{definition.label}</h3>
        <p>{definition.description}</p>
      </div>
      <dl>
        <div><dt>Rewards</dt><dd>{definition.rewards.length}</dd></div>
        <div><dt>Rare+</dt><dd>{rareCount}</dd></div>
        <div><dt>Weight</dt><dd>{totalWeight}</dd></div>
      </dl>
      <button className="button button-soft" type="button" disabled>
        <i className="fa-solid fa-store" aria-hidden="true" /> Shop prep only
      </button>
    </article>
  );
}

export function CasesHub({ initialState, signedIn }: Props) {
  const [state, setState] = useState<CasesState | null>(initialState);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [lastRewardId, setLastRewardId] = useState<string | null>(null);
  const [openingPhase, setOpeningPhase] = useState<OpeningPhase>('idle');
  const [openingCaseName, setOpeningCaseName] = useState('Daily case');
  const [openingRewards, setOpeningRewards] = useState<CaseRewardDefinition[]>([]);
  const [revealReward, setRevealReward] = useState<CaseRewardDefinition | null>(null);
  const [activeTab, setActiveTab] = useState<CaseTab>('overview');

  const dailyCase = state?.dailyCase ?? null;
  const definitions = state?.definitions ?? [];
  const unopened = state?.inventory.filter((item) => !item.openedAt) ?? [];
  const opened = state?.inventory.filter((item) => item.openedAt) ?? [];
  const latestReward = opened.find((item) => item.reward)?.reward ?? null;
  const reelRewards = useMemo(() => rewardStripe(openingRewards.length ? openingRewards : dailyCase?.rewards ?? [], revealReward), [dailyCase?.rewards, openingRewards, revealReward]);

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
      setMessage(payload.ok ? 'Case claimed. It has been added to your inventory vault.' : payload.message ?? 'That did not work. Try again.');
      if (payload.ok) setActiveTab('inventory');
    } catch {
      setMessage('Could not reach the case system. Try again in a minute.');
    } finally {
      setBusy(false);
    }
  }

  async function openCase(caseItemId: string, caseName: string, caseDefinition: CaseDefinition | null) {
    setBusy(true);
    setMessage('');
    setOpeningCaseName(caseName);
    setOpeningRewards(caseDefinition?.rewards ?? dailyCase?.rewards ?? []);
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
      const minimumSpinMs = 3250;
      const waitMs = Math.max(0, minimumSpinMs - (Date.now() - startedAt));
      window.setTimeout(() => {
        if (payload.state) setState(payload.state);
        if (payload.reward) {
          setRevealReward(payload.reward);
          setLastRewardId(payload.reward.id);
          setOpeningPhase('revealed');
          setActiveTab('rewards');
          setMessage('Case opened. Reward saved to your website inventory ledger.');
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
      <section className="cases-app cases-guest-app">
        <div className="cases-guest-card cases-pro-card">
          <div className="cases-guest-icon"><i className="fa-solid fa-gift" aria-hidden="true" /></div>
          <span className="kicker">Daily drops</span>
          <h2>Sign in to open your case vault.</h2>
          <p>Claim a free daily case, build a site inventory, preview reward pools, and come back for the upcoming case shop once testing is enabled.</p>
          <a className="button button-primary" href="/api/auth/steam?returnTo=/cases"><i className="fa-brands fa-steam" aria-hidden="true" /> Steam sign-in</a>
        </div>
      </section>
    );
  }

  if (!dailyCase) {
    return (
      <section className="cases-app cases-guest-app">
        <div className="cases-guest-card cases-pro-card">
          <div className="cases-guest-icon"><i className="fa-solid fa-gift" aria-hidden="true" /></div>
          <span className="kicker">Daily drops</span>
          <h2>Daily drops are not active right now.</h2>
          <p>Staff has hidden or retired the current drop pool. Check back later for the next public reward window.</p>
        </div>
      </section>
    );
  }

  return (
    <div className="cases-app">
      {openingPhase !== 'idle' ? (
        <div className="case-opening-overlay case-opening-overlay-v65" role="dialog" aria-modal="true" aria-labelledby="case-opening-title">
          <div className={`case-opening-modal case-opening-modal-v65 ${openingPhase === 'revealed' ? 'revealed' : 'rolling'}`}>
            <div className="case-stage-glow" aria-hidden="true" />
            <button className="case-opening-close" type="button" disabled={openingPhase === 'rolling'} onClick={() => setOpeningPhase('idle')} aria-label="Close case reveal"><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
            <div className="case-opening-title-row">
              <span className="kicker">Opening sequence</span>
              <strong>{openingPhase === 'rolling' ? 'Rolling reward pool' : 'Reward secured'}</strong>
            </div>
            <h2 id="case-opening-title">{openingCaseName}</h2>
            <div className="case-reel-window case-reel-window-v65" aria-hidden="true">
              <div className="case-reel-marker" />
              <div className="case-reel-track case-reel-track-v65">
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
              <div className="case-opening-hint case-opening-hint-v65">
                <i className="fa-solid fa-dice" aria-hidden="true" />
                <span>Rolling weighted rewards… the marker decides the drop.</span>
              </div>
            ) : revealReward ? (
              <div className={`case-reveal-card case-reveal-card-v65 rarity-${revealReward.rarity}`}>
                <i className={revealReward.icon} aria-hidden="true" />
                <span>{rarityLabel(revealReward.rarity)} reward</span>
                <strong>{revealReward.label}</strong>
                <p>{revealReward.description}</p>
                <button className="button button-primary" type="button" onClick={() => setOpeningPhase('idle')}>Add to ledger</button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <section className="cases-command-hero">
        <div className="cases-command-copy">
          <span className="kicker">Daily cases</span>
          <h1>Daily drops, case inventory, and rewards.</h1>
          <p>
            Claim a free case every {dailyCase.cadenceHours} hours, open it when you want, track your inventory, and preview upcoming reward pools.
          </p>
          <div className="cases-hero-actions">
            <button className="button button-primary" disabled={busy || !state.canClaim} type="button" onClick={claimCase}>
              <i className="fa-solid fa-box-open" aria-hidden="true" /> {state.canClaim ? 'Claim daily case' : 'Daily claimed'}
            </button>
            <button className="button button-soft" type="button" onClick={() => setActiveTab('inventory')}>
              <i className="fa-solid fa-warehouse" aria-hidden="true" /> Open inventory
            </button>
            <button className="button button-soft" type="button" onClick={() => setActiveTab('shop')}>
              <i className="fa-solid fa-store" aria-hidden="true" /> Preview shop
            </button>
          </div>
          {!state.canClaim && state.claimAvailableAt ? <p className="cases-next-claim">Next claim {relativeFromDate(state.claimAvailableAt)}</p> : null}
          {message ? <p className="cases-message cases-message-v65">{message}</p> : null}
        </div>

        <aside className="cases-claim-console">
          <div className="case-3d-box" aria-hidden="true"><i className="fa-solid fa-cube" /></div>
          <span>Today&apos;s drop</span>
          <strong>{dailyCase.label}</strong>
          <p>{dailyCase.description}</p>
          <dl>
            <div><dt>Unopened</dt><dd>{state.unopenedCount}</dd></div>
            <div><dt>Opened</dt><dd>{state.openedCount}</dd></div>
            <div><dt>Active cases</dt><dd>{definitions.length}</dd></div>
          </dl>
        </aside>
      </section>

      <section className="cases-status-grid" aria-label="Daily case status">
        <article><i className="fa-solid fa-clock" aria-hidden="true" /><span>Claim cadence</span><strong>{dailyCase.cadenceHours}h</strong><p>{state.canClaim ? 'Your free daily case is ready.' : 'Timer is cooling down.'}</p></article>
        <article><i className="fa-solid fa-boxes-stacked" aria-hidden="true" /><span>Vault inventory</span><strong>{unopened.length}</strong><p>Unopened cases waiting in your account vault.</p></article>
        <article><i className="fa-solid fa-trophy" aria-hidden="true" /><span>Rewards ledger</span><strong>{opened.length}</strong><p>Opened rewards saved for tracking and future bridge fulfillment.</p></article>
        <article><i className="fa-solid fa-store" aria-hidden="true" /><span>Shop prep</span><strong>{definitions.length}</strong><p>Configured public case pools ready for future shop testing.</p></article>
      </section>

      <nav className="cases-app-tabs" aria-label="Cases navigation">
        {[
          ['overview', 'Overview', 'fa-solid fa-layer-group'],
          ['inventory', 'Inventory', 'fa-solid fa-warehouse'],
          ['shop', 'Shop preview', 'fa-solid fa-store'],
          ['rewards', 'Reward ledger', 'fa-solid fa-scroll'],
        ].map(([id, label, icon]) => (
          <button className={activeTab === id ? 'active' : ''} key={id} type="button" onClick={() => setActiveTab(id as CaseTab)}>
            <i className={icon} aria-hidden="true" /> {label}
          </button>
        ))}
      </nav>

      {activeTab === 'overview' ? (
        <section className="cases-workspace-grid">
          <article className="cases-pro-card cases-featured-case" style={{ ['--case-accent' as string]: dailyCase.accent }}>
            <div className="cases-panel-heading">
              <span className="kicker">Featured drop</span>
              <h2>{dailyCase.label}</h2>
              <p>{dailyCase.description}</p>
            </div>
            <div className="case-preview-machine" aria-hidden="true">
              {dailyCase.rewards.slice(0, 5).map((reward) => <span className={`rarity-${reward.rarity}`} key={reward.id}><i className={reward.icon} /></span>)}
            </div>
            <div className="case-reward-list case-reward-list-v65">
              {dailyCase.rewards.map((reward) => (
                <div className={`case-reward-row rarity-${reward.rarity} ${lastRewardId === reward.id ? 'just-won' : ''}`} key={reward.id}>
                  <i className={reward.icon} aria-hidden="true" />
                  <span><strong>{reward.label}</strong><small>{rarityLabel(reward.rarity)} · {rewardOdds(reward, dailyCase.rewards)} estimated pool share · {reward.description}</small></span>
                </div>
              ))}
            </div>
          </article>

          <aside className="cases-pro-card cases-next-steps">
            <span className="kicker">How it works</span>
            <h2>Claim, open, track.</h2>
            <div className="cases-step-list">
              <div><strong>01</strong><span>Claim your free daily case when the timer is ready.</span></div>
              <div><strong>02</strong><span>Open now or save cases in your inventory vault.</span></div>
              <div><strong>03</strong><span>Rewards are recorded in your ledger for staff or bridge fulfillment later.</span></div>
              <div><strong>04</strong><span>The shop preview is ready for future paid/free case testing without enabling purchases yet.</span></div>
            </div>
          </aside>
        </section>
      ) : null}

      {activeTab === 'inventory' ? (
        <section className="cases-pro-card cases-inventory-panel">
          <div className="cases-panel-heading inline">
            <div>
              <span className="kicker">Inventory vault</span>
              <h2>Your unopened cases</h2>
              <p>Cases stay here until you decide to open them. Each one remembers which case pool it came from.</p>
            </div>
            <button className="button button-primary" disabled={busy || !state.canClaim} type="button" onClick={claimCase}>{state.canClaim ? 'Claim another' : 'Claim unavailable'}</button>
          </div>
          {unopened.length ? (
            <div className="case-inventory-grid case-inventory-grid-v65">
              {unopened.map((item) => {
                const caseDefinition = caseDefinitionFor(item.caseId, definitions, dailyCase);
                const caseName = caseLabelFor(item.caseId, definitions);
                return (
                  <article className="case-card case-card-v65 unopened" key={item.id} style={{ ['--case-accent' as string]: caseDefinition?.accent ?? dailyCase.accent }}>
                    <span className="case-card-icon"><i className="fa-solid fa-box" aria-hidden="true" /></span>
                    <span className="case-card-kicker">Unopened case</span>
                    <h3>{caseName}</h3>
                    <p>Claimed {relativeFromDate(item.claimedAt)}</p>
                    <button className="button button-soft" disabled={busy} type="button" onClick={() => openCase(item.id, caseName, caseDefinition)}>
                      <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Open with animation
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="cases-empty-box cases-empty-box-v65"><strong>No unopened cases.</strong><span>Claim one when your daily timer is ready, then come back here to open it.</span></div>
          )}
        </section>
      ) : null}

      {activeTab === 'shop' ? (
        <section className="cases-pro-card cases-shop-panel">
          <div className="cases-panel-heading inline">
            <div>
              <span className="kicker">Case shop preview</span>
              <h2>Shop foundation for upcoming case testing</h2>
              <p>This is a display-ready shop layer. Purchases are intentionally disabled until you decide how new cases should be earned or sold.</p>
            </div>
            <span className="cases-shop-pill"><i className="fa-solid fa-flask" aria-hidden="true" /> Testing mode</span>
          </div>
          <div className="cases-shop-grid">
            {definitions.map((definition) => <ShopCaseCard definition={definition} key={definition.id} primary={definition.id === dailyCase.id} />)}
          </div>
          <div className="cases-shop-roadmap">
            <strong>Shop preparation included</strong>
            <span>Cards, metadata, reward counts, rarity summaries, and disabled purchase CTAs are now in place for testing new public cases.</span>
          </div>
        </section>
      ) : null}

      {activeTab === 'rewards' ? (
        <section className="cases-pro-card cases-history-panel cases-history-panel-v65">
          <div className="cases-panel-heading inline">
            <div>
              <span className="kicker">Reward ledger</span>
              <h2>Opened rewards</h2>
              <p>Recent opened rewards are tracked here. This page does not grant items directly until a safe fulfillment bridge exists.</p>
            </div>
            {latestReward ? <span className={`cases-latest-reward rarity-${latestReward.rarity}`}>Latest: {latestReward.label}</span> : null}
          </div>
          {opened.length ? (
            <div className="case-history-list case-history-list-v65">
              {opened.slice(0, 30).map((item) => (
                <article className={`rarity-${item.reward?.rarity ?? 'common'}`} key={item.id}>
                  <i className={item.reward?.icon ?? 'fa-solid fa-gift'} aria-hidden="true" />
                  <span><strong>{item.reward?.label ?? 'Unknown reward'}</strong><small>{item.openedAt ? `Opened ${relativeFromDate(item.openedAt)}` : 'Opened recently'} · {caseLabelFor(item.caseId, definitions)}</small></span>
                  <em>{rarityLabel(item.reward?.rarity)}</em>
                </article>
              ))}
            </div>
          ) : <div className="cases-empty-box cases-empty-box-v65"><strong>No opened rewards yet.</strong><span>Open an inventory case to start your ledger.</span></div>}
        </section>
      ) : null}
    </div>
  );
}

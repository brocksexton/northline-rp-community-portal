import Link from 'next/link';
import { buildPageMetadata } from '@/lib/embed-metadata';
import { getPlayer, getPropertyLayoutsForSteamId, getServerConfig } from '@/lib/ape-data';
import { getSessionSteamId } from '@/lib/session';
import { buildBankView, formatBankAmount, statementIcon, trackedBankStats } from '@/lib/bank-view';
import { money, duration } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return buildPageMetadata({
    title: 'Northbound Bank',
    description: 'Private balance, wallet, inventory, and storage snapshot for your Northline RP character.',
    path: '/bank',
  });
}

function pct(filled: number, slots: number) {
  if (!slots) return 0;
  return Math.max(0, Math.min(100, Math.round((filled / slots) * 100)));
}

function secondsLabel(seconds: number | null) {
  return seconds == null ? 'Unknown' : duration(seconds);
}

export default async function BankPage() {
  const steamId = await getSessionSteamId();
  if (!steamId) {
    return (
      <main className="page-shell northbound-bank-page">
        <section className="bank-auth-card">
          <span className="bank-chip"><i className="fa-solid fa-building-columns" aria-hidden="true" /> Northbound Bank</span>
          <h1>Your account statement is private.</h1>
          <p>Sign in with Steam to view the balance and storage snapshot tied to your character save.</p>
          <div className="button-row">
            <a className="button button-primary" href="/api/auth/steam?returnTo=/bank"><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in with Steam</a>
            <Link className="button button-soft" href="/guides?guide=core-basics">Learn cash and storage basics</Link>
          </div>
        </section>
      </main>
    );
  }

  const [player, config, layouts] = await Promise.all([
    getPlayer(steamId),
    getServerConfig(),
    getPropertyLayoutsForSteamId(steamId),
  ]);
  const bank = buildBankView({ steamId, player, config, layouts });
  const stats = trackedBankStats(player);

  return (
    <main className="page-shell northbound-bank-page">
      <section className="bank-hero">
        <div>
          <span className="bank-chip"><i className="fa-solid fa-building-columns" aria-hidden="true" /> Northbound Bank</span>
          <h1>{bank.displayName}&apos;s account snapshot</h1>
          <p>
            A private banking-style view built from the game data Northline already has. Full transaction history will appear here once the server begins writing a proper ledger.
          </p>
          <div className="bank-hero-actions">
            <Link className="button button-primary" href="/guides?guide=core-basics"><i className="fa-solid fa-book-open-reader" aria-hidden="true" /> Cash & storage guide</Link>
            <Link className="button button-soft" href="/dashboard"><i className="fa-solid fa-sliders" aria-hidden="true" /> Profile studio</Link>
          </div>
        </div>
        <aside className="bank-card-preview" aria-label="Bank card preview">
          <span>Northbound Bank</span>
          <strong>{bank.hasGameSave ? bank.displayName : 'No character save'}</strong>
          <small>Steam {steamId.slice(-8)}</small>
          <b>{money(bank.balances.liquid)}</b>
          <em>Available liquid funds</em>
        </aside>
      </section>

      {!bank.hasGameSave ? (
        <section className="bank-notice-card">
          <i className="fa-solid fa-circle-info" aria-hidden="true" />
          <div>
            <strong>No game save found yet.</strong>
            <p>Join the server once, then come back here to see your bank balance, wallet cash, item storage, and property summaries.</p>
          </div>
        </section>
      ) : null}

      <section className="bank-balance-grid" aria-label="Balance summary">
        <article className="bank-balance-card primary">
          <span>Bank balance</span>
          <strong>{money(bank.balances.bank)}</strong>
          <small>Money stored safely in your account.</small>
        </article>
        <article className="bank-balance-card">
          <span>Wallet cash</span>
          <strong>{money(bank.balances.cash)}</strong>
          <small>Cash currently carried on your character.</small>
        </article>
        <article className="bank-balance-card">
          <span>Estimated net worth</span>
          <strong>{money(bank.balances.estimatedNetWorth)}</strong>
          <small>Bank + wallet + container cash + priced items.</small>
        </article>
        <article className="bank-balance-card muted">
          <span>Unvalued items</span>
          <strong>{bank.balances.unvaluedItems.toLocaleString()}</strong>
          <small>Items without price data in the current export.</small>
        </article>
      </section>

      <section className="bank-layout-grid">
        <article className="bank-panel bank-statement-panel">
          <div className="bank-panel-heading">
            <span className="bank-kicker">Statement preview</span>
            <h2>Known records</h2>
            <p>This is a snapshot, not a purchase ledger. It uses current save data and clearly marks what is known.</p>
          </div>
          <div className="bank-statement-list">
            {bank.statement.map((entry) => (
              <div className={`bank-statement-row tone-${entry.kind}`} key={`${entry.kind}-${entry.label}`}>
                <i className={statementIcon(entry.kind)} aria-hidden="true" />
                <span><strong>{entry.label}</strong><small>{entry.detail}</small></span>
                <b>{formatBankAmount(entry.amount)}</b>
              </div>
            ))}
          </div>
        </article>

        <aside className="bank-panel bank-insights-panel">
          <div className="bank-panel-heading">
            <span className="bank-kicker">Account notes</span>
            <h2>Useful context</h2>
          </div>
          <ul className="bank-insight-list">
            {bank.insights.map((insight) => <li key={insight}>{insight}</li>)}
          </ul>
          <dl className="bank-mini-metrics">
            <div><dt>Joined</dt><dd>{bank.joinedLabel}</dd></div>
            <div><dt>Tax rate</dt><dd>{bank.limits.taxRate == null ? 'Unknown' : `${Math.round(bank.limits.taxRate * 100)}%`}</dd></div>
            <div><dt>Salary interval</dt><dd>{secondsLabel(bank.limits.salaryIntervalSeconds)}</dd></div>
            <div><dt>Rent interval</dt><dd>{secondsLabel(bank.limits.rentIntervalSeconds)}</dd></div>
          </dl>
        </aside>
      </section>

      <section className="bank-layout-grid reverse">
        <article className="bank-panel">
          <div className="bank-panel-heading">
            <span className="bank-kicker">Storage</span>
            <h2>Where your things are</h2>
            <p>Item locations are grouped from your current save. Nested containers are counted in the holdings list below.</p>
          </div>
          <div className="bank-storage-list">
            {bank.storage.length ? bank.storage.map((bucket) => (
              <div className="bank-storage-row" key={bucket.key}>
                <div>
                  <strong>{bucket.label}</strong>
                  <span>{bucket.description}</span>
                </div>
                <div className="bank-storage-meter" aria-label={`${bucket.filled} of ${bucket.slots} slots used`}>
                  <i style={{ width: `${pct(bucket.filled, bucket.slots)}%` }} />
                </div>
                <b>{bucket.filled}/{bucket.slots || '—'}</b>
              </div>
            )) : <div className="bank-empty-state"><strong>No storage slots found</strong><span>Your save does not currently expose inventory or mailbox storage slots.</span></div>}
          </div>
        </article>

        <aside className="bank-panel">
          <div className="bank-panel-heading">
            <span className="bank-kicker">Property footprint</span>
            <h2>Saved spaces</h2>
          </div>
          <dl className="bank-big-pair">
            <div><dt>Saved layouts</dt><dd>{bank.properties.savedLayouts.toLocaleString()}</dd></div>
            <div><dt>Placed props</dt><dd>{bank.properties.placedProps.toLocaleString()}</dd></div>
            <div><dt>Container cash</dt><dd>{money(bank.balances.containerCash)}</dd></div>
            <div><dt>Mailbox slots</dt><dd>{bank.limits.publicMailboxSlots ?? 'Unknown'}</dd></div>
          </dl>
        </aside>
      </section>

      <section className="bank-panel">
        <div className="bank-panel-heading">
          <span className="bank-kicker">Holdings</span>
          <h2>Top items currently visible to the bank</h2>
          <p>Only values with known configured prices can be estimated. Everything else is counted but not assigned a dollar value.</p>
        </div>
        <div className="bank-holdings-grid">
          {bank.topHoldings.length ? bank.topHoldings.map((item) => (
            <article className="bank-holding-card" key={item.label}>
              <strong>{item.label}</strong>
              <span>{item.count.toLocaleString()} held</span>
              <b>{item.estimatedValue == null ? 'No value data' : money(item.estimatedValue)}</b>
              {item.flags.length ? <small>{item.flags.join(' · ')}</small> : <small>standard item</small>}
            </article>
          )) : <div className="bank-empty-state"><strong>No held items found</strong><span>Inventory and storage items will appear here when present in your save.</span></div>}
        </div>
      </section>

      <section className="bank-layout-grid">
        <article className="bank-panel">
          <div className="bank-panel-heading">
            <span className="bank-kicker">Character economy stats</span>
            <h2>Activity signals</h2>
            <p>These are not transactions, but they can explain parts of your economy story when the game tracks them.</p>
          </div>
          <div className="bank-stat-chip-grid">
            {stats.length ? stats.map((stat) => <div key={stat.label}><span>{stat.label}</span><strong>{stat.value.toLocaleString()}</strong></div>) : <div><span>No extra stats</span><strong>—</strong></div>}
          </div>
        </article>
        <aside className="bank-panel bank-ledger-roadmap">
          <div className="bank-panel-heading">
            <span className="bank-kicker">Future ledger</span>
            <h2>What this page is ready for</h2>
          </div>
          <p>Once the server starts logging economy events, this page can become a proper bank statement with ATM deposits, withdrawals, rent payments, store purchases, courier payouts, salaries, shop sales, mayor tax effects, and cash transfers.</p>
        </aside>
      </section>
    </main>
  );
}

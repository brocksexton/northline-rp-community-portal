import type { ReactNode } from 'react';
import type { PublicProfileView } from '@/lib/profile-view';

type VisibleModule = 'economy' | 'inventory' | 'stats' | 'properties' | 'activity';

function EmptyShowcase({ compact }: { compact: boolean }) {
  return (
    <section className={`profile-showcase-section ${compact ? 'compact' : ''}`}>
      <article className="profile-showcase-card wide empty-showcase-card">
        <span>Public information</span>
        <strong>No gameplay modules published</strong>
        <p>This citizen has not opted into showing economy, inventory, stats, property, or activity details.</p>
      </article>
    </section>
  );
}

export function ProfileShowcasePanels({
  profile,
  compact = false,
  modules,
  showEmpty = true,
}: {
  profile: PublicProfileView;
  compact?: boolean;
  modules?: VisibleModule[];
  showEmpty?: boolean;
}) {
  if (profile.privacy === 'private') {
    return showEmpty ? <EmptyShowcase compact={compact} /> : null;
  }

  const allowed = new Set<VisibleModule>(modules ?? ['economy', 'inventory', 'stats', 'properties', 'activity']);
  const cards: ReactNode[] = [];

  if (allowed.has('economy') && profile.economy) {
    cards.push(
      <article className="profile-showcase-card economy-card" key="economy">
        <span>Economy</span>
        <strong>{profile.economy.total}</strong>
        <dl>
          <div><dt>Wallet</dt><dd>{profile.economy.cash}</dd></div>
          <div><dt>Bank</dt><dd>{profile.economy.bank}</dd></div>
        </dl>
      </article>,
    );
  }

  if (allowed.has('inventory') && profile.inventory) {
    cards.push(
      <article className="profile-showcase-card inventory-card" key="inventory">
        <span>Inventory</span>
        <strong>{profile.inventory.totalSlots.toLocaleString()} occupied slots</strong>
        <div className="profile-chip-list">
          {profile.inventory.topItems.length ? profile.inventory.topItems.slice(0, compact ? 5 : 10).map((item) => (
            <em key={item.label}>{item.label} ×{item.count.toLocaleString()}</em>
          )) : <p>No public inventory items found.</p>}
        </div>
      </article>,
    );
  }

  if (allowed.has('stats') && profile.stats) {
    cards.push(
      <article className="profile-showcase-card stats-card" key="stats">
        <span>Stats</span>
        <strong>Level {profile.stats.level}</strong>
        <dl>
          <div><dt>XP</dt><dd>{profile.stats.xp.toLocaleString()}</dd></div>
          {profile.stats.topStats.slice(0, compact ? 4 : 8).map((stat) => (
            <div key={stat.key}><dt>{stat.label}</dt><dd>{stat.value.toLocaleString()}</dd></div>
          ))}
        </dl>
      </article>,
    );
  }

  if (allowed.has('properties') && profile.properties) {
    cards.push(
      <article className="profile-showcase-card properties-card" key="properties">
        <span>Properties</span>
        <strong>{profile.properties.totalLayouts.toLocaleString()} saved layouts</strong>
        <div className="profile-mini-list">
          {profile.properties.layouts.length ? profile.properties.layouts.slice(0, compact ? 3 : 6).map((layout) => (
            <div key={`${layout.propertyName}-${layout.layoutName}`}>
              <b>{layout.layoutName}</b>
              <small>{layout.propertyName} · {layout.propCount.toLocaleString()} props</small>
            </div>
          )) : <p>No public saved layouts found.</p>}
        </div>
      </article>,
    );
  }

  if (allowed.has('activity') && profile.activity) {
    cards.push(
      <article className="profile-showcase-card activity-card" key="activity">
        <span>Activity</span>
        <strong>{profile.activity.playtime}</strong>
        <dl>
          <div><dt>Joined</dt><dd>{profile.activity.joined}</dd></div>
          {profile.activity.health !== null ? <div><dt>Health</dt><dd>{Math.round(profile.activity.health)}%</dd></div> : null}
          {profile.activity.hunger !== null ? <div><dt>Hunger</dt><dd>{Math.round(profile.activity.hunger)}%</dd></div> : null}
          {profile.activity.thirst !== null ? <div><dt>Thirst</dt><dd>{Math.round(profile.activity.thirst)}%</dd></div> : null}
        </dl>
      </article>,
    );
  }

  if (!cards.length) return showEmpty ? <EmptyShowcase compact={compact} /> : null;

  return <section className={`profile-showcase-section ${compact ? 'compact' : ''}`}>{cards}</section>;
}

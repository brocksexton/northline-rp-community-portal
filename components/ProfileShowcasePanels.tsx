import type { PublicProfileView } from '@/lib/profile-view';

function LockCard({ label }: { label: string }) {
  return (
    <article className="profile-showcase-card locked">
      <span>{label}</span>
      <strong>Hidden</strong>
      <p>This section is not public on this citizen profile.</p>
    </article>
  );
}

export function ProfileShowcasePanels({ profile, compact = false }: { profile: PublicProfileView; compact?: boolean }) {
  const privateProfile = profile.privacy === 'private';

  if (privateProfile) {
    return (
      <section className="profile-showcase-section">
        <article className="profile-showcase-card wide locked">
          <span>Private profile</span>
          <strong>This citizen keeps gameplay details private.</strong>
          <p>Only basic identity is visible. Economy, inventory, stats, property, and activity modules are hidden.</p>
        </article>
      </section>
    );
  }

  return (
    <section className={`profile-showcase-section ${compact ? 'compact' : ''}`}>
      {profile.economy ? (
        <article className="profile-showcase-card economy-card">
          <span>Economy</span>
          <strong>{profile.economy.total}</strong>
          <dl>
            <div><dt>Wallet</dt><dd>{profile.economy.cash}</dd></div>
            <div><dt>Bank</dt><dd>{profile.economy.bank}</dd></div>
          </dl>
        </article>
      ) : <LockCard label="Economy" />}

      {profile.inventory ? (
        <article className="profile-showcase-card inventory-card">
          <span>Inventory</span>
          <strong>{profile.inventory.totalSlots.toLocaleString()} occupied slots</strong>
          <div className="profile-chip-list">
            {profile.inventory.topItems.length ? profile.inventory.topItems.slice(0, compact ? 5 : 10).map((item) => (
              <em key={item.label}>{item.label} ×{item.count.toLocaleString()}</em>
            )) : <p>No public inventory items found.</p>}
          </div>
        </article>
      ) : <LockCard label="Inventory" />}

      {profile.stats ? (
        <article className="profile-showcase-card stats-card">
          <span>Stats</span>
          <strong>Level {profile.stats.level}</strong>
          <dl>
            <div><dt>XP</dt><dd>{profile.stats.xp.toLocaleString()}</dd></div>
            {profile.stats.topStats.slice(0, compact ? 4 : 8).map((stat) => (
              <div key={stat.key}><dt>{stat.label}</dt><dd>{stat.value.toLocaleString()}</dd></div>
            ))}
          </dl>
        </article>
      ) : <LockCard label="Stats" />}

      {profile.properties ? (
        <article className="profile-showcase-card properties-card">
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
        </article>
      ) : <LockCard label="Properties" />}

      {profile.activity ? (
        <article className="profile-showcase-card activity-card">
          <span>Activity</span>
          <strong>{profile.activity.playtime}</strong>
          <dl>
            <div><dt>Joined</dt><dd>{profile.activity.joined}</dd></div>
            {profile.activity.health !== null ? <div><dt>Health</dt><dd>{Math.round(profile.activity.health)}%</dd></div> : null}
            {profile.activity.hunger !== null ? <div><dt>Hunger</dt><dd>{Math.round(profile.activity.hunger)}%</dd></div> : null}
            {profile.activity.thirst !== null ? <div><dt>Thirst</dt><dd>{Math.round(profile.activity.thirst)}%</dd></div> : null}
          </dl>
        </article>
      ) : <LockCard label="Activity" />}
    </section>
  );
}

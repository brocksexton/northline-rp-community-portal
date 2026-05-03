import type { PlayerSave, PropertyLayout } from '@/lib/ape-data';
import { countItems, getCitizenName, getLevel, getXp } from '@/lib/ape-data';
import { duration, money, percent, statLabel } from '@/lib/format';

type Props = {
  player: PlayerSave | null;
  steamId: string;
  layouts?: PropertyLayout[];
  publicView?: boolean;
};

function tracked(player: PlayerSave | null, key: string): number {
  return Number(player?.TrackedStats?.[key] ?? 0);
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="need-meter">
      <div><span>{label}</span><strong>{percent(safe)}</strong></div>
      <i style={{ width: `${safe}%` }} />
    </div>
  );
}

export function CharacterCard({ player, steamId, layouts = [], publicView = false }: Props) {
  if (!player) {
    return (
      <section className="card character-card">
        <span className="kicker">Character</span>
        <div className="empty-state">
          <strong>No save file match</strong>
          <p>Steam sign-in worked, but this SteamID64 was not found in player_save_data.json.</p>
          <code>{steamId}</code>
        </div>
      </section>
    );
  }

  const level = getLevel(player);
  const xp = getXp(player);
  const inventoryCount = countItems(player);
  const deaths = tracked(player, 'deaths');
  const topStats = Object.entries(player.TrackedStats ?? {})
    .filter(([key]) => !['bank_balance', 'level', 'xp_earned', 'playtime_mins'].includes(key))
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 4);

  return (
    <section className="card character-card">
      <div className="section-heading inline">
        <div>
          <span className="kicker">Citizen record</span>
          <h2>{getCitizenName(player, steamId)}</h2>
          <p>{player.DisplayTitle || 'Northline citizen'} · Level {level}</p>
        </div>
        <span className="level-pill">LVL {level}</span>
      </div>

      <dl className="metric-grid">
        {!publicView ? <div><dt>Wallet</dt><dd>{money(player.CashBalance)}</dd></div> : null}
        {!publicView ? <div><dt>Bank</dt><dd>{money(player.BankBalance)}</dd></div> : null}
        <div><dt>Playtime</dt><dd>{duration(player.TotalPlaytimeSeconds)}</dd></div>
        <div><dt>XP</dt><dd>{xp.toLocaleString()}</dd></div>
        <div><dt>Deaths</dt><dd>{deaths.toLocaleString()}</dd></div>
        <div><dt>Layouts</dt><dd>{layouts.length.toLocaleString()}</dd></div>
        {!publicView ? <div><dt>Items held</dt><dd>{inventoryCount.toLocaleString()}</dd></div> : null}
        <div><dt>Joined</dt><dd>{player.FirstJoinedUtc ? new Date(player.FirstJoinedUtc).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Unknown'}</dd></div>
      </dl>

      {!publicView ? (
        <div className="needs-grid">
          <ProgressBar label="Health" value={Number(player.Health ?? 0)} />
          <ProgressBar label="Hunger" value={Number(player.Hunger ?? 0)} />
          <ProgressBar label="Thirst" value={Number(player.Thirst ?? 0)} />
        </div>
      ) : null}

      {topStats.length ? (
        <div className="mini-list two-col">
          {topStats.map(([key, value]) => (
            <div key={key}><span>{statLabel(key)}</span><strong>{Number(value).toLocaleString()}</strong></div>
          ))}
        </div>
      ) : null}

      {layouts.length ? (
        <div className="property-strip">
          {layouts.slice(0, 3).map((layout) => (
            <article key={`${layout.PropertyName}-${layout.LayoutName}`}>
              <span>{layout.PropertyName || 'Property'}</span>
              <strong>{layout.LayoutName || 'Saved layout'}</strong>
              <small>{(layout.Items?.length ?? 0).toLocaleString()} props</small>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

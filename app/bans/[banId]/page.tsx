import Link from 'next/link';
import { notFound } from 'next/navigation';
import { UserAvatar } from '@/components/UserAvatar';
import { getBanRecords, getModerationProfile, type BanRecord, type ModerationTimelineAction } from '@/lib/ape-data';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ banId: string }> };

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return 'less than a minute';
}

function getStatus(ban: BanRecord) {
  if (ban.revokedAt) return { label: 'Expired', tone: 'expired', detail: `Lifted ${formatDateTime(ban.revokedAt)}` };
  if (ban.isPermanent || !ban.expiresAt) return { label: 'Permanent', tone: 'permanent', detail: 'No scheduled expiry' };
  const remaining = new Date(ban.expiresAt).getTime() - Date.now();
  if (remaining <= 0) return { label: 'Expired', tone: 'expired', detail: 'Time served' };
  return { label: 'Active', tone: 'active', detail: `${formatCountdown(remaining)} remaining` };
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function countByType(actions: ModerationTimelineAction[]) {
  return {
    bans: actions.filter((action) => action.type === 'ban').length,
    warnings: actions.filter((action) => action.type === 'warning').length,
    kicks: actions.filter((action) => action.type === 'kick').length,
  };
}

function actionTone(type: ModerationTimelineAction['type']) {
  if (type === 'ban') return 'active';
  if (type === 'warning') return 'warning';
  if (type === 'kick') return 'kick';
  if (type === 'unban') return 'expired';
  return 'permanent';
}

function TimelineRow({ action }: { action: ModerationTimelineAction }) {
  return (
    <article className="ban-timeline-row">
      <div>
        <span className={`ban-state-pill ${actionTone(action.type)}`}>{action.label}</span>
        <strong>{formatDateTime(action.createdAt)}</strong>
      </div>
      <p>{action.reason || 'No reason provided'}</p>
      <div className="ban-timeline-staff">
        <UserAvatar src={action.staffAvatarUrl ?? null} name={action.staffName || 'Staff'} size="sm" />
        <span>{action.staffName || 'Staff'}</span>
      </div>
    </article>
  );
}

export async function generateMetadata({ params }: Params) {
  const { banId } = await params;
  const records = await getBanRecords();
  const ban = records.find((record) => record.id === decodeURIComponent(banId));
  return { title: ban ? `${ban.playerName} ban record` : 'Ban record' };
}

export default async function BanDetailPage({ params }: Params) {
  const { banId } = await params;
  const records = await getBanRecords();
  const matchedBan = records.find((record) => record.id === decodeURIComponent(banId));
  if (!matchedBan) notFound();
  const ban = matchedBan as BanRecord;

  const status = getStatus(ban);
  const profile = await getModerationProfile(ban.steamId);
  const currentCreatedAt = new Date(ban.createdAt).getTime();
  const priorActions = profile.timeline.filter((action) => new Date(action.createdAt).getTime() < currentCreatedAt);
  const prior = countByType(priorActions);
  const visibleTimeline = profile.timeline.slice(0, 12);

  return (
    <main className="page-shell ban-detail-shell">
      <Link className="ban-back-link" href="/bans">← Back to ban list</Link>

      <section className="ban-detail-hero">
        <div className="ban-detail-person">
          <UserAvatar src={profile.avatarUrl ?? ban.avatarUrl ?? null} name={profile.playerName || ban.playerName} size="lg" />
          <div>
            <span className="nl-kicker"><i /> Moderation record</span>
            <h1>{profile.playerName || ban.playerName}</h1>
            <p>{ban.steamId}</p>
          </div>
        </div>
        <aside className="ban-detail-status-card">
          <span className={`ban-state-pill ${status.tone}`}>{status.label}</span>
          <strong>{status.detail}</strong>
          <small>{ban.isPermanent ? 'Permanent account action' : `Issued ${formatDateTime(ban.createdAt)}`}</small>
        </aside>
      </section>

      <section className="ban-detail-grid">
        <article className="ban-detail-panel ban-detail-main-panel">
          <span className="ban-detail-kicker">Current record</span>
          <h2>{ban.isPermanent ? 'Permanent ban' : 'Temporary ban'}</h2>
          <dl className="ban-detail-facts">
            <div><dt>Reason</dt><dd>{ban.reason || 'No reason provided'}</dd></div>
            <div><dt>Issued</dt><dd>{formatDateTime(ban.createdAt)}</dd></div>
            <div><dt>Expires</dt><dd>{ban.expiresAt ? formatDateTime(ban.expiresAt) : 'No scheduled expiry'}</dd></div>
            <div><dt>Issued by</dt><dd>{ban.staffName || 'Staff'}</dd></div>
          </dl>
        </article>

        <aside className="ban-detail-panel ban-context-panel">
          <span className="ban-detail-kicker">Player context</span>
          <h2>Prior history</h2>
          <div className="ban-context-stats">
            <div><span>Prior bans</span><strong>{prior.bans}</strong></div>
            <div><span>Prior warnings</span><strong>{prior.warnings}</strong></div>
            <div><span>Prior kicks</span><strong>{prior.kicks}</strong></div>
          </div>
          <p>This is meant to give context, not to dogpile someone. Counts only reflect data the website can read from the server exports.</p>
        </aside>
      </section>

      <section className="ban-detail-panel ban-total-panel">
        <div className="ban-list-header compact">
          <div><h2>Recorded moderation history</h2><p>{profile.totals.totalActions} total visible actions for this player</p></div>
          <span>{profile.totals.activeBans} active ban{profile.totals.activeBans === 1 ? '' : 's'}</span>
        </div>
        <div className="ban-total-stats">
          <div><span>Bans</span><strong>{profile.totals.bans}</strong></div>
          <div><span>Warnings</span><strong>{profile.totals.warnings}</strong></div>
          <div><span>Kicks</span><strong>{profile.totals.kicks}</strong></div>
          <div><span>Mutes</span><strong>{profile.totals.mutes}</strong></div>
        </div>
        {visibleTimeline.length ? (
          <div className="ban-timeline-list">{visibleTimeline.map((action) => <TimelineRow key={action.id} action={action} />)}</div>
        ) : (
          <div className="ban-empty-state"><strong>No extra context found</strong><p>The current ban exists, but the connected data folder does not include additional warnings, kicks, mutes, or unban records for this player.</p></div>
        )}
      </section>
    </main>
  );
}

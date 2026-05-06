import Link from 'next/link';
import { CharacterCard } from '@/components/CharacterCard';
import { ProfileSettingsForm } from '@/components/ProfileSettingsForm';
import { UserAvatar } from '@/components/UserAvatar';
import { getAllGuideProgress, getCitizenName, getGuideProgress, getPermissionsForSteamId, getPhoneMessageSummary, getPlayer, getPropertyLayoutsForSteamId, getRecentAdminLogs, getRecentChatLogs, getRecentDamageLogs, getRoleForSteamId, GUIDE_CATALOG } from '@/lib/ape-data';
import { getCommunityProfile } from '@/lib/community-data';
import { duration, fullDate, relativeFromDate } from '@/lib/format';
import { createProfileEditToken, getSessionSteamId } from '@/lib/session';
import { getSteamProfile } from '@/lib/steam-openid';
import { enabledFeatureIds, getSiteFeatureSettings } from '@/lib/site-features-data';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const steamId = await getSessionSteamId();

  if (!steamId) {
    return (
      <main className="page-shell">
        <section className="card auth-panel">
          <span className="eyebrow">Dashboard</span>
          <h1>Steam sign-in required</h1>
          <p>Northline links your SteamID64 to your Northbound RP character save, role permissions, guide progress, property layouts, and public profile settings.</p>
          <div className="button-row">
            <a className="button button-primary" href="/api/auth/steam?returnTo=/dashboard"><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in with Steam</a>
            {process.env.ENABLE_DEV_STEAM_LOGIN === 'true' ? <a className="button button-ghost" href="/api/auth/steam?dev=1&returnTo=/dashboard">Dev login</a> : null}
          </div>
        </section>
      </main>
    );
  }

  const [player, role, permissions, steamProfile, layouts, communityProfile, guideProgress, phoneSummary, chatLogs, adminLogs, damageLogs, featureSettings] = await Promise.all([
    getPlayer(steamId),
    getRoleForSteamId(steamId),
    getPermissionsForSteamId(steamId),
    getSteamProfile(steamId),
    getPropertyLayoutsForSteamId(steamId),
    getCommunityProfile(steamId),
    getGuideProgress(steamId),
    getPhoneMessageSummary(steamId),
    getRecentChatLogs(50),
    getRecentAdminLogs(50),
    getRecentDamageLogs(50),
    getSiteFeatureSettings(),
  ]);

  const displayName = getCitizenName(player, steamId);
  const avatar = communityProfile?.customAvatarUrl || steamProfile?.avatarFull || steamProfile?.avatarMedium;
  const ownChat = chatLogs.filter((log) => String(log.SenderSteamId) === steamId).slice(0, 5);
  const ownAdmin = adminLogs.filter((log) => String(log.TargetSteamId) === steamId || String(log.AdminSteamId) === steamId).slice(0, 5);
  const ownDamage = damageLogs.filter((log) => String(log.VictimSteamId) === steamId || String(log.AttackerSteamId ?? '') === steamId).slice(0, 5);
  const missingGuides = GUIDE_CATALOG.filter((guide) => guideProgress.missing.includes(guide.id));
  const enabledFeatures = enabledFeatureIds(featureSettings);
  const tweeterVisible = enabledFeatures.has('tweeter');
  const guidesVisible = enabledFeatures.has('guides');

  return (
    <main className="page-shell dashboard-page">
      <section className="dashboard-hero card dashboard-studio-hero">
        <div className="profile-headline dashboard-studio-headline">
          <UserAvatar src={avatar} name={displayName} size="xl" />
          <div>
            <span className="eyebrow">Citizen dashboard</span>
            <h1>{displayName}</h1>
            <p>{steamProfile?.personaName ? `Steam: ${steamProfile.personaName}` : steamId} · {role} · {permissions.length} permissions</p>
            <div className="button-row">
              {tweeterVisible ? <Link className="button button-primary" href={`/tweeter/profile/${steamId}`}>View public profile</Link> : null}
              {guidesVisible ? <Link className="button button-soft" href="/guides">Continue onboarding</Link> : null}
            </div>
          </div>
        </div>
        <aside className="role-card dashboard-studio-progress">
          <span>Guide progress</span>
          <strong>{guideProgress.percent}%</strong>
          <small>{guideProgress.completed}/{guideProgress.total} guides seen</small>
          <div className="dashboard-progress-bar" aria-hidden="true"><span style={{ width: `${guideProgress.percent}%` }} /></div>
        </aside>
      </section>

      <section className="layout-two dashboard-layout">
        <CharacterCard player={player} steamId={steamId} layouts={layouts} />
        <ProfileSettingsForm profile={communityProfile} profileEditToken={createProfileEditToken(steamId)} role={role} steamId={steamId} displayName={displayName} fallbackAvatar={avatar} tweeterVisible={tweeterVisible} />
      </section>

      <section className="layout-three">
        <article className="card">
          <div className="section-heading"><span className="kicker">Properties</span><h2>Saved layouts</h2><p>Public profiles show only safe summaries unless you keep your profile private.</p></div>
          <div className="stack-list">
            {layouts.length ? layouts.slice(0, 5).map((layout) => <div key={`${layout.PropertyName}-${layout.LayoutName}`}><strong>{layout.LayoutName || 'Saved layout'}</strong><span>{layout.PropertyName || 'Unknown property'}</span><small>{(layout.Items?.length ?? 0).toLocaleString()} placed props</small></div>) : <div><strong>No layouts found</strong><span>Saved property layouts will appear here.</span></div>}
          </div>
        </article>

        <article className="card">
          <div className="section-heading"><span className="kicker">Phone summary</span><h2>Private comms</h2><p>The portal summarizes phone data for you only; message bodies are not exposed publicly.</p></div>
          <dl className="metric-grid compact">
            <div><dt>Messages</dt><dd>{phoneSummary.messageCount}</dd></div>
            <div><dt>Contacts</dt><dd>{phoneSummary.contactCount}</dd></div>
            <div><dt>Unread-ish</dt><dd>{phoneSummary.unreadConversationCount}</dd></div>
            <div><dt>Privacy</dt><dd>Owner only</dd></div>
          </dl>
        </article>

        <article className="card">
          <div className="section-heading"><span className="kicker">Next steps</span><h2>Onboarding</h2><p>Use in-game guide progress to make the website useful for new and returning players.</p></div>
          <div className="stack-list">
            {missingGuides.length ? missingGuides.slice(0, 4).map((guide) => <div key={guide.id}><strong>{guide.title}</strong><span>{guide.body}</span><small>{guide.category}</small></div>) : <div><strong>All core guides seen</strong><span>You are caught up on the current guide catalog.</span></div>}
          </div>
        </article>
      </section>

      <section className="layout-three">
        <article className="card">
          <div className="section-heading"><span className="kicker">Recent chat</span><h2>Your messages</h2></div>
          <div className="stack-list compact-stack">
            {ownChat.length ? ownChat.map((log) => <div key={`${log.Timestamp}-${log.Message}`}><strong>{log.Type}</strong><span>{log.Message}</span><small>{relativeFromDate(log.Timestamp)}</small></div>) : <div><strong>No recent chat found</strong><span>Your recent chat logs will appear here for your own account.</span></div>}
          </div>
        </article>
        <article className="card">
          <div className="section-heading"><span className="kicker">Moderation/admin</span><h2>Related actions</h2></div>
          <div className="stack-list compact-stack">
            {ownAdmin.length ? ownAdmin.map((log) => <div key={`${log.Timestamp}-${log.ActionType}`}><strong>{log.ActionType}</strong><span>{log.Details || 'No details'}</span><small>{fullDate(log.Timestamp)}</small></div>) : <div><strong>No related admin actions</strong><span>Actions involving your account will appear here.</span></div>}
          </div>
        </article>
        <article className="card">
          <div className="section-heading"><span className="kicker">Damage timeline</span><h2>Recent incidents</h2></div>
          <div className="stack-list compact-stack">
            {ownDamage.length ? ownDamage.map((log) => <div key={`${log.Timestamp}-${log.Cause}`}><strong>{log.Cause || 'Damage'}</strong><span>{log.VictimName} took {Math.round(Number(log.Damage ?? 0))} damage</span><small>{log.IsFatal ? 'Fatal · ' : ''}{relativeFromDate(log.Timestamp)}</small></div>) : <div><strong>No recent damage logs</strong><span>Recent damage involving your account will appear here.</span></div>}
          </div>
        </article>
      </section>
    </main>
  );
}

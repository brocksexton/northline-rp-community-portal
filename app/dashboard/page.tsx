import Link from 'next/link';
import { CharacterCard } from '@/components/CharacterCard';
import { UserAvatar } from '@/components/UserAvatar';
import { getCitizenName, getGuideProgress, getPermissionsForSteamId, getPhoneMessageSummary, getPlayer, getPropertyLayoutsForSteamId, getRoleForSteamId } from '@/lib/ape-data';
import { getCommunityProfile } from '@/lib/community-data';
import { createProfileEditToken, getSessionSteamId } from '@/lib/session';
import { getSteamProfile } from '@/lib/steam-openid';
import { enabledFeatureIds, getSiteFeatureSettings } from '@/lib/site-features-data';
import { getDiscordLinkForSteamId } from '@/lib/forum-data';

export const dynamic = 'force-dynamic';

type StudioCard = { href: string; icon: string; kicker: string; title: string; body: string; metric: string; cta: string; tone?: string };

export default async function DashboardPage() {
  const steamId = await getSessionSteamId();
  if (!steamId) {
    return (
      <main className="page-shell">
        <section className="card auth-panel">
          <span className="eyebrow">Profile studio</span>
          <h1>Steam sign-in required</h1>
          <p>Sign in to manage your public profile, Discord connection, saved layouts, privacy, and personal account tools.</p>
          <div className="button-row">
            <a className="button button-primary" href="/api/auth/steam?returnTo=/dashboard"><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in with Steam</a>
            {process.env.ENABLE_DEV_STEAM_LOGIN === 'true' ? <a className="button button-ghost" href="/api/auth/steam?dev=1&returnTo=/dashboard">Dev login</a> : null}
          </div>
        </section>
      </main>
    );
  }

  const [player, role, permissions, steamProfile, layouts, profile, guideProgress, phoneSummary, featureSettings, discordLink] = await Promise.all([
    getPlayer(steamId), getRoleForSteamId(steamId), getPermissionsForSteamId(steamId), getSteamProfile(steamId), getPropertyLayoutsForSteamId(steamId), getCommunityProfile(steamId), getGuideProgress(steamId), getPhoneMessageSummary(steamId), getSiteFeatureSettings(), getDiscordLinkForSteamId(steamId),
  ]);
  const enabledFeatures = enabledFeatureIds(featureSettings);
  const tweeterVisible = enabledFeatures.has('tweeter');
  const guidesVisible = enabledFeatures.has('guides');
  const displayName = getCitizenName(player, steamId);
  const avatar = profile?.customAvatarUrl || steamProfile?.avatarFull || steamProfile?.avatarMedium;
  const publicModules = Object.values(profile?.showcase ?? {}).filter(Boolean).length;
  const cards: StudioCard[] = [
    { href: '/dashboard/profile', icon: 'fa-solid fa-sliders', kicker: profile?.privacy === 'public' ? 'Public profile' : 'Private profile', title: 'Profile appearance', body: 'Edit your bio, cover, avatar, accent color, Tweeter look, and what game details appear publicly.', metric: `${publicModules} visible sections`, cta: 'Open profile studio' },
    { href: '/dashboard/connections', icon: 'fa-brands fa-discord', kicker: discordLink ? 'Discord linked' : 'Discord not linked', title: 'Connections', body: 'Link your Discord account for forum identity, synced conversations, and future community integrations.', metric: discordLink ? discordLink.discordUsername : 'Generate a key', cta: 'Manage connections', tone: 'discord' },
    { href: '/bank', icon: 'fa-solid fa-building-columns', kicker: 'Private banking', title: 'Northbound Bank', body: 'Review your current wallet, bank balance, storage snapshot, item holdings, and economy context from your character save.', metric: player ? `$${Math.round(Number(player.CashBalance ?? 0) + Number(player.BankBalance ?? 0)).toLocaleString()}` : 'No save yet', cta: 'Open bank', tone: 'bank' },
    { href: '/dashboard/properties', icon: 'fa-solid fa-building', kicker: 'Character data', title: 'Properties and private summaries', body: 'Review saved layouts, phone summary, and safe owner-only character snapshots without crowding the editor.', metric: `${layouts.length} saved layouts`, cta: 'View character data' },
    { href: '/dashboard/activity', icon: 'fa-solid fa-clock-rotate-left', kicker: 'Personal history', title: 'Activity center', body: 'Check recent chat, admin/moderation records involving your account, and recent damage incidents.', metric: 'Owner only', cta: 'Open activity' },
  ];

  return (
    <main className="page-shell dashboard-page account-command-page">
      <section className="dashboard-hero card dashboard-studio-hero account-command-hero">
        <div className="profile-headline dashboard-studio-headline">
          <UserAvatar src={avatar} name={displayName} size="xl" />
          <div>
            <span className="eyebrow">Profile studio</span>
            <h1>{displayName}</h1>
            <p>{steamProfile?.personaName ? `Steam: ${steamProfile.personaName}` : steamId} · {role} · {permissions.length} permissions</p>
            <div className="button-row">
              <Link className="button button-primary" href="/dashboard/profile"><i className="fa-solid fa-pen-to-square" aria-hidden="true" /> Edit profile</Link>
              {tweeterVisible ? <Link className="button button-soft" href={`/tweeter/profile/${steamId}`}>View public profile</Link> : null}
              {guidesVisible ? <Link className="button button-soft" href="/guides">Continue onboarding</Link> : null}
            </div>
          </div>
        </div>
        <aside className="role-card dashboard-studio-progress account-health-card">
          <span>Setup progress</span>
          <strong>{guideProgress.percent}%</strong>
          <small>{guideProgress.completed}/{guideProgress.total} guides seen · {profile?.privacy === 'public' ? 'Profile public' : 'Profile private'}</small>
          <div className="dashboard-progress-bar" aria-hidden="true"><span style={{ width: `${guideProgress.percent}%` }} /></div>
        </aside>
      </section>

      <section className="account-workspace-grid" aria-label="Profile studio workspaces">
        {cards.map((card) => (
          <Link href={card.href} className={`account-workspace-card ${card.tone ? `tone-${card.tone}` : ''}`} key={card.href}>
            <span className="account-workspace-icon"><i className={card.icon} aria-hidden="true" /></span>
            <span className="kicker">{card.kicker}</span>
            <h2>{card.title}</h2>
            <p>{card.body}</p>
            <div><strong>{card.metric}</strong><span>{card.cta} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></span></div>
          </Link>
        ))}
      </section>

      <section className="account-overview-grid">
        <CharacterCard player={player} steamId={steamId} layouts={layouts} />
        <article className="card account-next-card">
          <div className="section-heading"><span className="kicker">Quick actions</span><h2>Most-used account tools</h2><p>Profile tools are split into focused rooms so each page has room to breathe.</p></div>
          <div className="account-action-list">
            <Link href="/dashboard/profile"><i className="fa-solid fa-palette" /> Customize public profile</Link>
            <Link href="/dashboard/connections"><i className="fa-brands fa-discord" /> Link Discord</Link>
            <Link href="/dashboard/properties"><i className="fa-solid fa-box-archive" /> Review private data</Link>
            <Link href="/bank"><i className="fa-solid fa-building-columns" /> Open Northbound Bank</Link>
            <Link href="/dashboard/activity"><i className="fa-solid fa-shield-halved" /> Account activity</Link>
          </div>
          <dl className="metric-grid compact">
            <div><dt>Messages</dt><dd>{phoneSummary.messageCount}</dd></div>
            <div><dt>Contacts</dt><dd>{phoneSummary.contactCount}</dd></div>
            <div><dt>Layouts</dt><dd>{layouts.length}</dd></div>
            <div><dt>Discord</dt><dd>{discordLink ? 'Linked' : 'Open'}</dd></div>
          </dl>
        </article>
      </section>
    </main>
  );
}

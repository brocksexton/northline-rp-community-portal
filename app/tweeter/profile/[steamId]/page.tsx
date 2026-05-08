import type { CSSProperties } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProfileShowcasePanels } from '@/components/ProfileShowcasePanels';
import { UserAvatar } from '@/components/UserAvatar';
import { TweeterLikeButton } from '@/components/TweeterLikeButton';
import { TweeterFollowButton } from '@/components/TweeterFollowButton';
import { TweeterMessageButton } from '@/components/TweeterMessageButton';
import { TweeterMaintenanceProfileEditor } from '@/components/TweeterMaintenanceProfileEditor';
import { TweeterFilteredText, TweeterFilterNotice } from '@/components/TweeterFilteredText';
import { TweeterVerifiedBadge } from '@/components/TweeterVerifiedBadge';
import { getPlayer, getPropertyLayoutsForSteamId, getRoleForSteamId } from '@/lib/ape-data';
import { getCommunityProfile } from '@/lib/community-data';
import { buildPublicProfileView, type PublicProfileView } from '@/lib/profile-view';
import { getSessionSteamId } from '@/lib/session';
import { buildTweeterPayload, buildTweeterUser, type TweetView } from '@/lib/tweeter-view';
import { getProfileCoverPreset, PROFILE_THEMES } from '@/lib/profile-customization';
import type { TextFilterRule } from '@/lib/content-filter';
import { getMaintenanceSettings, isMaintenanceActive, isTweeterMaintenanceActive } from '@/lib/maintenance-data';
import { getFollowStates } from '@/lib/tweeter-social-data';
import { buildPageMetadata } from '@/lib/embed-metadata';

export const dynamic = 'force-dynamic';

type SearchParams = {
  tab?: string | string[];
};

type Params = {
  params: Promise<{ steamId: string }>;
  searchParams?: Promise<SearchParams>;
};


export async function generateMetadata({ params }: Pick<Params, 'params'>) {
  const { steamId } = await params;
  if (!/^\d{15,20}$/.test(steamId)) {
    return buildPageMetadata({
      title: 'Tweeter Profile',
      description: 'View a Northline RP Tweeter profile, public posts, and citizen information.',
      path: '/tweeter',
    });
  }

  try {
    const user = await buildTweeterUser(steamId);
    const handle = user.handle || `@${steamId.slice(-8)}`;
    const postCount = user.tweetCount ?? 0;
    return buildPageMetadata({
      title: `${user.displayName} ${handle}`,
      description: `${postCount.toLocaleString()} ${postCount === 1 ? 'post' : 'posts'} on Northline RP Tweeter. View public posts, profile details, and city activity.`,
      path: `/tweeter/profile/${steamId}`,
    });
  } catch {
    return buildPageMetadata({
      title: 'Tweeter Profile',
      description: 'View a Northline RP Tweeter profile, public posts, and citizen information.',
      path: `/tweeter/profile/${steamId}`,
    });
  }
}

type ProfileTab = 'tweets' | 'replies' | 'info';

function cleanTab(value: unknown): ProfileTab {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'replies' || raw === 'info') return raw;
  return 'tweets';
}

function formatShortDate(value?: string | null) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}


function formatPostCount(count: number) {
  return `${count.toLocaleString()} ${count === 1 ? 'post' : 'posts'}`;
}
function formatTweetTime(seconds: number) {
  if (!seconds) return 'Just now';
  const date = new Date(seconds * 1000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}


function cssUrl(value?: string | null) {
  const raw = value?.trim();
  if (!raw) return 'none';
  if (raw.startsWith('url(')) return raw;
  const safe = raw.replace(/\\/g, '\\\\').replace(/"/g, '\\\"');
  return `url("${safe}")`;
}

function profileCoverStyle(user: Awaited<ReturnType<typeof buildTweeterUser>>): CSSProperties {
  const preset = getProfileCoverPreset(user.coverPreset);
  const imageUrl = user.customCoverUrl || preset.imageUrl || '';
  const image = cssUrl(imageUrl);
  return {
    '--profile-cover-gradient': preset.gradient,
    '--profile-cover-image': image,
    '--profile-cover-accent': user.bannerColor || '#1d9bf0',
    backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${user.bannerColor || '#1d9bf0'} 18%, transparent), rgba(2,6,23,.34)), ${image}, ${preset.gradient}`,
  } as unknown as CSSProperties;
}

function profileCoverKind(user: Awaited<ReturnType<typeof buildTweeterUser>>) {
  if (user.customCoverUrl) return 'image';
  return getProfileCoverPreset(user.coverPreset).kind;
}

function profileThemeLabel(value?: string | null) {
  return PROFILE_THEMES.find((theme) => theme.id === value)?.label ?? 'Clean';
}

function ProfileTweet({ tweet, signedIn, disabledReason = '', contentFilterRules }: { tweet: TweetView; signedIn: boolean; disabledReason?: string; contentFilterRules?: TextFilterRule[] }) {
  return (
    <article className="tweet-card-v2">
      <div className="tweet-card-avatar"><UserAvatar src={tweet.avatarUrl ?? null} name={tweet.authorDisplayName} size="md" /></div>
      <div className="tweet-card-body">
        <div className="tweet-card-header">
          <div className="tweet-card-authorline">
            <Link href={`/tweeter/profile/${tweet.authorSteamId}`} className="tweet-author-link"><strong>{tweet.authorDisplayName}</strong><TweeterVerifiedBadge kind={tweet.verifiedKind} /></Link>
            <span>{tweet.handle}</span><span>·</span><span>{formatTweetTime(tweet.postedAtTimeSeconds)}</span>
          </div>
        </div>
        {tweet.isRetweet && tweet.retweetOfBody ? <blockquote className="tweet-quoted-card"><span>{tweet.retweetOfAuthorDisplayName}: </span><TweeterFilteredText text={tweet.retweetOfBody} rules={contentFilterRules} /></blockquote> : null}
        <div className="tweet-card-text"><TweeterFilteredText text={tweet.body} rules={contentFilterRules} /></div>
        <TweeterFilterNotice text={tweet.body} rules={contentFilterRules} compact />
        <footer className="tweet-actions-row">
          <Link href={`/tweeter/tweet/${tweet.id}`}><span>💬</span><small>{tweet.replyCount || ''}</small></Link>
          <button type="button" disabled title="Reposts require the future game bridge."><span>↻</span><small>{tweet.retweetCount || ''}</small></button>
          <TweeterLikeButton tweetId={tweet.id} initialLiked={tweet.likedByMe} initialCount={tweet.likeCount} signedIn={signedIn} disabledReason={disabledReason} />
          <Link href={`/tweeter/tweet/${tweet.id}`}><span>↗</span></Link>
        </footer>
      </div>
    </article>
  );
}

function ProfileTabs({ steamId, active }: { steamId: string; active: ProfileTab }) {
  const tabs: Array<{ id: ProfileTab; label: string }> = [
    { id: 'tweets', label: 'Tweets' },
    { id: 'replies', label: 'Replies' },
    { id: 'info', label: 'Info' },
  ];
  return (
    <nav className="tweeter-profile-tabs" aria-label="Profile tabs">
      {tabs.map((tab) => (
        <Link className={active === tab.id ? 'active' : ''} href={`/tweeter/profile/${steamId}${tab.id === 'tweets' ? '' : `?tab=${tab.id}`}`} key={tab.id}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function ProfileInfoTab({
  profile,
  user,
  posts,
  originals,
  replies,
}: {
  profile: PublicProfileView;
  user: Awaited<ReturnType<typeof buildTweeterUser>>;
  posts: number;
  originals: number;
  replies: number;
}) {
  const hasAnyModule = Boolean(profile.economy || profile.inventory || profile.stats || profile.properties || profile.activity);
  return (
    <section className="tweeter-profile-info-tab">
      <article className="tweeter-profile-info-card">
        <div className="tweeter-profile-section-title">
          <strong>Public profile information</strong>
          <span>{profile.hiddenSections.length ? `${profile.hiddenSections.length} modules hidden` : 'All modules public'}</span>
        </div>
        <dl className="tweeter-info-grid">
          <div><dt>Handle</dt><dd>{user.handle}</dd></div>
          <div><dt>Role</dt><dd>{profile.role || 'Citizen'}</dd></div>
          <div><dt>Title</dt><dd>{profile.title}</dd></div>
          <div><dt>Joined</dt><dd>{profile.activity?.joined ?? formatShortDate(user.joinedAt)}</dd></div>
          <div><dt>Playtime</dt><dd>{profile.activity?.playtime ?? (user.playtimeHours ? `${user.playtimeHours.toLocaleString()}h in city` : 'Hidden')}</dd></div>
          <div><dt>Posts</dt><dd>{posts.toLocaleString()}</dd></div>
          <div><dt>Originals</dt><dd>{originals.toLocaleString()}</dd></div>
          <div><dt>Replies</dt><dd>{replies.toLocaleString()}</dd></div>
          {profile.location ? <div><dt>Location</dt><dd>{profile.location}</dd></div> : null}
          {profile.websiteUrl ? <div><dt>Website</dt><dd><a href={profile.websiteUrl} rel="noreferrer" target="_blank">Open link</a></dd></div> : null}
        </dl>
      </article>

      {hasAnyModule ? (
        <div className="tweeter-profile-showcase-block inline-info-showcases">
          <div className="tweeter-profile-section-title">
            <strong>Published showcases</strong>
            <span>Opt-in gameplay details</span>
          </div>
          <ProfileShowcasePanels profile={profile} compact showEmpty={false} />
        </div>
      ) : (
        <article className="tweeter-empty-state profile-info-empty">
          <strong>No gameplay details published</strong>
          <p>This citizen has not opted into showing economy, inventory, stats, property, or activity details.</p>
        </article>
      )}
    </section>
  );
}

export default async function TweeterProfilePage({ params, searchParams }: Params) {
  const [{ steamId }, sessionSteamId] = await Promise.all([params, getSessionSteamId()]);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  if (!/^\d{15,20}$/.test(steamId)) notFound();

  const activeTab = cleanTab(resolvedSearchParams.tab);
  const payload = await buildTweeterPayload(sessionSteamId);
  const [user, player, role, layouts, communityProfile, maintenance, followStates] = await Promise.all([
    buildTweeterUser(steamId, payload.tweets),
    getPlayer(steamId),
    getRoleForSteamId(steamId),
    getPropertyLayoutsForSteamId(steamId),
    getCommunityProfile(steamId),
    getMaintenanceSettings(),
    getFollowStates(sessionSteamId, [steamId, ...payload.suggestions.map((suggestion) => suggestion.steamId)]),
  ]);
  const userTweets = payload.tweets
    .filter((tweet) => tweet.authorSteamId === steamId)
    .sort((a, b) => b.postedAtTimeSeconds - a.postedAtTimeSeconds);

  if (!user.displayName && !userTweets.length) notFound();

  const replyTweets = userTweets.filter((tweet) => tweet.isReply);
  const originalTweets = userTweets.filter((tweet) => !tweet.isReply);
  const isOwner = sessionSteamId === steamId;
  const publicProfile = buildPublicProfileView({ steamId, player, role, layouts, communityProfile, fallbackName: user.displayName });
  const privateForViewer = publicProfile.privacy === 'private' && !isOwner;
  const steamProfileUrl = `https://steamcommunity.com/profiles/${steamId}`;
  const visibleTweets = activeTab === 'replies' ? replyTweets : originalTweets;
  const publishedSections = [
    publicProfile.economy ? 'Economy' : null,
    publicProfile.inventory ? 'Inventory' : null,
    publicProfile.stats ? 'Stats' : null,
    publicProfile.properties ? 'Properties' : null,
    publicProfile.activity ? 'Activity' : null,
  ].filter(Boolean) as string[];
  const hiddenSectionText = publicProfile.hiddenSections.length ? publicProfile.hiddenSections.join(', ') : 'Nothing hidden';
  const joinedLabel = publicProfile.activity?.joined ?? formatShortDate(user.joinedAt);
  const roleLabel = user.verifiedKind && user.verifiedKind !== 'None' ? user.verifiedKind : (publicProfile.role || 'Citizen');
  const tweeterFallbackEditor = isOwner && isMaintenanceActive(maintenance) && maintenance.allowTweeterDuringMaintenance && !isTweeterMaintenanceActive(maintenance);
  const profileHasServerIdentity = !!user.hasPlayedInServer || !!user.joinedAt;
  const profileHasClaimedSiteProfile = Boolean(communityProfile);
  const viewerNeedsGameLogin = !!sessionSteamId && !(payload.currentUser?.hasPlayedInServer || payload.currentUser?.joinedAt);
  const viewerModerationLockReason = payload.currentUser?.actionLockReason ?? '';
  const viewerSocialLockReason = viewerNeedsGameLogin ? 'Log in to the Northline game server once before using Tweeter social actions.' : viewerModerationLockReason;
  const targetFollowLockReason = user.targetFollowLockReason ?? '';
  const targetMessageClaimLockReason = profileHasClaimedSiteProfile ? '' : 'This citizen has not signed into the website yet, so website DMs are locked for now.';
  const targetMessageLockReason = targetMessageClaimLockReason || user.targetMessageLockReason || '';
  const followActionLockReason = viewerSocialLockReason || targetFollowLockReason;
  const messageActionLockReason = viewerSocialLockReason || targetMessageLockReason;
  const ownerEditLockReason = !profileHasServerIdentity ? 'Join the Northline game server once before editing your Tweeter profile.' : (user.actionLockReason ?? '');
  const sidebarSuggestions = payload.suggestions.filter((suggestion) => suggestion.steamId !== steamId && !suggestion.hiddenFromTweeter).slice(0, 3);

  if (user.hiddenFromTweeter && !isOwner) {
    return (
      <main className="tweeter-shell">
        <div className="tweeter-detail-grid compact-private-profile">
          <section className="tweeter-main-column">
            <header className="tweeter-topbar">
              <div className="tweeter-title-row">
                <Link href="/tweeter" aria-label="Back to Tweeter">←</Link>
                <div><h1>Profile unavailable</h1><small>This account is not available on Tweeter</small></div>
              </div>
            </header>
            <section className="tweeter-private-profile-card moderated">
              <UserAvatar src={user.avatarUrl ?? null} name={user.displayName || 'Unavailable profile'} size="xl" />
              <span className="tweeter-badge danger">Restricted profile</span>
              <h1>This profile is currently hidden.</h1>
              <p>Staff has limited this Tweeter profile. Existing links may remain valid, but profile details, DMs, follows, and public discovery are unavailable.</p>
              <Link className="button button-primary" href="/tweeter">Return to Tweeter</Link>
            </section>
          </section>
        </div>
      </main>
    );
  }

  if (privateForViewer) {
    return (
      <main className="tweeter-shell">
        <div className="tweeter-detail-grid compact-private-profile">
          <section className="tweeter-main-column">
            <header className="tweeter-topbar">
              <div className="tweeter-title-row">
                <Link href="/tweeter" aria-label="Back to Tweeter">←</Link>
                <div><h1>Private profile</h1><small>This citizen controls their visibility</small></div>
              </div>
            </header>
            <section className="tweeter-private-profile-card">
              <UserAvatar src={user.avatarUrl ?? null} name={user.displayName || 'Private profile'} size="xl" />
              <span className="tweeter-badge">Private profile</span>
              <h1>This user’s profile is private.</h1>
              <p>Their Tweeter timeline and public gameplay information are hidden. Economy, inventory, stats, properties, and activity details are not visible.</p>
              <Link className="button button-primary" href="/tweeter">Return to Tweeter</Link>
            </section>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="tweeter-shell">
      <div className="tweeter-detail-grid">
        <section className="tweeter-main-column">
          <header className="tweeter-topbar">
            <div className="tweeter-title-row">
              <Link href="/tweeter" aria-label="Back to Tweeter">←</Link>
              <div><h1>{user.displayName}</h1><small>{formatPostCount(userTweets.length)}</small></div>
            </div>
          </header>

          <section className={`tweeter-profile-hero tweeter-profile-skin-${user.profileTheme ?? 'clean'}`}>
            <div className={`tweeter-profile-banner cover-kind-${profileCoverKind(user)}`} style={profileCoverStyle(user)} />
            <div className="tweeter-profile-main">
              <div className="tweeter-profile-avatar"><UserAvatar src={user.avatarUrl ?? null} name={user.displayName} size="xl" /></div>
              <div className="tweeter-profile-actions">
                {isOwner ? (ownerEditLockReason ? <button type="button" disabled title={ownerEditLockReason}>Locked</button> : <Link href={tweeterFallbackEditor ? '#tweeter-lite-edit' : '/dashboard'}>{tweeterFallbackEditor ? 'Lite Edit' : 'Edit profile'}</Link>) : <TweeterFollowButton targetSteamId={steamId} signedIn={!!sessionSteamId} initialFollowing={followStates[steamId]?.following ?? false} initialFollowerCount={followStates[steamId]?.followerCount ?? 0} disabledReason={followActionLockReason} />}
              </div>
            </div>
            <div className="tweeter-profile-copy">
              <h1>{user.displayName} <TweeterVerifiedBadge kind={user.verifiedKind} /></h1>
              <span>{user.handle}</span>
              <p>{publicProfile.bio || user.bio}</p>
              <div className="tweeter-profile-meta">
                {profileHasServerIdentity ? <span>📅 Joined {formatShortDate(user.joinedAt)}</span> : <span>🚧 Has not joined the game server yet</span>}
                {user.playtimeHours ? <span>🕒 {user.playtimeHours.toLocaleString()}h in city</span> : null}
                {user.title ? <span>🏷 {user.title}</span> : null}
                {publicProfile.location ? <span>📍 {publicProfile.location}</span> : null}
                {publicProfile.websiteUrl ? <a href={publicProfile.websiteUrl} rel="noreferrer" target="_blank">🔗 Website</a> : null}
                <a href={steamProfileUrl} rel="noreferrer" target="_blank"><i className="fa-brands fa-steam" aria-hidden="true" /> Steam</a>
                {publicProfile.privacy === 'private' ? <span>🔒 Private preview</span> : null}
              </div>
              <div className="tweeter-profile-stats">
                <span><strong>{userTweets.length.toLocaleString()}</strong> Posts</span>
                <span><strong>{(followStates[steamId]?.followerCount ?? 0).toLocaleString()}</strong> Followers</span>
                <span><strong>{(followStates[steamId]?.followingCount ?? 0).toLocaleString()}</strong> Following</span>
                <span><strong>{(user.likeCount ?? 0).toLocaleString()}</strong> Likes earned</span>
                <span><strong>{originalTweets.length.toLocaleString()}</strong> Originals</span>
                <span><strong>{replyTweets.length.toLocaleString()}</strong> Replies</span>
              </div>
            </div>
          </section>

          {user.moderationNotices?.length ? (
            <section className="tweeter-moderation-stack" aria-label="Account notices">
              {user.moderationNotices.map((notice) => (
                <article className={`tweeter-moderation-notice ${notice.level}`} key={`${notice.kind}-${notice.title}`}>
                  <i className={notice.kind === 'game' ? 'fa-solid fa-gavel' : 'fa-solid fa-shield-halved'} aria-hidden="true" />
                  <div>
                    <strong>{notice.title}</strong>
                    <p>{notice.message}</p>
                  </div>
                </article>
              ))}
            </section>
          ) : null}

          {profileHasClaimedSiteProfile && !profileHasServerIdentity ? (
            <section className="tweeter-server-lock-banner profile compact">
              <i className="fa-solid fa-circle-info" aria-hidden="true" />
              <div>
                <strong>Website profile only</strong>
                <p>{isOwner ? 'You have signed into the website, but you have not joined the Northline game server yet. Join once in-game to unlock profile editing, follows, messages, and likes.' : 'This user has signed into the website, but has not joined the Northline game server yet. Gameplay details stay limited until they play in-game.'}</p>
              </div>
            </section>
          ) : viewerSocialLockReason ? (
            <section className="tweeter-server-lock-banner profile compact">
              <i className="fa-solid fa-lock" aria-hidden="true" />
              <div>
                <strong>Unlock Tweeter actions</strong>
                <p>Join Northline RP in S&box once with your signed-in Steam account before using likes, follows, and messages on the website.</p>
              </div>
            </section>
          ) : null}

          {!profileHasClaimedSiteProfile && userTweets.length ? (
            <section className="tweeter-profile-claim-banner profile compact">
              <i className="fa-regular fa-id-card" aria-hidden="true" />
              <div>
                <strong>In-game Tweeter profile</strong>
                <p>{isOwner ? 'This Steam account has in-game Tweeter activity, but has not finished claiming a website profile yet. Open profile settings once to finish the website side.' : 'This citizen has posted from in-game Tweeter, but has not signed into the website yet. Their posts stay visible, but DMs and custom website profile details are limited.'}</p>
              </div>
            </section>
          ) : null}

          {tweeterFallbackEditor && profileHasServerIdentity ? <TweeterMaintenanceProfileEditor profile={communityProfile} role={role} displayName={user.displayName} /> : null}

          <ProfileTabs steamId={steamId} active={activeTab} />

          {activeTab === 'info' ? (
            <ProfileInfoTab profile={publicProfile} user={user} posts={userTweets.length} originals={originalTweets.length} replies={replyTweets.length} />
          ) : (
            <section className="tweeter-feed-list">
              {visibleTweets.length ? visibleTweets.map((tweet) => <ProfileTweet key={tweet.id} tweet={tweet} signedIn={!!sessionSteamId} disabledReason={viewerSocialLockReason} contentFilterRules={payload.contentFilterRules} />) : (
                <div className="tweeter-empty-state"><strong>No {activeTab === 'replies' ? 'replies' : 'tweets'} yet</strong><p>This citizen has no visible {activeTab === 'replies' ? 'replies' : 'original tweets'} in the current server data.</p></div>
              )}
            </section>
          )}
        </section>

        <aside className="tweeter-right-rail tweeter-detail-rail">
          <section className="tweeter-panel tweeter-profile-mini-card">
            <div className="tweeter-profile-mini-head">
              <UserAvatar src={user.avatarUrl ?? null} name={user.displayName} size="md" />
              <div>
                <strong>{user.displayName} <TweeterVerifiedBadge kind={user.verifiedKind} /></strong>
                <span>{user.handle}</span>
              </div>
            </div>
            <div className="tweeter-profile-mini-links">
              <a href={steamProfileUrl} rel="noreferrer" target="_blank"><i className="fa-brands fa-steam" aria-hidden="true" /> Steam</a>
              {isOwner ? (ownerEditLockReason ? <button type="button" disabled title={ownerEditLockReason}><i className="fa-solid fa-lock" aria-hidden="true" /> Locked</button> : <Link href={tweeterFallbackEditor ? '#tweeter-lite-edit' : '/dashboard'}><i className="fa-solid fa-palette" aria-hidden="true" /> {tweeterFallbackEditor ? 'Lite Edit' : 'Customize'}</Link>) : <TweeterMessageButton targetSteamId={steamId} targetName={user.displayName} signedIn={!!sessionSteamId} disabledReason={messageActionLockReason} />}
            </div>
            <details className="tweeter-profile-details-menu">
              <summary>
                <span>Profile details</span>
                <i className="fa-solid fa-chevron-down" aria-hidden="true" />
              </summary>
              <dl className="tweet-context-list tweeter-side-details">
                <div><dt>Role</dt><dd>{roleLabel}</dd></div>
                {publicProfile.title ? <div><dt>Title</dt><dd>{publicProfile.title}</dd></div> : null}
                <div><dt>Joined</dt><dd>{joinedLabel}</dd></div>
                {user.playtimeHours ? <div><dt>Time in city</dt><dd>{user.playtimeHours.toLocaleString()}h</dd></div> : null}
                <div><dt>Website profile</dt><dd>{profileHasClaimedSiteProfile ? 'Claimed' : 'Not claimed'}</dd></div>
                <div><dt>Profile look</dt><dd>{profileThemeLabel(user.profileTheme)}</dd></div>
                <div><dt>Posts</dt><dd>{userTweets.length.toLocaleString()}</dd></div>
                <div><dt>Followers</dt><dd>{(followStates[steamId]?.followerCount ?? 0).toLocaleString()}</dd></div>
                <div><dt>Following</dt><dd>{(followStates[steamId]?.followingCount ?? 0).toLocaleString()}</dd></div>
                <div><dt>Likes earned</dt><dd>{(user.likeCount ?? 0).toLocaleString()}</dd></div>
              </dl>
              <div className="tweeter-profile-shared-strip">
                <span>Shared on profile</span>
                <div>
                  {publishedSections.length ? publishedSections.map((section) => <small key={section}>{section}</small>) : <small>Basics only</small>}
                </div>
              </div>
              {publicProfile.hiddenSections.length ? <p className="tweeter-profile-muted-note">Hidden: {hiddenSectionText}</p> : null}
            </details>
          </section>
          <section className="tweeter-panel tweeter-follow-compact">
            <div className="tweeter-panel-header"><strong>Who to follow</strong></div>
            <div className="tweeter-suggestion-list">
              {sidebarSuggestions.length ? sidebarSuggestions.map((suggestion) => (
                <div className="tweeter-suggestion" key={suggestion.steamId}>
                  <Link href={`/tweeter/profile/${suggestion.steamId}`} className="tweeter-suggestion-main">
                    <UserAvatar src={suggestion.avatarUrl ?? null} name={suggestion.displayName} size="sm" />
                    <div><strong>{suggestion.displayName} <TweeterVerifiedBadge kind={suggestion.verifiedKind} /></strong><span>{suggestion.handle}</span></div>
                  </Link>
                  <TweeterFollowButton targetSteamId={suggestion.steamId} signedIn={!!sessionSteamId} initialFollowing={followStates[suggestion.steamId]?.following ?? false} initialFollowerCount={followStates[suggestion.steamId]?.followerCount ?? 0} compact disabledReason={viewerSocialLockReason} />
                </div>
              )) : <div className="tweeter-panel-empty">No public claimed profiles to suggest yet.</div>}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

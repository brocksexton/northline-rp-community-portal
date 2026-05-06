'use client';

import { type CSSProperties, useMemo, useState } from 'react';
import Link from 'next/link';
import { UserAvatar } from '@/components/UserAvatar';

export type PlayerDirectoryEntry = {
  steamId: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  bannerColor: string;
  coverImageUrl: string;
  coverGradient: string;
  role: string;
  title: string;
  bio: string;
  location: string;
  joinedLabel: string;
  lastSeenLabel: string;
  activityBucket: 'recent' | 'quiet' | 'unknown';
  tweetCount: number;
  publicModules: number;
  hasBio: boolean;
  isCurrentUser: boolean;
};

type DirectoryStats = {
  totalSaves: number;
  listedProfiles: number;
  privateProfiles: number;
  unclaimedSaves: number;
  onlineNow: number;
};

type SortMode = 'featured' | 'recent' | 'name' | 'posts';

type Props = {
  entries: PlayerDirectoryEntry[];
  roles: string[];
  stats: DirectoryStats;
  signedIn: boolean;
  currentUserListed: boolean;
  currentUserPrivate: boolean;
  currentUserRestricted?: boolean;
};

function roleLabel(role: string) {
  return role === 'User' ? 'Citizen' : role;
}

function entryScore(entry: PlayerDirectoryEntry) {
  return (entry.isCurrentUser ? 500 : 0)
    + (entry.activityBucket === 'recent' ? 80 : 0)
    + entry.publicModules * 15
    + Math.min(80, entry.tweetCount * 8)
    + (entry.hasBio ? 15 : 0)
    + (entry.role !== 'User' ? 20 : 0);
}


function bannerStyle(entry: PlayerDirectoryEntry): CSSProperties {
  if (entry.coverImageUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, .06), rgba(15, 23, 42, .26)), url(${entry.coverImageUrl}), ${entry.coverGradient}`,
      backgroundPosition: 'center',
      backgroundSize: 'cover',
      backgroundColor: entry.bannerColor,
    };
  }

  return {
    background: entry.coverGradient || `linear-gradient(135deg, ${entry.bannerColor}, #0ea5e9 55%, #111827)`,
  };
}

function chipsFor(entry: PlayerDirectoryEntry) {
  const chips = [roleLabel(entry.role)];
  if (entry.isCurrentUser) chips.push('You');
  if (entry.activityBucket === 'recent') chips.push('Recently around');
  if (entry.publicModules) chips.push(`${entry.publicModules} public section${entry.publicModules === 1 ? '' : 's'}`);
  if (entry.tweetCount) chips.push(`${entry.tweetCount} Tweeter post${entry.tweetCount === 1 ? '' : 's'}`);
  return chips.slice(0, 5);
}

export function PlayersDirectory({ entries, roles, stats, signedIn, currentUserListed, currentUserPrivate, currentUserRestricted = false }: Props) {
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [sort, setSort] = useState<SortMode>('featured');
  const [visibleCount, setVisibleCount] = useState(18);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return entries
      .filter((entry) => {
        if (role !== 'all' && entry.role !== role) return false;
        if (!normalizedQuery) return true;
        return [entry.displayName, entry.handle, entry.bio, entry.location, entry.role, entry.title]
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => {
        if (sort === 'name') return a.displayName.localeCompare(b.displayName);
        if (sort === 'recent') return (b.activityBucket === 'recent' ? 1 : 0) - (a.activityBucket === 'recent' ? 1 : 0) || entryScore(b) - entryScore(a);
        if (sort === 'posts') return b.tweetCount - a.tweetCount || entryScore(b) - entryScore(a);
        return entryScore(b) - entryScore(a) || a.displayName.localeCompare(b.displayName);
      });
  }, [entries, query, role, sort]);

  const shown = filteredEntries.slice(0, visibleCount);

  return (
    <>
      <section className="players-directory-hero">
        <div className="players-directory-copy">
          <span className="kicker">Citizen board</span>
          <h1>Meet Northline’s public citizens.</h1>
          <p>Browse claimed, discoverable profiles from citizens who chose to be on the board.</p>
          <div className="players-hero-actions">
            {signedIn ? (
              <Link className="button button-primary" href="/dashboard">
                <i className="fa-solid fa-id-card" aria-hidden="true" /> Edit my profile
              </Link>
            ) : (
              <a className="button button-primary" href="/api/auth/steam?returnTo=/dashboard">
                <i className="fa-solid fa-id-card" aria-hidden="true" /> Claim my profile
              </a>
            )}
            <Link className="button button-soft" href="/tweeter">
              <i className="fa-brands fa-twitter" aria-hidden="true" /> Open Tweeter
            </Link>
          </div>
        </div>
        <aside className="players-directory-scoreboard" aria-label="Directory summary">
          <div className="scoreboard-main">
            <span>On the board</span>
            <strong>{stats.listedProfiles.toLocaleString()}</strong>
            <p>{stats.onlineNow.toLocaleString()} online in the city</p>
          </div>
          <div className="scoreboard-grid">
            <div><strong>{stats.totalSaves.toLocaleString()}</strong><span>known citizens</span></div>
            <div><strong>{stats.privateProfiles.toLocaleString()}</strong><span>staying private</span></div>
            <div><strong>{stats.unclaimedSaves.toLocaleString()}</strong><span>not claimed yet</span></div>
          </div>
        </aside>
      </section>

      {signedIn && !currentUserListed ? (
        <section className={`players-directory-nudge ${currentUserPrivate ? 'private' : ''}`}>
          <div>
            <strong>{currentUserRestricted ? 'Your profile is restricted from the board.' : currentUserPrivate ? 'You are hidden from the board.' : 'You are not on the board yet.'}</strong>
            <p>
              {currentUserRestricted
                ? 'A staff or active ban restriction is keeping this account out of the public citizens directory.'
                : currentUserPrivate
                  ? 'Your profile is private, so nobody browsing this page can find you. Switch to public whenever you want to be listed.'
                  : 'Open your dashboard, publish your profile, and add a short bio if you want other citizens to find you here.'}
            </p>
          </div>
          {currentUserRestricted ? <Link className="button button-soft" href="/support">Contact staff</Link> : <Link className="button button-soft" href="/dashboard">Profile settings</Link>}
        </section>
      ) : null}

      <section className="players-directory-toolbar" aria-label="Filter public citizens">
        <label className="players-search-field">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(18); }} placeholder="Search citizens, bios, roles..." />
        </label>
        <label className="players-select-field">
          <span>Role</span>
          <select value={role} onChange={(event) => { setRole(event.target.value); setVisibleCount(18); }}>
            <option value="all">All roles</option>
            {roles.map((roleName) => <option key={roleName} value={roleName}>{roleLabel(roleName)}</option>)}
          </select>
        </label>
        <label className="players-select-field">
          <span>Sort</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
            <option value="featured">Featured</option>
            <option value="recent">Recently around</option>
            <option value="posts">Tweeter posts</option>
            <option value="name">Name</option>
          </select>
        </label>
      </section>

      <section className="players-directory-results-head">
        <div>
          <span className="kicker">Public citizens</span>
          <h2>{filteredEntries.length.toLocaleString()} citizen{filteredEntries.length === 1 ? '' : 's'} found</h2>
        </div>
        <p>Only public, unrestricted profiles appear here.</p>
      </section>

      {shown.length ? (
        <section className="players-directory-grid">
          {shown.map((entry) => (
            <article className={`public-citizen-card ${entry.isCurrentUser ? 'is-you' : ''}`} key={entry.steamId}>
              <div className="public-citizen-banner" style={bannerStyle(entry)} />
              <div className="public-citizen-body">
                <div className="public-citizen-avatar-row">
                  <UserAvatar src={entry.avatarUrl} name={entry.displayName} size="lg" />
                  <Link className="public-citizen-open" href={`/tweeter/profile/${entry.steamId}`} aria-label={`Open ${entry.displayName}'s profile`}>
                    <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                  </Link>
                </div>
                <div className="public-citizen-title-row">
                  <div>
                    <h3>{entry.displayName}</h3>
                    <span>{entry.handle}</span>
                  </div>
                  <em>{roleLabel(entry.role)}</em>
                </div>
                {entry.bio ? <p className="public-citizen-bio">{entry.bio}</p> : <p className="public-citizen-bio empty">No bio yet — just vibes and a public profile.</p>}
                <div className="public-citizen-meta">
                  {entry.location ? <span><i className="fa-solid fa-location-dot" aria-hidden="true" /> {entry.location}</span> : null}
                  <span><i className="fa-regular fa-calendar" aria-hidden="true" /> {entry.joinedLabel}</span>
                  <span><i className="fa-solid fa-signal" aria-hidden="true" /> {entry.lastSeenLabel}</span>
                </div>
                <div className="public-citizen-chips">
                  {chipsFor(entry).map((chip) => <span key={chip}>{chip}</span>)}
                </div>
                <Link className="button button-soft" href={`/tweeter/profile/${entry.steamId}`}>View profile</Link>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="players-directory-empty">
          <div className="empty-city-icon"><i className="fa-solid fa-people-arrows" aria-hidden="true" /></div>
          <h2>No public citizens found</h2>
          <p>Try clearing your search, or claim your own profile and be the first face on this part of the board.</p>
          {signedIn ? (
            <Link className="button button-primary" href="/dashboard">Open profile settings</Link>
          ) : (
            <a className="button button-primary" href="/api/auth/steam?returnTo=/dashboard">Sign in with Steam</a>
          )}
        </section>
      )}

      {filteredEntries.length > visibleCount ? (
        <div className="players-load-more">
          <button className="button button-soft" type="button" onClick={() => setVisibleCount((count) => count + 18)}>
            Show more citizens
          </button>
        </div>
      ) : null}

      <section className="players-directory-policy">
        <div>
          <i className="fa-solid fa-user-shield" aria-hidden="true" />
          <strong>You control whether you appear here</strong>
        </div>
        <p>
          The board only shows public, claimed, unrestricted profiles. Private citizens and restricted accounts stay hidden, and sensitive gameplay details never appear unless the player explicitly publishes that section.
        </p>
      </section>
    </>
  );
}

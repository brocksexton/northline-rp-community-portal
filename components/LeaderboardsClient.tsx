'use client';

import Link from 'next/link';
import { useMemo, useState, type CSSProperties } from 'react';
import { UserAvatar } from '@/components/UserAvatar';
import type { LeaderboardBoard, LeaderboardCategory, LeaderboardSummary } from '@/lib/leaderboard-data';
import { relativeFromDate } from '@/lib/format';

type Props = {
  summary: LeaderboardSummary;
  boards: LeaderboardBoard[];
};

const categoryOrder: LeaderboardCategory[] = ['Economy', 'Activity', 'Stats', 'Property', 'Tweeter', 'Learning'];

function bannerStyle(row: { coverImageUrl: string | null; coverGradient: string }): CSSProperties {
  if (row.coverImageUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, .05), rgba(15, 23, 42, .46)), url(${row.coverImageUrl}), ${row.coverGradient}`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  return { background: row.coverGradient };
}

function medal(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

export function LeaderboardsClient({ summary, boards }: Props) {
  const fallbackBoard: LeaderboardBoard = boards[0] ?? {
    id: 'tweetPosts',
    label: 'Tweeter posts',
    category: 'Tweeter',
    icon: 'fa-brands fa-twitter',
    description: 'No leaderboard data is available yet.',
    privacyNote: 'Profiles need to be public before they can appear here.',
    unit: 'posts',
    rows: [],
  };
  const firstBoard = boards.find((board) => board.rows.length) ?? fallbackBoard;
  const [activeBoardId, setActiveBoardId] = useState(firstBoard.id);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<LeaderboardCategory | 'All'>('All');

  const activeBoard = boards.find((board) => board.id === activeBoardId) ?? fallbackBoard;
  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return activeBoard.rows;
    return activeBoard.rows.filter((row) => [row.displayName, row.handle, row.role, row.title, row.bio]
      .some((value) => value.toLowerCase().includes(needle)));
  }, [activeBoard, query]);

  const visibleBoards = category === 'All' ? boards : boards.filter((board) => board.category === category);
  const topThree = activeBoard.rows.slice(0, 3);

  return (
    <>
      <section className="leaderboard-hero">
        <div className="leaderboard-hero-copy">
          <span className="kicker">City scoreboards</span>
          <h1>Leaderboards for the locals who opt in.</h1>
          <p>
            Compare money, playtime, building, Tweeter activity, stats, and more. Private profiles stay private,
            and some boards only show people who chose to share that kind of detail.
          </p>
          <div className="leaderboard-hero-actions">
            <Link className="button button-primary" href="/dashboard"><i className="fa-solid fa-sliders" aria-hidden="true" /> Manage my profile</Link>
            <Link className="button button-soft" href="/players"><i className="fa-solid fa-users" aria-hidden="true" /> Citizen board</Link>
          </div>
        </div>
        <div className="leaderboard-summary-panel" aria-label="Leaderboard summary">
          <div><strong>{summary.publicProfiles.toLocaleString()}</strong><span>public profiles</span></div>
          <div><strong>{summary.boards.toLocaleString()}</strong><span>boards</span></div>
          <div><strong>{summary.totalSaves.toLocaleString()}</strong><span>known saves</span></div>
          <p>Updated {relativeFromDate(summary.lastUpdated)} from the server exports.</p>
        </div>
      </section>

      <section className="leaderboard-toolbar" aria-label="Leaderboard controls">
        <label className="leaderboard-search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this leaderboard..." />
        </label>
        <div className="leaderboard-category-tabs" aria-label="Leaderboard categories">
          <button className={category === 'All' ? 'active' : ''} type="button" onClick={() => setCategory('All')}>All</button>
          {categoryOrder.map((item) => (
            <button className={category === item ? 'active' : ''} type="button" key={item} onClick={() => setCategory(item)}>{item}</button>
          ))}
        </div>
      </section>

      <section className="leaderboard-layout">
        <aside className="leaderboard-board-list" aria-label="Choose leaderboard">
          <span className="kicker">Pick a board</span>
          {visibleBoards.map((board) => (
            <button className={board.id === activeBoard.id ? 'active' : ''} type="button" key={board.id} onClick={() => { setActiveBoardId(board.id); setQuery(''); }}>
              <i className={board.icon} aria-hidden="true" />
              <span><strong>{board.label}</strong><small>{board.rows.length.toLocaleString()} ranked</small></span>
            </button>
          ))}
        </aside>

        <div className="leaderboard-main-panel">
          <header className="leaderboard-board-header">
            <div>
              <span className="kicker">{activeBoard.category}</span>
              <h2><i className={activeBoard.icon} aria-hidden="true" /> {activeBoard.label}</h2>
              <p>{activeBoard.description}</p>
            </div>
            <div className="leaderboard-privacy-note"><i className="fa-solid fa-user-shield" aria-hidden="true" /> {activeBoard.privacyNote}</div>
          </header>

          {topThree.length ? (
            <section className="leaderboard-podium" aria-label="Top three">
              {topThree.map((row) => (
                <Link className={`leaderboard-podium-card rank-${row.rank}`} href={row.profileHref} key={row.steamId} style={bannerStyle(row)}>
                  <span className="leaderboard-medal">{medal(row.rank)}</span>
                  <UserAvatar src={row.avatarUrl} name={row.displayName} size="lg" />
                  <strong>{row.displayName}</strong>
                  <small>{row.handle}</small>
                  <b>{row.valueLabel}</b>
                  <em>{row.detail}</em>
                </Link>
              ))}
            </section>
          ) : null}

          {filteredRows.length ? (
            <section className="leaderboard-table" aria-label={`${activeBoard.label} leaderboard`}>
              {filteredRows.map((row) => (
                <article className={`leaderboard-row ${row.isCurrentUser ? 'is-you' : ''}`} key={`${activeBoard.id}-${row.steamId}`}>
                  <div className="leaderboard-rank">{medal(row.rank)}</div>
                  <Link className="leaderboard-person" href={row.profileHref}>
                    <UserAvatar src={row.avatarUrl} name={row.displayName} size="md" />
                    <span>
                      <strong>{row.displayName}</strong>
                      <small>{row.handle} · {row.role}</small>
                    </span>
                  </Link>
                  <div className="leaderboard-row-detail">
                    <strong>{row.valueLabel}</strong>
                    <span>{row.detail}</span>
                  </div>
                  <div className="leaderboard-row-badges">
                    {row.isCurrentUser ? <span>You</span> : null}
                    {row.badges.slice(0, 2).map((badge) => <span key={badge}>{badge}</span>)}
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <section className="leaderboard-empty">
              <div><i className="fa-solid fa-ranking-star" aria-hidden="true" /></div>
              <h2>No one is ranked here yet</h2>
              <p>
                This board may need more public profiles, or players may need to enable the matching public section from their dashboard.
              </p>
              <Link className="button button-primary" href="/dashboard">Open profile settings</Link>
            </section>
          )}
        </div>
      </section>
    </>
  );
}

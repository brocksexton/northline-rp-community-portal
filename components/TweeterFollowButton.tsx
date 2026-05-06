'use client';

import { useEffect, useState } from 'react';

type Props = {
  targetSteamId: string;
  signedIn: boolean;
  initialFollowing?: boolean;
  initialFollowerCount?: number;
  className?: string;
  compact?: boolean;
  disabledReason?: string;
};

type FollowState = {
  following: boolean;
  followerCount: number;
  followingCount: number;
};

function countLabel(value: number) {
  if (!value) return '';
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

export function TweeterFollowButton({ targetSteamId, signedIn, initialFollowing = false, initialFollowerCount = 0, className = '', compact = false, disabledReason = '' }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialFollowerCount);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!signedIn || !targetSteamId || disabledReason) return;
    let cancelled = false;
    async function loadState() {
      try {
        const response = await fetch(`/api/tweeter/social/follow?targetSteamId=${encodeURIComponent(targetSteamId)}`, { cache: 'no-store', credentials: 'same-origin' });
        if (!response.ok || cancelled) return;
        const data = await response.json() as FollowState;
        setFollowing(data.following);
        setCount(data.followerCount);
      } catch {
        // Keep the server-rendered/default state.
      }
    }
    void loadState();
    return () => { cancelled = true; };
  }, [disabledReason, signedIn, targetSteamId]);

  async function toggleFollow() {
    if (disabledReason) return;
    if (!signedIn) {
      window.location.href = `/api/auth/steam?returnTo=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    if (busy) return;
    const previous = { following, count };
    const nextFollowing = !following;
    setBusy(true);
    setFollowing(nextFollowing);
    setCount(Math.max(0, count + (nextFollowing ? 1 : -1)));

    try {
      const response = await fetch('/api/tweeter/social/follow', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ targetSteamId, follow: nextFollowing }),
      });
      if (!response.ok) throw new Error('follow_failed');
      const data = await response.json() as FollowState;
      setFollowing(data.following);
      setCount(data.followerCount);
    } catch {
      setFollowing(previous.following);
      setCount(previous.count);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`tweeter-follow-button ${following ? 'following' : ''} ${compact ? 'compact' : ''} ${disabledReason ? 'locked' : ''} ${className}`.trim()}
      onClick={toggleFollow}
      disabled={busy || !!disabledReason}
      aria-pressed={following}
      title={disabledReason || (signedIn ? (following ? 'Unfollow this citizen' : 'Follow this citizen') : 'Sign in with Steam to follow')}
    >
      <span>{following ? 'Following' : 'Follow'}</span>
      {!compact && count > 0 ? <small>{countLabel(count)}</small> : null}
    </button>
  );
}

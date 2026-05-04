'use client';

import { useState } from 'react';

type Props = {
  tweetId: string;
  initialLiked: boolean;
  initialCount: number;
  signedIn: boolean;
  variant?: 'action' | 'large';
};

function actionCount(value: number) {
  if (!value) return '';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

export function TweeterLikeButton({ tweetId, initialLiked, initialCount, signedIn, variant = 'action' }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  async function toggleLike() {
    if (!signedIn) {
      window.location.href = `/api/auth/steam?returnTo=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    if (busy) return;
    setBusy(true);
    const previous = { liked, count };
    setLiked(!liked);
    setCount(Math.max(0, count + (liked ? -1 : 1)));

    try {
      const response = await fetch(`/api/tweeter/${encodeURIComponent(tweetId)}/like`, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Like request failed');
      const next = await response.json() as { liked: boolean; count: number };
      setLiked(next.liked);
      setCount(next.count);
    } catch {
      setLiked(previous.liked);
      setCount(previous.count);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`tweeter-like-button ${variant === 'large' ? 'large' : ''} ${liked ? 'liked' : ''}`}
      onClick={toggleLike}
      disabled={busy}
      aria-pressed={liked}
      title={signedIn ? (liked ? 'Unlike' : 'Like') : 'Sign in with Steam to like'}
    >
      <span><i className={`${liked ? 'fa-solid' : 'fa-regular'} fa-heart`} aria-hidden="true" /></span>
      <small>{actionCount(count)}</small>
    </button>
  );
}

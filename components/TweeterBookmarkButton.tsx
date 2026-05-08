"use client";

import { useState } from "react";

function actionCount(value: number) {
  if (!value) return "";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

export function TweeterBookmarkButton({
  tweetId,
  initialBookmarked,
  initialCount,
  signedIn,
  disabledReason = "",
}: {
  tweetId: string;
  initialBookmarked: boolean;
  initialCount: number;
  signedIn: boolean;
  disabledReason?: string;
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  async function toggleBookmark() {
    if (disabledReason) return;
    if (!signedIn) {
      window.location.href = `/api/auth/steam?returnTo=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    if (busy) return;
    setBusy(true);
    const previous = { bookmarked, count };
    setBookmarked(!bookmarked);
    setCount(Math.max(0, count + (bookmarked ? -1 : 1)));
    try {
      const response = await fetch(
        `/api/tweeter/${encodeURIComponent(tweetId)}/bookmark`,
        { method: "POST", credentials: "same-origin", cache: "no-store" },
      );
      if (!response.ok) throw new Error("Bookmark request failed");
      const next = (await response.json()) as {
        bookmarked: boolean;
        bookmarkCount: number;
      };
      setBookmarked(next.bookmarked);
      setCount(next.bookmarkCount);
    } catch {
      setBookmarked(previous.bookmarked);
      setCount(previous.count);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`tweeter-bookmark-button ${bookmarked ? "bookmarked" : ""} ${disabledReason ? "locked" : ""}`}
      onClick={toggleBookmark}
      disabled={busy || !!disabledReason}
      aria-pressed={bookmarked}
      title={
        disabledReason ||
        (signedIn
          ? bookmarked
            ? "Remove bookmark"
            : "Bookmark"
          : "Sign in with Steam to bookmark")
      }
    >
      <i
        className={`${bookmarked ? "fa-solid" : "fa-regular"} fa-bookmark`}
        aria-hidden="true"
      />
      <small>{actionCount(count)}</small>
    </button>
  );
}

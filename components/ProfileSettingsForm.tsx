'use client';

import { useState } from 'react';
import type { CommunityProfile } from '@/lib/community-data';

export function ProfileSettingsForm({ profile }: { profile: CommunityProfile | null }) {
  const [privacy, setPrivacy] = useState(profile?.privacy ?? 'public');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [customAvatarUrl, setCustomAvatarUrl] = useState(profile?.customAvatarUrl ?? '');
  const [bannerColor, setBannerColor] = useState(profile?.bannerColor ?? '#38bdf8');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('saving');
    try {
      const response = await fetch('/api/profile/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ privacy, bio, location, customAvatarUrl, bannerColor }),
      });
      setState(response.ok ? 'saved' : 'error');
    } catch {
      setState('error');
    }
  }

  return (
    <form className="card form-card" onSubmit={submit}>
      <div className="section-heading">
        <span className="kicker">Profile settings</span>
        <h2>Control your public identity</h2>
        <p>Public pages never show phone messages, exact inventory, staff logs, or moderation evidence.</p>
      </div>

      <label className="field">
        <span>Profile visibility</span>
        <select value={privacy} onChange={(event) => setPrivacy(event.target.value as 'public' | 'private')}>
          <option value="public">Public profile</option>
          <option value="private">Private profile</option>
        </select>
      </label>

      <label className="field">
        <span>Bio</span>
        <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={240} placeholder="A short in-character or community bio." />
      </label>

      <label className="field">
        <span>Location / flavor text</span>
        <input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={60} placeholder="Downtown, waterfront, mayor's office..." />
      </label>

      <label className="field">
        <span>Custom avatar URL</span>
        <input value={customAvatarUrl} onChange={(event) => setCustomAvatarUrl(event.target.value)} placeholder="https://..." />
      </label>

      <label className="field compact-field">
        <span>Profile accent</span>
        <input type="color" value={bannerColor} onChange={(event) => setBannerColor(event.target.value)} />
      </label>

      <div className="form-actions">
        <button className="button button-primary" disabled={state === 'saving'}>{state === 'saving' ? 'Saving...' : 'Save profile'}</button>
        {state === 'saved' ? <span className="form-status success">Saved</span> : null}
        {state === 'error' ? <span className="form-status error">Could not save</span> : null}
      </div>
    </form>
  );
}

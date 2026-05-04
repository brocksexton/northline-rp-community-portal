'use client';

import { useState } from 'react';
import type { CommunityProfile, ProfileShowcaseSettings } from '@/lib/community-data';

const DEFAULT_CLIENT_SHOWCASE: ProfileShowcaseSettings = {
  economy: false,
  inventory: false,
  stats: false,
  properties: false,
  activity: false,
};

function normalizeShowcase(profile: CommunityProfile | null): ProfileShowcaseSettings {
  return {
    ...DEFAULT_CLIENT_SHOWCASE,
    ...(profile?.showcase ?? {}),
  };
}

function ShowcaseToggle({
  id,
  title,
  body,
  checked,
  onChange,
}: {
  id: keyof ProfileShowcaseSettings;
  title: string;
  body: string;
  checked: boolean;
  onChange: (id: keyof ProfileShowcaseSettings, value: boolean) => void;
}) {
  return (
    <label className="showcase-toggle-card">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(id, event.target.checked)} />
      <span>
        <strong>{title}</strong>
        <small>{body}</small>
      </span>
      <em>{checked ? 'Public' : 'Hidden'}</em>
    </label>
  );
}

export function ProfileSettingsForm({ profile }: { profile: CommunityProfile | null }) {
  const [privacy, setPrivacy] = useState(profile?.privacy ?? 'public');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(profile?.websiteUrl ?? '');
  const [customAvatarUrl, setCustomAvatarUrl] = useState(profile?.customAvatarUrl ?? '');
  const [bannerColor, setBannerColor] = useState(profile?.bannerColor ?? '#38bdf8');
  const [showcase, setShowcase] = useState<ProfileShowcaseSettings>(normalizeShowcase(profile));
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  function updateShowcase(id: keyof ProfileShowcaseSettings, value: boolean) {
    setShowcase((current) => ({ ...current, [id]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('saving');
    try {
      const response = await fetch('/api/profile/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ privacy, bio, location, websiteUrl, customAvatarUrl, bannerColor, showcase }),
      });
      setState(response.ok ? 'saved' : 'error');
    } catch {
      setState('error');
    }
  }

  const profileDisabled = privacy === 'private';

  return (
    <form className="card form-card profile-settings-card" onSubmit={submit}>
      <div className="section-heading">
        <span className="kicker">Profile settings</span>
        <h2>Control your public identity</h2>
        <p>One profile now powers both the Northline website and Tweeter. Gameplay details are hidden unless you explicitly publish each section.</p>
      </div>

      <label className="field">
        <span>Profile visibility</span>
        <select value={privacy} onChange={(event) => setPrivacy(event.target.value as 'public' | 'private')}>
          <option value="public">Public profile</option>
          <option value="private">Private profile</option>
        </select>
      </label>

      <div className="layout-two tight-form-grid">
        <label className="field">
          <span>Bio</span>
          <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={280} placeholder="A short in-character or community bio." />
        </label>

        <div className="stacked-fields">
          <label className="field">
            <span>Location / flavor text</span>
            <input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={80} placeholder="Downtown, waterfront, mayor's office..." />
          </label>
          <label className="field">
            <span>Website / social link</span>
            <input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://..." />
          </label>
        </div>
      </div>

      <div className="layout-two tight-form-grid">
        <label className="field">
          <span>Custom avatar URL</span>
          <input value={customAvatarUrl} onChange={(event) => setCustomAvatarUrl(event.target.value)} placeholder="https://..." />
        </label>

        <label className="field compact-field">
          <span>Profile accent</span>
          <input type="color" value={bannerColor} onChange={(event) => setBannerColor(event.target.value)} />
        </label>
      </div>

      <div className="profile-privacy-builder">
        <div className="section-heading compact-heading">
          <span className="kicker">Public showcases</span>
          <h3>Choose which game details appear publicly</h3>
          <p>These modules appear on `/u/[steamId]` and `/tweeter/profile/[steamId]`. Exact phone messages, staff logs, damage evidence, and moderation notes are never published here.</p>
        </div>

        {profileDisabled ? <div className="profile-warning-strip">Your profile is private, so all showcase modules are hidden until you switch back to public.</div> : null}

        <div className="showcase-toggle-grid" aria-disabled={profileDisabled}>
          <ShowcaseToggle id="economy" title="Economy" body="Cash, bank, and total visible funds." checked={!profileDisabled && showcase.economy} onChange={updateShowcase} />
          <ShowcaseToggle id="inventory" title="Inventory" body="Item count and top public item stacks." checked={!profileDisabled && showcase.inventory} onChange={updateShowcase} />
          <ShowcaseToggle id="stats" title="Stats" body="Level, XP, and top tracked stats." checked={!profileDisabled && showcase.stats} onChange={updateShowcase} />
          <ShowcaseToggle id="properties" title="Properties" body="Saved layout names and prop counts." checked={!profileDisabled && showcase.properties} onChange={updateShowcase} />
          <ShowcaseToggle id="activity" title="Activity" body="Playtime, joined date, and basic needs." checked={!profileDisabled && showcase.activity} onChange={updateShowcase} />
        </div>
      </div>

      <div className="form-actions">
        <button className="button button-primary" disabled={state === 'saving'}>{state === 'saving' ? 'Saving...' : 'Save profile'}</button>
        {state === 'saved' ? <span className="form-status success">Saved</span> : null}
        {state === 'error' ? <span className="form-status error">Could not save</span> : null}
      </div>
    </form>
  );
}

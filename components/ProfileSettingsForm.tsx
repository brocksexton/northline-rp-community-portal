'use client';

import { useMemo, useState, type FormEvent } from 'react';
import type {
  CommunityProfile,
  ProfileShowcaseSettings,
  TweeterColorMode,
  TweeterThemeEra,
  WebsiteStyle,
} from '@/lib/community-data';

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

function ThemeChoiceCard({
  active,
  title,
  body,
  onClick,
}: {
  active: boolean;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`theme-choice-card ${active ? 'active' : ''}`} onClick={onClick}>
      <strong>{title}</strong>
      <small>{body}</small>
    </button>
  );
}

function ModeChoiceCard({
  active,
  title,
  body,
  onClick,
}: {
  active: boolean;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`theme-mode-card ${active ? 'active' : ''}`} onClick={onClick}>
      <strong>{title}</strong>
      <small>{body}</small>
    </button>
  );
}


function WebsiteChoiceCard({
  active,
  title,
  body,
  onClick,
}: {
  active: boolean;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`website-style-card ${active ? 'active' : ''}`} onClick={onClick}>
      <strong>{title}</strong>
      <small>{body}</small>
    </button>
  );
}

export function ProfileSettingsForm({ profile, profileEditToken }: { profile: CommunityProfile | null; profileEditToken?: string }) {
  const [privacy, setPrivacy] = useState(profile?.privacy ?? 'public');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(profile?.websiteUrl ?? '');
  const [customAvatarUrl, setCustomAvatarUrl] = useState(profile?.customAvatarUrl ?? '');
  const [bannerColor, setBannerColor] = useState(profile?.bannerColor ?? '#1d9bf0');
  const [showcase, setShowcase] = useState<ProfileShowcaseSettings>(normalizeShowcase(profile));
  const [tweeterTheme, setTweeterTheme] = useState<TweeterThemeEra>(profile?.tweeterTheme ?? 'modern');
  const [tweeterMode, setTweeterMode] = useState<TweeterColorMode>(profile?.tweeterMode ?? 'dark');
  const [websiteStyle, setWebsiteStyle] = useState<WebsiteStyle>(profile?.websiteStyle ?? 'civic');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const previewLabel = useMemo(() => {
    const era = tweeterTheme === 'modern' ? 'Modern' : tweeterTheme === 'retro' ? 'Mid-2010s' : 'Classic';
    const mode = tweeterMode === 'dark' ? 'Dark' : tweeterMode === 'light' ? 'Light' : 'Twitter Blue';
    return `${era} · ${mode}`;
  }, [tweeterMode, tweeterTheme]);

  function updateShowcase(id: keyof ProfileShowcaseSettings, value: boolean) {
    setShowcase((current) => ({ ...current, [id]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('saving');
    try {
      const response = await fetch('/api/profile/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({
          privacy,
          bio,
          location,
          websiteUrl,
          customAvatarUrl,
          bannerColor,
          showcase,
          tweeterTheme,
          tweeterMode,
          websiteStyle,
          profileEditToken,
        }),
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
        <p>One profile powers both the Northline website and Tweeter. Publish only what you want the community to see.</p>
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

      <div className="profile-theme-builder">
        <div className="section-heading compact-heading">
          <span className="kicker">Tweeter themes</span>
          <h3>Choose your personal Tweeter experience</h3>
          <p>Your Tweeter theme follows your account. Pick a layout era and then choose how bright or blue it feels.</p>
        </div>

        <div className="theme-preview-banner">
          <div>
            <strong>{previewLabel}</strong>
            <small>Applied whenever you browse Tweeter while signed in.</small>
          </div>
          <span className="theme-preview-pill">Per-account preference</span>
        </div>

        <div className="theme-choice-grid">
          <ThemeChoiceCard active={tweeterTheme === 'modern'} title="Modern" body="The current Twitter-inspired experience with roomy rails and the latest feed feel." onClick={() => setTweeterTheme('modern')} />
          <ThemeChoiceCard active={tweeterTheme === 'retro'} title="Mid-2010s" body="A slightly older Twitter look with card-heavy panels, lighter structure, and compact rails." onClick={() => setTweeterTheme('retro')} />
          <ThemeChoiceCard active={tweeterTheme === 'classic'} title="Classic" body="A nostalgic old-school Twitter experience with simpler framing and older-era profile energy." onClick={() => setTweeterTheme('classic')} />
        </div>

        <div className="theme-mode-grid">
          <ModeChoiceCard active={tweeterMode === 'dark'} title="Dark" body="Deep night UI similar to modern dark Twitter." onClick={() => setTweeterMode('dark')} />
          <ModeChoiceCard active={tweeterMode === 'light'} title="Light" body="Bright classic white panels and lighter feed chrome." onClick={() => setTweeterMode('light')} />
          <ModeChoiceCard active={tweeterMode === 'blue'} title="Twitter Blue" body="A soft blue-tinted take that feels playful and distinct." onClick={() => setTweeterMode('blue')} />
        </div>
      </div>

      <div className="profile-theme-builder website-theme-builder">
        <div className="section-heading compact-heading">
          <span className="kicker">Website style</span>
          <h3>Choose your Northline website look</h3>
          <p>This changes the main website surfaces such as Home, Dashboard, Status, Staff, Bans, and public profiles. Tweeter keeps its own separate theme.</p>
        </div>

        <div className="website-style-grid">
          <WebsiteChoiceCard active={websiteStyle === 'civic'} title="Civic Clean" body="A bright, readable community portal style for everyday browsing." onClick={() => setWebsiteStyle('civic')} />
          <WebsiteChoiceCard active={websiteStyle === 'ops'} title="Control Center" body="A darker command-room look for dashboards, staff tools, and server operations." onClick={() => setWebsiteStyle('ops')} />
          <WebsiteChoiceCard active={websiteStyle === 'glass'} title="Northline Glass" body="Soft blue glass panels inspired by the older website build." onClick={() => setWebsiteStyle('glass')} />
        </div>
      </div>

      <div className="profile-privacy-builder">
        <div className="section-heading compact-heading">
          <span className="kicker">Public showcases</span>
          <h3>Choose which game details appear publicly</h3>
          <p>These modules appear on your public profile and Tweeter profile. Phone messages, staff logs, evidence, and moderation notes are never published.</p>
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

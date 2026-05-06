'use client';

import { useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import type { CommunityProfile, TweeterColorMode, TweeterThemeEra } from '@/lib/community-data';
import { PROFILE_COVER_PRESETS, PROFILE_THEMES, canUseCustomProfileCover, getProfileCoverPreset, type ProfileTheme } from '@/lib/profile-customization';

type Props = {
  profile: CommunityProfile | null;
  role?: string | null;
  displayName: string;
};

function handleFromName(name: string) {
  return `@${name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'citizen'}`;
}

function modeLabel(value: TweeterColorMode) {
  if (value === 'light') return 'Light';
  if (value === 'blue') return 'Twitter Blue';
  return 'Dark';
}

function eraLabel(value: TweeterThemeEra) {
  if (value === 'retro') return 'Mid-2010s';
  if (value === 'classic') return 'Classic';
  return 'Modern';
}

export function TweeterMaintenanceProfileEditor({ profile, role, displayName }: Props) {
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [customAvatarUrl, setCustomAvatarUrl] = useState(profile?.customAvatarUrl ?? '');
  const [bannerColor, setBannerColor] = useState(profile?.bannerColor ?? '#1d9bf0');
  const [coverPreset, setCoverPreset] = useState(profile?.coverPreset ?? 'northbound-downtown');
  const [customCoverUrl, setCustomCoverUrl] = useState(profile?.customCoverUrl ?? '');
  const [profileTheme, setProfileTheme] = useState<ProfileTheme>(profile?.profileTheme ?? 'clean');
  const [tweeterTheme, setTweeterTheme] = useState<TweeterThemeEra>(profile?.tweeterTheme ?? 'modern');
  const [tweeterMode, setTweeterMode] = useState<TweeterColorMode>(profile?.tweeterMode ?? 'dark');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const customCoverAllowed = canUseCustomProfileCover(role);
  const activeCover = getProfileCoverPreset(coverPreset);
  const coverImage = customCoverAllowed && customCoverUrl.trim() ? customCoverUrl.trim() : activeCover.imageUrl;
  const previewStyle = {
    '--quick-cover-gradient': activeCover.gradient,
    '--quick-cover-image': coverImage ? `url("${coverImage}")` : 'none',
    '--quick-accent': bannerColor,
  } as unknown as CSSProperties;

  const themeSummary = useMemo(() => `${eraLabel(tweeterTheme)} · ${modeLabel(tweeterMode)}`, [tweeterTheme, tweeterMode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('saving');
    setMessage('');
    try {
      const response = await fetch('/api/profile/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({
          profileEditMode: 'tweeterFallback',
          bio,
          customAvatarUrl,
          bannerColor,
          coverPreset,
          customCoverUrl: customCoverAllowed ? customCoverUrl : '',
          profileTheme,
          tweeterTheme,
          tweeterMode,
        }),
      });

      if (!response.ok) {
        setState('error');
        setMessage(response.status === 401 ? 'Your Steam sign-in expired. Sign in again, then save.' : 'Could not save right now. Check the fields and try again.');
        return;
      }

      setState('saved');
      setMessage('Saved. Refresh the profile if the new look does not show immediately.');
    } catch {
      setState('error');
      setMessage('Could not reach the server. Try again in a moment.');
    }
  }

  return (
    <section id="tweeter-profile-editor" className={`tweeter-maintenance-profile-editor profile-theme-preview-${profileTheme}`}>
      <div className="tweeter-maintenance-editor-head">
        <div>
          <span className="tweeter-pill">Maintenance fallback</span>
          <h2>Edit your Tweeter profile</h2>
          <p>The full dashboard is closed with the rest of the site, but Tweeter profile basics can still be updated here.</p>
        </div>
        <span className="tweeter-maintenance-theme-chip">{themeSummary}</span>
      </div>

      <form onSubmit={submit}>
        <div className="tweeter-quick-preview" style={previewStyle}>
          <div className="tweeter-quick-preview-cover" />
          <div className="tweeter-quick-preview-body">
            <span className="tweeter-quick-avatar" style={{ backgroundImage: customAvatarUrl.trim() ? `url("${customAvatarUrl.trim()}")` : undefined }}>{customAvatarUrl.trim() ? '' : displayName.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{displayName}</strong>
              <small>{handleFromName(displayName)}</small>
              <p>{bio.trim() || 'Add a short line for your profile.'}</p>
            </div>
          </div>
        </div>

        <div className="tweeter-maintenance-editor-grid">
          <label className="tweeter-editor-field wide">
            <span>Bio <small>{bio.length}/280</small></span>
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={280} placeholder="A quick blurb, character joke, or community note." />
          </label>

          <label className="tweeter-editor-field">
            <span>Avatar image URL</span>
            <input value={customAvatarUrl} onChange={(event) => setCustomAvatarUrl(event.target.value)} placeholder="Optional direct image link" />
          </label>

          <label className="tweeter-editor-field color-field">
            <span>Accent color</span>
            <input type="color" value={bannerColor} onChange={(event) => setBannerColor(event.target.value)} />
          </label>
        </div>

        <div className="tweeter-editor-section-label">Cover image</div>
        <div className="tweeter-cover-mini-grid">
          {PROFILE_COVER_PRESETS.map((preset) => {
            const style = {
              '--mini-cover-gradient': preset.gradient,
              '--mini-cover-image': preset.imageUrl ? `url("${preset.imageUrl}")` : 'none',
            } as unknown as CSSProperties;
            return (
              <button type="button" key={preset.id} className={coverPreset === preset.id ? 'active' : ''} style={style} onClick={() => setCoverPreset(preset.id)}>
                <span />
                <strong>{preset.label}</strong>
              </button>
            );
          })}
        </div>

        <label className="tweeter-editor-field tweeter-custom-cover-field">
          <span>Custom cover URL</span>
          <input value={customCoverUrl} onChange={(event) => setCustomCoverUrl(event.target.value)} placeholder="https://cdn.sbox.game/upload/i/..." disabled={!customCoverAllowed} />
          <small>{customCoverAllowed ? 'Optional. Use a supported image URL.' : 'Custom cover links are available to Trusted and staff accounts.'}</small>
        </label>

        <div className="tweeter-editor-split-options">
          <div>
            <div className="tweeter-editor-section-label">Profile look</div>
            <div className="tweeter-chip-choice-row">
              {PROFILE_THEMES.map((theme) => (
                <button type="button" key={theme.id} className={profileTheme === theme.id ? 'active' : ''} onClick={() => setProfileTheme(theme.id)}>{theme.label}</button>
              ))}
            </div>
          </div>

          <div>
            <div className="tweeter-editor-section-label">Tweeter layout</div>
            <div className="tweeter-chip-choice-row">
              {(['modern', 'retro', 'classic'] as TweeterThemeEra[]).map((theme) => (
                <button type="button" key={theme} className={tweeterTheme === theme ? 'active' : ''} onClick={() => setTweeterTheme(theme)}>{eraLabel(theme)}</button>
              ))}
            </div>
          </div>

          <div>
            <div className="tweeter-editor-section-label">Tweeter color</div>
            <div className="tweeter-chip-choice-row">
              {(['dark', 'light', 'blue'] as TweeterColorMode[]).map((mode) => (
                <button type="button" key={mode} className={tweeterMode === mode ? 'active' : ''} onClick={() => setTweeterMode(mode)}>{modeLabel(mode)}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="tweeter-maintenance-editor-savebar">
          <span className={state === 'error' ? 'error' : state === 'saved' ? 'success' : ''}>{message || 'Only Tweeter-facing profile options are available here during maintenance.'}</span>
          <button type="submit" disabled={state === 'saving'}>{state === 'saving' ? 'Saving…' : 'Save Tweeter profile'}</button>
        </div>
      </form>
    </section>
  );
}

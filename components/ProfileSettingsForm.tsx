'use client';

import Link from 'next/link';
import { useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import type {
  CommunityProfile,
  ProfileShowcaseSettings,
  TweeterColorMode,
  TweeterThemeEra,
  WebsiteStyle,
} from '@/lib/community-data';
import {
  canUseCustomProfileCover,
  getProfileCoverPreset,
  PROFILE_COVER_PRESETS,
  PROFILE_THEMES,
  type ProfileTheme,
} from '@/lib/profile-customization';
import { UserAvatar } from '@/components/UserAvatar';

const DEFAULT_CLIENT_SHOWCASE: ProfileShowcaseSettings = {
  economy: false,
  inventory: false,
  stats: false,
  properties: false,
  activity: false,
};

const SHOWCASE_COPY: Array<{
  id: keyof ProfileShowcaseSettings;
  title: string;
  body: string;
  saferNote: string;
}> = [
  { id: 'economy', title: 'Money snapshot', body: 'Wallet, bank, and total visible funds.', saferNote: 'Good for flexing progress. Hide it if you would rather keep your balance private.' },
  { id: 'inventory', title: 'Inventory summary', body: 'Item count and the biggest public item stacks.', saferNote: 'Shows a summary, not private messages or staff-only data.' },
  { id: 'stats', title: 'Character stats', body: 'Level, XP, deaths, and tracked stat highlights.', saferNote: 'Useful if you want your character progress visible.' },
  { id: 'properties', title: 'Saved properties', body: 'Saved layout names and prop counts.', saferNote: 'Good for builders. Phone data and staff notes are never included.' },
  { id: 'activity', title: 'City activity', body: 'Playtime, joined date, and basic character info.', saferNote: 'Keeps the profile feeling alive without exposing private comms.' },
];

function normalizeShowcase(profile: CommunityProfile | null): ProfileShowcaseSettings {
  return {
    ...DEFAULT_CLIENT_SHOWCASE,
    ...(profile?.showcase ?? {}),
  };
}

function handleFromName(name: string): string {
  const safe = name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18);
  return safe ? `@${safe}` : '@citizen';
}

function ProfileSection({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section className="settings-studio-section">
      <div className="settings-studio-section-head">
        <span className="kicker">{eyebrow}</span>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
      {children}
    </section>
  );
}

function ChoiceButton({
  active,
  icon,
  title,
  body,
  onClick,
  tone = 'default',
}: {
  active: boolean;
  icon: string;
  title: string;
  body: string;
  onClick: () => void;
  tone?: 'default' | 'safe' | 'private';
}) {
  return (
    <button type="button" aria-pressed={active} className={`settings-choice-card ${active ? 'active' : ''} tone-${tone}`} onClick={onClick}>
      <i className={icon} aria-hidden="true" />
      <span>
        <strong>{title}</strong>
        <small>{body}</small>
      </span>
    </button>
  );
}

function ShowcaseToggle({
  id,
  title,
  body,
  saferNote,
  checked,
  onChange,
}: {
  id: keyof ProfileShowcaseSettings;
  title: string;
  body: string;
  saferNote: string;
  checked: boolean;
  onChange: (id: keyof ProfileShowcaseSettings, value: boolean) => void;
}) {
  return (
    <label className={`showcase-toggle-card studio-toggle ${checked ? 'active' : ''}`}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(id, event.target.checked)} />
      <span>
        <strong>{title}</strong>
        <small>{body}</small>
        <small className="toggle-note">{saferNote}</small>
      </span>
      <em>{checked ? 'Shown' : 'Hidden'}</em>
    </label>
  );
}

function CoverChoiceCard({
  active,
  preset,
  onClick,
}: {
  active: boolean;
  preset: (typeof PROFILE_COVER_PRESETS)[number];
  onClick: () => void;
}) {
  const style = {
    '--cover-preview-gradient': preset.gradient,
    '--cover-preview-image': preset.imageUrl ? `url("${preset.imageUrl}")` : 'none',
  } as unknown as CSSProperties;

  return (
    <button type="button" aria-pressed={active} className={`cover-choice-card studio-cover-choice ${active ? 'active' : ''} cover-kind-${preset.kind}`} style={style} onClick={onClick}>
      <span className="cover-choice-preview" aria-hidden="true" />
      <span className="cover-choice-copy">
        <strong>{preset.label}</strong>
        <small>{preset.description}</small>
      </span>
    </button>
  );
}

function ProfileThemeCard({
  active,
  id,
  title,
  body,
  onClick,
}: {
  active: boolean;
  id: ProfileTheme;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button type="button" aria-pressed={active} className={`profile-theme-card studio-theme-card ${active ? 'active' : ''} profile-theme-card-${id}`} onClick={onClick}>
      <span aria-hidden="true" />
      <strong>{title}</strong>
      <small>{body}</small>
    </button>
  );
}

function SaveStatus({ state, errorMessage }: { state: 'idle' | 'saving' | 'saved' | 'error'; errorMessage: string }) {
  if (state === 'saving') return <span className="form-status saving" role="status">Saving…</span>;
  if (state === 'saved') return <span className="form-status success" role="status">Saved just now</span>;
  if (state === 'error') return <span className="form-status error" role="alert">{errorMessage}</span>;
  return <span className="form-status muted">Changes save when you press the button.</span>;
}

export function ProfileSettingsForm({
  profile,
  profileEditToken,
  role,
  steamId,
  displayName,
  fallbackAvatar,
  tweeterVisible = true,
}: {
  profile: CommunityProfile | null;
  profileEditToken?: string;
  role?: string | null;
  steamId: string;
  displayName: string;
  fallbackAvatar?: string | null;
  tweeterVisible?: boolean;
}) {
  const [privacy, setPrivacy] = useState(profile?.privacy ?? 'public');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(profile?.websiteUrl ?? '');
  const [customAvatarUrl, setCustomAvatarUrl] = useState(profile?.customAvatarUrl ?? '');
  const [bannerColor, setBannerColor] = useState(profile?.bannerColor ?? '#1d9bf0');
  const [coverPreset, setCoverPreset] = useState(profile?.coverPreset ?? 'northbound-downtown');
  const [customCoverUrl, setCustomCoverUrl] = useState(profile?.customCoverUrl ?? '');
  const [profileTheme, setProfileTheme] = useState<ProfileTheme>(profile?.profileTheme ?? 'clean');
  const [showcase, setShowcase] = useState<ProfileShowcaseSettings>(normalizeShowcase(profile));
  const [tweeterTheme, setTweeterTheme] = useState<TweeterThemeEra>(profile?.tweeterTheme ?? 'modern');
  const [tweeterMode, setTweeterMode] = useState<TweeterColorMode>(profile?.tweeterMode ?? 'dark');
  const [websiteStyle, setWebsiteStyle] = useState<WebsiteStyle>(profile?.websiteStyle ?? 'civic');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('Could not save. Please try again.');

  const customCoverAllowed = canUseCustomProfileCover(role);
  const activeCover = getProfileCoverPreset(coverPreset);
  const profilePrivate = privacy === 'private';
  const visibleModuleCount = Object.values(showcase).filter(Boolean).length;
  const avatarPreview = customAvatarUrl.trim() || fallbackAvatar || null;
  const coverImage = customCoverAllowed && customCoverUrl.trim() ? customCoverUrl.trim() : activeCover.imageUrl;
  const coverPreviewStyle = {
    '--cover-preview-gradient': activeCover.gradient,
    '--cover-preview-image': coverImage ? `url("${coverImage}")` : 'none',
    '--profile-preview-accent': bannerColor,
  } as unknown as CSSProperties;

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
    setErrorMessage('Could not save. Please try again.');
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
          coverPreset,
          customCoverUrl: customCoverAllowed ? customCoverUrl : '',
          profileTheme,
          showcase,
          tweeterTheme,
          tweeterMode,
          websiteStyle,
          profileEditToken,
        }),
      });

      if (response.ok) {
        setState('saved');
        return;
      }

      setState('error');
      setErrorMessage(response.status === 401 ? 'Your Steam sign-in expired. Sign in again, then save.' : 'Could not save. Please check the fields and try again.');
    } catch {
      setState('error');
      setErrorMessage('Could not reach the server. Try again in a moment.');
    }
  }

  return (
    <form className="card form-card profile-settings-card profile-studio-card" onSubmit={submit}>
      <div className="profile-studio-hero">
        <div>
          <span className="kicker">Profile studio</span>
          <h2>Make your profile feel like yours.</h2>
          <p>Choose what people see, how Tweeter looks for you, and how your public profile is dressed up.</p>
        </div>
        <div className="profile-studio-summary" aria-label="Profile setup summary">
          <span><strong>{profilePrivate ? 'Private' : 'Public'}</strong> visibility</span>
          <span><strong>{visibleModuleCount}</strong> public section{visibleModuleCount === 1 ? '' : 's'}</span>
          <span><strong>{previewLabel}</strong> Tweeter</span>
        </div>
      </div>

      <section className={`profile-studio-preview profile-theme-preview-${profileTheme}`}>
        <div className={`studio-preview-cover cover-kind-${activeCover.kind}`} style={coverPreviewStyle}>
          <span className="studio-preview-badge">{profilePrivate ? 'Private profile' : 'Public profile'}</span>
        </div>
        <div className="studio-preview-body">
          <UserAvatar src={avatarPreview} name={displayName} size="lg" />
          <div>
            <h3>{displayName}</h3>
            <p>{handleFromName(displayName)} · {role || 'User'}</p>
            <span>{bio.trim() || 'Add a short bio so people know who they are looking at.'}</span>
          </div>
          {tweeterVisible ? <Link className="button button-soft" href={`/tweeter/profile/${steamId}`}>Preview profile</Link> : null}
        </div>
      </section>

      <ProfileSection eyebrow="Step 1" title="Visibility and basic info" body="Start with the basics. If your profile is private, people will only see that it is private.">
        <div className="settings-choice-grid two">
          <ChoiceButton active={privacy === 'public'} tone="safe" icon="fa-solid fa-earth-americas" title="Public" body="People can open your profile and see the sections you choose below." onClick={() => setPrivacy('public')} />
          <ChoiceButton active={privacy === 'private'} tone="private" icon="fa-solid fa-lock" title="Private" body="Your profile is hidden from public pages until you switch this back." onClick={() => setPrivacy('private')} />
        </div>

        <div className="settings-field-grid">
          <label className="field studio-field large-field">
            <span>Bio <small>{bio.length}/280</small></span>
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={280} placeholder="A short in-character blurb, community note, or whatever fits your vibe." />
          </label>

          <div className="stacked-fields">
            <label className="field studio-field">
              <span>Location / flavor text</span>
              <input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={80} placeholder="Downtown, waterfront, mayor's office..." />
            </label>
            <label className="field studio-field">
              <span>Website / social link</span>
              <input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://..." />
            </label>
            <label className="field studio-field">
              <span>Custom avatar URL</span>
              <input value={customAvatarUrl} onChange={(event) => setCustomAvatarUrl(event.target.value)} placeholder="Optional direct image link" />
            </label>
          </div>
        </div>
      </ProfileSection>

      <ProfileSection eyebrow="Step 2" title="Cover image and color" body="Pick a Northbound RP screenshot for your Tweeter banner, then choose the accent color that ties it together.">
        <div className="settings-accent-row">
          <label className="field studio-color-field">
            <span>Accent color</span>
            <input type="color" value={bannerColor} onChange={(event) => setBannerColor(event.target.value)} />
          </label>
          <div className="settings-accent-note">
            <strong>Used on profile highlights.</strong>
            <small>This does not change your in-game character. It only styles your web profile.</small>
          </div>
        </div>

        <div className="cover-choice-grid studio-cover-grid">
          {PROFILE_COVER_PRESETS.map((preset) => (
            <CoverChoiceCard key={preset.id} preset={preset} active={coverPreset === preset.id} onClick={() => setCoverPreset(preset.id)} />
          ))}
        </div>

        <div className="custom-cover-panel studio-custom-cover">
          <div>
            <strong>Custom cover image</strong>
            <small>{customCoverAllowed ? 'Available for your account. Use a direct image URL or supported sbox CDN upload link.' : 'Available to Trusted and staff accounts so profile images stay easier to moderate.'}</small>
          </div>
          <input value={customCoverUrl} onChange={(event) => setCustomCoverUrl(event.target.value)} placeholder="https://cdn.sbox.game/upload/i/..." disabled={!customCoverAllowed} />
        </div>
      </ProfileSection>

      <ProfileSection eyebrow="Step 3" title="Profile look" body="This is the style other people see when they open your Tweeter profile.">
        <div className="profile-theme-grid studio-profile-theme-grid">
          {PROFILE_THEMES.map((theme) => (
            <ProfileThemeCard key={theme.id} id={theme.id} active={profileTheme === theme.id} title={theme.label} body={theme.description} onClick={() => setProfileTheme(theme.id)} />
          ))}
        </div>
      </ProfileSection>

      <ProfileSection eyebrow="Step 4" title="Your Tweeter and website style" body="These are personal preferences. They change how the site feels when you are signed in.">
        <div className="theme-preview-banner studio-theme-preview-banner">
          <div>
            <strong>{previewLabel}</strong>
            <small>Your Tweeter choice is separate from the rest of the Northline website.</small>
          </div>
          <span className="theme-preview-pill">Saved to your account</span>
        </div>

        <div className="settings-subsection-label">Tweeter layout</div>
        <div className="settings-choice-grid three">
          <ChoiceButton active={tweeterTheme === 'modern'} icon="fa-brands fa-twitter" title="Modern" body="Roomier, current Twitter-style layout." onClick={() => setTweeterTheme('modern')} />
          <ChoiceButton active={tweeterTheme === 'retro'} icon="fa-solid fa-table-columns" title="Mid-2010s" body="Card-heavy, lighter, and a bit more compact." onClick={() => setTweeterTheme('retro')} />
          <ChoiceButton active={tweeterTheme === 'classic'} icon="fa-solid fa-clock-rotate-left" title="Classic" body="Old-school Twitter energy with simpler framing." onClick={() => setTweeterTheme('classic')} />
        </div>

        <div className="settings-subsection-label">Tweeter color</div>
        <div className="settings-choice-grid three">
          <ChoiceButton active={tweeterMode === 'dark'} icon="fa-solid fa-moon" title="Dark" body="Deep dark mode for Tweeter." onClick={() => setTweeterMode('dark')} />
          <ChoiceButton active={tweeterMode === 'light'} icon="fa-solid fa-sun" title="Light" body="Bright, readable white panels." onClick={() => setTweeterMode('light')} />
          <ChoiceButton active={tweeterMode === 'blue'} icon="fa-solid fa-droplet" title="Twitter Blue" body="Soft blue tint with a playful feel." onClick={() => setTweeterMode('blue')} />
        </div>

        <div className="settings-subsection-label">Main website style</div>
        <div className="settings-choice-grid three">
          <ChoiceButton active={websiteStyle === 'civic'} icon="fa-solid fa-house-chimney" title="Civic Clean" body="Bright and easy to read for everyday browsing." onClick={() => setWebsiteStyle('civic')} />
          <ChoiceButton active={websiteStyle === 'ops'} icon="fa-solid fa-display" title="Control Center" body="Darker dashboard feel for server tools." onClick={() => setWebsiteStyle('ops')} />
          <ChoiceButton active={websiteStyle === 'glass'} icon="fa-regular fa-gem" title="Northline Glass" body="Soft blue panels inspired by the older site." onClick={() => setWebsiteStyle('glass')} />
        </div>
      </ProfileSection>

      <ProfileSection eyebrow="Step 5" title="Game details people can see" body="These are optional. Pick what makes your profile more fun without showing anything you would rather keep to yourself.">
        {profilePrivate ? <div className="profile-warning-strip studio-warning-strip"><i className="fa-solid fa-lock" aria-hidden="true" /> Your profile is private right now. These choices are saved, but nobody sees them until you publish your profile.</div> : null}

        <div className="showcase-toggle-grid studio-showcase-grid">
          {SHOWCASE_COPY.map((item) => (
            <ShowcaseToggle key={item.id} id={item.id} title={item.title} body={item.body} saferNote={item.saferNote} checked={showcase[item.id]} onChange={updateShowcase} />
          ))}
        </div>
      </ProfileSection>

      <div className="form-actions profile-studio-savebar">
        <div>
          <strong>Ready when you are.</strong>
          <SaveStatus state={state} errorMessage={errorMessage} />
        </div>
        <button className="button button-primary" disabled={state === 'saving'}>{state === 'saving' ? 'Saving…' : 'Save profile'}</button>
      </div>
    </form>
  );
}

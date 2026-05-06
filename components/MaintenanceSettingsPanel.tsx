'use client';

import { useState } from 'react';
import type { MaintenanceIcon, MaintenanceLayout, MaintenanceSettings, MaintenanceTheme, TweeterMaintenanceTheme } from '@/lib/maintenance-data';

const themes: Array<{ id: MaintenanceTheme; label: string; description: string; icon: string }> = [
  { id: 'blueprint', label: 'Blueprint', description: 'Clean blue screen for normal updates.', icon: 'fa-solid fa-ruler-combined' },
  { id: 'midnight', label: 'Midnight', description: 'Dark, calm, and easy to read.', icon: 'fa-solid fa-moon' },
  { id: 'sunrise', label: 'Sunrise', description: 'Warm downtime page for short breaks.', icon: 'fa-solid fa-sun' },
  { id: 'arcade', label: 'Arcade', description: 'More colorful and game-like.', icon: 'fa-solid fa-gamepad' },
  { id: 'garage', label: 'Garage', description: 'Workshop-style page for updates.', icon: 'fa-solid fa-screwdriver-wrench' },
  { id: 'cityhall', label: 'City Hall', description: 'Clear official-looking notice.', icon: 'fa-solid fa-landmark' },
];

const layouts: Array<{ id: MaintenanceLayout; label: string; description: string }> = [
  { id: 'split', label: 'Split', description: 'Big text with actions beside it.' },
  { id: 'centered', label: 'Centered', description: 'Simple centered announcement.' },
  { id: 'compact', label: 'Compact', description: 'Short message with less height.' },
];

const icons: Array<{ id: MaintenanceIcon; label: string; icon: string }> = [
  { id: 'wrench', label: 'Wrench', icon: 'fa-solid fa-screwdriver-wrench' },
  { id: 'traffic', label: 'Traffic', icon: 'fa-solid fa-traffic-light' },
  { id: 'coffee', label: 'Coffee', icon: 'fa-solid fa-mug-hot' },
  { id: 'broadcast', label: 'Broadcast', icon: 'fa-solid fa-satellite-dish' },
  { id: 'moon', label: 'Moon', icon: 'fa-solid fa-moon' },
  { id: 'sparkles', label: 'Sparkles', icon: 'fa-solid fa-wand-magic-sparkles' },
];

const tweeterThemes: Array<{ id: TweeterMaintenanceTheme; label: string; description: string }> = [
  { id: 'twitter-blue', label: 'Twitter blue', description: 'Bright blue card with classic Tweeter feel.' },
  { id: 'dim', label: 'Dim', description: 'Dark timeline-style maintenance page.' },
  { id: 'lights-out', label: 'Lights out', description: 'Black background, high contrast.' },
  { id: 'classic', label: 'Classic', description: 'Older light Twitter-inspired pause page.' },
];

const sitePresets: Array<{ label: string; description: string; settings: Partial<MaintenanceSettings> }> = [
  {
    label: 'Quick tune-up',
    description: 'Friendly default for short website changes.',
    settings: {
      theme: 'blueprint', layout: 'split', icon: 'wrench', kicker: 'Quick tune-up', accentColor: '#0ea5e9',
      headline: 'Northline is getting a quick tune-up.',
      message: 'The site is closed for a bit while staff works on it. Check back soon, or hop into Discord for updates.',
      showDiscordButton: true, showTweeterButton: true,
    },
  },
  {
    label: 'Late-night patch',
    description: 'Good for after-hours work or bigger deploys.',
    settings: {
      theme: 'midnight', layout: 'centered', icon: 'moon', kicker: 'Late-night patch', accentColor: '#818cf8',
      headline: 'Doing a little late-night work.',
      message: 'The site is taking a short break while an update goes in. Nothing scary, just tidying things up.',
      showDiscordButton: true, showTweeterButton: true,
    },
  },
  {
    label: 'City notice',
    description: 'More straightforward when you want less flair.',
    settings: {
      theme: 'cityhall', layout: 'split', icon: 'broadcast', kicker: 'City notice', accentColor: '#2563eb',
      headline: 'The website is paused for maintenance.',
      message: 'Staff is working on the website right now. Check Discord for updates, or come back in a little bit.',
      showDiscordButton: true, showTweeterButton: false,
    },
  },
  {
    label: 'Arcade break',
    description: 'A more playful screen for community/event work.',
    settings: {
      theme: 'arcade', layout: 'compact', icon: 'sparkles', kicker: 'Small break', accentColor: '#ec4899',
      headline: 'The website is taking five.',
      message: 'Staff is poking at buttons behind the scenes. We will be back soon.',
      showDiscordButton: true, showTweeterButton: true,
    },
  },
];

const tweeterPresets: Array<{ label: string; description: string; settings: Partial<MaintenanceSettings> }> = [
  {
    label: 'Feed pause',
    description: 'Default Tweeter-only maintenance page.',
    settings: {
      tweeterMaintenanceTheme: 'twitter-blue', tweeterMaintenanceKicker: 'Tweeter',
      tweeterMaintenanceHeadline: 'Tweeter is taking a quick break.',
      tweeterMaintenanceMessage: 'The feed is paused while staff works on it. Check back soon.',
    },
  },
  {
    label: 'Timeline cleanup',
    description: 'Darker page for Tweeter fixes.',
    settings: {
      tweeterMaintenanceTheme: 'dim', tweeterMaintenanceKicker: 'Timeline maintenance',
      tweeterMaintenanceHeadline: 'Cleaning up the timeline.',
      tweeterMaintenanceMessage: 'Tweeter is offline for a bit while staff works on the feed.',
    },
  },
  {
    label: 'Classic outage',
    description: 'Older Twitter-like message card.',
    settings: {
      tweeterMaintenanceTheme: 'classic', tweeterMaintenanceKicker: 'Tweeter status',
      tweeterMaintenanceHeadline: 'Something is being worked on.',
      tweeterMaintenanceMessage: 'Tweeter will be back once the update is finished.',
    },
  },
];

function toLocalInputValue(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function MaintenanceSettingsPanel({ initialSettings, canManage, studio = false }: { initialSettings: MaintenanceSettings; canManage: boolean; studio?: boolean }) {
  const [settings, setSettings] = useState(initialSettings);
  const [countdown, setCountdown] = useState(toLocalInputValue(initialSettings.countdownEndsAt));
  const [tweeterCountdown, setTweeterCountdown] = useState(toLocalInputValue(initialSettings.tweeterMaintenanceCountdownEndsAt));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function save() {
    if (!canManage) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/staff/maintenance', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          countdownEndsAt: countdown ? new Date(countdown).toISOString() : null,
          tweeterMaintenanceCountdownEndsAt: tweeterCountdown ? new Date(tweeterCountdown).toISOString() : null,
        }),
      });
      const payload = await response.json();
      if (payload.settings) setSettings(payload.settings);
      setMessage(payload.ok ? 'Saved.' : payload.message ?? 'Could not save settings.');
    } catch {
      setMessage('Could not reach the maintenance settings endpoint.');
    } finally {
      setSaving(false);
    }
  }

  function applyPreset(next: Partial<MaintenanceSettings>) {
    if (!canManage) return;
    setSettings((current) => ({ ...current, ...next }));
  }

  return (
    <article className={`staff-panel maintenance-settings-panel ${studio ? 'maintenance-studio-panel' : ''}`}>
      <div className="section-heading">
        <span className="kicker">Website access</span>
        <h2>{studio ? 'Maintenance studio' : 'Maintenance mode'}</h2>
        <p>{studio ? 'Pick a preset, tweak the copy, and decide which buttons visitors can use while the site is paused.' : 'Close the main site, leave Tweeter open, or pause Tweeter by itself.'}</p>
      </div>

      {!canManage ? (
        <div className="notice warning"><p>Only Developer accounts can change maintenance mode.</p></div>
      ) : null}

      <div className="maintenance-toggle-deck">
        <div className="maintenance-toggle-row">
          <div><strong>{settings.enabled ? 'Main site maintenance is on' : 'Main site maintenance is off'}</strong><span>{settings.enabled ? 'Visitors see your maintenance page.' : 'The normal website is open.'}</span></div>
          <button className={`maintenance-toggle ${settings.enabled ? 'enabled' : ''}`} disabled={!canManage} type="button" onClick={() => setSettings((current) => ({ ...current, enabled: !current.enabled }))}><span>{settings.enabled ? 'On' : 'Off'}</span></button>
        </div>
        <div className="maintenance-toggle-row">
          <div><strong>{settings.tweeterMaintenanceEnabled ? 'Tweeter maintenance is on' : 'Tweeter maintenance is off'}</strong><span>{settings.tweeterMaintenanceEnabled ? 'Tweeter shows its own pause page.' : 'Tweeter follows normal access rules.'}</span></div>
          <button className={`maintenance-toggle ${settings.tweeterMaintenanceEnabled ? 'enabled' : ''}`} disabled={!canManage} type="button" onClick={() => setSettings((current) => ({ ...current, tweeterMaintenanceEnabled: !current.tweeterMaintenanceEnabled }))}><span>{settings.tweeterMaintenanceEnabled ? 'On' : 'Off'}</span></button>
        </div>
      </div>

      <div className="maintenance-editor-grid">
        <section className="maintenance-editor-column">
          <div className="maintenance-editor-section">
            <h3>Site maintenance page</h3>
            <p>What most visitors see when the main website is closed.</p>
            <div className="maintenance-preset-grid">
              {sitePresets.map((preset) => <button key={preset.label} disabled={!canManage} type="button" onClick={() => applyPreset(preset.settings)}><strong>{preset.label}</strong><span>{preset.description}</span></button>)}
            </div>
            <div className="maintenance-form-grid">
              <label><span>Small label</span><input disabled={!canManage} value={settings.kicker} maxLength={50} onChange={(event) => setSettings((current) => ({ ...current, kicker: event.target.value }))} /></label>
              <label><span>Headline</span><input disabled={!canManage} value={settings.headline} maxLength={90} onChange={(event) => setSettings((current) => ({ ...current, headline: event.target.value }))} /></label>
              <label className="wide"><span>Message</span><textarea disabled={!canManage} value={settings.message} maxLength={420} rows={4} onChange={(event) => setSettings((current) => ({ ...current, message: event.target.value }))} /></label>
              <label><span>Optional countdown</span><input disabled={!canManage} type="datetime-local" value={countdown} onChange={(event) => setCountdown(event.target.value)} /></label>
              <label><span>Accent color</span><input disabled={!canManage} type="color" value={settings.accentColor} onChange={(event) => setSettings((current) => ({ ...current, accentColor: event.target.value }))} /></label>
            </div>
          </div>

          <div className="maintenance-editor-section">
            <h3>Buttons visitors can use</h3>
            <div className="maintenance-action-options">
              <label className="maintenance-checkbox"><input disabled={!canManage} type="checkbox" checked={settings.showDiscordButton} onChange={(event) => setSettings((current) => ({ ...current, showDiscordButton: event.target.checked }))} /><span>Show Discord/update button</span></label>
              <label className="maintenance-checkbox"><input disabled={!canManage} type="checkbox" checked={settings.allowTweeterDuringMaintenance} onChange={(event) => setSettings((current) => ({ ...current, allowTweeterDuringMaintenance: event.target.checked }))} /><span>Let visitors use Tweeter while the main site is down</span></label>
              <label className="maintenance-checkbox"><input disabled={!canManage} type="checkbox" checked={settings.showTweeterButton} onChange={(event) => setSettings((current) => ({ ...current, showTweeterButton: event.target.checked }))} /><span>Show a Visit Tweeter button when Tweeter is open</span></label>
              <label className="maintenance-checkbox"><input disabled={!canManage} type="checkbox" checked={settings.showCustomButton} onChange={(event) => setSettings((current) => ({ ...current, showCustomButton: event.target.checked }))} /><span>Show one custom link button</span></label>
            </div>
            <div className="maintenance-form-grid">
              <label><span>Discord/update link</span><input disabled={!canManage} value={settings.discordUrl} onChange={(event) => setSettings((current) => ({ ...current, discordUrl: event.target.value }))} /></label>
              <label><span>Tweeter button label</span><input disabled={!canManage} value={settings.tweeterButtonLabel} maxLength={36} onChange={(event) => setSettings((current) => ({ ...current, tweeterButtonLabel: event.target.value }))} /></label>
              <label><span>Custom button label</span><input disabled={!canManage} value={settings.customButtonLabel} maxLength={36} onChange={(event) => setSettings((current) => ({ ...current, customButtonLabel: event.target.value }))} /></label>
              <label><span>Custom button URL</span><input disabled={!canManage} value={settings.customButtonUrl} onChange={(event) => setSettings((current) => ({ ...current, customButtonUrl: event.target.value }))} /></label>
            </div>
          </div>
        </section>

        <section className="maintenance-editor-column">
          <div className="maintenance-editor-section">
            <h3>Look and feel</h3>
            <div className="maintenance-theme-grid">
              {themes.map((theme) => <button className={settings.theme === theme.id ? 'selected' : ''} disabled={!canManage} key={theme.id} type="button" onClick={() => setSettings((current) => ({ ...current, theme: theme.id }))}><i className={theme.icon} aria-hidden="true" /><span><strong>{theme.label}</strong><small>{theme.description}</small></span></button>)}
            </div>
            <div className="maintenance-choice-strip">
              {layouts.map((layout) => <button className={settings.layout === layout.id ? 'selected' : ''} disabled={!canManage} type="button" key={layout.id} onClick={() => setSettings((current) => ({ ...current, layout: layout.id }))}><strong>{layout.label}</strong><span>{layout.description}</span></button>)}
            </div>
            <div className="maintenance-icon-strip">
              {icons.map((icon) => <button className={settings.icon === icon.id ? 'selected' : ''} disabled={!canManage} type="button" key={icon.id} onClick={() => setSettings((current) => ({ ...current, icon: icon.id }))}><i className={icon.icon} aria-hidden="true" /><span>{icon.label}</span></button>)}
            </div>
          </div>

          <div className="maintenance-editor-section">
            <h3>Tweeter maintenance page</h3>
            <p>This only affects Tweeter when Tweeter maintenance is switched on.</p>
            <div className="maintenance-preset-grid">
              {tweeterPresets.map((preset) => <button key={preset.label} disabled={!canManage} type="button" onClick={() => applyPreset(preset.settings)}><strong>{preset.label}</strong><span>{preset.description}</span></button>)}
            </div>
            <div className="maintenance-form-grid tweeter-maintenance-settings">
              <label><span>Tweeter label</span><input disabled={!canManage} value={settings.tweeterMaintenanceKicker} maxLength={42} onChange={(event) => setSettings((current) => ({ ...current, tweeterMaintenanceKicker: event.target.value }))} /></label>
              <label><span>Tweeter return time</span><input disabled={!canManage} type="datetime-local" value={tweeterCountdown} onChange={(event) => setTweeterCountdown(event.target.value)} /></label>
              <label className="wide"><span>Tweeter headline</span><input disabled={!canManage} value={settings.tweeterMaintenanceHeadline} maxLength={90} onChange={(event) => setSettings((current) => ({ ...current, tweeterMaintenanceHeadline: event.target.value }))} /></label>
              <label className="wide"><span>Tweeter message</span><textarea disabled={!canManage} value={settings.tweeterMaintenanceMessage} maxLength={300} rows={3} onChange={(event) => setSettings((current) => ({ ...current, tweeterMaintenanceMessage: event.target.value }))} /></label>
            </div>
            <div className="maintenance-choice-strip tweeter-theme-strip">
              {tweeterThemes.map((theme) => <button className={settings.tweeterMaintenanceTheme === theme.id ? 'selected' : ''} disabled={!canManage} type="button" key={theme.id} onClick={() => setSettings((current) => ({ ...current, tweeterMaintenanceTheme: theme.id }))}><strong>{theme.label}</strong><span>{theme.description}</span></button>)}
            </div>
          </div>
        </section>
      </div>

      <div className="maintenance-preview-pair">
        <div className={`maintenance-mini-preview maintenance-theme-${settings.theme} maintenance-layout-${settings.layout}`} style={{ ['--maintenance-accent' as string]: settings.accentColor }}>
          <span>{settings.kicker}</span><strong>{settings.headline}</strong><p>{settings.message}</p>
          <div className="maintenance-preview-buttons"><b>Developer sign-in</b>{settings.allowTweeterDuringMaintenance && settings.showTweeterButton && !settings.tweeterMaintenanceEnabled ? <b>{settings.tweeterButtonLabel}</b> : null}{settings.showDiscordButton ? <b>Discord updates</b> : null}</div>
        </div>
        <div className={`tweeter-mini-preview tweeter-maintenance-theme-${settings.tweeterMaintenanceTheme}`}>
          <i className="fa-brands fa-twitter" aria-hidden="true" /><span>{settings.tweeterMaintenanceKicker}</span><strong>{settings.tweeterMaintenanceHeadline}</strong><p>{settings.tweeterMaintenanceMessage}</p>
        </div>
      </div>

      <div className="maintenance-save-row">
        <button className="button button-primary" disabled={!canManage || saving} type="button" onClick={save}><i className="fa-solid fa-floppy-disk" aria-hidden="true" /> {saving ? 'Saving…' : 'Save maintenance settings'}</button>
        {countdown ? <button className="button button-soft" disabled={!canManage || saving} type="button" onClick={() => setCountdown('')}>Clear site countdown</button> : null}
        {tweeterCountdown ? <button className="button button-soft" disabled={!canManage || saving} type="button" onClick={() => setTweeterCountdown('')}>Clear Tweeter countdown</button> : null}
        {message ? <span>{message}</span> : null}
      </div>
    </article>
  );
}

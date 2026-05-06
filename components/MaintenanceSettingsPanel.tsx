'use client';

import { useState } from 'react';
import type { MaintenanceSettings, MaintenanceTheme } from '@/lib/maintenance-data';

const themes: Array<{ id: MaintenanceTheme; label: string; description: string; icon: string }> = [
  { id: 'blueprint', label: 'Blueprint', description: 'Clean blue maintenance page with a workshop feel.', icon: 'fa-solid fa-ruler-combined' },
  { id: 'midnight', label: 'Midnight', description: 'Dark, calm, and very readable.', icon: 'fa-solid fa-moon' },
  { id: 'sunrise', label: 'Sunrise', description: 'Warmer page for quick friendly updates.', icon: 'fa-solid fa-sun' },
  { id: 'arcade', label: 'Arcade', description: 'Brighter game-style downtime screen.', icon: 'fa-solid fa-gamepad' },
];

function toLocalInputValue(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function MaintenanceSettingsPanel({ initialSettings, canManage }: { initialSettings: MaintenanceSettings; canManage: boolean }) {
  const [settings, setSettings] = useState(initialSettings);
  const [countdown, setCountdown] = useState(toLocalInputValue(initialSettings.countdownEndsAt));
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
        }),
      });
      const payload = await response.json();
      if (payload.settings) setSettings(payload.settings);
      setMessage(payload.ok ? 'Maintenance settings saved.' : payload.message ?? 'Could not save maintenance settings.');
    } catch {
      setMessage('Could not reach the maintenance settings endpoint.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="staff-panel maintenance-settings-panel">
      <div className="section-heading">
        <span className="kicker">Website access</span>
        <h2>Maintenance mode</h2>
        <p>Temporarily close the website to everyone except Developer accounts. Use this when you are deploying or changing data-heavy features.</p>
      </div>

      {!canManage ? (
        <div className="notice warning"><p>Only Developer accounts can change maintenance mode.</p></div>
      ) : null}

      <div className="maintenance-toggle-row">
        <div>
          <strong>{settings.enabled ? 'Maintenance is on' : 'Maintenance is off'}</strong>
          <span>{settings.enabled ? 'Regular visitors will see the maintenance page.' : 'Everyone can browse the website normally.'}</span>
        </div>
        <button className={`maintenance-toggle ${settings.enabled ? 'enabled' : ''}`} disabled={!canManage} type="button" onClick={() => setSettings((current) => ({ ...current, enabled: !current.enabled }))}>
          <span>{settings.enabled ? 'On' : 'Off'}</span>
        </button>
      </div>

      <div className="maintenance-form-grid">
        <label>
          <span>Headline</span>
          <input disabled={!canManage} value={settings.headline} maxLength={90} onChange={(event) => setSettings((current) => ({ ...current, headline: event.target.value }))} />
        </label>
        <label>
          <span>Accent color</span>
          <input disabled={!canManage} type="color" value={settings.accentColor} onChange={(event) => setSettings((current) => ({ ...current, accentColor: event.target.value }))} />
        </label>
        <label className="wide">
          <span>Message</span>
          <textarea disabled={!canManage} value={settings.message} maxLength={360} rows={4} onChange={(event) => setSettings((current) => ({ ...current, message: event.target.value }))} />
        </label>
        <label>
          <span>Optional countdown</span>
          <input disabled={!canManage} type="datetime-local" value={countdown} onChange={(event) => setCountdown(event.target.value)} />
        </label>
        <label>
          <span>Discord/update link</span>
          <input disabled={!canManage} value={settings.discordUrl} onChange={(event) => setSettings((current) => ({ ...current, discordUrl: event.target.value }))} />
        </label>
      </div>

      <div className="maintenance-theme-grid">
        {themes.map((theme) => (
          <button className={settings.theme === theme.id ? 'selected' : ''} disabled={!canManage} key={theme.id} type="button" onClick={() => setSettings((current) => ({ ...current, theme: theme.id }))}>
            <i className={theme.icon} aria-hidden="true" />
            <span><strong>{theme.label}</strong><small>{theme.description}</small></span>
          </button>
        ))}
      </div>

      <label className="maintenance-checkbox">
        <input disabled={!canManage} type="checkbox" checked={settings.showDiscordButton} onChange={(event) => setSettings((current) => ({ ...current, showDiscordButton: event.target.checked }))} />
        <span>Show Discord/update button on the maintenance page</span>
      </label>

      <div className={`maintenance-mini-preview maintenance-theme-${settings.theme}`} style={{ ['--maintenance-accent' as string]: settings.accentColor }}>
        <span>Preview</span>
        <strong>{settings.headline}</strong>
        <p>{settings.message}</p>
      </div>

      <div className="maintenance-save-row">
        <button className="button button-primary" disabled={!canManage || saving} type="button" onClick={save}><i className="fa-solid fa-floppy-disk" aria-hidden="true" /> {saving ? 'Saving…' : 'Save maintenance settings'}</button>
        {countdown ? <button className="button button-soft" disabled={!canManage || saving} type="button" onClick={() => setCountdown('')}>Clear countdown</button> : null}
        {message ? <span>{message}</span> : null}
      </div>
    </article>
  );
}

'use client';

import { useMemo, useState } from 'react';
import type { SiteFeatureSettings } from '@/lib/site-features-data';

type Props = {
  initialSettings: SiteFeatureSettings;
  canManage: boolean;
};

const areaLabels: Record<string, string> = {
  navigation: 'Core navigation',
  community: 'Community systems',
  commerce: 'Commerce / future systems',
};

export function SiteFeaturesAdminPanel({ initialSettings, canManage }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof settings.features>();
    for (const feature of settings.features) {
      const list = groups.get(feature.area) ?? [];
      list.push(feature);
      groups.set(feature.area, list);
    }
    return Array.from(groups.entries());
  }, [settings.features]);

  function toggleFeature(id: string, enabled: boolean) {
    setSettings((current) => ({
      ...current,
      features: current.features.map((feature) => feature.id === id ? { ...feature, enabled } : feature),
    }));
  }

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/staff/site-features', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const payload = await response.json();
      if (payload.settings) setSettings(payload.settings);
      setMessage(payload.ok ? 'Website visibility saved. Disabled sections are hidden from navigation and direct pages.' : payload.message ?? 'Could not save visibility settings.');
    } catch {
      setMessage('Could not reach the website visibility API.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="staff-panel feature-admin-panel">
      <div className="section-heading inline">
        <div>
          <span className="kicker">Website visibility</span>
          <h2>Enable or hide portal sections</h2>
          <p>Turn off public sections before they are ready. Header navigation, footer links, homepage cards, account shortcuts, and direct pages all follow these switches.</p>
        </div>
        <span className="feature-admin-count"><strong>{settings.features.filter((feature) => feature.enabled).length}</strong> live</span>
      </div>

      <div className="feature-admin-groups">
        {grouped.map(([area, features]) => (
          <section className="feature-admin-group" key={area}>
            <h3>{areaLabels[area] ?? area}</h3>
            <div className="feature-toggle-grid">
              {features.map((feature) => (
                <label className={`feature-toggle-card ${feature.enabled ? 'enabled' : 'disabled'}`} key={feature.id}>
                  <input disabled={!canManage || saving} type="checkbox" checked={feature.enabled} onChange={(event) => toggleFeature(feature.id, event.target.checked)} />
                  <span className="feature-toggle-icon"><i className={feature.icon} aria-hidden="true" /></span>
                  <span className="feature-toggle-copy"><strong>{feature.label}</strong><small>{feature.description}</small><em>{feature.enabled ? 'Visible' : 'Hidden'}</em></span>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="staff-editor-actions">
        <button className="button button-primary" disabled={!canManage || saving} type="button" onClick={save}><i className="fa-solid fa-floppy-disk" aria-hidden="true" /> {saving ? 'Saving…' : 'Save visibility'}</button>
        {!canManage ? <span>Ape Tavern staff access required to edit.</span> : message ? <span>{message}</span> : null}
      </div>
    </article>
  );
}

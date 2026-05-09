'use client';

import { useMemo, useState } from 'react';
import type { HomeHeroMessage, HomeHeroSettings, HomeHeroTimeSlot } from '@/lib/home-hero-data';

type Props = {
  initialSettings: HomeHeroSettings;
  canManage: boolean;
};


const HOME_HERO_TIME_SLOTS: Array<{ id: HomeHeroTimeSlot; label: string; description: string }> = [
  { id: 'all', label: 'Any time', description: 'Can appear during any normal homepage visit.' },
  { id: 'late_night', label: 'Late night', description: 'Midnight through early morning.' },
  { id: 'morning', label: 'Morning', description: 'Morning hours.' },
  { id: 'afternoon', label: 'Afternoon', description: 'Midday and afternoon hours.' },
  { id: 'evening', label: 'Evening', description: 'Evening and prime-time hours.' },
  { id: 'winter', label: 'Holiday / winter', description: 'Seasonal December holiday window.' },
  { id: 'halloween', label: 'Halloween', description: 'Late October seasonal window.' },
  { id: 'new_year', label: 'New year', description: 'New year seasonal window.' },
];

const toneOptions = [
  { value: 'home-moment-day', label: 'Day / bright' },
  { value: 'home-moment-morning', label: 'Morning' },
  { value: 'home-moment-evening', label: 'Evening' },
  { value: 'home-moment-late-night', label: 'Late night' },
  { value: 'home-moment-winter', label: 'Winter' },
  { value: 'home-moment-halloween', label: 'Halloween' },
  { value: 'home-moment-new-year', label: 'New year' },
];

const iconSuggestions = [
  'fa-solid fa-sun',
  'fa-solid fa-moon',
  'fa-solid fa-city',
  'fa-solid fa-store',
  'fa-solid fa-mug-hot',
  'fa-solid fa-signal',
  'fa-solid fa-house-chimney-user',
  'fa-solid fa-tower-broadcast',
  'fa-solid fa-snowflake',
  'fa-solid fa-ghost',
];

function newMessage(): HomeHeroMessage {
  return {
    id: `custom_${Date.now().toString(36)}`,
    enabled: true,
    label: 'Around town',
    icon: 'fa-solid fa-city',
    className: 'home-moment-day',
    greeting: 'Welcome back',
    guestTitle: 'Northline is ready when you are.',
    signedTitle: 'Northline is ready, {name}.',
    body: 'Check the server, browse the city feed, and jump in when you know what kind of scene you want to start.',
    scene: 'The city is moving, and there is always something worth checking before you load in.',
    timeSlots: ['all'],
    updatedAt: null,
    updatedBy: null,
  };
}

function slotSummary(slots: HomeHeroTimeSlot[]) {
  if (slots.includes('all')) return 'Any time';
  return slots.map((slot) => HOME_HERO_TIME_SLOTS.find((item) => item.id === slot)?.label ?? slot).join(', ');
}

export function HomeHeroAdminPanel({ initialSettings, canManage }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [activeId, setActiveId] = useState(initialSettings.messages[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const active = useMemo(() => settings.messages.find((item) => item.id === activeId) ?? settings.messages[0] ?? null, [activeId, settings.messages]);
  const liveCount = settings.messages.filter((item) => item.enabled).length;

  function updateMessage(id: string, patch: Partial<HomeHeroMessage>) {
    setSettings((current) => ({
      ...current,
      messages: current.messages.map((item) => item.id === id ? { ...item, ...patch } : item),
    }));
  }

  function addMessage() {
    const created = newMessage();
    setSettings((current) => ({ ...current, messages: [created, ...current.messages] }));
    setActiveId(created.id);
  }

  function duplicateMessage(id: string) {
    const source = settings.messages.find((item) => item.id === id);
    if (!source) return;
    const copy = { ...source, id: `custom_${Date.now().toString(36)}`, label: `${source.label} copy` };
    setSettings((current) => ({ ...current, messages: [copy, ...current.messages] }));
    setActiveId(copy.id);
  }

  function deleteMessage(id: string) {
    setSettings((current) => {
      const messages = current.messages.filter((item) => item.id !== id);
      if (activeId === id) setActiveId(messages[0]?.id ?? '');
      return { ...current, messages };
    });
  }

  function toggleSlot(id: string, slot: HomeHeroTimeSlot, checked: boolean) {
    const current = settings.messages.find((item) => item.id === id);
    if (!current) return;
    let next = checked ? [...new Set([...current.timeSlots, slot])] : current.timeSlots.filter((item) => item !== slot);
    if (slot === 'all' && checked) next = ['all'];
    if (slot !== 'all' && checked) next = next.filter((item) => item !== 'all');
    if (!next.length) next = ['all'];
    updateMessage(id, { timeSlots: next });
  }

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/staff/home-hero', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const payload = await response.json();
      if (payload.settings) setSettings(payload.settings);
      setMessage(payload.ok ? 'Homepage hero messages saved.' : payload.message ?? 'Could not save homepage messages.');
    } catch {
      setMessage('Could not reach the homepage message API.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="staff-panel home-hero-admin-panel">
      <div className="section-heading inline">
        <div>
          <span className="kicker">Homepage hero</span>
          <h2>Rotating welcome messages</h2>
          <p>Control the homepage greeting, small scene note, icon, visual tone, and when each message is eligible to appear.</p>
        </div>
        <span className="feature-admin-count"><strong>{liveCount}</strong> live</span>
      </div>

      <div className="home-hero-admin-layout">
        <aside className="home-hero-message-list" aria-label="Homepage hero messages">
          <button className="button button-primary" type="button" disabled={!canManage || saving} onClick={addMessage}><i className="fa-solid fa-plus" aria-hidden="true" /> Add message</button>
          <div className="home-hero-message-list-scroll">
            {settings.messages.map((item) => (
              <button className={`home-hero-message-row ${active?.id === item.id ? 'active' : ''} ${item.enabled ? 'enabled' : 'disabled'}`} type="button" key={item.id} onClick={() => setActiveId(item.id)}>
                <i className={item.icon} aria-hidden="true" />
                <span><strong>{item.label}</strong><small>{slotSummary(item.timeSlots)}</small></span>
                <em>{item.enabled ? 'Live' : 'Off'}</em>
              </button>
            ))}
          </div>
        </aside>

        {active ? (
          <section className="home-hero-editor" key={active.id}>
            <div className="home-hero-preview-card">
              <span className="community-pill homey-pill"><i className={active.icon} aria-hidden="true" /> {active.label}</span>
              <strong>{active.signedTitle.replace('{name}', 'Brock')}</strong>
              <p>{active.body}</p>
              <div className="homey-moment-note compact"><i className={active.icon} aria-hidden="true" /><span>{active.scene}</span></div>
            </div>

            <div className="home-hero-editor-grid">
              <label className="field"><span>Label / pill text</span><input value={active.label} disabled={!canManage || saving} maxLength={80} onChange={(event) => updateMessage(active.id, { label: event.target.value })} /></label>
              <label className="field"><span>Greeting</span><input value={active.greeting} disabled={!canManage || saving} maxLength={100} onChange={(event) => updateMessage(active.id, { greeting: event.target.value })} /></label>
              <label className="field"><span>Guest title</span><input value={active.guestTitle} disabled={!canManage || saving} maxLength={140} onChange={(event) => updateMessage(active.id, { guestTitle: event.target.value })} /></label>
              <label className="field"><span>Signed-in title</span><input value={active.signedTitle} disabled={!canManage || saving} maxLength={140} onChange={(event) => updateMessage(active.id, { signedTitle: event.target.value })} /><small>Use {'{name}'} where the player name should appear.</small></label>
              <label className="field wide"><span>Main text</span><textarea value={active.body} disabled={!canManage || saving} maxLength={360} onChange={(event) => updateMessage(active.id, { body: event.target.value })} /></label>
              <label className="field wide"><span>Scene note</span><textarea value={active.scene} disabled={!canManage || saving} maxLength={280} onChange={(event) => updateMessage(active.id, { scene: event.target.value })} /></label>
              <label className="field"><span>Icon class</span><input list="home-hero-icons" value={active.icon} disabled={!canManage || saving} maxLength={80} onChange={(event) => updateMessage(active.id, { icon: event.target.value })} /></label>
              <datalist id="home-hero-icons">{iconSuggestions.map((icon) => <option value={icon} key={icon} />)}</datalist>
              <label className="field"><span>Visual tone</span><select value={active.className} disabled={!canManage || saving} onChange={(event) => updateMessage(active.id, { className: event.target.value })}>{toneOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
            </div>

            <fieldset className="home-hero-time-fieldset" disabled={!canManage || saving}>
              <legend>When this can show</legend>
              <div className="home-hero-time-grid">
                {HOME_HERO_TIME_SLOTS.map((slot) => (
                  <label key={slot.id} className={active.timeSlots.includes(slot.id) ? 'selected' : ''}>
                    <input type="checkbox" checked={active.timeSlots.includes(slot.id)} onChange={(event) => toggleSlot(active.id, slot.id, event.target.checked)} />
                    <span><strong>{slot.label}</strong><small>{slot.description}</small></span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="staff-editor-actions split">
              <div>
                <button className="button button-soft" type="button" disabled={!canManage || saving} onClick={() => updateMessage(active.id, { enabled: !active.enabled })}>{active.enabled ? 'Disable' : 'Enable'}</button>
                <button className="button button-soft" type="button" disabled={!canManage || saving} onClick={() => duplicateMessage(active.id)}>Duplicate</button>
                <button className="button button-danger" type="button" disabled={!canManage || saving || settings.messages.length <= 1} onClick={() => deleteMessage(active.id)}>Delete</button>
              </div>
              <button className="button button-primary" type="button" disabled={!canManage || saving} onClick={save}><i className="fa-solid fa-floppy-disk" aria-hidden="true" /> {saving ? 'Saving…' : 'Save homepage messages'}</button>
            </div>
            {!canManage ? <p className="staff-editor-note">Website admin access required to edit homepage messages.</p> : message ? <p className="staff-editor-note">{message}</p> : null}
          </section>
        ) : (
          <section className="home-hero-editor empty"><strong>No messages configured.</strong><span>Add one to start rotating homepage hero text.</span></section>
        )}
      </div>
    </article>
  );
}

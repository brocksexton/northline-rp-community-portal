'use client';

import { useMemo, useState } from 'react';
import type { DiscordGuildSummary } from '@/lib/discord-manager';

type Props = {
  initialSummary: DiscordGuildSummary;
  canSendPanels: boolean;
  canManageMembers: boolean;
};

type PanelDraft = {
  channelId: string;
  title: string;
  description: string;
  color: string;
  imageUrl: string;
  thumbnailUrl: string;
  authorName: string;
  footer: string;
  buttonLabel: string;
  buttonUrl: string;
  pingRoleId: string;
};

const presets: Record<string, Partial<PanelDraft> & { label: string; helper: string }> = {
  announcement: {
    label: 'Announcement',
    helper: 'A clean staff announcement for updates, changes, and important news.',
    title: 'Northline RP Announcement',
    description: 'Write the announcement here. Keep it clear, concise, and actionable.',
    color: '#1d9bf0',
    footer: 'Northline RP Staff',
    buttonLabel: 'Read more',
    buttonUrl: '',
  },
  maintenance: {
    label: 'Maintenance Notice',
    helper: 'Use this before planned website or server downtime.',
    title: 'Scheduled Maintenance',
    description: 'Northline RP will be undergoing maintenance. We will post another update when everything is back online.',
    color: '#f59e0b',
    footer: 'Northline RP Operations',
  },
  event: {
    label: 'Event Panel',
    helper: 'Promote a city event with a clear call to action.',
    title: 'Community Event',
    description: 'Event details, time, location, and expectations go here.',
    color: '#8b5cf6',
    footer: 'Northline RP Events',
    buttonLabel: 'View website',
  },
  rules: {
    label: 'Rules Reminder',
    helper: 'Friendly but clear reminders for Discord or RP rules.',
    title: 'Rules Reminder',
    description: 'Please keep the community respectful and follow posted rules. Staff may moderate messages or access as needed.',
    color: '#ef4444',
    footer: 'Northline RP Moderation',
  },
};

function emptyDraft(channelId = ''): PanelDraft {
  return {
    channelId,
    title: 'Northline RP Announcement',
    description: 'Write a clear message for the community. Staff can preview this before sending it to Discord.',
    color: '#1d9bf0',
    imageUrl: '',
    thumbnailUrl: '',
    authorName: 'Northline RP Staff',
    footer: 'Northline RP',
    buttonLabel: '',
    buttonUrl: '',
    pingRoleId: '',
  };
}

function hexToGradient(hex: string) {
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#1d9bf0';
}

export function DiscordBotManagerPanel({ initialSummary, canSendPanels, canManageMembers }: Props) {
  const [summary, setSummary] = useState(initialSummary);
  const [active, setActive] = useState<'overview' | 'panel' | 'members'>('overview');
  const [draft, setDraft] = useState<PanelDraft>(() => emptyDraft(initialSummary.channels[0]?.id ?? ''));
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [memberId, setMemberId] = useState(initialSummary.members[0]?.id ?? '');
  const [roleId, setRoleId] = useState(initialSummary.roles[0]?.id ?? '');
  const [timeoutMinutes, setTimeoutMinutes] = useState(10);
  const [timeoutReason, setTimeoutReason] = useState('Staff action from Northline website');

  const selectedChannel = useMemo(() => summary.channels.find((channel) => channel.id === draft.channelId), [summary.channels, draft.channelId]);
  const selectedRole = useMemo(() => summary.roles.find((role) => role.id === roleId), [summary.roles, roleId]);
  const selectedMember = useMemo(() => summary.members.find((member) => member.id === memberId), [summary.members, memberId]);

  async function refreshSummary() {
    setBusy(true);
    setStatus('Refreshing Discord data…');
    try {
      const response = await fetch('/api/staff/discord/summary', { credentials: 'same-origin' });
      const data = await response.json();
      if (!response.ok || !data.summary) throw new Error(data.message || 'Could not refresh Discord data.');
      setSummary(data.summary);
      setStatus('Discord data refreshed.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not refresh Discord data.');
    } finally {
      setBusy(false);
    }
  }

  function applyPreset(key: string) {
    const preset = presets[key];
    if (!preset) return;
    setDraft((current) => ({ ...current, ...preset, channelId: current.channelId }));
  }

  async function sendPanel() {
    if (!canSendPanels || busy) return;
    setBusy(true);
    setStatus('Sending panel to Discord…');
    try {
      const response = await fetch('/api/staff/discord/panel', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || 'Discord rejected the panel.');
      setStatus(`Panel sent${data.messageId ? ` · message ${data.messageId}` : ''}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not send Discord panel.');
    } finally {
      setBusy(false);
    }
  }

  async function updateRole(action: 'add' | 'remove') {
    if (!canManageMembers || busy) return;
    setBusy(true);
    setStatus(action === 'add' ? 'Adding role…' : 'Removing role…');
    try {
      const response = await fetch('/api/staff/discord/roles', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, discordUserId: memberId, roleId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || 'Could not update role.');
      setStatus(action === 'add' ? 'Role added.' : 'Role removed.');
      await refreshSummary();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not update role.');
    } finally {
      setBusy(false);
    }
  }

  async function timeoutMember() {
    if (!canManageMembers || busy) return;
    setBusy(true);
    setStatus('Applying timeout…');
    try {
      const response = await fetch('/api/staff/discord/timeout', {
        method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ discordUserId: memberId, minutes: timeoutMinutes, reason: timeoutReason }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || 'Could not timeout member.');
      setStatus('Timeout applied.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not timeout member.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="discord-manager-shell">
      <section className="discord-manager-tabs" aria-label="Discord manager sections">
        {[
          ['overview', 'Overview', 'Server health and bot connection'],
          ['panel', 'Message Builder', 'Guided embeds and preview'],
          ['members', 'Roles + Users', 'Careful member actions'],
        ].map(([id, label, helper]) => (
          <button className={active === id ? 'active' : ''} key={id} type="button" onClick={() => setActive(id as typeof active)}>
            <strong>{label}</strong>
            <span>{helper}</span>
          </button>
        ))}
      </section>

      {status ? <p className="discord-manager-notice">{status}</p> : null}

      {active === 'overview' ? (
        <section className="discord-manager-grid">
          <article className="discord-manager-card guild-card">
            <div className="discord-manager-card-head">
              {summary.guild?.iconUrl ? <img src={summary.guild.iconUrl} alt="" /> : <span className="discord-placeholder-icon"><i className="fa-brands fa-discord" /></span>}
              <div>
                <span className="kicker">Discord server</span>
                <h2>{summary.guild?.name ?? 'Not connected'}</h2>
                <p>{summary.configured ? 'The website can read Discord server data using your bot token.' : 'Discord manager needs environment setup.'}</p>
              </div>
            </div>
            <dl className="discord-metric-row">
              <div><dt>Members</dt><dd>{summary.guild?.approximateMemberCount ?? '—'}</dd></div>
              <div><dt>Online</dt><dd>{summary.guild?.approximatePresenceCount ?? '—'}</dd></div>
              <div><dt>Channels</dt><dd>{summary.channels.length}</dd></div>
              <div><dt>Roles</dt><dd>{summary.roles.length}</dd></div>
            </dl>
            <button className="button button-primary" type="button" onClick={refreshSummary} disabled={busy}><i className="fa-solid fa-rotate" /> Refresh Discord data</button>
          </article>

          <article className="discord-manager-card">
            <span className="kicker">Bot identity</span>
            <h3>{summary.botUser?.username ?? 'Bot unavailable'}</h3>
            <p>Use this page to send guided embeds, view available channels/roles, and perform careful member actions without requiring staff to learn raw Discord commands.</p>
            {summary.errors.length ? (
              <div className="discord-error-list">
                {summary.errors.map((error) => <p key={error}>{error}</p>)}
              </div>
            ) : <p className="discord-success-line"><i className="fa-solid fa-circle-check" /> Discord API checks passed.</p>}
          </article>
        </section>
      ) : null}

      {active === 'panel' ? (
        <section className="discord-builder-layout">
          <article className="discord-manager-card discord-builder-form">
            <span className="kicker">Guided panel builder</span>
            <h2>Send a polished Discord embed</h2>
            <p>Choose a channel, pick a preset, edit the message, preview it, then send. Nothing posts until you press Send.</p>

            <div className="discord-preset-row">
              {Object.entries(presets).map(([key, preset]) => (
                <button key={key} type="button" onClick={() => applyPreset(key)}>
                  <strong>{preset.label}</strong>
                  <span>{preset.helper}</span>
                </button>
              ))}
            </div>

            <div className="discord-form-grid">
              <label><span>Destination channel</span><select value={draft.channelId} onChange={(event) => setDraft({ ...draft, channelId: event.target.value })}>{summary.channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.label}</option>)}</select></label>
              <label><span>Accent color</span><input value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} /></label>
              <label className="wide"><span>Title</span><input maxLength={256} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
              <label className="wide"><span>Message</span><textarea rows={7} maxLength={4000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
              <label><span>Author label</span><input value={draft.authorName} onChange={(event) => setDraft({ ...draft, authorName: event.target.value })} /></label>
              <label><span>Footer</span><input value={draft.footer} onChange={(event) => setDraft({ ...draft, footer: event.target.value })} /></label>
              <label><span>Thumbnail URL</span><input value={draft.thumbnailUrl} onChange={(event) => setDraft({ ...draft, thumbnailUrl: event.target.value })} /></label>
              <label><span>Image URL</span><input value={draft.imageUrl} onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })} /></label>
              <label><span>Button label</span><input value={draft.buttonLabel} onChange={(event) => setDraft({ ...draft, buttonLabel: event.target.value })} /></label>
              <label><span>Button URL</span><input value={draft.buttonUrl} onChange={(event) => setDraft({ ...draft, buttonUrl: event.target.value })} /></label>
              <label><span>Optional role ping</span><select value={draft.pingRoleId} onChange={(event) => setDraft({ ...draft, pingRoleId: event.target.value })}><option value="">No ping</option>{summary.roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
            </div>

            <div className="discord-action-row">
              <button className="button button-primary" type="button" onClick={sendPanel} disabled={!canSendPanels || busy}><i className="fa-brands fa-discord" /> Send to Discord</button>
              {!canSendPanels ? <span className="muted-inline-note">You have read-only access to this builder.</span> : null}
            </div>
          </article>

          <aside className="discord-preview-card" style={{ ['--discord-accent' as string]: hexToGradient(draft.color) }}>
            <div className="discord-preview-channel">Preview in {selectedChannel?.label ?? 'Discord'}</div>
            <div className="discord-embed-preview">
              {draft.authorName ? <span className="discord-preview-author">{draft.authorName}</span> : null}
              <h3>{draft.title || 'Panel title'}</h3>
              <p>{draft.description || 'Panel message preview appears here.'}</p>
              {draft.thumbnailUrl ? <img className="discord-preview-thumb" src={draft.thumbnailUrl} alt="" /> : null}
              {draft.imageUrl ? <img className="discord-preview-image" src={draft.imageUrl} alt="" /> : null}
              {draft.buttonLabel && draft.buttonUrl ? <span className="discord-preview-button">{draft.buttonLabel}</span> : null}
              <footer>{draft.footer || 'Northline RP'} · just now</footer>
            </div>
          </aside>
        </section>
      ) : null}

      {active === 'members' ? (
        <section className="discord-manager-grid">
          <article className="discord-manager-card">
            <span className="kicker">Guided member actions</span>
            <h2>Manage roles and timeouts</h2>
            <p>Use this for simple Discord user maintenance. For destructive actions, keep using Discord directly until you are comfortable with the workflow.</p>
            <div className="discord-form-grid single">
              <label><span>Member</span><select value={memberId} onChange={(event) => setMemberId(event.target.value)}>{summary.members.map((member) => <option key={member.id} value={member.id}>{member.displayName} · {member.username}</option>)}</select></label>
              <label><span>Role</span><select value={roleId} onChange={(event) => setRoleId(event.target.value)}>{summary.roles.filter((role) => !role.managed).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
              <label><span>Timeout minutes</span><input type="number" min="1" max="40320" value={timeoutMinutes} onChange={(event) => setTimeoutMinutes(Number(event.target.value))} /></label>
              <label className="wide"><span>Reason</span><input value={timeoutReason} onChange={(event) => setTimeoutReason(event.target.value)} /></label>
            </div>
            <div className="discord-action-row">
              <button className="button button-primary" type="button" disabled={!canManageMembers || busy} onClick={() => updateRole('add')}>Add role</button>
              <button className="button button-soft" type="button" disabled={!canManageMembers || busy} onClick={() => updateRole('remove')}>Remove role</button>
              <button className="button button-soft danger-soft" type="button" disabled={!canManageMembers || busy} onClick={timeoutMember}>Timeout member</button>
            </div>
          </article>

          <article className="discord-manager-card member-preview-card">
            <span className="kicker">Selected member</span>
            <h3>{selectedMember?.displayName ?? 'No member selected'}</h3>
            <p>{selectedMember?.username ?? 'Refresh Discord data to load members.'}</p>
            <small>{selectedMember?.id}</small>
            <hr />
            <strong>Selected role</strong>
            <p>{selectedRole?.name ?? 'No role selected'}</p>
            <small>Bot role hierarchy still applies. The bot cannot assign roles higher than its own highest role.</small>
          </article>
        </section>
      ) : null}
    </div>
  );
}

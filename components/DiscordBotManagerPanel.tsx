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

type GuidePreset = {
  id: string;
  emoji: string;
  title: string;
  summary: string;
  covers: string[];
  goodFor: string;
  command: string;
  path: string;
  color: string;
  imageUrl: string;
  thumbnailUrl: string;
};

type AssetPreset = {
  label: string;
  helper: string;
  path: string;
  kind: 'Hero image' | 'Thumbnail';
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
    buttonUrl: '/status',
  },
  maintenance: {
    label: 'Maintenance Notice',
    helper: 'Use this before planned website or server downtime.',
    title: 'Scheduled Maintenance',
    description: 'Northline RP will be undergoing maintenance. We will post another update when everything is back online.',
    color: '#f59e0b',
    footer: 'Northline RP Operations',
    buttonLabel: 'View status',
    buttonUrl: '/status',
  },
  event: {
    label: 'Event Panel',
    helper: 'Promote a city event with a clear call to action.',
    title: 'Community Event',
    description: 'Event details, time, location, and expectations go here.',
    color: '#8b5cf6',
    footer: 'Northline RP Events',
    buttonLabel: 'View website',
    buttonUrl: '/',
  },
  rules: {
    label: 'Rules Reminder',
    helper: 'Friendly but clear reminders for Discord or RP rules.',
    title: 'Rules Reminder',
    description: 'Please keep the community respectful and follow posted rules. Staff may moderate messages or access as needed.',
    color: '#ef4444',
    footer: 'Northline RP Moderation',
    buttonLabel: 'Read rules',
    buttonUrl: '/rules',
  },
  guide: {
    label: 'Guide Link',
    helper: 'Point players toward a useful website guide.',
    title: 'Need help getting started?',
    description: 'Open the Northline guidebook for short walkthroughs on jobs, banking, inventory, property, and phone apps.',
    color: '#0ea5e9',
    footer: 'Northline RP Guidebook',
    buttonLabel: 'Open guides',
    buttonUrl: '/guides',
  },
  status: {
    label: 'Server Status',
    helper: 'Send a quick pointer to the live status page.',
    title: 'Check the live server status',
    description: 'The status page shows whether the server is online, recent notices, population information, and connection details.',
    color: '#22c55e',
    footer: 'Northline RP Status',
    buttonLabel: 'View status',
    buttonUrl: '/status',
  },
};

const guidePresets: GuidePreset[] = [
  {
    id: 'core-basics',
    emoji: '💵',
    title: 'Cash, Bank, Inventory & Property Basics',
    summary: 'Explains cash on hand, bank deposits, item storage, property rental, personal safes, Town Hall storage, and red illegal-item outlines.',
    covers: ['Cash vs bank balance', 'ATM deposits and withdrawals', 'Inventory storage', 'Property rental basics', 'Personal safes and Town Hall storage'],
    goodFor: 'New players who are confused about money, inventory, storage, or property systems.',
    command: '/guide topic:cash',
    path: '/guides?guide=core-basics',
    color: '#f59e0b',
    imageUrl: '/guides/basics/inventory-illegal.png',
    thumbnailUrl: '/guides/basics/atm.png',
  },
  {
    id: 'police',
    emoji: '🚓',
    title: 'Police Officer / Chief of Police Guide',
    summary: 'Covers applying through Job Finder, visiting the Police Department, talking to Sergeant Harris, 911 reports, theft alerts, cuffs, tasers, and police scenes.',
    covers: ['Applying for police roles', 'Finding the station', '911 and break-in reports', 'Common blockers', 'Cuffs and escape minigame'],
    goodFor: 'Players who want police RP but need the application and on-duty basics explained first.',
    command: '/job police',
    path: '/guides?guide=police',
    color: '#1d9bf0',
    imageUrl: '/guides/police/police-station-exterior.png',
    thumbnailUrl: '/guides/police/sergeant-harris.png',
  },
  {
    id: 'mayor',
    emoji: '🏛️',
    title: 'Elections & Mayor Guide',
    summary: 'Shows how elections start, how to register as a candidate, how to campaign, how voting works, and how the Mayor manages laws, contraband, and tax rate.',
    covers: ['Starting an election', 'Registering as a candidate', 'Campaigning with Tweeter', 'Voting flow', 'Mayor computer and policy'],
    goodFor: 'Players who started an election but still need to enter the race or learn what Mayor actually controls.',
    command: '/job mayor',
    path: '/guides?guide=mayor',
    color: '#6d28d9',
    imageUrl: '/guides/mayor/mayor-computer.png',
    thumbnailUrl: '/guides/mayor/michael-dialogue.png',
  },
  {
    id: 'courier',
    emoji: '📦',
    title: 'Courier Guide',
    summary: 'Walks through becoming a Courier, picking up timed parcels at the post office, following the compass, and delivering packages for pay.',
    covers: ['Courier application', '$0 salary explanation', 'Postman Patrick', 'Picking up parcels', 'Timed delivery HUD'],
    goodFor: 'A strong first job for new players learning the map and task-based pay.',
    command: '/job courier',
    path: '/guides?guide=courier',
    color: '#c0843a',
    imageUrl: '/guides/courier/post-office-exterior.png',
    thumbnailUrl: '/guides/courier/postman-patrick.png',
  },
  {
    id: 'business',
    emoji: '🏪',
    title: 'Store Owner / Business Guide',
    summary: 'Introduces business jobs, advertising, commercial property, shop setup, and creating reasons for players to visit.',
    covers: ['Grocery, gun, and hardware stores', 'Advertisement app', 'Commercial property', 'Customer-facing RP', 'Job/property conflicts'],
    goodFor: 'Players who want to run a shop, rent commercial space, or understand business role expectations.',
    command: '/job business',
    path: '/guides?guide=business',
    color: '#f97316',
    imageUrl: '/guides/basics/property-panel.png',
    thumbnailUrl: '/guides/basics/rent-sign.png',
  },
  {
    id: 'citizen',
    emoji: '🏙️',
    title: 'Citizen Guide',
    summary: 'A calmer first-day guide for learning the city, phone apps, recycling, basic RP, and how to find your first role naturally.',
    covers: ['Exploring the city', 'Phone basics', 'Recycling', 'Meeting players', 'Building into a role'],
    goodFor: 'Players who want to learn Northline before taking a limited public job.',
    command: '/job citizen',
    path: '/guides?guide=citizen',
    color: '#38bdf8',
    imageUrl: '/guides/police/controls.png',
    thumbnailUrl: '/guides/police/phone-home.png',
  },
];

const assetPresets: AssetPreset[] = [
  { label: 'Police station', helper: 'Police guide / public safety panels', path: '/guides/police/police-station-exterior.png', kind: 'Hero image' },
  { label: 'Sergeant Harris', helper: 'Police application panel thumbnail', path: '/guides/police/sergeant-harris.png', kind: 'Thumbnail' },
  { label: 'Post office', helper: 'Courier guide / delivery panels', path: '/guides/courier/post-office-exterior.png', kind: 'Hero image' },
  { label: 'Postman Patrick', helper: 'Courier helper thumbnail', path: '/guides/courier/postman-patrick.png', kind: 'Thumbnail' },
  { label: 'Mayor computer', helper: 'Election / mayor policy panels', path: '/guides/mayor/mayor-computer.png', kind: 'Hero image' },
  { label: 'Michael dialogue', helper: 'Election starter thumbnail', path: '/guides/mayor/michael-dialogue.png', kind: 'Thumbnail' },
  { label: 'Inventory basics', helper: 'Cash / bank / inventory guide panels', path: '/guides/basics/inventory-illegal.png', kind: 'Hero image' },
  { label: 'ATM', helper: 'Banking thumbnails', path: '/guides/basics/atm.png', kind: 'Thumbnail' },
  { label: 'Property panel', helper: 'Business and property panels', path: '/guides/basics/property-panel.png', kind: 'Hero image' },
];

const commandSections = [
  {
    title: 'Guide shortcuts',
    helper: 'Fast replies for common player questions.',
    commands: ['/job police', '/job courier', '/job mayor', '/job medic', '/job business', '/job citizen', '/guide topic:cash', '/northline guides'],
  },
  {
    title: 'Public Northline commands',
    helper: 'Useful status and website lookups.',
    commands: ['/northline status', '/northline players', '/northline links', '/northline forum', '/northline jobs', '/northline leaderboards', '/northline cases'],
  },
  {
    title: 'Staff/game moderation',
    helper: 'Requires appropriate staff permissions.',
    commands: ['/northline broadcast', '/northline kick', '/northline ban', '/northline server'],
  },
  {
    title: 'Discord moderation',
    helper: 'Careful Discord-side actions.',
    commands: ['/discordmod timeout', '/discordmod purge', '/discordmod slowmode', '/discordmod lock', '/discordmod unlock', '/discordmod userinfo'],
  },
  {
    title: 'Utility and account linking',
    helper: 'Low-risk helper commands.',
    commands: ['/link code:<code>', '/northline roll', '/northline coinflip', '/northline choose', '/northline eightball'],
  },
];

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

function absoluteUrl(pathOrUrl: string) {
  const value = String(pathOrUrl || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://northline.lol';
  try {
    return new URL(value.startsWith('/') ? value : `/${value}`, base).href;
  } catch {
    return value;
  }
}

function relativeOrAbsolute(value: string) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return trimmed.startsWith('/') ? absoluteUrl(trimmed) : trimmed;
}

function guideDraft(guide: GuidePreset, channelId = ''): PanelDraft {
  return {
    channelId,
    title: guide.title,
    description: `${guide.summary}\n\nWhat it covers:\n${guide.covers.map((item) => `• ${item}`).join('\n')}\n\nGood for: ${guide.goodFor}`,
    color: guide.color,
    imageUrl: absoluteUrl(guide.imageUrl),
    thumbnailUrl: absoluteUrl(guide.thumbnailUrl),
    authorName: 'Northline RP Guidebook',
    footer: `Try ${guide.command}`,
    buttonLabel: 'Open guide',
    buttonUrl: absoluteUrl(guide.path),
    pingRoleId: '',
  };
}

function roleColor(color: number) {
  return color ? `#${color.toString(16).padStart(6, '0')}` : '#94a3b8';
}

export function DiscordBotManagerPanel({ initialSummary, canSendPanels, canManageMembers }: Props) {
  const [summary, setSummary] = useState(initialSummary);
  const [active, setActive] = useState<'overview' | 'guides' | 'panel' | 'commands' | 'members'>('overview');
  const [draft, setDraft] = useState<PanelDraft>(() => emptyDraft(initialSummary.channels[0]?.id ?? ''));
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [memberId, setMemberId] = useState(initialSummary.members[0]?.id ?? '');
  const [roleId, setRoleId] = useState(initialSummary.roles[0]?.id ?? '');
  const [timeoutMinutes, setTimeoutMinutes] = useState(10);
  const [timeoutReason, setTimeoutReason] = useState('Staff action from Northline website');
  const [commandFilter, setCommandFilter] = useState('');

  const selectedChannel = useMemo(() => summary.channels.find((channel) => channel.id === draft.channelId), [summary.channels, draft.channelId]);
  const selectedRole = useMemo(() => summary.roles.find((role) => role.id === roleId), [summary.roles, roleId]);
  const selectedMember = useMemo(() => summary.members.find((member) => member.id === memberId), [summary.members, memberId]);
  const sendableChannels = useMemo(() => summary.channels.filter((channel) => [0, 5, 15].includes(Number(channel.type))), [summary.channels]);
  const botHealth = summary.configured && !summary.errors.length ? 'Healthy' : summary.configured ? 'Needs attention' : 'Not configured';

  const filteredCommandSections = useMemo(() => {
    const needle = commandFilter.trim().toLowerCase();
    if (!needle) return commandSections;
    return commandSections
      .map((section) => ({ ...section, commands: section.commands.filter((command) => command.toLowerCase().includes(needle) || section.title.toLowerCase().includes(needle)) }))
      .filter((section) => section.commands.length);
  }, [commandFilter]);

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
    setDraft((current) => ({
      ...current,
      ...preset,
      channelId: current.channelId,
      imageUrl: relativeOrAbsolute(preset.imageUrl ?? current.imageUrl),
      thumbnailUrl: relativeOrAbsolute(preset.thumbnailUrl ?? current.thumbnailUrl),
      buttonUrl: relativeOrAbsolute(preset.buttonUrl ?? current.buttonUrl),
    }));
  }

  function prepareGuide(guide: GuidePreset) {
    setDraft(guideDraft(guide, draft.channelId || sendableChannels[0]?.id || ''));
    setActive('panel');
    setStatus(`${guide.title} loaded into the message builder.`);
  }

  async function sendGuide(guide: GuidePreset) {
    if (!canSendPanels || busy) {
      prepareGuide(guide);
      return;
    }
    setBusy(true);
    setStatus(`Sending ${guide.title} guide embed…`);
    try {
      const payload = guideDraft(guide, draft.channelId || sendableChannels[0]?.id || '');
      const response = await fetch('/api/staff/discord/panel', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || 'Discord rejected the guide embed.');
      setStatus(`${guide.title} guide embed sent${data.messageId ? ` · message ${data.messageId}` : ''}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not send guide embed.');
    } finally {
      setBusy(false);
    }
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
        body: JSON.stringify({
          ...draft,
          imageUrl: relativeOrAbsolute(draft.imageUrl),
          thumbnailUrl: relativeOrAbsolute(draft.thumbnailUrl),
          buttonUrl: relativeOrAbsolute(draft.buttonUrl),
        }),
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

  async function copyText(value: string, label = 'Copied') {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(`${label}: ${value}`);
    } catch {
      setStatus(value);
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
    <div className="discord-manager-shell discord-manager-expanded">
      <section className="discord-manager-tabs" aria-label="Discord manager sections">
        {[
          ['overview', 'Overview', 'Bot health, server info, and setup checks'],
          ['guides', 'Guide Embeds', 'Quick-send useful guide cards'],
          ['panel', 'Message Builder', 'Compose polished Discord embeds'],
          ['commands', 'Command Book', 'Browse slash commands and shortcuts'],
          ['members', 'Roles + Users', 'Careful member actions'],
        ].map(([id, label, helper]) => (
          <button className={active === id ? 'active' : ''} key={id} type="button" onClick={() => setActive(id as typeof active)}>
            <strong>{label}</strong>
            <span>{helper}</span>
          </button>
        ))}
      </section>

      {status ? <p className="discord-manager-notice" role="status">{status}</p> : null}

      {active === 'overview' ? (
        <section className="discord-manager-grid discord-overview-grid">
          <article className="discord-manager-card discord-bot-health-card">
            <div className="discord-manager-card-head">
              {summary.botUser?.avatarUrl ? <img src={summary.botUser.avatarUrl} alt="" /> : <span className="discord-placeholder-icon"><i className="fa-brands fa-discord" /></span>}
              <div>
                <span className="kicker">Bot connection</span>
                <h2>{summary.botUser?.username ?? 'Bot unavailable'}</h2>
                <p>{summary.guild?.name ? `Connected to ${summary.guild.name}.` : 'Set the Discord environment variables to connect this panel.'}</p>
              </div>
            </div>

            <dl className="discord-metric-row">
              <div><dt>Status</dt><dd>{botHealth}</dd></div>
              <div><dt>Channels</dt><dd>{summary.channels.length}</dd></div>
              <div><dt>Roles</dt><dd>{summary.roles.length}</dd></div>
              <div><dt>Cached members</dt><dd>{summary.members.length}</dd></div>
            </dl>

            {summary.errors.length ? (
              <div className="discord-error-list">
                {summary.errors.map((error) => <p key={error}>{error}</p>)}
              </div>
            ) : <p className="discord-success-line"><i className="fa-solid fa-circle-check" /> Discord API checks passed.</p>}

            <div className="discord-action-row">
              <button className="button button-primary" type="button" onClick={refreshSummary} disabled={busy}><i className="fa-solid fa-rotate" /> Refresh Discord data</button>
              <button className="button button-soft" type="button" onClick={() => setActive('guides')}><i className="fa-solid fa-book-open" /> Open guide embeds</button>
              <button className="button button-soft" type="button" onClick={() => setActive('panel')}><i className="fa-solid fa-wand-magic-sparkles" /> Build message</button>
            </div>
          </article>

          <aside className="discord-manager-card discord-checklist-card">
            <span className="kicker">Operational checklist</span>
            <h3>Before using the bot panel</h3>
            <ul className="discord-check-list">
              <li className={summary.configured ? 'done' : ''}><i className="fa-solid fa-circle-check" /> Bot token and guild ID configured</li>
              <li className={summary.channels.length ? 'done' : ''}><i className="fa-solid fa-circle-check" /> Sendable channels loaded</li>
              <li className={summary.roles.length ? 'done' : ''}><i className="fa-solid fa-circle-check" /> Roles visible to the bot</li>
              <li className={canSendPanels ? 'done' : ''}><i className="fa-solid fa-circle-check" /> You can send public panels</li>
              <li className={canManageMembers ? 'done' : ''}><i className="fa-solid fa-circle-check" /> You can manage Discord members</li>
            </ul>
            <p>Use Discord directly for destructive actions until the website workflow is intentionally expanded for them.</p>
          </aside>

          <article className="discord-manager-card discord-channel-card">
            <span className="kicker">Sendable channels</span>
            <h3>Where embeds can go</h3>
            <div className="discord-chip-list">
              {sendableChannels.slice(0, 18).map((channel) => <span key={channel.id}>#{channel.name}</span>)}
              {!sendableChannels.length ? <p>No sendable channels were found.</p> : null}
            </div>
          </article>

          <article className="discord-manager-card discord-channel-card">
            <span className="kicker">Top roles</span>
            <h3>Available role targets</h3>
            <div className="discord-role-list">
              {summary.roles.slice(0, 10).map((role) => <span key={role.id}><i style={{ background: roleColor(role.color) }} /> {role.name}</span>)}
              {!summary.roles.length ? <p>No roles were loaded.</p> : null}
            </div>
          </article>
        </section>
      ) : null}

      {active === 'guides' ? (
        <section className="discord-guides-layout">
          <article className="discord-manager-card discord-guides-intro">
            <span className="kicker">Guide embed launcher</span>
            <h2>Send helpful guide cards without rewriting the same answer.</h2>
            <p>Each card uses a relevant website image, a useful synopsis, a direct guide link, and the matching slash-command shortcut players can use later.</p>
            <div className="discord-form-grid single">
              <label><span>Destination channel</span><select value={draft.channelId} onChange={(event) => setDraft({ ...draft, channelId: event.target.value })}>{summary.channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.label}</option>)}</select></label>
            </div>
          </article>

          <div className="discord-guide-card-grid">
            {guidePresets.map((guide) => (
              <article className="discord-guide-card" key={guide.id} style={{ ['--guide-color' as string]: guide.color }}>
                <img src={guide.imageUrl} alt="" />
                <div>
                  <span>{guide.emoji} {guide.command}</span>
                  <h3>{guide.title}</h3>
                  <p>{guide.summary}</p>
                  <ul>{guide.covers.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
                  <div className="discord-action-row compact">
                    <button className="button button-primary" type="button" disabled={busy} onClick={() => prepareGuide(guide)}>Load in builder</button>
                    <button className="button button-soft" type="button" disabled={!canSendPanels || busy} onClick={() => sendGuide(guide)}>Send now</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {active === 'panel' ? (
        <section className="discord-builder-layout">
          <article className="discord-manager-card discord-builder-form">
            <span className="kicker">Guided panel builder</span>
            <h2>Send a polished Discord embed</h2>
            <p>Choose a destination, pick a preset, attach a relevant website asset, preview it, then send. Nothing posts until you press Send.</p>

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

            <section className="discord-asset-picker" aria-label="Embed image presets">
              <div>
                <span className="kicker">Asset picker</span>
                <h3>Use existing website screenshots</h3>
              </div>
              <div className="discord-asset-grid">
                {assetPresets.map((asset) => (
                  <button key={asset.path} type="button" onClick={() => setDraft((current) => ({ ...current, [asset.kind === 'Thumbnail' ? 'thumbnailUrl' : 'imageUrl']: absoluteUrl(asset.path) }))}>
                    <img src={asset.path} alt="" />
                    <strong>{asset.label}</strong>
                    <span>{asset.kind} · {asset.helper}</span>
                  </button>
                ))}
              </div>
            </section>

            <div className="discord-action-row">
              <button className="button button-primary" type="button" onClick={sendPanel} disabled={!canSendPanels || busy}><i className="fa-brands fa-discord" /> Send to Discord</button>
              <button className="button button-soft" type="button" onClick={() => setDraft(emptyDraft(draft.channelId))}>Reset draft</button>
              {!canSendPanels ? <span className="muted-inline-note">You have read-only access to this builder.</span> : null}
            </div>
          </article>

          <aside className="discord-preview-card" style={{ ['--discord-accent' as string]: hexToGradient(draft.color) }}>
            <div className="discord-preview-channel">Preview in {selectedChannel?.label ?? 'Discord'}</div>
            <div className="discord-embed-preview">
              {draft.thumbnailUrl ? <img className="discord-preview-thumb" src={relativeOrAbsolute(draft.thumbnailUrl)} alt="" /> : null}
              {draft.authorName ? <span className="discord-preview-author">{draft.authorName}</span> : null}
              <h3>{draft.title || 'Panel title'}</h3>
              <p>{draft.description || 'Panel message preview appears here.'}</p>
              {draft.imageUrl ? <img className="discord-preview-image" src={relativeOrAbsolute(draft.imageUrl)} alt="" /> : null}
              {draft.buttonLabel && draft.buttonUrl ? <span className="discord-preview-button">{draft.buttonLabel}</span> : null}
              <footer>{draft.footer || 'Northline RP'} · just now</footer>
            </div>
          </aside>
        </section>
      ) : null}

      {active === 'commands' ? (
        <section className="discord-manager-grid discord-command-layout">
          <article className="discord-manager-card discord-command-book">
            <span className="kicker">Command book</span>
            <h2>Slash commands and shortcuts</h2>
            <p>Use this as a quick reference while helping players. Click a command to copy it.</p>
            <label className="discord-command-search"><span>Search commands</span><input value={commandFilter} onChange={(event) => setCommandFilter(event.target.value)} placeholder="police, guide, timeout, status…" /></label>
            <div className="discord-command-sections">
              {filteredCommandSections.map((section) => (
                <section key={section.title}>
                  <h3>{section.title}</h3>
                  <p>{section.helper}</p>
                  <div className="discord-command-chip-grid">
                    {section.commands.map((command) => <button type="button" key={command} onClick={() => copyText(command, 'Command copied')}>{command}</button>)}
                  </div>
                </section>
              ))}
            </div>
          </article>

          <aside className="discord-manager-card discord-command-helper-card">
            <span className="kicker">Deployment reminder</span>
            <h3>After changing bot commands</h3>
            <p>Register slash commands and restart the bot process.</p>
            <pre>npm run bot:register{"\n"}npm run bot:start</pre>
            <p>Use the process manager / service wrapper on the live server if the bot is not launched directly from the terminal.</p>
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
              {!canManageMembers ? <span className="muted-inline-note">You do not have member-management access.</span> : null}
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

"use client";

import { useEffect, useMemo, useState } from 'react';

type ConsoleLine = { id: string; text: string; level: 'info' | 'warning' | 'error' | 'command' };
type ConnectedServerPlayer = {
  steamId: string;
  name: string;
  since: string;
  rpName?: string | null;
  level?: number | null;
  cashBalance?: number | null;
  bankBalance?: number | null;
  totalPlaytimeSeconds?: number | null;
};
type QueueRecord = {
  id: string;
  createdAt: string;
  actorName: string;
  command: string;
  targetName?: string | null;
  targetSteamId?: string | null;
  status: 'sent' | 'queued' | 'failed';
  delivery: 'script' | 'queue' | 'control';
  result?: string | null;
};
type ConsoleLogCandidate = {
  path: string;
  exists: boolean;
  readable: boolean;
  sizeBytes: number | null;
  modifiedAt: string | null;
  note: string | null;
};

type ManagedService = {
  key: 'discord-bot' | 'server-bridge';
  label: string;
  description: string;
  status: 'running' | 'stopped' | 'not-configured';
  pid: number | null;
  pidFile: string;
  logPath: string | null;
  logReadable: boolean;
  updatedAt: string | null;
  configuration: string[];
  command: string;
  lines: ConsoleLine[];
};

type Snapshot = {
  generatedAt: string;
  console: { source: string | null; readable: boolean; lines: ConsoleLine[]; candidates: ConsoleLogCandidate[]; hint: string | null };
  players: ConnectedServerPlayer[];
  queue: QueueRecord[];
  capabilities: { consoleCommandScript: boolean; consoleLogConfigured: boolean; startScript: string; updateScript: string; commandQueuePath: string; consoleLogPath: string; webManagedStartCapture: boolean; bridgeScript?: string | null };
  services: { bot: ManagedService; bridge: ManagedService };
};

type PlayerAction = 'kick' | 'ban';

type ServerAdminPanelProps = {
  initialSnapshot: Snapshot;
  canModerate: boolean;
  canPowerControl: boolean;
};

function formatTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

function duration(seconds: number | null | undefined) {
  if (!seconds || seconds < 1) return 'unknown';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes || 1}m`;
}

function formatBytes(value: number | null) {
  if (value === null || value === undefined) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 102.4) / 10} KB`;
  return `${Math.round(value / 1024 / 102.4) / 10} MB`;
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

function serviceTone(status: ManagedService['status']) {
  return status === 'running' ? 'is-running' : status === 'not-configured' ? 'is-warning' : 'is-stopped';
}

function serviceStatusLabel(status: ManagedService['status']) {
  return status === 'running' ? 'Running' : status === 'not-configured' ? 'Needs setup' : 'Stopped';
}

export function ServerAdminPanel({ initialSnapshot, canModerate, canPowerControl }: ServerAdminPanelProps) {
  const [snapshot, setSnapshot] = useState<Snapshot>(initialSnapshot);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<ConnectedServerPlayer | null>(null);
  const [action, setAction] = useState<PlayerAction>('kick');
  const [reason, setReason] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('1440');
  const [broadcast, setBroadcast] = useState('');

  const latestLines = useMemo(() => snapshot.console.lines.slice(-220), [snapshot.console.lines]);
  const services = useMemo(() => [snapshot.services.bot, snapshot.services.bridge], [snapshot.services]);

  async function refresh(silent = false) {
    if (!silent) setLoading(true);
    try {
      const response = await fetch('/api/staff/server-console', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not refresh server administration data.');
      setSnapshot(data);
    } catch (error) {
      if (!silent) setNotice(error instanceof Error ? error.message : 'Refresh failed.');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function submitAction(body: Record<string, unknown>) {
    setLoading(true);
    setNotice(null);
    try {
      const response = await fetch('/api/staff/server-console', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Action failed.');
      setNotice(
        data.record?.status === 'queued'
          ? 'Queued only — no console command bridge is configured, so this did not run in-game yet.'
          : data.record?.status === 'failed'
            ? `Action failed: ${data.record?.result || 'unknown error'}`
            : data.record?.result || 'Action sent.',
      );
      await refresh(true);
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Action failed.');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function submitPlayerModeration() {
    if (!selectedPlayer) return;
    const ok = await submitAction({
      type: 'moderation',
      action,
      steamId: selectedPlayer.steamId,
      name: selectedPlayer.rpName || selectedPlayer.name,
      reason,
      durationMinutes: action === 'ban' ? Number(durationMinutes) : null,
    });
    if (ok) {
      setSelectedPlayer(null);
      setReason('');
      setAction('kick');
    }
  }

  async function submitBroadcast() {
    const ok = await submitAction({ type: 'broadcast', message: broadcast });
    if (ok) setBroadcast('');
  }

  async function manageService(service: ManagedService['key'], action: 'start' | 'stop' | 'restart' | 'register') {
    await submitAction({ type: 'service-control', service, action });
  }

  useEffect(() => {
    const timer = window.setInterval(() => refresh(true), 5000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <section className="server-admin-toolbar">
        <div>
          <span className="kicker">Live snapshot</span>
          <strong>{snapshot.players.length} connected</strong>
          <small>Last refreshed {formatTime(snapshot.generatedAt)}</small>
        </div>
        <div className="server-admin-toolbar-actions">
          <button className="button button-soft" type="button" onClick={() => refresh()} disabled={loading}>{loading ? 'Working…' : 'Refresh'}</button>
        </div>
      </section>

      {notice ? <div className="notice info server-admin-notice">{notice}</div> : null}

      <section className="server-admin-layout">
        <article className="staff-panel server-console-panel">
          <div className="section-heading">
            <span className="kicker">Console</span>
            <h2>Current output</h2>
            <p>{snapshot.console.readable ? `Reading ${snapshot.console.source}` : 'No readable console log is attached yet.'}</p>
          </div>
          {snapshot.console.hint ? <div className="server-console-hint"><strong>Why it is not changing</strong><span>{snapshot.console.hint}</span></div> : null}
          <pre className="server-console-output" aria-live="polite">
            {latestLines.length ? latestLines.map((line) => <span key={line.id} className={`console-line console-${line.level}`}>{line.text}</span>) : <span className="console-line console-warning">No console log lines are available yet.</span>}
          </pre>
          <details className="server-console-diagnostics">
            <summary>Console hook diagnostics</summary>
            <div className="server-console-diagnostic-list">
              {snapshot.console.candidates.map((candidate) => (
                <div key={candidate.path} className={candidate.readable ? 'is-readable' : ''}>
                  <strong>{candidate.path}</strong>
                  <span>{candidate.readable ? 'Readable' : candidate.exists ? 'Found but not readable as a file' : 'Not found'} · {formatBytes(candidate.sizeBytes)} · Updated {formatDateTime(candidate.modifiedAt)}</span>
                  {candidate.note ? <small>{candidate.note}</small> : null}
                </div>
              ))}
            </div>
          </details>
        </article>

        <aside className="staff-panel server-control-panel">
          <div className="section-heading">
            <span className="kicker">Server controls</span>
            <h2>Power actions</h2>
            <p>These actions are restricted to Developer/server-settings staff.</p>
          </div>
          <div className="server-power-grid">
            <button type="button" className="button button-primary" disabled={!canPowerControl || loading} onClick={() => submitAction({ type: 'server-control', action: 'start' })}>Start server</button>
            <button type="button" className="button button-soft" disabled={!canPowerControl || loading} onClick={() => submitAction({ type: 'server-control', action: 'update' })}>Run update</button>
            <button type="button" className="button button-soft danger-button" disabled={!canPowerControl || loading} onClick={() => submitAction({ type: 'server-control', action: 'restart' })}>Restart</button>
            <button type="button" className="button button-soft danger-button" disabled={!canPowerControl || loading} onClick={() => submitAction({ type: 'server-control', action: 'kill' })}>Kill server</button>
          </div>
          {!snapshot.capabilities.consoleCommandScript ? <div className="server-console-hint is-warning"><strong>Moderation bridge not configured</strong><span>Kick, ban, and broadcast requests are written to the queue file but cannot execute in-game until NORTHLINE_CONSOLE_COMMAND_SCRIPT or a queue bridge is installed.</span></div> : null}
          <dl className="server-admin-config-list">
            <div><dt>Command bridge</dt><dd>{snapshot.capabilities.consoleCommandScript ? 'Script configured' : snapshot.capabilities.bridgeScript ? 'Built-in bridge configured' : 'Queue file only'}</dd></div>
            <div><dt>Console log</dt><dd>{snapshot.capabilities.consoleLogPath}</dd></div>
            <div><dt>Start script</dt><dd>{snapshot.capabilities.startScript}</dd></div>
            <div><dt>Update script</dt><dd>{snapshot.capabilities.updateScript}</dd></div>
            <div><dt>Queue</dt><dd>{snapshot.capabilities.commandQueuePath}</dd></div>
          </dl>
        </aside>
      </section>

      <section className="staff-panel server-services-panel">
        <div className="section-heading">
          <span className="kicker">Remote process controls</span>
          <h2>Discord bot & command bridge</h2>
          <p>Manage the background helpers that keep Discord commands and in-game automation working when you cannot remote into the server.</p>
        </div>
        <div className="server-service-grid">
          {services.map((service) => (
            <section key={service.key} className={`server-service-card ${serviceTone(service.status)}`}>
              <div className="server-service-header">
                <div>
                  <span className="kicker">{service.key === 'discord-bot' ? 'Discord' : 'Queue bridge'}</span>
                  <h3>{service.label}</h3>
                  <p>{service.description}</p>
                </div>
                <span className={`server-service-status ${serviceTone(service.status)}`}>{serviceStatusLabel(service.status)}</span>
              </div>
              <div className="server-service-actions">
                <button type="button" className="button button-primary" disabled={!canPowerControl || loading} onClick={() => manageService(service.key, 'start')}>Start</button>
                <button type="button" className="button button-soft" disabled={!canPowerControl || loading} onClick={() => manageService(service.key, 'restart')}>Restart</button>
                <button type="button" className="button button-soft danger-button" disabled={!canPowerControl || loading} onClick={() => manageService(service.key, 'stop')}>Stop</button>
                {service.key === 'discord-bot' ? <button type="button" className="button button-soft" disabled={!canPowerControl || loading} onClick={() => manageService(service.key, 'register')}>Register commands</button> : null}
              </div>
              <dl className="server-service-meta">
                <div><dt>Status</dt><dd>{serviceStatusLabel(service.status)}</dd></div>
                <div><dt>PID</dt><dd>{service.pid ?? '—'}</dd></div>
                <div><dt>Updated</dt><dd>{formatDateTime(service.updatedAt)}</dd></div>
                <div><dt>Log</dt><dd>{service.logPath || '—'}</dd></div>
              </dl>
              <ul className="server-service-config">
                {service.configuration.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <details className="server-service-log">
                <summary>{service.label} log tail</summary>
                <pre className="server-console-output compact-console">
                  {service.lines.length ? service.lines.map((line) => <span key={line.id} className={`console-line console-${line.level}`}>{line.text}</span>) : <span className="console-line console-warning">No log lines captured yet.</span>}
                </pre>
              </details>
            </section>
          ))}
        </div>
      </section>

      <section className="server-admin-layout compact-layout">
        <article className="staff-panel server-players-panel">
          <div className="section-heading">
            <span className="kicker">Players</span>
            <h2>Connected citizens</h2>
            <p>Open a player action menu to kick or ban with the SteamID already filled in.</p>
          </div>
          <div className="server-player-list">
            {snapshot.players.length ? snapshot.players.map((player) => (
              <div className="server-player-row" key={player.steamId}>
                <div>
                  <strong>{player.rpName || player.name}</strong>
                  <span>{player.name !== player.rpName ? player.name : 'Online'} · {player.steamId}</span>
                  <small>Connected {duration((Date.now() - new Date(player.since).getTime()) / 1000)} ago{player.level ? ` · Level ${player.level}` : ''}</small>
                </div>
                <button type="button" className="button button-soft" disabled={!canModerate} onClick={() => setSelectedPlayer(player)}>Moderate</button>
              </div>
            )) : <div className="server-empty-state"><strong>No connected players</strong><p>The server may be empty, offline, or waiting on fresh connection logs.</p></div>}
          </div>
        </article>

        <aside className="staff-panel server-actions-panel">
          <div className="section-heading"><span className="kicker">Quick broadcast</span><h2>Send a server message</h2><p>Uses the same command bridge as moderation actions.</p></div>
          <textarea value={broadcast} onChange={(event) => setBroadcast(event.target.value)} placeholder="Write a short server announcement…" maxLength={180} />
          <button type="button" className="button button-primary" disabled={!canModerate || loading || broadcast.trim().length < 2} onClick={submitBroadcast}>Send broadcast</button>
        </aside>
      </section>

      <section className="staff-panel server-command-history-panel">
        <div className="section-heading"><span className="kicker">Command history</span><h2>Recent web actions</h2><p>Everything requested from this panel is logged locally and sent to Discord when configured.</p></div>
        <div className="server-command-history">
          {snapshot.queue.length ? snapshot.queue.map((record) => (
            <div key={record.id} className={`server-command-row status-${record.status}`}>
              <div><strong>{record.command}</strong><span>{record.actorName} · {record.delivery} · {formatTime(record.createdAt)}</span>{record.result ? <small>{record.result}</small> : null}</div>
              <em>{record.status}</em>
            </div>
          )) : <p className="muted-inline-note">No web commands have been recorded yet.</p>}
        </div>
      </section>

      {selectedPlayer ? (
        <div className="server-modal-backdrop" role="dialog" aria-modal="true" aria-label="Player moderation menu">
          <div className="server-moderation-modal">
            <button type="button" className="modal-close" onClick={() => setSelectedPlayer(null)} aria-label="Close">×</button>
            <span className="kicker">Player action</span>
            <h2>{selectedPlayer.rpName || selectedPlayer.name}</h2>
            <p>{selectedPlayer.steamId}</p>
            <div className="segmented-control">
              <button type="button" className={action === 'kick' ? 'active' : ''} onClick={() => setAction('kick')}>Kick</button>
              <button type="button" className={action === 'ban' ? 'active' : ''} onClick={() => setAction('ban')}>Ban</button>
            </div>
            {action === 'ban' ? (
              <label className="form-field">Duration minutes <input value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} inputMode="numeric" placeholder="1440" /></label>
            ) : null}
            <label className="form-field">Reason <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason shown in the command and Discord log…" maxLength={160} /></label>
            <div className="modal-actions">
              <button type="button" className="button button-soft" onClick={() => setSelectedPlayer(null)}>Cancel</button>
              <button type="button" className="button button-primary danger-solid" disabled={loading || reason.trim().length < 2} onClick={submitPlayerModeration}>{action === 'ban' ? 'Ban player' : 'Kick player'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

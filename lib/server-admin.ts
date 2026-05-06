import { appendFile, mkdir, readFile, stat, writeFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getPopulationSummary, getPlayersBySteamId, getRecentAdminLogs, type AdminLog } from '@/lib/ape-data';
import { notifyGameServerAction } from '@/lib/discord-webhooks';
import type { StaffIdentity } from '@/lib/staff-auth';

const execFileAsync = promisify(execFile);

export type ConsoleLine = {
  id: string;
  text: string;
  level: 'info' | 'warning' | 'error' | 'command';
};

export type ConnectedServerPlayer = {
  steamId: string;
  name: string;
  since: string;
  rpName?: string | null;
  level?: number | null;
  cashBalance?: number | null;
  bankBalance?: number | null;
  totalPlaytimeSeconds?: number | null;
};

export type QueuedServerCommand = {
  id: string;
  createdAt: string;
  actorSteamId: string;
  actorName: string;
  command: string;
  targetSteamId?: string | null;
  targetName?: string | null;
  reason?: string | null;
  delivery: 'script' | 'queue' | 'control';
  status: 'sent' | 'queued' | 'failed';
  result?: string | null;
};

export type ServerAdminSnapshot = {
  generatedAt: string;
  console: {
    source: string | null;
    readable: boolean;
    lines: ConsoleLine[];
  };
  players: ConnectedServerPlayer[];
  queue: QueuedServerCommand[];
  capabilities: {
    consoleCommandScript: boolean;
    consoleLogConfigured: boolean;
    startScript: string;
    updateScript: string;
    commandQueuePath: string;
  };
};

type SeenGameActionsStore = {
  seen: string[];
  lastScanAt?: string;
};

function dataDir() {
  return process.env.NORTHLINE_DATA_PATH?.trim() || path.join(process.cwd(), '.northline-data');
}

function commandQueuePath() {
  return process.env.NORTHLINE_SERVER_COMMAND_QUEUE_PATH?.trim() || path.join(dataDir(), 'server-command-queue.jsonl');
}

function seenGameActionsPath() {
  return path.join(dataDir(), 'server-game-action-monitor.json');
}

function defaultStartScript() {
  return process.env.NORTHLINE_START_SERVER_SCRIPT?.trim() || 'C:\\Servers\\Scripts\\Run-NorthboundRP.bat';
}

function defaultUpdateScript() {
  return process.env.NORTHLINE_UPDATE_SERVER_SCRIPT?.trim() || 'C:\\Servers\\Scripts\\update_sbox.bat';
}

function consoleCommandScript() {
  return process.env.NORTHLINE_CONSOLE_COMMAND_SCRIPT?.trim() || '';
}

function configuredConsoleLogCandidates() {
  const explicit = [
    process.env.NORTHLINE_SERVER_CONSOLE_LOG_PATH,
    process.env.SBOX_SERVER_CONSOLE_LOG_PATH,
    process.env.SBOX_SERVER_LOG_PATH,
  ].map((value) => value?.trim()).filter(Boolean) as string[];

  const base = process.env.APE_RP_DATA_PATH?.trim();
  const fallback = base ? [
    path.join(base, 'server_console.log'),
    path.join(base, 'console.log'),
    path.join(base, 'logs', 'latest.log'),
    path.join(base, 'logs', 'console.log'),
  ] : [];
  return [...explicit, ...fallback];
}

function configuredProcessNames() {
  const raw = process.env.NORTHLINE_SERVER_PROCESS_NAMES?.trim() || process.env.SBOX_SERVER_PROCESS_NAMES?.trim() || 'sbox.exe,sbox-server.exe,sboxserver.exe';
  return raw.split(',').map((item) => item.trim()).filter(Boolean);
}

async function ensureDataDir() {
  await mkdir(dataDir(), { recursive: true });
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function lineLevel(text: string): ConsoleLine['level'] {
  const lower = text.toLowerCase();
  if (lower.includes('[error') || lower.includes('exception') || lower.includes('failed')) return 'error';
  if (lower.includes('[warn') || lower.includes('warning')) return 'warning';
  if (lower.startsWith('>') || lower.includes(' command ')) return 'command';
  return 'info';
}

async function existingConsoleLogPath(): Promise<string | null> {
  for (const candidate of configuredConsoleLogCandidates()) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) return candidate;
    } catch {}
  }
  return null;
}

export async function readConsoleOutput(limit = 260): Promise<{ source: string | null; readable: boolean; lines: ConsoleLine[] }> {
  const source = await existingConsoleLogPath();
  if (!source) return { source: configuredConsoleLogCandidates()[0] ?? null, readable: false, lines: [] };

  try {
    const info = await stat(source);
    const maxBytes = 180_000;
    const start = Math.max(0, info.size - maxBytes);
    const handle = await fs.promises.open(source, 'r');
    try {
      const buffer = Buffer.alloc(info.size - start);
      await handle.read(buffer, 0, buffer.length, start);
      const raw = buffer.toString('utf8').replace(/\0/g, '');
      const lines = raw.split(/\r?\n/).map((line) => line.trimEnd()).filter(Boolean).slice(-limit);
      return {
        source,
        readable: true,
        lines: lines.map((text, index) => ({ id: `${start}-${index}`, text, level: lineLevel(text) })),
      };
    } finally {
      await handle.close();
    }
  } catch {
    return { source, readable: false, lines: [] };
  }
}

export async function getConnectedServerPlayers(): Promise<ConnectedServerPlayer[]> {
  const [population, playersBySteam] = await Promise.all([getPopulationSummary(), getPlayersBySteamId()]);
  return population.onlinePlayers.map((online) => {
    const save = playersBySteam.get(online.steamId);
    return {
      steamId: online.steamId,
      name: online.name,
      since: online.since,
      rpName: save?.RpDisplayName || save?.LastKnownDisplayName || null,
      level: typeof save?.Level === 'number' ? save.Level : null,
      cashBalance: typeof save?.CashBalance === 'number' ? save.CashBalance : null,
      bankBalance: typeof save?.BankBalance === 'number' ? save.BankBalance : null,
      totalPlaytimeSeconds: typeof save?.TotalPlaytimeSeconds === 'number' ? save.TotalPlaytimeSeconds : null,
    };
  });
}

function cleanReason(value: unknown) {
  const text = String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/["`]/g, '').trim();
  return text.slice(0, 160) || 'No reason provided';
}

function cleanTarget(value: unknown) {
  const text = String(value ?? '').trim();
  return text.replace(/[^\w .:\-#[\]]/g, '').slice(0, 80);
}

function quoteCommandValue(value: string) {
  return `"${value.replace(/"/g, '')}"`;
}

function normalizeDurationMinutes(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return Math.min(Math.round(number), 5256000);
}

export function buildModerationCommand(input: { action: 'kick' | 'ban'; steamId: string; name?: string | null; reason?: string | null; durationMinutes?: number | null }) {
  const target = /^\d{15,20}$/.test(input.steamId) ? input.steamId : cleanTarget(input.name || input.steamId);
  const reason = cleanReason(input.reason);
  if (input.action === 'kick') return `kick ${target} ${quoteCommandValue(reason)}`;
  const duration = normalizeDurationMinutes(input.durationMinutes);
  return duration ? `ban ${target} ${duration}m ${quoteCommandValue(reason)}` : `ban ${target} ${quoteCommandValue(reason)}`;
}

async function appendCommandRecord(record: QueuedServerCommand) {
  await ensureDataDir();
  await appendFile(commandQueuePath(), `${JSON.stringify(record)}\n`, 'utf8');
}

export async function getRecentCommandQueue(limit = 40): Promise<QueuedServerCommand[]> {
  try {
    const raw = await readFile(commandQueuePath(), 'utf8');
    return raw.split(/\r?\n/).filter(Boolean).slice(-limit).map((line) => JSON.parse(line) as QueuedServerCommand).reverse();
  } catch {
    return [];
  }
}

async function runConsoleScript(command: string): Promise<{ status: 'sent' | 'failed'; result: string }> {
  const script = consoleCommandScript();
  if (!script) return { status: 'failed', result: 'NORTHLINE_CONSOLE_COMMAND_SCRIPT is not configured.' };

  try {
    const options = { timeout: 15_000, windowsHide: true, maxBuffer: 1024 * 128 };
    const output = process.platform === 'win32'
      ? await execFileAsync('cmd.exe', ['/c', script, command], options)
      : await execFileAsync(script, [command], options);
    const result = `${output.stdout || ''}${output.stderr ? `\n${output.stderr}` : ''}`.trim();
    return { status: 'sent', result: result || 'Command script completed.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Command script failed.';
    return { status: 'failed', result: message };
  }
}

export async function sendServerCommand(input: { command: string; actor: StaffIdentity; targetSteamId?: string | null; targetName?: string | null; reason?: string | null }): Promise<QueuedServerCommand> {
  const safeCommand = String(input.command ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 300);
  const base: QueuedServerCommand = {
    id: makeId('cmd'),
    createdAt: new Date().toISOString(),
    actorSteamId: input.actor.steamId,
    actorName: input.actor.displayName,
    command: safeCommand,
    targetSteamId: input.targetSteamId ?? null,
    targetName: input.targetName ?? null,
    reason: input.reason ?? null,
    delivery: consoleCommandScript() ? 'script' : 'queue',
    status: 'queued',
    result: null,
  };

  if (consoleCommandScript()) {
    const result = await runConsoleScript(safeCommand);
    const record = { ...base, status: result.status, result: result.result } satisfies QueuedServerCommand;
    await appendCommandRecord(record);
    return record;
  }

  await appendCommandRecord(base);
  return base;
}

async function runDetachedBatch(scriptPath: string): Promise<string> {
  if (process.platform === 'win32') {
    await execFileAsync('cmd.exe', ['/c', 'start', '""', scriptPath], { windowsHide: true, timeout: 10_000 });
    return `Started ${scriptPath}`;
  }
  await execFileAsync('sh', ['-lc', `${JSON.stringify(scriptPath)} >/dev/null 2>&1 &`], { timeout: 10_000 });
  return `Started ${scriptPath}`;
}

async function killConfiguredServerProcesses(): Promise<string> {
  const names = configuredProcessNames();
  if (!names.length) return 'No process names are configured.';
  const results: string[] = [];
  for (const name of names) {
    try {
      if (process.platform === 'win32') {
        const output = await execFileAsync('taskkill.exe', ['/IM', name, '/F'], { timeout: 12_000, windowsHide: true, maxBuffer: 1024 * 128 });
        results.push(`${name}: ${(output.stdout || output.stderr || 'requested').trim()}`);
      } else {
        const output = await execFileAsync('pkill', ['-f', name], { timeout: 12_000, maxBuffer: 1024 * 128 });
        results.push(`${name}: ${(output.stdout || output.stderr || 'requested').trim()}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'not running or failed';
      results.push(`${name}: ${message}`);
    }
  }
  return results.join('\n');
}

export async function runServerPowerAction(action: 'start' | 'kill' | 'restart' | 'update', actor: StaffIdentity): Promise<QueuedServerCommand> {
  const id = makeId('power');
  const createdAt = new Date().toISOString();
  let result = '';
  let status: QueuedServerCommand['status'] = 'sent';
  let command: string = action;

  try {
    if (action === 'start') {
      command = `start-server ${defaultStartScript()}`;
      result = await runDetachedBatch(defaultStartScript());
    } else if (action === 'update') {
      command = `update-server ${defaultUpdateScript()}`;
      result = await runDetachedBatch(defaultUpdateScript());
    } else if (action === 'kill') {
      command = `kill-server ${configuredProcessNames().join(',')}`;
      result = await killConfiguredServerProcesses();
    } else if (action === 'restart') {
      command = `restart-server ${configuredProcessNames().join(',')} -> ${defaultStartScript()}`;
      const killed = await killConfiguredServerProcesses();
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const started = await runDetachedBatch(defaultStartScript());
      result = `${killed}\n${started}`;
    }
  } catch (error) {
    status = 'failed';
    result = error instanceof Error ? error.message : 'Server power action failed.';
  }

  const record: QueuedServerCommand = {
    id,
    createdAt,
    actorSteamId: actor.steamId,
    actorName: actor.displayName,
    command,
    delivery: 'control',
    status,
    result,
  };
  await appendCommandRecord(record);
  return record;
}

function adminActionId(log: AdminLog) {
  return `${log.Timestamp}|${log.AdminSteamId}|${log.ActionType}|${log.TargetSteamId}|${log.TargetName}|${log.Details}`;
}

function isKickOrBan(log: AdminLog) {
  const action = String(log.ActionType ?? '').toLowerCase();
  return action.includes('kick') || (action.includes('ban') && !action.includes('unban') && !action.includes('pardon'));
}

async function readSeenGameActions(): Promise<SeenGameActionsStore> {
  try {
    const parsed = JSON.parse(await readFile(seenGameActionsPath(), 'utf8')) as SeenGameActionsStore;
    return { seen: Array.isArray(parsed.seen) ? parsed.seen : [], lastScanAt: parsed.lastScanAt };
  } catch {
    return { seen: [] };
  }
}

async function writeSeenGameActions(store: SeenGameActionsStore) {
  await ensureDataDir();
  await writeFile(seenGameActionsPath(), JSON.stringify({ seen: store.seen.slice(-500), lastScanAt: new Date().toISOString() }, null, 2), 'utf8');
}

export async function scanGameModerationActions(): Promise<{ sent: number; scanned: number }> {
  const [store, logs] = await Promise.all([readSeenGameActions(), getRecentAdminLogs(80)]);
  const seen = new Set(store.seen);
  const candidates = logs.filter(isKickOrBan).reverse();
  if (!store.lastScanAt && store.seen.length === 0) {
    for (const log of candidates) seen.add(adminActionId(log));
    await writeSeenGameActions({ seen: [...seen] });
    return { sent: 0, scanned: candidates.length };
  }
  let sent = 0;

  for (const log of candidates) {
    const id = adminActionId(log);
    if (seen.has(id)) continue;
    seen.add(id);
    const adminName = String(log.AdminName ?? '').trim();
    const action = String(log.ActionType ?? 'Moderation action');
    // Avoid looping obvious website-originated records if the game later mirrors them back into admin logs.
    if (/website|web panel|web action/i.test(adminName) || /website|web panel|web action/i.test(String(log.Category ?? ''))) continue;
    await notifyGameServerAction({
      action,
      actor: { steamId: log.AdminSteamId == null ? null : String(log.AdminSteamId), name: adminName || 'In-game staff' },
      targetSteamId: log.TargetSteamId == null ? null : String(log.TargetSteamId),
      targetName: log.TargetName ?? null,
      reason: log.Details ?? null,
      occurredAt: log.Timestamp,
      source: 'game_admin_log',
    });
    sent += 1;
  }

  await writeSeenGameActions({ seen: [...seen] });
  return { sent, scanned: candidates.length };
}

export async function getServerAdminSnapshot(): Promise<ServerAdminSnapshot> {
  await scanGameModerationActions().catch(() => ({ sent: 0, scanned: 0 }));
  const [consoleOutput, players, queue] = await Promise.all([
    readConsoleOutput(),
    getConnectedServerPlayers(),
    getRecentCommandQueue(30),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    console: consoleOutput,
    players,
    queue,
    capabilities: {
      consoleCommandScript: Boolean(consoleCommandScript()),
      consoleLogConfigured: Boolean(configuredConsoleLogCandidates()[0]),
      startScript: defaultStartScript(),
      updateScript: defaultUpdateScript(),
      commandQueuePath: commandQueuePath(),
    },
  };
}

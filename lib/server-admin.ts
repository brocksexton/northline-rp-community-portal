import { appendFile, mkdir, readFile, stat, writeFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { execFile, spawn } from 'node:child_process';
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

export type ConsoleLogCandidate = {
  path: string;
  exists: boolean;
  readable: boolean;
  sizeBytes: number | null;
  modifiedAt: string | null;
  note: string | null;
};

export type ManagedServiceKey = 'discord-bot' | 'server-bridge';
export type ManagedServiceAction = 'start' | 'stop' | 'restart' | 'register';

export type ManagedServiceSnapshot = {
  key: ManagedServiceKey;
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

export type ServerAdminSnapshot = {
  generatedAt: string;
  console: {
    source: string | null;
    readable: boolean;
    lines: ConsoleLine[];
    candidates: ConsoleLogCandidate[];
    hint: string | null;
  };
  players: ConnectedServerPlayer[];
  queue: QueuedServerCommand[];
  capabilities: {
    consoleCommandScript: boolean;
    consoleLogConfigured: boolean;
    startScript: string;
    updateScript: string;
    commandQueuePath: string;
    consoleLogPath: string;
    webManagedStartCapture: boolean;
    bridgeScript: string | null;
  };
  services: {
    bot: ManagedServiceSnapshot;
    bridge: ManagedServiceSnapshot;
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

function defaultConsoleLogPath() {
  return process.env.NORTHLINE_SERVER_CONSOLE_LOG_PATH?.trim()
    || process.env.SBOX_SERVER_CONSOLE_LOG_PATH?.trim()
    || process.env.SBOX_SERVER_LOG_PATH?.trim()
    || (process.platform === 'win32' ? 'C:\\Servers\\northline-data\\server-console.log' : path.join(dataDir(), 'server-console.log'));
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

function defaultBridgeScript() {
  return process.env.NORTHLINE_SERVER_BRIDGE_SCRIPT?.trim() || '';
}

function startTargetScript() {
  return defaultBridgeScript() || defaultStartScript();
}

function botScriptPath() {
  return path.join(process.cwd(), 'scripts', 'discord-bot', 'bot.mjs');
}

function botRegisterScriptPath() {
  return path.join(process.cwd(), 'scripts', 'discord-bot', 'register-commands.mjs');
}

function bridgeScriptPath() {
  return path.join(process.cwd(), 'scripts', 'server-bridge', 'command-bridge.mjs');
}

function botLogPath() {
  return process.env.NORTHLINE_BOT_LOG_PATH?.trim() || path.join(dataDir(), 'discord-bot.log');
}

function bridgeLogPath() {
  return process.env.NORTHLINE_SERVER_BRIDGE_LOG_PATH?.trim() || path.join(dataDir(), 'server-bridge.log');
}

function botPidPath() {
  return path.join(dataDir(), 'discord-bot.pid');
}

function bridgePidPath() {
  return path.join(dataDir(), 'server-bridge.pid');
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
  const values = [...explicit, ...fallback, defaultConsoleLogPath()];
  return [...new Set(values.filter(Boolean))];
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

async function getConsoleLogCandidates(): Promise<ConsoleLogCandidate[]> {
  const candidates = configuredConsoleLogCandidates();
  const rows: ConsoleLogCandidate[] = [];
  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      rows.push({
        path: candidate,
        exists: true,
        readable: info.isFile(),
        sizeBytes: info.isFile() ? info.size : null,
        modifiedAt: info.isFile() ? info.mtime.toISOString() : null,
        note: info.isFile() ? null : 'Path exists but is not a file.',
      });
    } catch (error) {
      rows.push({
        path: candidate,
        exists: false,
        readable: false,
        sizeBytes: null,
        modifiedAt: null,
        note: error instanceof Error ? error.message : 'Not found or not readable.',
      });
    }
  }
  return rows;
}

function consoleHint(readable: boolean, candidates: ConsoleLogCandidate[]) {
  if (readable) return null;
  if (!candidates.length) return 'No console log path is configured.';
  const primary = candidates[0]?.path || defaultConsoleLogPath();
  return `No readable console log was found. The website cannot attach to an existing Windows console window; it can only tail a log file. Start the game server from this panel to capture output to ${primary}, or set NORTHLINE_SERVER_CONSOLE_LOG_PATH to a file your server writes to.`;
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

  const queued = { ...base, result: `Queued only. No NORTHLINE_CONSOLE_COMMAND_SCRIPT is configured, so this will not execute until a local bridge consumes ${commandQueuePath()}.` } satisfies QueuedServerCommand;
  await appendCommandRecord(queued);
  return queued;
}

async function readPidValue(pidPath: string): Promise<number | null> {
  try {
    const raw = (await readFile(pidPath, 'utf8')).trim();
    const pid = Number(raw);
    return Number.isFinite(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

async function isPidRunning(pid: number | null): Promise<boolean> {
  if (!pid) return false;
  try {
    if (process.platform === 'win32') {
      const output = await execFileAsync('tasklist.exe', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], {
        timeout: 10_000,
        windowsHide: true,
        maxBuffer: 1024 * 128,
      });
      return output.stdout.includes(`"${pid}"`);
    }
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function tailLogFile(filePath: string | null, limit = 80): Promise<{ readable: boolean; modifiedAt: string | null; lines: ConsoleLine[] }> {
  if (!filePath) return { readable: false, modifiedAt: null, lines: [] };
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return { readable: false, modifiedAt: null, lines: [] };
    const maxBytes = 120_000;
    const start = Math.max(0, info.size - maxBytes);
    const handle = await fs.promises.open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(info.size - start);
      await handle.read(buffer, 0, buffer.length, start);
      const raw = buffer.toString('utf8').replace(/\0/g, '');
      const rows: string[] = raw.split(/\r?\n/).map((line: string) => line.trimEnd()).filter(Boolean).slice(-limit);
      return {
        readable: true,
        modifiedAt: info.mtime.toISOString(),
        lines: rows.map((row: string, index: number) => ({ id: `${filePath}-${start}-${index}`, text: row, level: lineLevel(row) })),
      };
    } finally {
      await handle.close();
    }
  } catch {
    return { readable: false, modifiedAt: null, lines: [] };
  }
}

async function removePidFile(pidPath: string) {
  try { await fs.promises.unlink(pidPath); } catch {}
}

async function stopManagedProcess(pidPath: string): Promise<string> {
  const pid = await readPidValue(pidPath);
  if (!pid) {
    await removePidFile(pidPath);
    return 'No saved process ID was found.';
  }
  if (!(await isPidRunning(pid))) {
    await removePidFile(pidPath);
    return `Saved process ${pid} is no longer running.`;
  }

  if (process.platform === 'win32') {
    const output = await execFileAsync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
      timeout: 12_000,
      windowsHide: true,
      maxBuffer: 1024 * 128,
    });
    await removePidFile(pidPath);
    return (output.stdout || output.stderr || `Stopped process ${pid}.`).trim();
  }

  process.kill(pid, 'SIGTERM');
  await removePidFile(pidPath);
  return `Stopped process ${pid}.`;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function tailPlainLog(filePath: string, limit = 24) {
  try {
    const raw = await readFile(filePath, 'utf8');
    return raw.split(/\r?\n/).filter(Boolean).slice(-limit).join('\n');
  } catch {
    return '';
  }
}

async function assertManagedProcessStillRunning(pidPath: string, logPath: string, label: string) {
  await sleep(1800);
  const pid = await readPidValue(pidPath);
  if (await isPidRunning(pid)) return;
  const tail = await tailPlainLog(logPath, 30);
  await removePidFile(pidPath);
  throw new Error(`${label} exited immediately after launch.${tail ? ` Recent log output:\n${tail}` : ' No log output was captured.'}`);
}

async function writeNodeProcessRunner(opts: { logPath: string; scriptPath: string; args: string[]; env?: Record<string, string> }) {
  await ensureDataDir();
  const runnerPath = path.join(dataDir(), `${path.basename(opts.scriptPath).replace(/[^a-z0-9_.-]/gi, '-')}-${Date.now().toString(36)}.cmd`);
  const nodeExe = process.execPath;
  const argLine = opts.args.map((arg) => `"${arg.replace(/"/g, '')}"`).join(' ');
  const extraEnv = Object.entries(opts.env || {}).map(([key, value]) => `set "${key}=${String(value).replace(/"/g, '')}"`);
  const lines = [
    '@echo off',
    'setlocal EnableExtensions',
    `cd /d "${process.cwd()}"`,
    ...extraEnv,
    `echo [${new Date().toISOString()}] Starting ${path.basename(opts.scriptPath)}>> "${opts.logPath}"`,
    `"${nodeExe}" ${argLine} >> "${opts.logPath}" 2>&1`,
    'set "EXIT_CODE=%ERRORLEVEL%"',
    `echo [${new Date().toISOString()}] ${path.basename(opts.scriptPath)} exited with code %EXIT_CODE%.>> "${opts.logPath}"`,
    'exit /b %EXIT_CODE%',
  ];
  await writeFile(runnerPath, lines.join('\r\n'), 'utf8');
  return runnerPath;
}

async function startManagedNodeProcess(opts: { pidPath: string; logPath: string; scriptPath: string; args?: string[]; env?: Record<string, string> }): Promise<string> {
  const existingPid = await readPidValue(opts.pidPath);
  if (await isPidRunning(existingPid)) return `Process is already running (PID ${existingPid}).`;

  await ensureDataDir();
  await mkdir(path.dirname(opts.logPath), { recursive: true });
  await writeFile(opts.logPath, `[${new Date().toISOString()}] Starting ${path.basename(opts.scriptPath)}\n`, { encoding: 'utf8', flag: 'a' });

  const args = [opts.scriptPath, ...(opts.args || [])];
  const environment = { ...process.env, ...opts.env };

  if (process.platform === 'win32') {
    const runnerPath = await writeNodeProcessRunner({ logPath: opts.logPath, scriptPath: opts.scriptPath, args, env: opts.env });
    const ps = [
      "$p = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/d','/s','/c', ('\"' + $env:NL_RUNNER_PATH + '\"')) -WorkingDirectory $env:NL_CWD -PassThru",
      "$p.Id | Set-Content -Encoding ASCII -Path $env:NL_PID_PATH",
      'Write-Output $p.Id',
    ].join('; ');

    const child = await execFileAsync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], {
      windowsHide: true,
      timeout: 15_000,
      maxBuffer: 1024 * 128,
      env: {
        ...environment,
        NL_CWD: process.cwd(),
        NL_PID_PATH: opts.pidPath,
        NL_RUNNER_PATH: runnerPath,
      },
    });
    await assertManagedProcessStillRunning(opts.pidPath, opts.logPath, path.basename(opts.scriptPath));
    return `Started ${path.basename(opts.scriptPath)}${child.stdout?.trim() ? ` (PID ${child.stdout.trim()})` : ''}.`;
  }

  const out = fs.openSync(opts.logPath, 'a');
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    env: environment,
    detached: true,
    stdio: ['ignore', out, out],
  });
  child.unref();
  await writeFile(opts.pidPath, String(child.pid), 'utf8');
  await assertManagedProcessStillRunning(opts.pidPath, opts.logPath, path.basename(opts.scriptPath));
  return `Started ${path.basename(opts.scriptPath)} (PID ${child.pid}).`;
}

function serviceLabel(key: ManagedServiceKey) {
  return key === 'discord-bot' ? 'Discord bot' : 'Server bridge';
}

async function getManagedServiceSnapshot(key: ManagedServiceKey): Promise<ManagedServiceSnapshot> {
  const isBot = key === 'discord-bot';
  const pidPath = isBot ? botPidPath() : bridgePidPath();
  const logPath = isBot ? botLogPath() : bridgeLogPath();
  const pid = await readPidValue(pidPath);
  const running = await isPidRunning(pid);
  const tailed = await tailLogFile(logPath, 70);
  const configured = isBot
    ? Boolean(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_BOT_CLIENT_ID && (process.env.NORTHLINE_BOT_API_SECRET || process.env.DISCORD_BOT_API_SECRET))
    : fs.existsSync(defaultStartScript());

  return {
    key,
    label: serviceLabel(key),
    description: isBot
      ? 'Handles Discord slash commands, pretty embeds, announcements, and server-aware status replies.'
      : 'Consumes queued website and Discord actions, launches the server, and delivers commands into the live S&box console.',
    status: !configured ? 'not-configured' : running ? 'running' : 'stopped',
    pid: running ? pid : null,
    pidFile: pidPath,
    logPath,
    logReadable: tailed.readable,
    updatedAt: tailed.modifiedAt,
    configuration: isBot
      ? [
          process.env.DISCORD_BOT_TOKEN ? 'Bot token configured' : 'Missing DISCORD_BOT_TOKEN',
          process.env.DISCORD_BOT_CLIENT_ID ? 'Client ID configured' : 'Missing DISCORD_BOT_CLIENT_ID',
          process.env.NORTHLINE_BOT_API_SECRET || process.env.DISCORD_BOT_API_SECRET ? 'Bot API secret configured' : 'Missing NORTHLINE_BOT_API_SECRET',
          process.env.DISCORD_BOT_GUILD_ID ? `Guild target: ${process.env.DISCORD_BOT_GUILD_ID}` : 'Global command registration (no guild override)',
          /^true$/i.test(process.env.NORTHLINE_BOT_ENABLE_PRIVILEGED_INTENTS || '') ? 'Privileged Gateway intents enabled by env' : 'Using safe Gateway intents only',
        ]
      : [
          fs.existsSync(defaultStartScript()) ? `Start script found: ${defaultStartScript()}` : `Missing start script: ${defaultStartScript()}`,
          `Queue file: ${commandQueuePath()}`,
          `Console log: ${defaultConsoleLogPath()}`,
          `Bridge log: ${logPath}`,
        ],
    command: isBot ? `node ${botScriptPath()}` : `node ${bridgeScriptPath()}`,
    lines: tailed.lines,
  };
}

export async function runManagedServiceAction(service: ManagedServiceKey, action: ManagedServiceAction, actor: StaffIdentity): Promise<QueuedServerCommand> {
  const id = makeId('service');
  const createdAt = new Date().toISOString();
  const label = serviceLabel(service);
  let status: QueuedServerCommand['status'] = 'sent';
  let result = '';

  try {
    if (service === 'discord-bot') {
      const configured = Boolean(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_BOT_CLIENT_ID && (process.env.NORTHLINE_BOT_API_SECRET || process.env.DISCORD_BOT_API_SECRET));
      if ((action === 'start' || action === 'restart' || action === 'register') && !configured) {
        throw new Error('The Discord bot is not configured yet. Set DISCORD_BOT_TOKEN, DISCORD_BOT_CLIENT_ID, and NORTHLINE_BOT_API_SECRET in .env.local first.');
      }

      if (action === 'start') {
        result = await startManagedNodeProcess({ pidPath: botPidPath(), logPath: botLogPath(), scriptPath: botScriptPath() });
      } else if (action === 'stop') {
        result = await stopManagedProcess(botPidPath());
      } else if (action === 'restart') {
        const stopped = await stopManagedProcess(botPidPath());
        const started = await startManagedNodeProcess({ pidPath: botPidPath(), logPath: botLogPath(), scriptPath: botScriptPath() });
        result = `${stopped}\n${started}`;
      } else if (action === 'register') {
        const output = await execFileAsync(process.execPath, [botRegisterScriptPath()], {
          cwd: process.cwd(),
          timeout: 120_000,
          maxBuffer: 1024 * 512,
          env: process.env,
        });
        result = `${output.stdout || ''}${output.stderr ? `\n${output.stderr}` : ''}`.trim() || 'Discord bot commands registered.';
        await appendFile(botLogPath(), `\n[${new Date().toISOString()}] Register commands\n${result}\n`, 'utf8').catch(() => {});
      }
    } else {
      if (action === 'register') throw new Error('Register is only available for the Discord bot.');
      if (!fs.existsSync(defaultStartScript()) && (action === 'start' || action === 'restart')) {
        throw new Error(`The bridge cannot start because the server start script was not found: ${defaultStartScript()}`);
      }

      if (action === 'start') {
        result = await startManagedNodeProcess({
          pidPath: bridgePidPath(),
          logPath: bridgeLogPath(),
          scriptPath: bridgeScriptPath(),
          env: { NORTHLINE_SERVER_BRIDGE_LOG_PATH: bridgeLogPath() },
        });
      } else if (action === 'stop') {
        result = await stopManagedProcess(bridgePidPath());
      } else if (action === 'restart') {
        const stopped = await stopManagedProcess(bridgePidPath());
        const started = await startManagedNodeProcess({
          pidPath: bridgePidPath(),
          logPath: bridgeLogPath(),
          scriptPath: bridgeScriptPath(),
          env: { NORTHLINE_SERVER_BRIDGE_LOG_PATH: bridgeLogPath() },
        });
        result = `${stopped}\n${started}`;
      }
    }
  } catch (error) {
    status = 'failed';
    result = error instanceof Error ? error.message : `${label} ${action} failed.`;
  }

  const record: QueuedServerCommand = {
    id,
    createdAt,
    actorSteamId: actor.steamId,
    actorName: actor.displayName,
    command: `${label.toLowerCase()} ${action}`,
    delivery: 'control',
    status,
    result,
  };
  await appendCommandRecord(record);
  return record;
}

async function appendConsoleCaptureHeader(scriptPath: string, action: string) {
  const logPath = defaultConsoleLogPath();
  await mkdir(path.dirname(logPath), { recursive: true });
  await appendFile(logPath, `
============================================================
[${new Date().toISOString()}] ${action}: ${scriptPath}
============================================================
`, 'utf8');
  return logPath;
}

async function writeWindowsCaptureRunner(scriptPath: string) {
  const logPath = await appendConsoleCaptureHeader(scriptPath, 'Website managed launch');
  const runnerPath = path.join(dataDir(), 'northline-web-managed-server-runner.cmd');
  await ensureDataDir();
  const content = [
    '@echo off',
    'setlocal EnableExtensions',
    `echo [${new Date().toISOString()}] Starting Northline RP server through web-managed capture.>> "${logPath}"`,
    `echo Script: ${scriptPath}>> "${logPath}"`,
    `call "${scriptPath}" >> "${logPath}" 2>&1`,
    `echo [${new Date().toISOString()}] Server script exited.>> "${logPath}"`,
  ].join('\r\n');
  await writeFile(runnerPath, content, 'utf8');
  return { runnerPath, logPath };
}

async function runDetachedBatch(scriptPath: string): Promise<string> {
  if (process.platform === 'win32') {
    await execFileAsync('cmd.exe', ['/c', 'start', '""', scriptPath], { windowsHide: true, timeout: 10_000 });
    return `Started ${scriptPath}`;
  }
  await execFileAsync('sh', ['-lc', `${JSON.stringify(scriptPath)} >/dev/null 2>&1 &`], { timeout: 10_000 });
  return `Started ${scriptPath}`;
}

async function runServerStartWithConsoleCapture(scriptPath: string): Promise<string> {
  if (process.platform === 'win32') {
    const { runnerPath, logPath } = await writeWindowsCaptureRunner(scriptPath);
    const command = `Start-Process -FilePath $env:NORTHLINE_CAPTURE_RUNNER -WorkingDirectory $env:NORTHLINE_CAPTURE_DIR -WindowStyle Normal`;
    await execFileAsync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
      windowsHide: true,
      timeout: 10_000,
      env: { ...process.env, NORTHLINE_CAPTURE_RUNNER: runnerPath, NORTHLINE_CAPTURE_DIR: path.dirname(runnerPath) },
    });
    return `Started ${scriptPath} with web-managed console capture. Tail file: ${logPath}`;
  }
  const logPath = await appendConsoleCaptureHeader(scriptPath, 'Website managed launch');
  await execFileAsync('sh', ['-lc', `${JSON.stringify(scriptPath)} >> ${JSON.stringify(logPath)} 2>&1 &`], { timeout: 10_000 });
  return `Started ${scriptPath} with web-managed console capture. Tail file: ${logPath}`;
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
      command = `start-server ${startTargetScript()}`;
      result = defaultBridgeScript() ? await runDetachedBatch(defaultBridgeScript()) : await runServerStartWithConsoleCapture(defaultStartScript());
    } else if (action === 'update') {
      command = `update-server ${defaultUpdateScript()}`;
      result = await runDetachedBatch(defaultUpdateScript());
    } else if (action === 'kill') {
      command = `kill-server ${configuredProcessNames().join(',')}`;
      result = await killConfiguredServerProcesses();
    } else if (action === 'restart') {
      command = `restart-server ${configuredProcessNames().join(',')} -> ${startTargetScript()}`;
      const killed = await killConfiguredServerProcesses();
      await new Promise((resolve) => setTimeout(resolve, 2500));
      const started = defaultBridgeScript() ? await runDetachedBatch(defaultBridgeScript()) : await runServerStartWithConsoleCapture(defaultStartScript());
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
  const [consoleOutput, consoleCandidates, players, queue, botService, bridgeService] = await Promise.all([
    readConsoleOutput(),
    getConsoleLogCandidates(),
    getConnectedServerPlayers(),
    getRecentCommandQueue(30),
    getManagedServiceSnapshot('discord-bot'),
    getManagedServiceSnapshot('server-bridge'),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    console: { ...consoleOutput, candidates: consoleCandidates, hint: consoleHint(consoleOutput.readable, consoleCandidates) },
    players,
    queue,
    capabilities: {
      consoleCommandScript: Boolean(consoleCommandScript()),
      consoleLogConfigured: Boolean(process.env.NORTHLINE_SERVER_CONSOLE_LOG_PATH || process.env.SBOX_SERVER_CONSOLE_LOG_PATH || process.env.SBOX_SERVER_LOG_PATH),
      startScript: defaultStartScript(),
      updateScript: defaultUpdateScript(),
      commandQueuePath: commandQueuePath(),
      consoleLogPath: defaultConsoleLogPath(),
      webManagedStartCapture: true,
      bridgeScript: defaultBridgeScript() || null,
    },
    services: {
      bot: botService,
      bridge: bridgeService,
    },
  };
}

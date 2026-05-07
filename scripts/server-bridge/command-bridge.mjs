import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { loadNorthlineEnv } from '../shared/load-env.mjs';

loadNorthlineEnv();

const isWin = process.platform === 'win32';
const root = process.cwd();
const dataDir = envPath(process.env.NORTHLINE_DATA_PATH, path.join(root, '.northline-data'));
const queuePath = envPath(process.env.NORTHLINE_SERVER_COMMAND_QUEUE_PATH, path.join(dataDir, 'server-command-queue.jsonl'));
const logPath = envPath(process.env.NORTHLINE_SERVER_CONSOLE_LOG_PATH, isWin ? 'C:\\Servers\\northline-data\\server-console.log' : path.join(dataDir, 'server-console.log'));
const serviceLogPath = envPath(process.env.NORTHLINE_SERVER_BRIDGE_LOG_PATH, path.join(dataDir, 'server-bridge.log'));
const statePath = envPath(process.env.NORTHLINE_SERVER_BRIDGE_STATE_PATH, path.join(dataDir, 'server-command-bridge-state.json'));
const startScript = envPath(process.env.NORTHLINE_START_SERVER_SCRIPT, isWin ? 'C:\\Servers\\Scripts\\Run-NorthboundRP.bat' : '');
const launchServer = !/^false$/i.test(process.env.NORTHLINE_BRIDGE_LAUNCH_SERVER || 'true');
const skipExistingDefault = !/^false$/i.test(process.env.NORTHLINE_BRIDGE_SKIP_EXISTING_QUEUE_ON_FIRST_RUN || 'true');
const pollMs = Math.max(300, Number(process.env.NORTHLINE_BRIDGE_POLL_MS || 1000));

function cleanEnvValue(value) {
  let text = String(value ?? '').trim();
  // Tolerate values copied into .env or Windows environment variables with literal escaped quotes.
  if ((text.startsWith('\\"') && text.endsWith('\\"')) || (text.startsWith("\\'") && text.endsWith("\\'"))) {
    text = text.slice(2, -2);
  }
  text = text.replace(/^\\(["'])/, '$1').replace(/\\(["'])$/, '$1');
  if ((text.startsWith('\"') && text.endsWith('\"')) || (text.startsWith("'") && text.endsWith("'"))) {
    text = text.slice(1, -1);
  }
  return text.trim();
}

function envPath(value, fallback = '') {
  return cleanEnvValue(value || fallback);
}

function quoteForCmd(value) {
  return `"${cleanEnvValue(value).replace(/["]/g, '')}"`;
}

let child = null;
let queueOffset = 0;
let shuttingDown = false;
let commandCount = 0;

function timestamp() {
  return new Date().toISOString();
}

async function ensureDirs() {
  await fsp.mkdir(path.dirname(queuePath), { recursive: true });
  await fsp.mkdir(path.dirname(logPath), { recursive: true });
  await fsp.mkdir(path.dirname(serviceLogPath), { recursive: true });
  await fsp.mkdir(path.dirname(statePath), { recursive: true });
  if (!fs.existsSync(queuePath)) await fsp.writeFile(queuePath, '', 'utf8');
}

async function appendLog(line) {
  await fsp.appendFile(logPath, `${line}\n`, 'utf8').catch(() => {});
  if (serviceLogPath !== logPath) await fsp.appendFile(serviceLogPath, `${line}\n`, 'utf8').catch(() => {});
}

function safeCommand(raw) {
  const command = String(raw || '').replace(/[\r\n]+/g, ' ').trim();
  if (!command) return '';
  return command.length > 300 ? command.slice(0, 300) : command;
}

async function readState() {
  try {
    const parsed = JSON.parse(await fsp.readFile(statePath, 'utf8'));
    if (typeof parsed.queueOffset === 'number' && parsed.queueOffset >= 0) return parsed.queueOffset;
  } catch {}
  if (skipExistingDefault) {
    try { return (await fsp.stat(queuePath)).size; } catch { return 0; }
  }
  return 0;
}

async function writeState() {
  const payload = { queueOffset, updatedAt: timestamp(), commandsSent: commandCount };
  await fsp.writeFile(statePath, JSON.stringify(payload, null, 2), 'utf8').catch(() => {});
}

async function launchGameServer() {
  if (!launchServer) {
    await appendLog(`[bridge ${timestamp()}] Bridge started in queue-consumer-only mode. It will not launch the game server.`);
    return;
  }
  if (!startScript) throw new Error('NORTHLINE_START_SERVER_SCRIPT is not configured.');
  if (!fs.existsSync(startScript)) throw new Error(`Start script was not found: ${startScript}`);

  await appendLog('');
  await appendLog('============================================================');
  await appendLog(`[bridge ${timestamp()}] Starting Northline server command bridge.`);
  await appendLog(`[bridge] Launching: ${startScript}`);
  await appendLog(`[bridge] Queue: ${queuePath}`);
  await appendLog(`[bridge] Console log: ${logPath}`);
  await appendLog(`[bridge] Bridge log: ${serviceLogPath}`);
  await appendLog('============================================================');

  const cwd = path.dirname(startScript);
  if (isWin) {
    // Use CALL so .bat/.cmd files launch reliably and paths with spaces do not turn into literal quoted commands.
    const commandLine = `call ${quoteForCmd(startScript)}`;
    await appendLog(`[bridge] Windows command line: cmd.exe /d /c ${commandLine}`);
    child = spawn('cmd.exe', ['/d', '/c', commandLine], { cwd, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: false });
  } else {
    child = spawn(startScript, [], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
  }

  child.stdout.on('data', (chunk) => fs.appendFileSync(logPath, chunk));
  child.stderr.on('data', (chunk) => fs.appendFileSync(logPath, chunk));
  child.on('exit', async (code, signal) => {
    await appendLog(`[bridge ${timestamp()}] Server process exited. code=${code ?? 'null'} signal=${signal ?? 'null'}`);
    if (!shuttingDown) process.exit(code || 0);
  });
}

async function sendToServer(command) {
  if (!child || !child.stdin || child.killed) {
    await appendLog(`[bridge ${timestamp()}] Cannot send command because the bridge does not own a live server stdin: ${command}`);
    return false;
  }
  child.stdin.write(`${command}\r\n`);
  commandCount += 1;
  await appendLog(`[bridge ${timestamp()}] > ${command}`);
  return true;
}

function shouldExecute(record) {
  if (!record || typeof record !== 'object') return false;
  if (record.status && record.status !== 'queued') return false;
  if (record.delivery && record.delivery !== 'queue') return false;
  if (!record.command) return false;
  if (String(record.id || '').startsWith('bridge_')) return false;
  return true;
}

async function scanQueue() {
  let info;
  try { info = await fsp.stat(queuePath); } catch { return; }
  if (info.size < queueOffset) queueOffset = 0;
  if (info.size === queueOffset) return;

  const fd = await fsp.open(queuePath, 'r');
  try {
    const length = info.size - queueOffset;
    const buffer = Buffer.alloc(length);
    await fd.read(buffer, 0, length, queueOffset);
    queueOffset = info.size;
    const raw = buffer.toString('utf8');
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue;
      let record;
      try { record = JSON.parse(line); } catch { continue; }
      if (!shouldExecute(record)) continue;
      const command = safeCommand(record.command);
      if (!command) continue;
      await sendToServer(command);
    }
  } finally {
    await fd.close();
    await writeState();
  }
}

async function main() {
  await ensureDirs();
  queueOffset = await readState();
  await writeState();
  await launchGameServer();
  await appendLog(`[bridge ${timestamp()}] Watching queue from byte offset ${queueOffset}.`);
  setInterval(() => scanQueue().catch((error) => appendLog(`[bridge ${timestamp()}] Queue scan failed: ${error?.message || error}`)), pollMs);
}

process.on('SIGINT', async () => {
  shuttingDown = true;
  await appendLog(`[bridge ${timestamp()}] SIGINT received, shutting down bridge.`);
  if (child && !child.killed) child.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  shuttingDown = true;
  await appendLog(`[bridge ${timestamp()}] SIGTERM received, shutting down bridge.`);
  if (child && !child.killed) child.kill('SIGTERM');
  process.exit(0);
});

main().catch(async (error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  await appendLog(`[bridge ${timestamp()}] Fatal bridge error: ${message}`);
  process.exit(1);
});

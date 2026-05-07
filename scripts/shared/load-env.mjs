import fs from 'node:fs';
import path from 'node:path';

function unquote(value) {
  const trimmed = String(value ?? '').trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).replace(/\\n/g, '\n').replace(/\\r/g, '\r');
  }
  return trimmed;
}

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const clean = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
  const equals = clean.indexOf('=');
  if (equals < 1) return null;
  const key = clean.slice(0, equals).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return null;
  let value = clean.slice(equals + 1);
  let quoted = false;
  const first = value.trimStart()[0];
  if (first === '"' || first === "'") quoted = true;
  if (!quoted) value = value.replace(/\s+#.*$/, '');
  return [key, unquote(value)];
}

function candidateRoots(startDir) {
  const roots = [];
  let current = path.resolve(startDir || process.cwd());
  for (let i = 0; i < 8; i += 1) {
    roots.push(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  if (process.env.NORTHLINE_WEB_DIR) roots.unshift(process.env.NORTHLINE_WEB_DIR);
  if (process.platform === 'win32') roots.unshift('C:\\Servers\\web');
  return [...new Set(roots)];
}

export function loadNorthlineEnv(options = {}) {
  const root = options.root || process.cwd();
  const loaded = [];
  const names = ['.env', '.env.local'];

  for (const base of candidateRoots(root)) {
    for (const name of names) {
      const file = path.join(base, name);
      if (!fs.existsSync(file)) continue;
      try {
        const text = fs.readFileSync(file, 'utf8');
        for (const line of text.split(/\r?\n/)) {
          const parsed = parseEnvLine(line);
          if (!parsed) continue;
          const [key, value] = parsed;
          if (process.env[key] === undefined || process.env[key] === '') process.env[key] = value;
        }
        loaded.push(file);
      } catch (error) {
        if (options.debug) console.warn(`[northline-env] Could not read ${file}: ${error?.message || error}`);
      }
    }
  }

  if (options.debug) {
    if (loaded.length) console.log(`[northline-env] Loaded ${loaded.join(', ')}`);
    else console.warn('[northline-env] No .env or .env.local file was found.');
  }
  return loaded;
}

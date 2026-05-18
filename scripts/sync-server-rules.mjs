import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const dataPath = process.env.NORTHLINE_DATA_PATH || process.env.APE_RP_DATA_PATH || process.argv[2];
if (!dataPath) {
  console.error('Usage: NORTHLINE_DATA_PATH="C:\\Servers\\northline-data" npm run rules:sync');
  console.error('Or: node scripts/sync-server-rules.mjs "C:\\Servers\\northline-data"');
  process.exit(1);
}

const rulesPath = resolve('config/server-rules.json');
const configPath = resolve(dataPath, 'server_config.json');
const rules = JSON.parse(await readFile(rulesPath, 'utf8'));
if (!Array.isArray(rules) || !rules.every((rule) => typeof rule.Id === 'string' && typeof rule.Text === 'string')) {
  throw new Error('config/server-rules.json must be an array of { Id, Text } objects.');
}
const config = JSON.parse(await readFile(configPath, 'utf8'));
config.ServerRules = rules.map((rule) => ({ Id: rule.Id, Text: rule.Text }));
await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Synced ${rules.length} Northline rules into ${configPath}`);

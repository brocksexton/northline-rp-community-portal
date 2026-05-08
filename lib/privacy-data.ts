import crypto from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { getCasesState } from '@/lib/cases-data';
import { getCommunityProfile } from '@/lib/community-data';
import { getForumStateForUser } from '@/lib/forum-data';
import { getPublicJobsState } from '@/lib/jobs-data';
import { getCitizenName, getConnectionEvents, getPermissionsForSteamId, getPlayer, getPropertyLayoutsForSteamId, getRoleForSteamId, getTweeterData } from '@/lib/ape-data';
import { getSteamProfile } from '@/lib/steam-openid';

import { DATA_DELETION_CONFIRMATION, type PrivacyRequest, type PrivacyRequestStatus } from '@/lib/privacy-shared';
export type { PrivacyRequest, PrivacyRequestStatus } from '@/lib/privacy-shared';

type PrivacyStore = { requests: PrivacyRequest[]; audit: Array<{ id: string; requestId: string; action: string; actorSteamId: string; actorName: string; createdAt: string; note?: string }> };
const DEFAULT_STORE: PrivacyStore = { requests: [], audit: [] };

function dataDir() { return process.env.NORTHLINE_DATA_PATH?.trim() || path.join(process.cwd(), '.northline-data'); }
function storePath() { return path.join(dataDir(), 'privacy-requests.json'); }
async function ensureDir() { await mkdir(dataDir(), { recursive: true }); }
async function readStore(): Promise<PrivacyStore> { try { const raw = await readFile(storePath(), 'utf8'); const parsed = JSON.parse(raw) as Partial<PrivacyStore>; return { requests: parsed.requests ?? [], audit: parsed.audit ?? [] }; } catch { return { ...DEFAULT_STORE, requests: [], audit: [] }; } }
async function writeStore(store: PrivacyStore) { await ensureDir(); await writeFile(storePath(), JSON.stringify(store, null, 2), 'utf8'); }
function isSteamId(value: string) { return /^\d{15,20}$/.test(value); }

async function displayNameFor(steamId: string) {
  const [player, steam] = await Promise.all([getPlayer(steamId), getSteamProfile(steamId)]);
  return getCitizenName(player, steamId) || steam?.personaName || `Steam ${steamId.slice(-8)}`;
}

export async function createExportRequest(steamId: string): Promise<PrivacyRequest> {
  if (!isSteamId(steamId)) throw new Error('Invalid SteamID.');
  const store = await readStore();
  const now = new Date().toISOString();
  const displayName = await displayNameFor(steamId);
  const request: PrivacyRequest = { id: `privacy_${crypto.randomUUID()}`, type: 'export', steamId, displayName, status: 'completed', requestedAt: now, updatedAt: now };
  store.requests.unshift(request);
  store.audit.unshift({ id: crypto.randomUUID(), requestId: request.id, action: 'export_generated', actorSteamId: steamId, actorName: displayName, createdAt: now });
  await writeStore(store);
  return request;
}

export async function createDeletionRequest(steamId: string, input: unknown): Promise<PrivacyRequest> {
  if (!isSteamId(steamId)) throw new Error('Invalid SteamID.');
  const body = typeof input === 'object' && input !== null ? input as Record<string, unknown> : {};
  const confirmation = String(body.confirmation ?? '').trim();
  if (confirmation !== DATA_DELETION_CONFIRMATION) throw new Error(`Type ${DATA_DELETION_CONFIRMATION} to continue.`);
  const required = ['gameProgressReset', 'irreversible', 'backupRetention', 'restoreNotice', 'limitedOperationalRetention'];
  const acknowledgements = typeof body.acknowledgements === 'object' && body.acknowledgements !== null ? body.acknowledgements as Record<string, unknown> : {};
  if (!required.every((key) => acknowledgements[key] === true)) throw new Error('Please confirm every acknowledgement before submitting.');
  const store = await readStore();
  const openExisting = store.requests.find((item) => item.type === 'deletion' && item.steamId === steamId && ['pending', 'approved'].includes(item.status));
  if (openExisting) return openExisting;
  const now = new Date().toISOString();
  const displayName = await displayNameFor(steamId);
  const request: PrivacyRequest = {
    id: `privacy_${crypto.randomUUID()}`,
    type: 'deletion',
    steamId,
    displayName,
    status: 'pending',
    requestedAt: now,
    updatedAt: now,
    userNote: String(body.note ?? '').slice(0, 1000),
    acknowledgements: Object.fromEntries(required.map((key) => [key, true])),
  };
  store.requests.unshift(request);
  store.audit.unshift({ id: crypto.randomUUID(), requestId: request.id, action: 'deletion_requested', actorSteamId: steamId, actorName: displayName, createdAt: now });
  await writeStore(store);
  return request;
}

export async function getUserPrivacyRequests(steamId: string) { const store = await readStore(); return store.requests.filter((item) => item.steamId === steamId).slice(0, 20); }
export async function getPrivacyAdminState() { const store = await readStore(); return { requests: store.requests, audit: store.audit.slice(0, 100), stats: { pending: store.requests.filter((r) => r.status === 'pending').length, deletion: store.requests.filter((r) => r.type === 'deletion').length, export: store.requests.filter((r) => r.type === 'export').length } }; }

export async function updatePrivacyRequestStatus(id: string, status: PrivacyRequestStatus, actorSteamId: string, actorName: string, note = '') {
  const store = await readStore();
  const now = new Date().toISOString();
  const requests = store.requests.map((request) => request.id === id ? { ...request, status, updatedAt: now, processedBySteamId: actorSteamId, processedByName: actorName, staffNote: note.slice(0, 1500) } : request);
  if (!requests.some((request) => request.id === id)) throw new Error('Request not found.');
  store.requests = requests;
  store.audit.unshift({ id: crypto.randomUUID(), requestId: id, action: `marked_${status}`, actorSteamId, actorName, createdAt: now, note: note.slice(0, 1500) });
  await writeStore(store);
  return getPrivacyAdminState();
}

async function buildExportPayload(steamId: string) {
  const [player, role, permissions, steamProfile, profile, layouts, jobs, cases, forum, tweeter, connections] = await Promise.all([
    getPlayer(steamId), getRoleForSteamId(steamId), getPermissionsForSteamId(steamId), getSteamProfile(steamId), getCommunityProfile(steamId), getPropertyLayoutsForSteamId(steamId), getPublicJobsState(steamId), getCasesState(steamId), getForumStateForUser(steamId), getTweeterData(), getConnectionEvents(),
  ]);
  const ownTweets = tweeter.Tweets.filter((tweet: any) => String(tweet.PosterSteamId ?? tweet.SteamId ?? tweet.AuthorSteamId ?? '') === steamId);
  const ownLikes = tweeter.Likes.filter((like: any) => String(like.SteamId ?? like.UserSteamId ?? '') === steamId);
  return {
    generatedAt: new Date().toISOString(),
    notice: 'This export contains account-linked data available to the Northline RP website at generation time. Staff-only notes, secrets, webhook URLs, and other users private data are not included.',
    account: { steamId, displayName: getCitizenName(player, steamId), role, permissions },
    steam: steamProfile,
    profile,
    gameData: { player, propertyLayouts: layouts, recentConnectionEvents: connections.filter((event: any) => String(event.SteamId ?? event.steamId ?? '') === steamId).slice(-100) },
    tweeter: { tweets: ownTweets, likes: ownLikes },
    forum: { discordLink: forum.discordLink, visibleForumSummary: forum.stats },
    applications: jobs.applications,
    cases,
    backups: { providerBackupRetentionDays: 14, note: 'Deleted live data may remain in temporary backup snapshots for up to 14 days. Backup restores are communicated through Discord and the website status page.' },
  };
}

function crc32(buf: Buffer) { let c = ~0; for (let i = 0; i < buf.length; i++) { c ^= buf[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; }
function u16(n: number) { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; }
function u32(n: number) { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; }
function fileRecord(name: string, content: Buffer, offset: number) { const nameBuf = Buffer.from(name); const crc = crc32(content); const local = Buffer.concat([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(content.length), u32(content.length), u16(nameBuf.length), u16(0), nameBuf, content]); const central = Buffer.concat([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(content.length), u32(content.length), u16(nameBuf.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameBuf]); return { local, central }; }
function zipFiles(files: Record<string, string>) { const locals: Buffer[] = []; const centrals: Buffer[] = []; let offset = 0; for (const [name, text] of Object.entries(files)) { const rec = fileRecord(name, Buffer.from(text, 'utf8'), offset); locals.push(rec.local); centrals.push(rec.central); offset += rec.local.length; } const centralSize = centrals.reduce((s, b) => s + b.length, 0); const end = Buffer.concat([u32(0x06054b50), u16(0), u16(0), u16(centrals.length), u16(centrals.length), u32(centralSize), u32(offset), u16(0)]); return Buffer.concat([...locals, ...centrals, end]); }


function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeJsonForHtml(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function buildExportIndexHtml(payload: Awaited<ReturnType<typeof buildExportPayload>>) {
  const displayName = escapeHtml(payload.account.displayName || `Steam ${String(payload.account.steamId).slice(-8)}`);
  const generated = escapeHtml(new Date(payload.generatedAt).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' }));
  const json = safeJsonForHtml(payload);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Northline RP Data Export - ${displayName}</title>
  <style>
    :root { color-scheme: light; --ink:#0f172a; --muted:#64748b; --line:#dbeafe; --card:#ffffff; --blue:#0ea5e9; --blue2:#2563eb; --soft:#eff6ff; --warn:#fff7ed; --danger:#991b1b; --shadow:0 24px 80px rgba(15,23,42,.12); }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color:var(--ink); background: radial-gradient(circle at top left, #e0f2fe 0, transparent 36rem), radial-gradient(circle at 80% 10%, #dbeafe 0, transparent 32rem), linear-gradient(135deg, #f8fafc, #eef6ff 45%, #f8fafc); min-height:100vh; }
    .shell { width:min(1180px, calc(100% - 32px)); margin:0 auto; padding:32px 0 56px; }
    .hero { position:relative; overflow:hidden; border:1px solid rgba(14,165,233,.22); border-radius:34px; padding:34px; background:linear-gradient(135deg, rgba(255,255,255,.96), rgba(239,246,255,.92)); box-shadow:var(--shadow); }
    .hero:after { content:""; position:absolute; width:22rem; height:22rem; border-radius:50%; right:-7rem; top:-9rem; background:linear-gradient(135deg, rgba(14,165,233,.24), rgba(37,99,235,.12)); filter: blur(2px); }
    .brand { display:flex; align-items:center; gap:12px; font-weight:900; letter-spacing:-.05em; font-size:1.35rem; }
    .brand span { display:inline-grid; place-items:center; width:36px; height:36px; border-radius:12px; color:white; background:linear-gradient(135deg, var(--blue), var(--blue2)); letter-spacing:-.08em; box-shadow:0 12px 30px rgba(14,165,233,.28); }
    .hero-grid { position:relative; z-index:1; display:grid; grid-template-columns: 1fr 320px; gap:26px; align-items:end; }
    h1 { margin:26px 0 12px; font-size:clamp(2.6rem, 7vw, 5.8rem); line-height:.88; letter-spacing:-.075em; }
    .lede { max-width:760px; color:#334155; font-size:1.08rem; line-height:1.65; margin:0; }
    .summary-card { border:1px solid rgba(148,163,184,.26); background:white; border-radius:26px; padding:22px; box-shadow:0 18px 50px rgba(15,23,42,.08); }
    .summary-card span, .kicker { display:block; color:var(--blue2); font-size:.75rem; font-weight:900; letter-spacing:.16em; text-transform:uppercase; }
    .summary-card strong { display:block; margin-top:8px; font-size:2rem; letter-spacing:-.05em; }
    .summary-card p { margin:6px 0 0; color:var(--muted); line-height:1.45; }
    .notice { margin-top:18px; border:1px solid #fed7aa; background:var(--warn); border-radius:22px; padding:16px 18px; color:#7c2d12; line-height:1.55; }
    .tabs { margin:24px 0 18px; display:flex; gap:10px; flex-wrap:wrap; }
    button { appearance:none; border:0; cursor:pointer; font:inherit; }
    .tab { border:1px solid #bfdbfe; background:rgba(255,255,255,.9); color:#1e3a8a; border-radius:999px; padding:10px 15px; font-weight:850; box-shadow:0 10px 24px rgba(14,165,233,.08); }
    .tab.active { background:linear-gradient(135deg, var(--blue), var(--blue2)); color:white; border-color:transparent; }
    .tools { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:18px; }
    .search { flex:1 1 260px; border:1px solid #bfdbfe; border-radius:999px; padding:13px 16px; font:inherit; background:white; color:var(--ink); outline:none; }
    .tool-button { border:1px solid #bfdbfe; border-radius:999px; background:white; color:#1e3a8a; padding:12px 15px; font-weight:850; }
    .grid { display:grid; grid-template-columns: repeat(12, 1fr); gap:16px; }
    .panel { grid-column:span 6; border:1px solid rgba(148,163,184,.26); background:rgba(255,255,255,.94); border-radius:26px; padding:20px; box-shadow:0 14px 46px rgba(15,23,42,.08); min-width:0; }
    .panel.full { grid-column:1 / -1; }
    .panel h2 { margin:8px 0 8px; font-size:1.45rem; letter-spacing:-.04em; }
    .panel p { color:var(--muted); line-height:1.55; }
    .stat-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:12px; margin-top:14px; }
    .stat { border:1px solid #dbeafe; background:var(--soft); border-radius:20px; padding:14px; }
    .stat small { display:block; color:var(--muted); font-weight:800; text-transform:uppercase; letter-spacing:.08em; }
    .stat strong { display:block; margin-top:5px; font-size:1.5rem; letter-spacing:-.04em; }
    .list { display:grid; gap:10px; margin-top:14px; }
    .item { border:1px solid #e2e8f0; border-radius:18px; padding:12px 14px; background:#fff; display:flex; justify-content:space-between; gap:14px; align-items:start; }
    .item div { min-width:0; }
    .item strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .item small { color:var(--muted); }
    pre { max-height:520px; overflow:auto; border-radius:22px; border:1px solid #cbd5e1; background:#0f172a; color:#e2e8f0; padding:18px; line-height:1.5; font-size:.86rem; }
    .empty { border:1px dashed #bfdbfe; background:#f8fbff; color:var(--muted); border-radius:18px; padding:16px; }
    .footer { color:#64748b; text-align:center; margin-top:28px; line-height:1.6; }
    .danger { border-color:#fecaca; background:#fff1f2; color:var(--danger); }
    .hidden { display:none !important; }
    @media (max-width: 860px) { .hero-grid, .grid { display:block; } .summary-card, .panel { margin-top:16px; } h1 { font-size:3.6rem; } .shell { width:min(100% - 20px, 1180px); padding-top:18px; } .hero { padding:24px; border-radius:26px; } }
    @media print { body { background:#fff; } .tabs, .tools { display:none; } .panel { break-inside:avoid; box-shadow:none; } }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div class="hero-grid">
        <div>
          <div class="brand">Northline<span>RP</span></div>
          <h1>Your data export.</h1>
          <p class="lede">This offline viewer is included inside your Northline RP data export. It turns the JSON files in this archive into readable sections so you can understand what was exported without needing extra tools.</p>
          <div class="notice"><strong>Backup note:</strong> Provider/server backups may retain deleted data for up to 14 days. If Northline must restore a backup, the restoration will be communicated through Discord and the website status page.</div>
        </div>
        <aside class="summary-card">
          <span>Export for</span>
          <strong>${displayName}</strong>
          <p>SteamID ${escapeHtml(payload.account.steamId)}</p>
          <p>Generated ${generated}</p>
        </aside>
      </div>
    </section>

    <nav class="tabs" aria-label="Export sections"></nav>
    <div class="tools">
      <input class="search" type="search" placeholder="Search this export…" />
      <button class="tool-button" data-action="expand">Show raw JSON</button>
      <button class="tool-button" data-action="print">Print / Save PDF</button>
    </div>
    <section id="content" class="grid"></section>
    <p class="footer">This file is self-contained. Keep the ZIP private because it may include account-linked website and game/server information.</p>
  </main>
  <script id="northline-export-data" type="application/json">${json}</script>
  <script>
    const data = JSON.parse(document.getElementById('northline-export-data').textContent || '{}');
    const sections = [
      { id:'overview', label:'Overview' }, { id:'account', label:'Account' }, { id:'gameData', label:'Game data' }, { id:'tweeter', label:'Tweeter' }, { id:'forum', label:'Forum' }, { id:'applications', label:'Applications' }, { id:'cases', label:'Cases' }, { id:'backups', label:'Backups' }, { id:'raw', label:'Raw JSON' }
    ];
    let active = 'overview';
    let query = '';
    let showRaw = false;
    const tabs = document.querySelector('.tabs');
    const content = document.getElementById('content');
    const search = document.querySelector('.search');
    const count = (v) => Array.isArray(v) ? v.length : (v && typeof v === 'object' ? Object.keys(v).length : v ? 1 : 0);
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const pretty = (v) => JSON.stringify(v ?? null, null, 2);
    const includesQuery = (value) => !query || JSON.stringify(value ?? '').toLowerCase().includes(query.toLowerCase());
    function card(title, body, opts={}) { return '<article class="panel '+(opts.full?'full':'')+' '+(opts.danger?'danger':'')+'"><span class="kicker">'+esc(opts.kicker || 'Northline export')+'</span><h2>'+esc(title)+'</h2>'+body+'</article>'; }
    function stat(label, value) { return '<div class="stat"><small>'+esc(label)+'</small><strong>'+esc(value ?? 'None')+'</strong></div>'; }
    function list(items, titleKey='title') { if (!Array.isArray(items) || !items.length) return '<div class="empty">No records found in this section.</div>'; return '<div class="list">'+items.slice(0,80).map((item, i) => '<div class="item"><div><strong>'+esc(item?.[titleKey] || item?.Name || item?.Title || item?.Body || item?.Text || ('Record '+(i+1)))+'</strong><small>'+esc(item?.createdAt || item?.CreatedAt || item?.updatedAt || item?.UpdatedAt || item?.id || item?.Id || '')+'</small></div><small>'+esc(item?.status || item?.Status || item?.Type || '')+'</small></div>').join('')+'</div>'; }
    function renderOverview() { return [
      card('What is in this archive?', '<p>This export includes account-linked Northline RP website data and available game/server records at the time it was generated.</p><div class="stat-grid">'+stat('SteamID', data.account?.steamId)+stat('Role', data.account?.role || 'Citizen')+stat('Tweets', count(data.tweeter?.tweets))+stat('Applications', count(data.applications))+stat('Case records', count(data.cases))+stat('Connection events', count(data.gameData?.recentConnectionEvents))+'</div>', {full:true, kicker:'Summary'}),
      card('Plain-English limits', '<p>Staff-only notes, webhook URLs, API keys, secrets, and other users private data are not included. Some operational, moderation, or security records may be retained where needed to run and protect the server.</p>', {full:true}),
      card('Deletion and backups', '<p>Deletion requests are reviewed by staff. If processed, in-game progress may be reset with no recovery option. Backups may retain deleted data for up to 14 days.</p>', {full:true, danger:true, kicker:'Important'})
    ].join(''); }
    function renderSection(id) {
      const value = data[id];
      if (id === 'overview') return renderOverview();
      if (id === 'raw') return card('Complete export JSON', '<pre>'+esc(pretty(data))+'</pre>', {full:true, kicker:'Raw data'});
      if (id === 'account') return card('Account details', '<div class="stat-grid">'+stat('Display name', data.account?.displayName)+stat('SteamID', data.account?.steamId)+stat('Role', data.account?.role)+stat('Permissions', count(data.account?.permissions))+'</div><pre class="'+(showRaw?'':'hidden')+'">'+esc(pretty(value))+'</pre>', {full:true});
      if (id === 'gameData') return card('Available game/server data', '<p>This can include character/player records, property layouts, and recent connection events linked to your SteamID.</p><div class="stat-grid">'+stat('Player fields', count(value?.player))+stat('Property layouts', count(value?.propertyLayouts))+stat('Recent connections', count(value?.recentConnectionEvents))+'</div>'+list(value?.recentConnectionEvents || [], 'Name')+'<pre class="'+(showRaw?'':'hidden')+'">'+esc(pretty(value))+'</pre>', {full:true});
      if (id === 'tweeter') return card('Tweeter activity', '<div class="stat-grid">'+stat('Tweets', count(value?.tweets))+stat('Likes', count(value?.likes))+'</div>'+list(value?.tweets || [], 'Body')+'<pre class="'+(showRaw?'':'hidden')+'">'+esc(pretty(value))+'</pre>', {full:true});
      if (id === 'applications') return card('Applications', '<p>Staff application records visible to you at export time.</p>'+list(value || [], 'jobTitle')+'<pre class="'+(showRaw?'':'hidden')+'">'+esc(pretty(value))+'</pre>', {full:true});
      if (id === 'backups') return card('Backup notice', '<p>'+esc(value?.note || 'Provider/server backups may retain deleted data for up to 14 days.')+'</p><div class="stat-grid">'+stat('Backup retention', (value?.providerBackupRetentionDays || 14) + ' days')+'</div><pre class="'+(showRaw?'':'hidden')+'">'+esc(pretty(value))+'</pre>', {full:true, danger:true, kicker:'Retention'});
      return card(sections.find(s => s.id === id)?.label || id, '<p>Structured records included in this export.</p>'+(Array.isArray(value) ? list(value) : '<pre>'+esc(pretty(value))+'</pre>'), {full:true});
    }
    function render() {
      tabs.innerHTML = sections.map(s => '<button class="tab '+(s.id===active?'active':'')+'" data-id="'+s.id+'">'+s.label+'</button>').join('');
      const html = renderSection(active);
      content.innerHTML = includesQuery(active === 'overview' ? data : data[active]) ? html : '<article class="panel full"><h2>No matching results</h2><p>Try a different search term.</p></article>';
      tabs.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => { active = btn.dataset.id; render(); }));
    }
    search.addEventListener('input', e => { query = e.target.value; render(); });
    document.querySelector('[data-action="expand"]').addEventListener('click', () => { showRaw = !showRaw; document.querySelector('[data-action="expand"]').textContent = showRaw ? 'Hide raw JSON' : 'Show raw JSON'; render(); });
    document.querySelector('[data-action="print"]').addEventListener('click', () => window.print());
    render();
  </script>
</body>
</html>`;
}

export async function buildUserExportZip(steamId: string): Promise<Buffer> {
  const payload = await buildExportPayload(steamId);
  const root = 'northline-data-export/';
  return zipFiles({
    [`${root}index.html`]: buildExportIndexHtml(payload),
    [`${root}README.txt`]: `Northline RP Data Export\nGenerated: ${payload.generatedAt}\n\nOpen index.html for a friendly offline viewer of this export.\n\nThis archive contains account-linked website and available game/server information for SteamID ${steamId}. Backups may retain deleted data for up to 14 days.`,
    [`${root}account.json`]: JSON.stringify(payload.account, null, 2),
    [`${root}steam.json`]: JSON.stringify(payload.steam, null, 2),
    [`${root}profile.json`]: JSON.stringify(payload.profile, null, 2),
    [`${root}game-data.json`]: JSON.stringify(payload.gameData, null, 2),
    [`${root}tweeter.json`]: JSON.stringify(payload.tweeter, null, 2),
    [`${root}forum.json`]: JSON.stringify(payload.forum, null, 2),
    [`${root}applications.json`]: JSON.stringify(payload.applications, null, 2),
    [`${root}cases.json`]: JSON.stringify(payload.cases, null, 2),
    [`${root}backup-notice.json`]: JSON.stringify(payload.backups, null, 2),
  });
}

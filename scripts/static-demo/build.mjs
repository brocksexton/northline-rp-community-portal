#!/usr/bin/env node
// Builds a static snapshot of the demo for GitHub Pages.
//
//   npm run demo:static                 -> writes static-demo-out/
//   npm run demo:static -- --publish    -> also commits it to the gh-pages branch and pushes
//
// How it works: for each view (a guest, and a signed-in Developer), make a production build
// served under that view's sub-path, start it with the demo data, crawl every page, and save
// the server-rendered HTML, the router (RSC) payloads and the /api responses the pages fetch.
// scripts/static-demo/shim.js is injected into every page to answer those requests offline.
// Needs Google Chrome or Microsoft Edge installed (driven through playwright-core).
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'static-demo-out');
const REPO_URL = 'https://github.com/brocksexton/northline-rp-community-portal';
const PAGES_ORIGIN = process.env.STATIC_DEMO_ORIGIN || 'https://brocksexton.github.io';
const BASE = process.env.STATIC_DEMO_BASE || '/northline-rp-community-portal';
const PORT = Number(process.env.STATIC_DEMO_PORT || 3100);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const MAX_PAGES_PER_VIEW = 700;
const MAX_QUERY_VARIANTS_PER_PAGE = 6;
const CONCURRENCY = 4;
const SESSION_SECRET = 'northline-demo-only-not-a-real-secret'; // matches demo/.env.demo
const DEVELOPER_STEAM_ID = '76561190000000001'; // Marcus Vale in demo/seed.mjs

const VIEWS = [
  { name: 'guest', basePath: BASE, outDir: OUT, steamId: null },
  // Dev blog posts are identical in both views; the shim's 404 page falls back to the guest copy.
  { name: 'developer', basePath: `${BASE}/signed-in`, outDir: path.join(OUT, 'signed-in'), steamId: DEVELOPER_STEAM_ID, skip: [/^\/dev-blog\/.+/] },
];

const log = (...args) => console.log('[static-demo]', ...args);
const sha = (text) => crypto.createHash('sha1').update(text).digest('hex').slice(0, 16);

function sessionCookie(steamId) {
  const payload = `v1.${steamId}.${Math.floor(Date.now() / 1000)}.${crypto.randomBytes(12).toString('base64url')}`;
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(`session.${payload}`).digest('base64url');
  return `${payload}.${signature}`;
}

function run(cmd, args, env) {
  const result = spawnSync(cmd, args, { cwd: ROOT, env: { ...process.env, ...env }, stdio: 'inherit', shell: false });
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited with ${result.status}`);
}

function viewEnv(view) {
  return {
    NORTHLINE_STATIC_BASE_PATH: view.basePath,
    NORTHLINE_STATIC_DIST_DIR: `.next-static-${view.name}`,
    NEXT_TELEMETRY_DISABLED: '1',
  };
}

async function startServer(view) {
  const env = { ...process.env, ...viewEnv(view), SITE_URL: ORIGIN, NEXT_PUBLIC_SITE_URL: ORIGIN, NODE_ENV: 'production' };
  const child = spawn(process.execPath, ['--env-file=demo/.env.demo', '--require', './scripts/static-demo/fake-host.cjs', 'node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(PORT)], {
    cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  for (let i = 0; i < 120; i += 1) {
    try {
      const response = await fetch(`${ORIGIN}${view.basePath}`, { redirect: 'manual' });
      if (response.status < 500) return child;
    } catch { /* not up yet */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  child.kill();
  throw new Error('Demo server did not start');
}

function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill('SIGTERM');
}

// Every app/**/page.tsx without dynamic segments, so unlinked pages are captured too.
function staticRoutes() {
  const routes = [];
  const walk = (dir, route) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'api' || entry.name.startsWith('[') || entry.name.startsWith('_')) continue;
      const child = path.join(dir, entry.name);
      const childRoute = `${route}${entry.name}/`;
      if (fs.existsSync(path.join(child, 'page.tsx'))) routes.push(childRoute);
      walk(child, childRoute);
    }
  };
  walk(path.join(ROOT, 'app'), '/');
  return ['/', ...routes];
}

function sitePathFor(view, pathname) {
  if (pathname === view.basePath || pathname.startsWith(`${view.basePath}/`)) return pathname.slice(view.basePath.length) || '/';
  return pathname;
}

// Normalized key for a page inside a view: "/tweeter/profile/123/?tab=info".
function pageKeyFor(view, urlLike) {
  const url = new URL(urlLike, ORIGIN);
  let sitePath = sitePathFor(view, url.pathname);
  if (!sitePath.endsWith('/')) sitePath += '/';
  url.searchParams.delete('_rsc');
  url.searchParams.sort();
  const query = url.searchParams.toString();
  return sitePath + (query ? `?${query}` : '');
}

function belongsToOtherView(view, pathname) {
  const developerBase = `${BASE}/signed-in`;
  const inDeveloper = pathname === developerBase || pathname.startsWith(`${developerBase}/`);
  return view.name === 'guest' ? inDeveloper : (pathname.startsWith(`${BASE}/`) && !inDeveloper);
}

// "/jobs/open?apply=x" -> "/jobs/open/?apply=x" (the static build uses trailing slashes).
function slashPath(target) {
  const [pathPart, ...rest] = target.split(/(?=[?#])/);
  const withSlash = pathPart === '' || pathPart.endsWith('/') ? pathPart : `${pathPart}/`;
  return `${withSlash}${rest.join('')}`;
}

// URL the demo server answers for a page key ("/tweeter/?a=1" -> "/tweeter?a=1", "/" -> "").
function serverPath(key) {
  const [pathOnly, query] = key.split('?');
  const trimmed = pathOnly.replace(/\/$/, '');
  return trimmed + (query ? `?${query}` : '');
}

function isCrawlable(view, key) {
  const pathOnly = key.split('?')[0];
  if (/^\/(api|_next)\//.test(pathOnly)) return false;
  if (/\.(png|jpe?g|webp|gif|svg|ico|css|js|map|json|txt|xml|pdf|zip|woff2?)\/$/i.test(pathOnly)) return false;
  if (key.includes('returnTo=') || key.includes('nl-demo-fallback')) return false;
  return !(view.skip || []).some((pattern) => pattern.test(pathOnly));
}

// Rewrite root-relative links and asset paths in markup (never inside <script>, where the
// router payload lives and string lengths matter).
function rewriteMarkup(html, view) {
  return html.split(/(<script\b[\s\S]*?<\/script>)/i).map((part, index) => {
    if (index % 2 === 1) return part;
    return part
      .replace(/(\s(?:src|href)=")\/((?:guides|badges|fonts)\/[^"]*\.(?:png|jpe?g|webp|gif|svg|woff2?|ttf|otf|txt)|apetavern-logo\.png|northline-bot-icon\.png)"/g, `$1${BASE}/$2"`)
      .replace(/(\shref=")\/api\/auth\/steam\?returnTo=([^"&]*)[^"]*"/g, (_, attr, returnTo) => {
        const target = decodeURIComponent(returnTo);
        return `${attr}${BASE}/signed-in${slashPath(target.startsWith('/') ? target : '/dashboard')}"`;
      })
      .replace(/(\shref=")(\/(?!\/)[^"]*)"/g, (match, attr, href) => {
        if (href === BASE || href.startsWith(`${BASE}/`) || href.startsWith(`${BASE}?`)) return match;
        if (href.startsWith('/api/') || href.startsWith('/_next/')) return match;
        return `${attr}${view.basePath}${slashPath(href)}"`;
      })
      .split(ORIGIN).join(PAGES_ORIGIN);
  }).join('');
}

function injectShim(html, view, snapshotTime, extra = {}) {
  const config = {
    base: BASE, view: view.name, viewBase: view.basePath, guestBase: BASE, developerBase: `${BASE}/signed-in`,
    snapshotTime, repoUrl: REPO_URL, ...extra,
  };
  const tags = `<script>window.__NL_DEMO__=${JSON.stringify(config)}</script><script src="${BASE}/__demo/shim.js"></script>`;
  return html.replace(/<head([^>]*)>/i, (match) => `${match}${tags}`);
}

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function outFileForKey(view, key) {
  const [pathOnly] = key.split('?');
  return path.join(view.outDir, ...pathOnly.split('/').filter(Boolean), 'index.html');
}

function stubPage(view, snapshotTime, title, message, href, linkText) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>${title}</title></head><body style="font:16px/1.5 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f1f5f9;color:#0f172a">` +
    `<main style="max-width:460px;padding:24px;text-align:center"><h1 style="font-size:22px">${title}</h1><p>${message}</p>` +
    `<p><a href="${href}" style="color:#2563eb;font-weight:600">${linkText}</a></p></main></body></html>`;
  return injectShim(html, view, snapshotTime);
}

async function launchBrowser() {
  const { chromium } = await import('playwright-core');
  for (const channel of ['chrome', 'msedge']) {
    try { return await chromium.launch({ channel, headless: true }); } catch { /* try next */ }
  }
  throw new Error('Could not start Chrome or Edge. Install one of them to build the static demo.');
}

async function crawlView(view, browser) {
  const snapshotTime = Date.now();
  const cookie = view.steamId ? `northline_steam_session=${sessionCookie(view.steamId)}` : '';
  const headers = cookie ? { cookie } : {};
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  if (view.steamId) {
    await context.addCookies([{ name: 'northline_steam_session', value: cookie.split('=').slice(1).join('='), domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax' }]);
  }
  const api = new Map();
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== ORIGIN) return route.abort();
    if (/\.(png|jpe?g|webp|gif|svg|woff2?)$/i.test(url.pathname)) return route.abort();
    const sitePath = sitePathFor(view, url.pathname);
    if (sitePath.startsWith('/api/')) {
      // The browser code calls /api/... without the sub-path; send it to the real route.
      const response = await route.fetch({ url: `${ORIGIN}${view.basePath}${sitePath}${url.search}` });
      if (request.method() === 'GET' && response.status() === 200) {
        const params = new URLSearchParams(url.search);
        params.sort();
        const query = params.toString();
        api.set(sitePath + (query ? `?${query}` : ''), await response.text());
      }
      return route.fulfill({ response });
    }
    return route.continue();
  });

  const seen = new Set();
  const queue = [];
  const variants = new Map();
  const enqueue = (key) => {
    if (seen.has(key) || !isCrawlable(view, key)) return;
    const pathOnly = key.split('?')[0];
    if (key.includes('?')) {
      const count = variants.get(pathOnly) || 0;
      if (count >= MAX_QUERY_VARIANTS_PER_PAGE) return;
      variants.set(pathOnly, count + 1);
    }
    if (seen.size >= MAX_PAGES_PER_VIEW) return;
    seen.add(key);
    queue.push(key);
  };
  for (const route of staticRoutes()) enqueue(route);

  const rsc = {};
  const redirects = {};
  const saved = { pages: 0, variants: 0, redirects: 0, signInStubs: 0, notFound: [] };

  async function processKey(key) {
    const target = `${ORIGIN}${view.basePath}${serverPath(key)}`;
    const response = await fetch(target, { headers, redirect: 'manual' });
    const [pathOnly, query] = key.split('?');

    if (response.status >= 300 && response.status < 400) {
      const location = new URL(response.headers.get('location') || '/', target);
      if (query) return;
      if (location.pathname.includes('/api/auth/steam')) {
        const returnTo = location.searchParams.get('returnTo') || pathOnly;
        writeFile(outFileForKey(view, key), stubPage(view, snapshotTime, 'Sign-in needed',
          'This page is for signed-in players. The demo has a signed-in view you can switch to.',
          `${BASE}/signed-in${slashPath(returnTo.startsWith('/') ? returnTo : pathOnly)}`, 'Open it signed in'));
        saved.signInStubs += 1;
        return;
      }
      const nextKey = pageKeyFor(view, location.href);
      redirects[key] = nextKey;
      enqueue(nextKey);
      writeFile(outFileForKey(view, key), stubPage(view, snapshotTime, 'Redirecting…', 'This page has moved.',
        `${view.basePath}${nextKey}`, 'Continue').replace('<head>', `<head><meta http-equiv="refresh" content="0;url=${view.basePath}${nextKey}">`));
      saved.redirects += 1;
      return;
    }
    if (response.status !== 200) {
      saved.notFound.push(`${key} (${response.status})`);
      return;
    }

    // Router payload, used by the shim for in-app navigation (also for query variants).
    const flight = await fetch(target, { headers: { ...headers, RSC: '1' } });
    if (flight.ok && (flight.headers.get('content-type') || '').startsWith('text/x-component')) {
      const file = `__demo/rsc/${sha(key)}.txt`;
      writeFile(path.join(view.outDir, file), await flight.text());
      rsc[key] = file;
    }

    if (query) {
      saved.variants += 1;
    } else {
      const html = await response.text();
      writeFile(outFileForKey(view, key), injectShim(rewriteMarkup(html, view), view, snapshotTime));
      saved.pages += 1;
    }

    // Load it in a real browser to find client-rendered links and capture /api calls.
    const page = await context.newPage();
    try {
      await page.goto(target, { waitUntil: 'load', timeout: 60_000 });
      await page.waitForTimeout(1200);
      const hrefs = await page.$$eval('a[href]', (anchors) => anchors.map((a) => a.href));
      for (const href of hrefs) {
        let url;
        try { url = new URL(href); } catch { continue; }
        if (url.origin !== ORIGIN || belongsToOtherView(view, url.pathname)) continue;
        enqueue(pageKeyFor(view, url.href));
      }
    } catch (error) {
      log(`  browser pass failed for ${key}: ${error.message}`);
    } finally {
      await page.close();
    }
  }

  // Workers take keys until the queue is drained. A worker can finish while another is
  // still discovering links, so repeat until a round adds nothing new.
  let index = 0;
  const work = async () => {
    while (index < queue.length) {
      const key = queue[index];
      index += 1;
      try { await processKey(key); } catch (error) { log(`  failed ${key}: ${error.message}`); }
      if (index % 25 === 0) log(`  ${view.name}: ${index}/${queue.length} pages`);
    }
  };
  while (index < queue.length) {
    await Promise.all(Array.from({ length: CONCURRENCY }, work));
  }

  // Not-found page (GitHub Pages serves 404.html for missing paths).
  if (view.name === 'guest') {
    const missing = await fetch(`${ORIGIN}${view.basePath}/this-page-does-not-exist`, { headers });
    const html = await missing.text();
    writeFile(path.join(OUT, '404.html'), injectShim(rewriteMarkup(html, view), view, snapshotTime, { notFound: true }));
  }

  const apiFiles = {};
  for (const [key, body] of api) {
    const file = `__demo/api/${sha(key)}.json`;
    writeFile(path.join(view.outDir, file), body);
    apiFiles[key] = file;
  }
  writeFile(path.join(view.outDir, '__demo', 'manifest.json'), JSON.stringify({ view: view.name, snapshotTime, rsc, redirects, api: apiFiles }));
  await context.close();
  if (seen.size >= MAX_PAGES_PER_VIEW) log(`  WARNING: ${view.name} hit the ${MAX_PAGES_PER_VIEW}-page cap; some pages were not captured.`);
  log(`${view.name}: ${saved.pages} pages, ${saved.variants} query variants, ${saved.redirects} redirects, ${saved.signInStubs} sign-in stubs, ${api.size} API responses`);
  if (saved.notFound.length) log(`  skipped (non-200): ${saved.notFound.join(', ')}`);
}

// Replace the folder this repo was built in (e.g. D:\GitHub) with a same-length placeholder in every
// saved page, payload and API response. Same length, because some router payload segments are
// length-prefixed. Handles raw, JSON-escaped and double-escaped backslashes and forward slashes.
function scrubLocalPaths(dir) {
  const [drive, ...segments] = path.dirname(ROOT).split(/[\\/]/).filter(Boolean);
  if (!drive || !segments.length) return 0;
  const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const separator = String.raw`(\\+|/)`;
  const pattern = new RegExp(escapeRegExp(drive) + segments.map((segment) => separator + escapeRegExp(segment)).join(''), 'g');
  const fakeDrive = /^[A-Za-z]:$/.test(drive) ? 'C:' : drive;
  const fakeSegments = segments.map((segment, i) => (i === 0 ? 'Server' : 'dir').padEnd(segment.length, 's').slice(0, segment.length));
  let changed = 0;
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) { walk(file); continue; }
      if (!/\.(html|txt|json)$/.test(entry.name)) continue;
      const text = fs.readFileSync(file, 'utf8');
      const next = text.replace(pattern, (...args) => {
        const separators = args.slice(1, 1 + segments.length);
        return fakeDrive + fakeSegments.map((segment, i) => separators[i] + segment).join('');
      });
      if (next !== text) { fs.writeFileSync(file, next); changed += 1; }
    }
  };
  walk(dir);
  return changed;
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else fs.copyFileSync(source, target);
  }
}

function publish() {
  const worktree = path.join(ROOT, '.gh-pages-worktree');
  const git = (args, cwd = ROOT) => run('git', ['-C', cwd, ...args], {});
  if (!fs.existsSync(worktree)) {
    const hasRemoteBranch = spawnSync('git', ['-C', ROOT, 'ls-remote', '--exit-code', '--heads', 'origin', 'gh-pages']).status === 0;
    if (hasRemoteBranch) {
      git(['fetch', 'origin', 'gh-pages']);
      git(['worktree', 'add', '-B', 'gh-pages', worktree, 'origin/gh-pages']);
    } else {
      git(['worktree', 'add', '--orphan', '-b', 'gh-pages', worktree]);
    }
  }
  for (const entry of fs.readdirSync(worktree)) {
    if (entry !== '.git') fs.rmSync(path.join(worktree, entry), { recursive: true, force: true });
  }
  copyDir(OUT, worktree);
  git(['add', '-A'], worktree);
  const clean = spawnSync('git', ['-C', worktree, 'diff', '--cached', '--quiet']).status === 0;
  if (clean) { log('gh-pages is already up to date.'); return; }
  git(['commit', '-q', '-m', `Update static demo (${new Date().toISOString().slice(0, 10)})`], worktree);
  git(['push', 'origin', 'gh-pages'], worktree);
  log(`Published. It can take a minute to appear at ${PAGES_ORIGIN}${BASE}/`);
}

async function main() {
  if (process.argv.includes('--publish-only')) { publish(); return; }
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  // `next build` adds the snapshot's distDir to tsconfig.json and may rewrite next-env.d.ts; put them back.
  const touched = ['tsconfig.json', 'next-env.d.ts'].map((file) => [path.join(ROOT, file), fs.readFileSync(path.join(ROOT, file))]);
  const browser = await launchBrowser();
  try {
    for (const view of VIEWS) {
      log(`Building the ${view.name} view (base path ${view.basePath})…`);
      run(process.execPath, ['--max-old-space-size=4096', 'node_modules/next/dist/bin/next', 'build'], viewEnv(view));
      run(process.execPath, ['demo/seed.mjs'], {});
      // The staff console page probes these; if they are missing it prints the absolute local path.
      for (const file of ['server_console.log', 'console.log', 'logs/latest.log', 'logs/console.log']) {
        writeFile(path.join(ROOT, 'demo', '.runtime', 'aperp', file), '');
      }
      const server = await startServer(view);
      try {
        log(`Crawling the ${view.name} view…`);
        await crawlView(view, browser);
      } finally {
        stopServer(server);
      }
      copyDir(path.join(ROOT, `.next-static-${view.name}`, 'static'), path.join(view.outDir, '_next', 'static'));
    }
  } finally {
    await browser.close();
    for (const [file, content] of touched) fs.writeFileSync(file, content);
  }
  for (const entry of fs.readdirSync(path.join(ROOT, 'public'), { withFileTypes: true })) {
    const source = path.join(ROOT, 'public', entry.name);
    if (entry.isDirectory()) copyDir(source, path.join(OUT, entry.name));
    else fs.copyFileSync(source, path.join(OUT, entry.name));
  }
  fs.copyFileSync(path.join(ROOT, 'scripts', 'static-demo', 'shim.js'), path.join(OUT, '__demo', 'shim.js'));
  writeFile(path.join(OUT, '.nojekyll'), ''); // keep the _next folder (Jekyll would drop it)
  log(`Replaced the local build folder path in ${scrubLocalPaths(OUT)} files.`);
  log(`Done: ${path.relative(ROOT, OUT)}/`);
  if (process.argv.includes('--publish')) publish();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

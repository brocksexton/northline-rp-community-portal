/*
 * Static demo shim, injected as the first script on every page of the GitHub Pages snapshot
 * (see scripts/static-demo/build.mjs). The snapshot is plain files, so this script stands in
 * for the server:
 *   - pins the clock to the moment the snapshot was taken, so "5m ago" stays "5m ago";
 *   - answers /api GET requests from captured JSON and politely refuses anything that saves;
 *   - answers Next.js router (RSC) requests from captured payloads, so in-app navigation works;
 *   - maps links and asset paths that assume the site lives at "/" onto the Pages sub-path;
 *   - adds a small banner to switch between the guest and signed-in (Developer) views.
 */
(function () {
  'use strict';
  var cfg = window.__NL_DEMO__;
  if (!cfg || window.__NL_DEMO_SHIM__) return;
  window.__NL_DEMO_SHIM__ = true;

  var BASE = cfg.base;
  var VIEW_BASE = cfg.viewBase;
  var GUEST_BASE = cfg.guestBase;
  var DEV_BASE = cfg.developerBase;
  var SAVE_MESSAGE = 'This is a static demo with made-up data, so nothing is saved.';

  // ---------------------------------------------------------------------------
  // Clock: keep time moving from the snapshot moment instead of today.
  // ---------------------------------------------------------------------------
  var RealDate = Date;
  var offset = cfg.snapshotTime - RealDate.now();
  function DemoDate(a, b, c, d, e, f, g) {
    if (!(this instanceof DemoDate)) return new RealDate(RealDate.now() + offset).toString();
    var n = arguments.length;
    if (n === 0) return new RealDate(RealDate.now() + offset);
    if (n === 1) return new RealDate(a);
    return new RealDate(a, b, n > 2 ? c : 1, n > 3 ? d : 0, n > 4 ? e : 0, n > 5 ? f : 0, n > 6 ? g : 0);
  }
  DemoDate.prototype = RealDate.prototype;
  DemoDate.now = function () { return RealDate.now() + offset; };
  DemoDate.parse = RealDate.parse;
  DemoDate.UTC = RealDate.UTC;
  window.Date = DemoDate;

  // ---------------------------------------------------------------------------
  // Paths
  // ---------------------------------------------------------------------------
  var realFetch = window.fetch.bind(window);
  var manifestPromise = realFetch(VIEW_BASE + '/__demo/manifest.json')
    .then(function (r) { return r.ok ? r.json() : { rsc: {}, api: {} }; })
    .catch(function () { return { rsc: {}, api: {} }; });

  function startsWithPath(pathname, prefix) {
    return pathname === prefix || pathname.indexOf(prefix + '/') === 0;
  }

  // Path inside the site ("/tweeter/") for a URL pathname on this host.
  function sitePath(pathname) {
    if (startsWithPath(pathname, VIEW_BASE)) return pathname.slice(VIEW_BASE.length) || '/';
    if (startsWithPath(pathname, BASE)) return pathname.slice(BASE.length) || '/';
    return pathname;
  }

  function withSlash(path) {
    if (path.slice(-1) === '/' || /\.(png|jpe?g|webp|gif|svg|ico|css|js|map|json|txt|xml|pdf|zip|woff2?)$/i.test(path)) return path;
    return path + '/';
  }

  function pageKey(path, searchParams) {
    var params = new URLSearchParams(searchParams);
    params.delete('_rsc');
    params.sort();
    var query = params.toString();
    return withSlash(path) + (query ? '?' + query : '');
  }

  var PUBLIC_ASSET = /^\/(guides|badges|fonts)\/.+\.(png|jpe?g|webp|gif|svg|woff2?|ttf|otf|txt)$|^\/(apetavern-logo|northline-bot-icon)\.png$/i;

  // Where a same-origin URL should really go in the static demo, or null if nowhere.
  function mapNavigation(url) {
    var path = url.pathname;
    if (startsWithPath(path, BASE)) return null; // already inside the demo
    if (path.indexOf('/api/auth/steam') === 0) {
      var returnTo = url.searchParams.get('returnTo') || '/dashboard';
      if (returnTo.charAt(0) !== '/') returnTo = '/dashboard';
      var target = new URL(returnTo, location.origin);
      return DEV_BASE + withSlash(sitePath(target.pathname)) + target.search;
    }
    if (path.indexOf('/api/auth/logout') === 0) return GUEST_BASE + withSlash(sitePath(location.pathname));
    if (path.indexOf('/api/') === 0 || path.indexOf('/_next/') === 0) return null;
    if (PUBLIC_ASSET.test(path)) return BASE + path + url.search + url.hash;
    return VIEW_BASE + withSlash(path) + url.search + url.hash;
  }

  // ---------------------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------------------
  var toastTimer = null;
  function toast(message) {
    var el = document.getElementById('nl-demo-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'nl-demo-toast';
      el.setAttribute('role', 'status');
      el.style.cssText = 'position:fixed;left:50%;bottom:72px;transform:translateX(-50%);z-index:2147483647;' +
        'max-width:min(92vw,420px);padding:10px 16px;border-radius:12px;background:#0f172a;color:#f8fafc;' +
        'font:500 14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.3);' +
        'transition:opacity .2s;text-align:center';
      (document.body || document.documentElement).appendChild(el);
    }
    el.textContent = message;
    el.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.style.opacity = '0'; }, 3200);
  }

  // ---------------------------------------------------------------------------
  // fetch: API and router requests come from captured files
  // ---------------------------------------------------------------------------
  function jsonResponse(status, body) {
    return new Response(JSON.stringify(body), { status: status, headers: { 'content-type': 'application/json' } });
  }

  function answerApi(path, search, method) {
    if (method !== 'GET' && method !== 'HEAD') {
      toast(SAVE_MESSAGE);
      return Promise.resolve(jsonResponse(403, { ok: false, error: SAVE_MESSAGE, message: SAVE_MESSAGE }));
    }
    return manifestPromise.then(function (manifest) {
      var params = new URLSearchParams(search);
      params.sort();
      var query = params.toString();
      var file = manifest.api[path + (query ? '?' + query : '')] || manifest.api[path];
      if (!file) return jsonResponse(404, { ok: false, error: 'Not part of the static demo.' });
      return realFetch(VIEW_BASE + '/' + file).then(function (r) {
        return r.text().then(function (text) {
          return new Response(text, { status: 200, headers: { 'content-type': 'application/json' } });
        });
      });
    });
  }

  // Prefetches get the saved payload too: Next caches a failed prefetch as "reload the page",
  // which would turn every link into a full page load.
  function answerRouter(url) {
    var key = pageKey(sitePath(url.pathname), url.search);
    return manifestPromise.then(function (manifest) {
      var file = manifest.rsc[key] || (manifest.redirects && manifest.rsc[manifest.redirects[key]]);
      if (!file) throw new TypeError('Static demo: no saved payload for ' + key);
      return realFetch(VIEW_BASE + '/' + file).then(function (r) {
        if (!r.ok) throw new TypeError('Static demo: payload missing for ' + key);
        return r.text();
      }).then(function (text) {
        return new Response(text, { status: 200, headers: { 'content-type': 'text/x-component' } });
      });
    });
  }

  window.fetch = function (input, init) {
    var url, method, headers;
    try {
      var request = typeof Request !== 'undefined' && input instanceof Request ? input : null;
      url = new URL(request ? request.url : String(input), location.href);
      method = String((init && init.method) || (request && request.method) || 'GET').toUpperCase();
      headers = new Headers((init && init.headers) || (request ? request.headers : undefined));
    } catch (error) {
      return realFetch(input, init);
    }
    if (url.origin !== location.origin) return realFetch(input, init);
    if (headers.get('rsc') === '1') return answerRouter(url);
    var path = sitePath(url.pathname);
    if (path.indexOf('/api/') === 0) return answerApi(path, url.search, method);
    return realFetch(input, init);
  };

  // ---------------------------------------------------------------------------
  // Links, forms, and script navigations that assume the site lives at "/"
  // ---------------------------------------------------------------------------
  window.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
    var url;
    try { url = new URL(anchor.getAttribute('href'), location.href); } catch (error) { return; }
    if (url.origin !== location.origin) return;
    var mapped = mapNavigation(url);
    if (mapped) {
      event.preventDefault();
      event.stopImmediatePropagation();
      location.assign(mapped);
    } else if (!startsWithPath(url.pathname, BASE)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toast(SAVE_MESSAGE);
    }
  }, true);

  window.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form || !form.getAttribute) return;
    var action = form.getAttribute('action');
    if (!action || (form.method || '').toLowerCase() !== 'post') return; // React-handled forms use fetch
    event.preventDefault();
    var url = new URL(action, location.href);
    var mapped = mapNavigation(url);
    if (mapped && url.pathname.indexOf('/api/auth/') !== -1) location.assign(mapped);
    else toast(SAVE_MESSAGE);
  }, true);

  // Buttons such as "like" send signed-out visitors to /api/auth/steam with location.href.
  if (window.navigation && window.navigation.addEventListener) {
    window.navigation.addEventListener('navigate', function (event) {
      if (!event.cancelable || event.hashChange || event.downloadRequest) return;
      var url;
      try { url = new URL(event.destination.url); } catch (error) { return; }
      if (url.origin !== location.origin || startsWithPath(url.pathname, BASE)) return;
      var mapped = mapNavigation(url);
      event.preventDefault();
      if (mapped) location.assign(mapped);
      else toast(SAVE_MESSAGE);
    });
  }

  // Images and plain <a> tags rendered after load still carry root-relative paths.
  function fixElement(el) {
    if (el.nodeType !== 1) return;
    if (el.tagName === 'IMG') {
      var src = el.getAttribute('src');
      if (src && PUBLIC_ASSET.test(src)) el.setAttribute('src', BASE + src);
    } else if (el.tagName === 'A') {
      var href = el.getAttribute('href');
      if (href && href.charAt(0) === '/' && href.charAt(1) !== '/' && !startsWithPath(href.split(/[?#]/)[0], BASE)) {
        var mapped = mapNavigation(new URL(href, location.origin));
        if (mapped) el.setAttribute('href', mapped);
      }
    }
  }
  function fixTree(root) {
    if (!root || !root.querySelectorAll) return;
    fixElement(root);
    var nodes = root.querySelectorAll('img[src^="/"], a[href^="/"]');
    for (var i = 0; i < nodes.length; i += 1) fixElement(nodes[i]);
  }
  new MutationObserver(function (records) {
    // React can rebuild <body> after a hydration mismatch (e.g. dates in another time zone).
    if (document.body && !document.getElementById('nl-demo-banner') && document.readyState !== 'loading') addBanner();
    for (var i = 0; i < records.length; i += 1) {
      var record = records[i];
      if (record.type === 'attributes') fixElement(record.target);
      else for (var j = 0; j < record.addedNodes.length; j += 1) fixTree(record.addedNodes[j]);
    }
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'href'] });

  // ---------------------------------------------------------------------------
  // 404 page: pages that only exist in the guest view (e.g. dev blog posts)
  // ---------------------------------------------------------------------------
  if (cfg.notFound && startsWithPath(location.pathname, DEV_BASE) && location.search.indexOf('nl-demo-fallback') === -1) {
    var rest = location.pathname.slice(DEV_BASE.length) || '/';
    location.replace(GUEST_BASE + rest + (location.search ? location.search + '&' : '?') + 'nl-demo-fallback=1');
  }

  // ---------------------------------------------------------------------------
  // Banner: which view you're in, and a switch to the other one
  // ---------------------------------------------------------------------------
  function viewUrl(targetBase) {
    var rest = sitePath(location.pathname);
    if (cfg.notFound) rest = '/';
    return targetBase + withSlash(rest) + location.search.replace(/[?&]nl-demo-fallback=1/, '');
  }

  function addBanner() {
    if (document.getElementById('nl-demo-banner')) return;
    var developer = cfg.view === 'developer';
    var bar = document.createElement('div');
    bar.id = 'nl-demo-banner';
    bar.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147483646;display:flex;align-items:center;gap:8px;' +
      'flex-wrap:wrap;max-width:calc(100vw - 24px);padding:6px 6px 6px 12px;border-radius:999px;background:rgba(15,23,42,.92);' +
      'color:#e2e8f0;font:500 12px/1.3 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.28);' +
      'backdrop-filter:blur(6px)';
    var label = document.createElement('span');
    label.textContent = 'Demo · made-up data';
    var group = document.createElement('span');
    group.style.cssText = 'display:inline-flex;border-radius:999px;background:rgba(255,255,255,.08);padding:2px';
    function option(text, active, href, title) {
      var el = document.createElement(active ? 'span' : 'a');
      el.textContent = text;
      el.title = title;
      el.style.cssText = 'padding:4px 10px;border-radius:999px;text-decoration:none;color:' + (active ? '#0f172a' : '#e2e8f0') +
        ';background:' + (active ? '#e2e8f0' : 'transparent') + ';font-weight:600';
      if (!active) el.href = href;
      return el;
    }
    group.appendChild(option('Guest', !developer, viewUrl(GUEST_BASE), 'Browse as a visitor who has not signed in'));
    group.appendChild(option('Signed in', developer, viewUrl(DEV_BASE), 'Browse as Marcus Vale, a made-up Developer who can open every staff page'));
    var repo = document.createElement('a');
    repo.href = cfg.repoUrl;
    repo.textContent = 'GitHub';
    repo.style.cssText = 'color:#93c5fd;text-decoration:none;padding:4px 8px 4px 2px;font-weight:600';
    bar.appendChild(label);
    bar.appendChild(group);
    bar.appendChild(repo);
    document.body.appendChild(bar);
  }

  function onReady() {
    fixTree(document.body);
    addBanner();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
  else onReady();
})();

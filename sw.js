/* Uni Hub phone: service worker. Serves the decrypted copy of the hub at /v/<original path>, keeps it offline, and syncs updates. */
importScripts('common.js');
var BASE = new URL('./', self.registration.scope).pathname, VP = BASE + 'v/';
var VER = '7', SC = 'uh-shell-7', BC = 'uh-blobs';
var SHELL = ['./', 'index.html', 'common.js', 'phone-bar.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
var MF = null, syncing = null, lastTouch = 0;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(SC).then(function (c) { return c.addAll(SHELL.map(function (x) { return new Request(x, { cache: 'reload' }); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    var ks = await caches.keys();
    for (var i = 0; i < ks.length; i++) if (ks[i] !== SC && ks[i] !== BC) await caches.delete(ks[i]);
    await self.clients.claim();
  })());
});

async function manifest() {
  if (MF) return MF;
  var mf = await UH.get('mf'); if (!mf) return null;
  var idx = new Map(); Object.keys(mf.files).forEach(function (p) { idx.set(p.normalize('NFC'), mf.files[p]); });
  return (MF = { mf: mf, idx: idx });
}
function txt(s, st) { return new Response(s, { status: st || 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }); }
function page(h, p) { return txt('<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><body style="font:16px -apple-system,system-ui,sans-serif;background:#0f1320;color:#e8ebf5;padding:28px;line-height:1.5"><h2 style="margin:0 0 8px;color:#e7c46a">' + h + '</h2><p>' + p + '</p><p><a style="color:#e7c46a" href="' + BASE + 'index.html">Back to the start</a></p>', 404); }

async function blob(name) {
  var c = await caches.open(BC), url = BASE + 'data/' + name, r = await c.match(url);
  if (!r) { r = await fetch(url); if (!r.ok) throw new Error('http ' + r.status); await c.put(url, r.clone()); }
  return r.arrayBuffer();
}
var GR = { b: null, v: null };
async function grades(key, m) {   /* the Grade Tracker marks the PC exported; seeded into each page before it runs */
  var ent = m.idx.get('__grades.json'); if (!ent) return null;
  if (GR.b !== ent.b) { try { var raw = new TextDecoder().decode(await UH.decrypt(key, await blob(ent.b))); JSON.parse(raw); GR = { b: ent.b, v: JSON.stringify(raw).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029') }; } catch (e) { return null; } }
  return GR.v;
}
async function serve(req, u) {
  var key = await UH.getKey(), m = await manifest();
  if (!key || !m) {
    if (req.mode !== 'navigate') return new Response('locked', { status: 401 });
    var back = u.pathname.slice(VP.length) + u.search;
    return Response.redirect(new URL(BASE + (back ? '?r=' + encodeURIComponent(back) : ''), location.origin).href, 302);
  }
  if (Date.now() - lastTouch > 10000) { lastTouch = Date.now(); UH.touch(); }
  if (u.pathname === VP) return Response.redirect(new URL(VP + encodeURIComponent(m.mf.hub), location.origin).href, 302);
  var p; try { p = decodeURIComponent(u.pathname.slice(VP.length)); } catch (e) { p = u.pathname.slice(VP.length); }
  var ent = m.idx.get(p.normalize('NFC'));
  if (!ent) return page('Not on the phone', 'The hub does not include <b>' + p.replace(/[<>&]/g, '') + '</b>. It may be too large, or not part of the hub.');
  var buf; try { buf = await blob(ent.b); } catch (e) { return /http 404/.test(String(e && e.message)) ? page('Still being uploaded', 'This file is on its way from your PC. Large folders upload in batches, so try again in a few minutes.') : page('Not saved on this phone yet', 'This file is downloaded the first time you open it. Connect to the internet once, open it, and it will then work offline.'); }
  var plain; try { plain = await UH.decrypt(key, buf); } catch (e) { return page('Could not unlock this file', 'The passcode may have been changed on the PC. Go back to the start and enter the new one.'); }
  var body = plain, type = ent.m;
  if (/^text\/html/.test(type)) {
    var t = new TextDecoder().decode(plain);
    var gj = await grades(key, m);
    var inj = (gj ? '<script>try{localStorage.setItem("uninotes:grades",' + gj + ')}catch(e){}</script>' : '') + (/<meta[^>]+name=["']?viewport/i.test(t) ? '' : '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">') + '<script src="' + BASE + 'common.js"></script><script src="' + BASE + 'phone-bar.js"></script>';
    t = /<head[^>]*>/i.test(t) ? t.replace(/<head[^>]*>/i, function (x) { return x + inj; }) : inj + t;
    body = new TextEncoder().encode(t);
  }
  var h = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
  var rg = req.headers.get('range'), mm = rg && /bytes=(\d*)-(\d*)/.exec(rg);
  if (mm) {
    var n = body.byteLength, a = mm[1] === '' ? Math.max(0, n - parseInt(mm[2], 10)) : parseInt(mm[1], 10), b = mm[1] === '' || mm[2] === '' ? n - 1 : Math.min(parseInt(mm[2], 10), n - 1);
    if (a > b || a >= n) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + n } });
    h['Content-Range'] = 'bytes ' + a + '-' + b + '/' + n;
    return new Response(body.slice(a, b + 1), { status: 206, headers: h });
  }
  return new Response(body, { status: 200, headers: h });
}
async function shell(req) {
  var c = await caches.open(SC), cached = await c.match(req, { ignoreSearch: true });
  if (!cached && req.mode === 'navigate') cached = await c.match(BASE);
  var net = fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(function (r) { if (r.ok) c.put(req, r.clone()); return r; });
  if (!cached) return net;
  return Promise.race([net, new Promise(function (ok) { setTimeout(function () { ok(cached); }, 2500); })]).catch(function () { return cached; });
}
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (u.origin !== location.origin || e.request.method !== 'GET') return;
  if (u.pathname.indexOf(VP) === 0) { e.respondWith(serve(e.request, u)); return; }
  if (u.pathname.indexOf(BASE + 'data/') === 0) return;
  e.respondWith(shell(e.request));
});

/* ---- sync ---- */
async function tell(m) { (await self.clients.matchAll({ includeUncontrolled: true })).forEach(function (c) { c.postMessage(m); }); }
async function checkOnly() {
  try { var r = await fetch(BASE + 'data/meta.json', { cache: 'no-store' }); if (!r.ok) throw 0; var meta = await r.json(), cur = await UH.get('meta'); return { ok: true, newer: !cur || cur.v !== meta.v, meta: meta }; }
  catch (e) { return { ok: false, err: 'offline' }; }
}
async function doSync(force) {
  var key = await UH.getKey(); if (!key) return { ok: false, err: 'locked', dbg: 'raw=' + typeof (await UH.get('kraw')) + ' old=' + typeof (await UH.get('key')) };
  var chk = await checkOnly(); if (!chk.ok) return chk;
  var meta = chk.meta, cur = await UH.get('meta');
  if (!force && cur && cur.v === meta.v && await UH.get('mf')) return { ok: true, changed: false, meta: cur };
  var mf;
  try { var mr = await fetch(BASE + 'data/' + meta.mf); mf = JSON.parse(new TextDecoder().decode(await UH.decrypt(key, await mr.arrayBuffer()))); }
  catch (e) { if (cur && cur.salt !== meta.salt) { await UH.delKey(); return { ok: false, err: 'passcode-changed' }; } return { ok: false, err: 'manifest' }; }
  var c = await caches.open(BC), want = new Set(), todo = [];
  var names = Object.keys(mf.files);
  for (var i = 0; i < names.length; i++) { var e = mf.files[names[i]], url = BASE + 'data/' + e.b; want.add(url); if (e.e && !(await c.match(url))) todo.push(url); }
  var done = 0, failed = 0, total = todo.length, q = todo.slice();
  await tell({ t: 'progress', done: 0, total: total });
  async function worker() { while (q.length) { var u = q.shift(); try { var r = await fetch(u); if (!r.ok) throw 0; await c.put(u, r); } catch (err) { failed++; } done++; tell({ t: 'progress', done: done, total: total }); } }
  await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
  if (failed) return { ok: false, err: 'partial', failed: failed };
  var stamp = Object.assign({}, meta, { syncedAt: Date.now() });
  await UH.set('mf', mf); await UH.set('meta', stamp); MF = null;
  var ks = await c.keys(); for (var j = 0; j < ks.length; j++) { var p = new URL(ks[j].url).pathname; if (!want.has(p)) await c.delete(ks[j]); }
  return { ok: true, changed: true, meta: stamp, files: names.length };
}
self.addEventListener('message', function (e) {
  var d = e.data || {}, port = e.ports && e.ports[0];
  var reply = function (x) { if (port) port.postMessage(x); };
  if (d.t === 'sync') { e.waitUntil((syncing = syncing || doSync(!!d.force).finally(function () { syncing = null; })).then(reply)); }
  else if (d.t === 'check') e.waitUntil(checkOnly().then(reply));
  else if (d.t === 'status') e.waitUntil(Promise.all([UH.get('meta'), UH.getKey(), UH.get('face')]).then(function (r) { reply({ meta: r[0], unlocked: !!r[1], face: !!r[2], syncing: !!syncing, ver: VER }); }));
  else if (d.t === 'lock') e.waitUntil((async function () { await UH.delKey(); await UH.del('mf'); await UH.del('meta'); MF = null; await caches.delete(BC); reply({ ok: true }); })());
  else if (d.t === 'reload-manifest') { MF = null; reply({ ok: true }); }
});

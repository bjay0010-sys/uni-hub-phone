/* shared by the page and the service worker: tiny IndexedDB store + passcode crypto */
(function (g) {
  function db() { return new Promise(function (ok, no) { var r = indexedDB.open('uh', 1); r.onupgradeneeded = function () { r.result.createObjectStore('kv'); }; r.onsuccess = function () { ok(r.result); }; r.onerror = function () { no(r.error); }; }); }
  async function get(k) { var d = await db(); return new Promise(function (ok, no) { var q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = function () { ok(q.result); }; q.onerror = function () { no(q.error); }; }); }
  var lastRaw = null;   /* so an older cached copy of the start page (which still calls deriveKey and stores a 'key') keeps working */
  async function set(k, v) { if (k === 'key' && lastRaw && !(v instanceof Uint8Array)) { k = 'kraw'; v = lastRaw; } var d = await db(); return new Promise(function (ok, no) { var t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = function () { ok(); }; t.onerror = function () { no(t.error); }; }); }
  async function del(k) { var d = await db(); return new Promise(function (ok, no) { var t = d.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = function () { ok(); }; t.onerror = function () { no(t.error); }; }); }
  function hex(h) { return new Uint8Array(h.match(/../g).map(function (x) { return parseInt(x, 16); })); }
  /* the passcode becomes 32 raw key bytes; the bytes (not a CryptoKey object) are what gets stored, which every browser can keep and every worker can read */
  async function deriveRaw(pass, saltHex, iter) {
    var base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass.normalize('NFKC')), 'PBKDF2', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: hex(saltHex), iterations: iter, hash: 'SHA-256' }, base, 256));
  }
  async function deriveKey(pass, saltHex, iter) { lastRaw = await deriveRaw(pass, saltHex, iter); return importRaw(lastRaw); }
  function importRaw(raw) { return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt']); }
  /* ---- the key, and the optional Face ID lock ----
     No Face ID: the key just stays on the phone. With Face ID on: the key only works for IDLE ms after the last Face ID / activity;
     after that the worker treats the app as locked and the start page asks for Face ID again. */
  var IDLE = 60 * 1000;   /* locks about a minute after you leave the app */
  async function getKey() {
    var raw = await get('kraw'); if (!raw) return null;
    if (await get('face')) { var exp = await get('kexp'); if (!exp || Date.now() > exp) { await del('kraw'); return null; } }
    return importRaw(raw);
  }
  async function setKey(raw) { await set('kraw', raw); if (await get('face')) await set('kexp', Date.now() + IDLE); }
  async function touch() { if ((await get('face')) && (await get('kraw'))) await set('kexp', Date.now() + IDLE); }
  async function delKey() { await del('kraw'); await del('key'); await del('kpark'); await del('kexp'); await del('face'); }
  async function lockNow() { if (await get('face')) { await set('kexp', 0); await del('kraw'); return true; } return false; }

  function b64(u) { var s = '', a = new Uint8Array(u); for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }
  function unb64(t) { var s = atob(t), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  async function faceAvailable() { try { return !!(window.PublicKeyCredential && navigator.credentials && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch (e) { return false; } }
  async function faceAssert(rec) {
    var a = await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rpId: location.hostname, userVerification: 'required', timeout: 60000,
      allowCredentials: [{ type: 'public-key', id: unb64(rec.cid), transports: ['internal'] }], extensions: { prf: { eval: { first: unb64(rec.salt) } } } } });
    var ext = a.getClientExtensionResults ? a.getClientExtensionResults() : {};
    return ext.prf && ext.prf.results && ext.prf.results.first ? new Uint8Array(ext.prf.results.first) : null;
  }
  async function wrapKey(prf, usage) { return crypto.subtle.importKey('raw', prf.slice(0, 32), { name: 'AES-GCM' }, false, usage); }
  async function faceEnroll() {
    var raw = await get('kraw'); if (!raw) throw new Error('Unlock with the passcode first.');
    var salt = crypto.getRandomValues(new Uint8Array(32));
    var cred = await navigator.credentials.create({ publicKey: { rp: { name: 'Uni Hub', id: location.hostname }, user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'uni-hub', displayName: 'Uni Hub' },
      challenge: crypto.getRandomValues(new Uint8Array(32)), pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' }, timeout: 60000, extensions: { prf: {} } } });
    var rec = { cid: b64(cred.rawId), salt: b64(salt), mode: 'gate' };
    var prf = null; try { prf = await faceAssert(rec); } catch (e) { prf = null; }
    if (prf) {
      var iv = crypto.getRandomValues(new Uint8Array(12));
      rec.wrapped = b64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, await wrapKey(prf, ['encrypt']), raw)); rec.iv = b64(iv); rec.mode = 'prf';
    } else { await set('kpark', raw); }
    await set('face', rec); await set('kexp', Date.now() + IDLE);
    return rec.mode;
  }
  async function faceUnlock() {
    var rec = await get('face'); if (!rec) throw new Error('Face ID is not set up.');
    var prf = await faceAssert(rec), raw;
    if (rec.mode === 'prf') {
      if (!prf) throw new Error('Face ID did not return the key.');
      raw = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(rec.iv) }, await wrapKey(prf, ['decrypt']), unb64(rec.wrapped)));
    } else { raw = await get('kpark'); if (!raw) throw new Error('Use the passcode this time.'); }
    await set('kraw', raw); await set('kexp', Date.now() + IDLE);
    return true;
  }
  async function faceOff() { await del('face'); await del('kpark'); await del('kexp'); }
  async function decrypt(key, buf) { var u = new Uint8Array(buf); return crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, key, u.slice(12)); }
  /* one request, one answer, to the service worker */
  async function ask(msg) {
    var reg = await navigator.serviceWorker.ready;
    return new Promise(function (ok) {
      var ch = new MessageChannel(); ch.port1.onmessage = function (e) { ok(e.data); };
      (reg.active || navigator.serviceWorker.controller).postMessage(msg, [ch.port2]);
    });
  }
  g.UH = { get: get, set: set, del: del, deriveRaw: deriveRaw, deriveKey: deriveKey, importRaw: importRaw, getKey: getKey, setKey: setKey, delKey: delKey, touch: touch, lockNow: lockNow, faceAvailable: faceAvailable, faceEnroll: faceEnroll, faceUnlock: faceUnlock, faceOff: faceOff, decrypt: decrypt, ask: ask };
})(typeof self !== 'undefined' ? self : window);

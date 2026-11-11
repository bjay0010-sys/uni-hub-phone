/* injected into every page the phone serves: back / home / menu, update notice, phone-only tidy-ups */
(function () {
  if (window.__phoneBar) return; window.__phoneBar = true; window.__PHONE = true;
  var src = document.currentScript && document.currentScript.src, BASE = new URL('./', src || location.href).pathname;
  document.documentElement.classList.add('is-phone');
  var css = '.uhb{position:fixed;left:0;right:0;margin:0 auto;width:max-content;max-width:calc(100% - 20px);white-space:nowrap;bottom:calc(env(safe-area-inset-bottom,0px) + 10px);z-index:2147483600;display:flex;gap:2px;padding:4px;border-radius:999px;background:rgba(18,22,38,.93);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.16);box-shadow:0 8px 26px rgba(0,0,0,.4);font:600 15px -apple-system,system-ui,sans-serif;transition:transform .22s,opacity .22s}'
    + '.uhb.hide{transform:translateY(160%);opacity:0}.uhb button{all:unset;color:#fff;padding:0 15px;min-height:42px;display:flex;align-items:center;border-radius:999px;-webkit-tap-highlight-color:transparent;cursor:pointer}.uhb button:active{background:rgba(255,255,255,.14)}'
    + '.uhb button.dis{opacity:.35}.uhb .dot{width:8px;height:8px;border-radius:50%;background:#e7c46a;margin-left:7px}'
    + '.uhs{position:fixed;inset:0;z-index:2147483640;background:rgba(0,0,0,.5);display:none}.uhs.on{display:block}'
    + '.uhs div{position:absolute;left:0;right:0;bottom:0;background:#171d33;color:#e8ebf5;border-radius:20px 20px 0 0;padding:18px 18px calc(env(safe-area-inset-bottom,0px) + 18px);font:15px/1.45 -apple-system,system-ui,sans-serif;box-shadow:0 -10px 40px rgba(0,0,0,.5)}'
    + '.uhs b{display:block;font-size:17px;margin-bottom:2px}.uhs small{display:block;color:#9aa3c0;margin-bottom:12px}.uhs button{all:unset;display:block;box-sizing:border-box;width:100%;text-align:center;padding:14px;margin-top:8px;border-radius:13px;background:#232b4a;color:#fff;font-weight:600;cursor:pointer}.uhs button.p{background:#e7c46a;color:#1a1608}.uhs button.w{color:#ff9a8a}'
    + '.uht{position:fixed;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 68px);z-index:2147483620;background:#171d33;color:#fff;border:1px solid #e7c46a;border-radius:14px;padding:12px 14px;font:600 14px/1.35 -apple-system,system-ui,sans-serif;display:none;box-shadow:0 8px 26px rgba(0,0,0,.45);align-items:center;gap:10px}.uht.on{display:flex}.uht span{flex:1}.uht button{all:unset;color:#e7c46a;font-weight:700;padding:6px 8px;cursor:pointer}'
    /* things that only make sense on the PC */
    + '.is-phone #recStatus,.is-phone #recOverlay,.is-phone #manageToggle,.is-phone #openFileBtn,.is-phone #hrBanner,.is-phone #saveChip,.is-phone [data-hn-go="rec"],.is-phone [data-hn-go="manage"],.is-phone a[href^="studyrecorder:"],.is-phone [data-act="edit-file"],.is-phone [data-act="subj-edit"],.is-phone [data-act="subj-del"],.is-phone [data-act="subj-archive"],.is-phone [data-act="subj-left"],.is-phone [data-act="subj-right"],.is-phone [data-act="doc-scan"],.is-phone [data-act="doc-add"],.is-phone [data-act="tool-add"],.is-phone [data-act="undo"],.is-phone [data-act="redo"],.is-phone [data-act="raw-data"],.is-phone [data-act="check-links"],.is-phone [data-act="cu-edit"],.is-phone [data-act="cu-add"],.is-phone [data-act="course-reset"],.is-phone [data-act="arc-restore"],.is-phone [data-act="arc-edit"],.is-phone [data-act="arc-del"],.is-phone [data-act="add-subject"],.is-phone [data-act="copy-path"],.is-phone [data-act="course-settings"],.is-phone #edSave,.is-phone #clockToggle{display:none!important}'
    + 'body{padding-bottom:calc(env(safe-area-inset-bottom,0px) + 70px)!important}';
  var st = document.createElement('style'); st.textContent = css;
  function ready(f) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', f); else f(); }
  ready(function () {
    document.head.appendChild(st);
    var bar = document.createElement('div'); bar.className = 'uhb'; bar.setAttribute('role', 'navigation');
    bar.innerHTML = '<button data-a="back">‹ Back</button><button data-a="home">⌂ Hub</button><button data-a="more">⋯<span class="dot" style="display:none"></span></button>';
    var sheet = document.createElement('div'); sheet.className = 'uhs';
    sheet.innerHTML = '<div><b>Uni Hub</b><small id="uhSt">&nbsp;</small><button class="p" data-a="check">Check for updates</button><button data-a="reload">Reload this page</button><button data-a="start">Start screen</button><button data-a="face" style="display:none"></button><button data-a="lockface" style="display:none">Lock now</button><button class="w" data-a="lock">Lock and remove from this phone</button><button data-a="close">Close</button></div>';
    var toast = document.createElement('div'); toast.className = 'uht'; toast.innerHTML = '<span></span><button data-a="reload">Reload</button>';
    document.body.appendChild(bar); document.body.appendChild(sheet); document.body.appendChild(toast);
    var dot = bar.querySelector('.dot'), stLine = sheet.querySelector('#uhSt'), checking = false, fresh = false;
    function say(t, keep) { toast.firstChild.textContent = t; toast.classList.add('on'); if (!keep) setTimeout(function () { toast.classList.remove('on'); }, 4500); }
    function ago(t) { if (!t) return 'never'; var s = Math.round((Date.now() - t) / 1000); if (s < 60) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago'; return Math.round(s / 86400) + ' d ago'; }
    async function faceUi() { try { var on = !!(await UH.get('face')), ok = on || await UH.faceAvailable(); var b = sheet.querySelector('[data-a=face]'); b.style.display = ok ? '' : 'none'; b.textContent = on ? 'Turn off Face ID lock' : 'Turn on Face ID lock'; sheet.querySelector('[data-a=lockface]').style.display = on ? '' : 'none'; } catch (e) {} }
    function toLock() { var p = location.pathname, i = p.indexOf('/v/'), back = i > -1 ? p.slice(i + 3) + location.search : ''; location.replace(BASE + (back ? '?r=' + encodeURIComponent(back) : '')); }
    async function beat() { try { await UH.touch(); } catch (e) {} }
    async function status() { faceUi(); try { var s = await UH.ask({ t: 'status' }); var m = s.meta; stLine.textContent = m ? ('Copy from the PC: ' + (m.updated ? new Date(m.updated).toLocaleString() : '?') + ' · checked ' + ago(m.syncedAt) + ' · ' + m.n + ' files') : 'Not synced yet'; } catch (e) {} }
    async function check(manual) {
      if (checking) return; checking = true;
      try {
        var c = await UH.ask({ t: 'check' });
        if (!c.ok) { if (manual) say('No connection — showing the copy saved on this phone.'); return; }
        if (c.newer) {
          if (manual) say('Updating…', true);
          var r = await UH.ask({ t: 'sync' });
          if (r.ok && r.changed) { fresh = true; dot.style.display = ''; say('Updated from your PC. Reload to see the latest.', true); }
          else if (r.err === 'passcode-changed') { location.href = BASE; }
          else if (manual) say('Update did not finish. Try again.');
        } else if (manual) say('Already up to date.');
      } finally { checking = false; status(); }
    }
    bar.addEventListener('click', function (e) {
      var a = e.target.closest('button'); if (!a) return; a = a.getAttribute('data-a');
      if (a === 'back') { if (history.length > 1) history.back(); else location.href = BASE + 'v/'; }
      else if (a === 'home') location.href = BASE + 'v/';
      else if (a === 'more') { status(); sheet.classList.add('on'); }
    });
    sheet.addEventListener('click', async function (e) {
      if (e.target === sheet) return sheet.classList.remove('on');
      var b = e.target.closest('button'); if (!b) return; var a = b.getAttribute('data-a');
      if (a === 'close') sheet.classList.remove('on');
      else if (a === 'check') { sheet.classList.remove('on'); check(true); }
      else if (a === 'face') { sheet.classList.remove('on'); try { if (await UH.get('face')) { await UH.faceOff(); say('Face ID lock is off.'); } else { var mode = await UH.faceEnroll(); say(mode === 'prf' ? 'Face ID lock is on.' : 'Face ID lock is on (screen lock only on this phone).'); } } catch (e) { say('Face ID: ' + ((e && e.name === 'NotAllowedError') ? 'cancelled.' : (e && e.message) || 'failed.')); } faceUi(); }
      else if (a === 'lockface') { await UH.lockNow(); toLock(); }
      else if (a === 'reload') location.reload();
      else if (a === 'start') location.href = BASE + 'index.html';
      else if (a === 'lock') { if (confirm('Remove the passcode and all saved notes from this phone? You can unlock again any time with the passcode.')) { await UH.ask({ t: 'lock' }); location.href = BASE; } }
    });
    toast.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) location.reload(); });
    document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[href^="studyrecorder:"]'); if (a) { e.preventDefault(); say('Recording only works on the PC.'); } }, true);
    /* ---- touch-first hub: bottom tab bar, no keyboard hints ---- */
    (function hubTouch() {
      var ICON = {
        home: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
        subjects: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
        course: '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.4 2.7 3 6 3s6-1.600 6-3v-4.500"/>',
        tools: '<rect x="3" y="3" width="7.500" height="7.500" rx="2"/><rect x="13.500" y="3" width="7.500" height="7.500" rx="2"/><rect x="3" y="13.500" width="7.500" height="7.500" rx="2"/><rect x="13.500" y="13.500" width="7.500" height="7.500" rx="2"/>',
        archive: '<rect x="3" y="4" width="18" height="5" rx="1.500"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/>',
        more: '<circle cx="5" cy="12" r="1.600"/><circle cx="12" cy="12" r="1.600"/><circle cx="19" cy="12" r="1.600"/>'
      };
      var SHORT = { course: 'Course' };
      function svg(k) { return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[k] || '') + '</svg>'; }
      var hcss = document.createElement('style');
      hcss.textContent = [
        'html.is-phone{-webkit-text-size-adjust:100%}',
        '.is-phone,.is-phone *{-webkit-tap-highlight-color:transparent}',
        '.is-phone a,.is-phone button,.is-phone summary,.is-phone [role=button],.is-phone label,.is-phone select{touch-action:manipulation}',
        '.is-phone input:not([type=checkbox]):not([type=radio]),.is-phone textarea,.is-phone select{font-size:16px!important}',
        /* keyboard-only things */
        '.is-phone kbd,.is-phone .hn-q,.is-phone .spy-rail,.is-phone .hn-help,.is-phone .nav-tools-sep,.is-phone .kbd-hint,.is-phone .hn-kbd{display:none!important}',
        /* top bar: brand mark + a wide tap-to-search pill + theme */
        '.is-phone header.nav .nav-inner{gap:.5rem}',
        '.is-phone .nav-search{display:flex!important;flex:1 1 auto;min-width:0;min-height:44px;justify-content:flex-start;margin:0}',
        '.is-phone .nav-search span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
        '.is-phone .brand .brand-name,.is-phone .brand h1,.is-phone .brand-text,.is-phone .brand>span:not(.brand-mark){display:none!important}',
        '.is-phone .icon-btn{min-width:44px;min-height:44px}',
        /* bottom tab bar replaces the top strip */
        '.is-phone .hn-tabs{position:fixed!important;top:auto!important;bottom:0;left:0;right:0;z-index:2147483000;justify-content:space-around;gap:0;overflow:visible;padding:6px 6px calc(env(safe-area-inset-bottom,0px) + 4px);border-top:1px solid var(--line-strong,#d9cfb7);border-bottom:0;background:var(--paper,#f1ebdf);box-shadow:0 -6px 18px rgba(0,0,0,.12)}',
        '.is-phone .hn-sp{display:none}',
        '.is-phone .hn-tab{flex:1 1 0;min-width:0;flex-direction:column;justify-content:center;gap:3px;padding:7px 2px 5px;min-height:54px;border-radius:14px;font-size:.64rem;letter-spacing:.01em}',
        '.is-phone .hn-tab svg{display:block;flex:none}',
        '.is-phone .hn-tab span{overflow:hidden;text-overflow:ellipsis;max-width:100%}',
        '.is-phone .hn-tab.on{box-shadow:none}',
        '.is-phone .hn-tab.on svg{stroke-width:2.2}',
        'html:has(#hubTabs) .uhb{display:none!important}',
        'html:has(#hubTabs) body{padding-bottom:calc(env(safe-area-inset-bottom,0px) + 84px)!important}',
        'html:has(#hubTabs) .to-top{bottom:calc(env(safe-area-inset-bottom,0px) + 92px)!important}',
        'html:has(#hubTabs) .uht{bottom:calc(env(safe-area-inset-bottom,0px) + 92px)}',
        'html:has(#hubTabs) .toast-stack{bottom:calc(env(safe-area-inset-bottom,0px) + 92px)!important}',
        /* bigger targets on the dashboard */
        '.is-phone .hn-act,.is-phone .hn-btn,.is-phone .hn-sub button,.is-phone .cm-tabs button{min-height:44px}',
        '.is-phone .hn-sub{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}',
        '.is-phone .palette{width:calc(100vw - 20px)!important;max-width:none!important;margin-top:calc(env(safe-area-inset-top,0px) + 10px)!important}',
        '.is-phone .palette-results>*{min-height:48px}'
      ].join('\n');
      document.head.appendChild(hcss);
      function tidyText(root) {
        /* replace "Ctrl K" style hints that the hub renders inside tiles and help text */
        var w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, null), n, hit = [];
        while ((n = w.nextNode())) { if (/\b(Ctrl|Cmd|⌘)\s*\+?\s*[A-Z]\b|Press \?|\(\s*[A-Z]\s*\)\s*$|\s·\s*g\s+[a-z]\s*$/.test(n.nodeValue)) hit.push(n); }
        hit.forEach(function (t) {
          var p = t.parentNode; if (!p || p.closest('script,style,textarea')) return;
          var v = t.nodeValue.replace(/\s*(Ctrl|Cmd|⌘)\s*\+?\s*[A-Z]\b/g, '').replace(/\s*[·•—-]?\s*Press \?[^.]*\.?/g, '').replace(/\s*\(\s*[A-Z]\s*\)\s*$/, '').replace(/\s·\s*g\s+[a-z]\s*$/, '');
          if (/^\s*$/.test(v) && p.tagName === 'SMALL') v = 'Tap to open';
          t.nodeValue = v;
        });
      }
      function decorate() {
        var bar = document.getElementById('hubTabs'); if (!bar) return false;
        bar.querySelectorAll('.hn-tab[data-hn]').forEach(function (b) {
          if (b.querySelector('svg')) return;
          var k = b.getAttribute('data-hn'), sp = b.querySelector('span');
          if (sp && SHORT[k]) sp.textContent = SHORT[k];
          b.insertAdjacentHTML('afterbegin', svg(k));
        });
        if (!bar.querySelector('[data-uh-more]')) {
          var m = document.createElement('button'); m.type = 'button'; m.className = 'hn-tab'; m.setAttribute('data-uh-more', '1'); m.innerHTML = svg('more') + '<span>More</span>';
          m.addEventListener('click', function () { status(); sheet.classList.add('on'); });
          bar.appendChild(m);
        }
        var ph = document.querySelector('.nav-search span'); if (ph && !/^Search$/.test(ph.textContent)) ph.textContent = 'Search';
        tidyText();
        return true;
      }
      var timer = null;
      function soon() { clearTimeout(timer); timer = setTimeout(decorate, 120); }
      new MutationObserver(soon).observe(document.body, { childList: true, subtree: true });
      decorate();
    })();
    /* hide the bar while reading downwards */
    var y = window.scrollY, tick = false;
    window.addEventListener('scroll', function () { if (tick) return; tick = true; requestAnimationFrame(function () { var n = window.scrollY, d = n - y; if (Math.abs(d) > 10) { bar.classList.toggle('hide', d > 0 && n > 120); y = n; } tick = false; }); }, { passive: true });
    document.addEventListener('visibilitychange', async function () { if (document.visibilityState === 'visible') { try { var st = await UH.ask({ t: 'status' }); if (!st.unlocked) return toLock(); } catch (e) {} beat(); check(false); } });
    setInterval(function () { if (document.visibilityState === 'visible') beat(); }, 15000); beat(); faceUi();
    window.addEventListener('online', function () { check(false); });
    setInterval(function () { if (document.visibilityState === 'visible') check(false); }, 120000);
    setTimeout(function () { check(false); }, 1200);
  });
})();

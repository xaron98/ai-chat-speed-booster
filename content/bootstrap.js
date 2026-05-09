(function (root) {
  var ACSB = root.ACSB || {};
  var doc = (typeof document !== 'undefined') ? document : null;
  if (!doc) return;

  var state = {
    adapter: null,
    container: null,
    observer: null,
    settings: ACSB.storage.defaultSettings(),
    autoThreshold: 50,
    perf: { jankFrames: 0, totalFrames: 0, sustainedLowJankSeconds: 0, lastSampleStart: 0, running: false },
    stats: { virtualized: 0, collapsed: 0 },
    lastSig: null,
    cachedMessageSelector: null
  };

  function pickAdapter() {
    var host = location.hostname;
    var all = ACSB.adapters || {};
    for (var k in all) {
      var a = all[k];
      if (a.hosts.indexOf(host) >= 0) return a;
    }
    return null;
  }

  function querySelectors(selectors) {
    for (var i = 0; i < selectors.length; i++) {
      var el = doc.querySelector(selectors[i]);
      if (el) return el;
    }
    return null;
  }

  function findContainer(adapter, deadlineMs, cb) {
    var startedAt = Date.now();
    function tick() {
      var el = querySelectors(adapter.containerSelectors);
      if (el) return cb(el);
      if (Date.now() - startedAt >= deadlineMs) return cb(null);
      setTimeout(tick, 250);
    }
    tick();
  }

  function findMessages(adapter, container) {
    if (!container) return [];
    if (state.cachedMessageSelector) {
      var cached = container.querySelectorAll(state.cachedMessageSelector);
      if (cached.length > 0) return Array.prototype.slice.call(cached);
      state.cachedMessageSelector = null; // invalidate; re-probe below
    }
    for (var i = 0; i < adapter.messageSelectors.length; i++) {
      var nodes = container.querySelectorAll(adapter.messageSelectors[i]);
      if (nodes.length > 0) {
        state.cachedMessageSelector = adapter.messageSelectors[i];
        return Array.prototype.slice.call(nodes);
      }
    }
    return [];
  }

  function activeThreshold() {
    return state.settings.threshold === 'auto' ? state.autoThreshold : state.settings.threshold;
  }

  function broadcast() {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'acsb:stats',
          host: location.hostname,
          stats: {
            virtualized: state.stats.virtualized,
            collapsed: state.stats.collapsed,
            currentAutoValue: state.autoThreshold,
            settings: state.settings
          }
        }, function () { void chrome.runtime.lastError; });
      }
    } catch (_) {}
  }

  function runOnce(force) {
    if (!state.container) return;
    var msgs = findMessages(state.adapter, state.container);
    var threshold = activeThreshold();
    var sig = state.settings.enabled + '|' + msgs.length + '|' + threshold;

    if (!force && sig === state.lastSig) {
      return;
    }
    state.lastSig = sig;

    if (state.settings.enabled) {
      ACSB.optimizer.virtualize(msgs);
      ACSB.collapser.applySplit(state.container, msgs, threshold);
    } else {
      ACSB.optimizer.devirtualizeAll(state.container);
      ACSB.collapser.unwrapAll(state.container);
    }
    state.stats.virtualized = ACSB.optimizer.countVirtualized(state.container);
    state.stats.collapsed = ACSB.collapser.countCollapsed(state.container);
    broadcast();
  }

  function startPerfSampler(durationMs) {
    if (state.settings.threshold !== 'auto') return;
    if (state.perf.running) return;
    state.perf.running = true;
    var start = performance.now();
    var lastFrame = start;
    state.perf.jankFrames = 0;
    state.perf.totalFrames = 0;

    function frame(t) {
      var delta = t - lastFrame;
      lastFrame = t;
      if (delta > 50) state.perf.jankFrames++;
      state.perf.totalFrames++;
      if (t - start < durationMs) {
        requestAnimationFrame(frame);
      } else {
        var ratio = state.perf.totalFrames ? state.perf.jankFrames / state.perf.totalFrames : 0;
        if (ratio < 0.05) state.perf.sustainedLowJankSeconds += Math.round(durationMs / 1000);
        else state.perf.sustainedLowJankSeconds = 0;
        state.autoThreshold = ACSB.perf.decideThreshold({
          jankRatio: ratio,
          currentThreshold: state.autoThreshold,
          sustainedLowJankSeconds: state.perf.sustainedLowJankSeconds
        });
        state.perf.running = false;
        runOnce();
      }
    }
    requestAnimationFrame(frame);
  }

  function attachScrollSampling() {
    var scrollTimer = null;
    window.addEventListener('scroll', function () {
      if (scrollTimer) return;
      scrollTimer = setTimeout(function () {
        scrollTimer = null;
        if (state.settings.threshold === 'auto') startPerfSampler(2000);
      }, 250);
    }, { passive: true });
  }

  function applyProfile() {
    var p = ACSB.profile.extract(state.adapter);
    if (p) ACSB.storage.setProfile(location.hostname, p);
  }

  function collectMessages() {
    if (!state.container || !state.adapter) return [];
    var roles = state.adapter.roleSelectors || {};
    var nodes = [];
    for (var i = 0; i < state.adapter.messageSelectors.length; i++) {
      var found = state.container.querySelectorAll(state.adapter.messageSelectors[i]);
      if (found.length > 0) { nodes = Array.prototype.slice.call(found); break; }
    }
    return nodes.map(function (el) {
      var role = 'message';
      if (roles.user && el.matches && el.matches(roles.user)) role = 'user';
      else if (roles.assistant && el.matches && el.matches(roles.assistant)) role = 'assistant';
      else if (roles.user && el.querySelector && el.querySelector(roles.user)) role = 'user';
      else if (roles.assistant && el.querySelector && el.querySelector(roles.assistant)) role = 'assistant';
      var text = (el.textContent || '').replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      return { role: role, text: text };
    }).filter(function (m) { return m.text.length > 0; });
  }

  function triggerDownload(body, mime, filename) {
    try {
      var blob = new Blob([body], { type: mime });
      var url = URL.createObjectURL(blob);
      var a = doc.createElement('a');
      a.href = url; a.download = filename;
      doc.body.appendChild(a);
      a.click();
      doc.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      return true;
    } catch (e) {
      console.warn('[ACSB] download failed', e);
      return false;
    }
  }

  function exportConversation(format) {
    if (!state.container) return { ok: false, reason: 'no-container' };
    var messages = collectMessages();
    var meta = {
      host: location.hostname,
      title: doc.title || 'Conversation'
    };
    var out = ACSB.exporter.serialize(messages, format, meta);
    var name = ACSB.exporter.buildFilename({ host: meta.host, ext: out.ext });
    var ok = triggerDownload(out.body, out.mime, name);
    return { ok: ok, count: messages.length, filename: name };
  }

  function start() {
    state.adapter = pickAdapter();
    if (!state.adapter) return;

    ACSB.storage.getSettings(function (s) {
      state.settings = s;
      findContainer(state.adapter, 3000, function (container) {
        if (!container) {
          console.warn('[ACSB] container not found for', state.adapter.id);
          return;
        }
        state.container = container;
        applyProfile();
        runOnce();
        startPerfSampler(2000);
        attachScrollSampling();
        state.observer = ACSB.observer.watch(container, runOnce);
      });
    });

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
        if (msg && msg.type === 'acsb:settings-changed') {
          state.settings = ACSB.storage.validateSettings(msg.settings);
          runOnce(true);
          if (state.settings.threshold === 'auto') startPerfSampler(2000);
        }
        if (msg && msg.type === 'acsb:request-stats') broadcast();
        if (msg && msg.type === 'acsb:export') {
          var result = exportConversation(msg.format);
          if (sendResponse) sendResponse(result);
          return true;
        }
      });
    }
  }

  ACSB.bootstrap = { start: start, _state: state };
  if (doc.readyState === 'complete' || doc.readyState === 'interactive') {
    start();
  } else {
    doc.addEventListener('DOMContentLoaded', start);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);

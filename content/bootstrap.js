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
    perf: { jankFrames: 0, totalFrames: 0, sustainedLowJankSeconds: 0, lastSampleStart: 0 },
    stats: { virtualized: 0, collapsed: 0 }
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
    for (var i = 0; i < adapter.messageSelectors.length; i++) {
      var nodes = container.querySelectorAll(adapter.messageSelectors[i]);
      if (nodes.length > 0) return Array.prototype.slice.call(nodes);
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

  function runOnce() {
    if (!state.container) return;
    var msgs = findMessages(state.adapter, state.container);
    if (state.settings.enabled) {
      ACSB.optimizer.virtualize(msgs);
      ACSB.collapser.applySplit(state.container, msgs, activeThreshold());
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
      chrome.runtime.onMessage.addListener(function (msg) {
        if (msg && msg.type === 'acsb:settings-changed') {
          state.settings = ACSB.storage.validateSettings(msg.settings);
          runOnce();
          if (state.settings.threshold === 'auto') startPerfSampler(2000);
        }
        if (msg && msg.type === 'acsb:request-stats') broadcast();
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

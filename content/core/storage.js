(function (root) {
  var ALLOWED_THRESHOLDS = ['auto', 30, 50, 100, 200];
  var SETTINGS_KEY = 'settings';

  function defaultSettings() {
    return { enabled: true, threshold: 'auto' };
  }

  function validateSettings(input) {
    var d = defaultSettings();
    if (!input || typeof input !== 'object') return d;
    var enabled = (typeof input.enabled === 'boolean') ? input.enabled : d.enabled;
    var threshold = (ALLOWED_THRESHOLDS.indexOf(input.threshold) >= 0) ? input.threshold : d.threshold;
    return { enabled: enabled, threshold: threshold };
  }

  function api() {
    if (typeof chrome !== 'undefined' && chrome.storage) return chrome;
    if (typeof browser !== 'undefined' && browser.storage) return browser;
    return null;
  }

  function getSettings(cb) {
    var a = api();
    if (!a) return cb(defaultSettings());
    a.storage.sync.get(SETTINGS_KEY, function (data) {
      cb(validateSettings(data && data[SETTINGS_KEY]));
    });
  }

  function setSettings(next, cb) {
    var a = api();
    var clean = validateSettings(next);
    if (!a) { if (cb) cb(clean); return; }
    var payload = {};
    payload[SETTINGS_KEY] = clean;
    a.storage.sync.set(payload, function () { if (cb) cb(clean); });
  }

  function setTabStats(tabId, stats) {
    var a = api(); if (!a || tabId == null) return;
    var payload = {};
    payload['tab_' + tabId] = Object.assign({ updatedAt: Date.now() }, stats);
    a.storage.local.set(payload);
  }

  function getTabStats(tabId, cb) {
    var a = api(); if (!a || tabId == null) return cb(null);
    a.storage.local.get('tab_' + tabId, function (data) { cb(data['tab_' + tabId] || null); });
  }

  function clearTabStats(tabId) {
    var a = api(); if (!a || tabId == null) return;
    a.storage.local.remove('tab_' + tabId);
  }

  function setProfile(host, profile) {
    var a = api(); if (!a || !host) return;
    var payload = {};
    payload['profile_' + host] = Object.assign({ updatedAt: Date.now() }, profile);
    a.storage.local.set(payload);
  }

  function getProfile(host, cb) {
    var a = api(); if (!a || !host) return cb(null);
    a.storage.local.get('profile_' + host, function (data) { cb(data['profile_' + host] || null); });
  }

  root.ACSB = root.ACSB || {};
  root.ACSB.storage = {
    ALLOWED_THRESHOLDS: ALLOWED_THRESHOLDS,
    SETTINGS_KEY: SETTINGS_KEY,
    defaultSettings: defaultSettings,
    validateSettings: validateSettings,
    getSettings: getSettings,
    setSettings: setSettings,
    setTabStats: setTabStats,
    getTabStats: getTabStats,
    clearTabStats: clearTabStats,
    setProfile: setProfile,
    getProfile: getProfile
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

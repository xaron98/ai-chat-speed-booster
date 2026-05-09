(function () {
  var SUPPORTED_HOSTS = ['chatgpt.com', 'chat.openai.com', 'claude.ai', 'gemini.google.com'];
  var DISPLAY_HOST = {
    'chatgpt.com': 'chatgpt.com',
    'chat.openai.com': 'chat.openai.com',
    'claude.ai': 'claude.ai',
    'gemini.google.com': 'gemini.google.com'
  };
  var ALLOWED_THRESHOLDS = ['auto', 30, 50, 100, 200];

  var browserApi = (typeof chrome !== 'undefined' && chrome.runtime) ? chrome : browser;

  var $enabled = document.getElementById('acsb-enabled');
  var $radios = document.getElementById('acsb-radios');
  var $autoCurrent = document.getElementById('acsb-auto-current');
  var $name = document.getElementById('acsb-name');
  var $host = document.getElementById('acsb-host');
  var $avatar = document.getElementById('acsb-avatar');
  var $virt = document.getElementById('acsb-virt');
  var $coll = document.getElementById('acsb-coll');
  var $status = document.getElementById('acsb-status');
  var $exportFormat = document.getElementById('acsb-export-format');
  var $exportBtn = document.getElementById('acsb-export-btn');
  var $exportStatus = document.getElementById('acsb-export-status');

  function getActiveTab(cb) {
    browserApi.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      cb(tabs && tabs[0]);
    });
  }

  function tabHost(tab) {
    if (!tab || !tab.url) return null;
    try { return new URL(tab.url).hostname; } catch (_) { return null; }
  }

  function isSupported(host) {
    return SUPPORTED_HOSTS.indexOf(host) >= 0;
  }

  function defaultSettings() { return { enabled: true, threshold: 'auto' }; }

  function loadSettings(cb) {
    browserApi.storage.sync.get('settings', function (data) {
      var s = (data && data.settings) || defaultSettings();
      if (typeof s.enabled !== 'boolean') s.enabled = true;
      if (ALLOWED_THRESHOLDS.indexOf(s.threshold) < 0) s.threshold = 'auto';
      cb(s);
    });
  }

  function saveSettings(s, cb) {
    browserApi.storage.sync.set({ settings: s }, function () {
      if (cb) cb();
    });
  }

  function loadTabStats(tabId, cb) {
    browserApi.storage.local.get('tab_' + tabId, function (data) {
      cb(data['tab_' + tabId] || null);
    });
  }

  function loadProfile(host, cb) {
    if (!host) return cb(null);
    browserApi.storage.local.get('profile_' + host, function (data) {
      cb(data['profile_' + host] || null);
    });
  }

  function setRadio(value) {
    var inputs = $radios.querySelectorAll('input[type="radio"]');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].checked = String(inputs[i].value) === String(value);
    }
  }

  function readRadio() {
    var checked = $radios.querySelector('input[type="radio"]:checked');
    if (!checked) return 'auto';
    if (checked.value === 'auto') return 'auto';
    return parseInt(checked.value, 10);
  }

  function initialsFrom(name, host) {
    var s = (name || host || '').trim();
    if (!s) return '';
    var parts = s.split(/[\s@.\-_]+/).filter(Boolean);
    var letters = parts.slice(0, 2).map(function (p) { return p[0].toUpperCase(); }).join('');
    return letters || s[0].toUpperCase();
  }

  function renderProfile(profile, host) {
    var name = (profile && profile.displayName) || '';
    $avatar.textContent = initialsFrom(name, host);
    $name.textContent = name || (host ? '' : '—');
    $host.textContent = host && isSupported(host) ? ('Active on ' + DISPLAY_HOST[host]) : 'Open ChatGPT, Claude or Gemini to use';
  }

  function renderStats(stats, settings) {
    $virt.textContent = (stats && stats.virtualized) || 0;
    $coll.textContent = (stats && stats.collapsed) || 0;
    var auto = (stats && stats.currentAutoValue) || 50;
    $autoCurrent.textContent = settings.threshold === 'auto' ? ('currently: ' + auto) : '—';
    $status.textContent = settings.enabled ? 'Active' : 'Off';
  }

  function disableControls(disabled) {
    $enabled.disabled = disabled;
    var inputs = $radios.querySelectorAll('input[type="radio"]');
    for (var i = 0; i < inputs.length; i++) inputs[i].disabled = disabled;
    if ($exportBtn) $exportBtn.disabled = disabled;
    if ($exportFormat) $exportFormat.disabled = disabled;
  }

  function requestExport(tabId) {
    if (tabId == null) return;
    var format = $exportFormat ? $exportFormat.value : 'md';
    $exportStatus.textContent = 'Loading older messages…';
    $exportBtn.disabled = true;
    try {
      browserApi.tabs.sendMessage(tabId, { type: 'acsb:export', format: format }, function (resp) {
        $exportBtn.disabled = false;
        if (browserApi.runtime.lastError) {
          $exportStatus.textContent = 'Error: ' + browserApi.runtime.lastError.message;
          return;
        }
        if (!resp) {
          $exportStatus.textContent = 'No response from page. Reload the tab and retry.';
          return;
        }
        if (!resp.ok) {
          $exportStatus.textContent = 'Export failed (' + (resp.reason || 'unknown') + ')';
          return;
        }
        $exportStatus.textContent = 'Saved ' + resp.count + ' messages → ' + resp.filename;
      });
    } catch (e) {
      $exportBtn.disabled = false;
      $exportStatus.textContent = 'Error: ' + e.message;
    }
  }

  function notifyContent(tabId, settings) {
    if (tabId == null) return;
    try {
      browserApi.tabs.sendMessage(tabId, { type: 'acsb:settings-changed', settings: settings }, function () {
        void browserApi.runtime.lastError;
      });
    } catch (_) {}
  }

  function init() {
    getActiveTab(function (tab) {
      var host = tabHost(tab);
      var supported = isSupported(host);

      loadSettings(function (settings) {
        $enabled.checked = settings.enabled;
        setRadio(settings.threshold);

        loadProfile(host, function (profile) { renderProfile(profile, host); });

        if (!supported) {
          renderStats({ virtualized: 0, collapsed: 0, currentAutoValue: 50 }, settings);
          disableControls(true);
          return;
        }

        loadTabStats(tab.id, function (stats) { renderStats(stats || {}, settings); });

        function refreshStatsSoon() {
          setTimeout(function () {
            loadTabStats(tab.id, function (stats) { renderStats(stats || {}, settings); });
          }, 300);
        }

        $enabled.addEventListener('change', function () {
          settings.enabled = $enabled.checked;
          saveSettings(settings, function () {
            notifyContent(tab.id, settings);
            renderStats({ virtualized: 0, collapsed: 0 }, settings);
            refreshStatsSoon();
          });
        });

        var inputs = $radios.querySelectorAll('input[type="radio"]');
        for (var i = 0; i < inputs.length; i++) {
          inputs[i].addEventListener('change', function () {
            settings.threshold = readRadio();
            saveSettings(settings, function () { notifyContent(tab.id, settings); refreshStatsSoon(); });
          });
        }

        if (browserApi.storage && browserApi.storage.onChanged) {
          browserApi.storage.onChanged.addListener(function (changes, area) {
            if (area === 'local' && changes['tab_' + tab.id]) {
              var newStats = changes['tab_' + tab.id].newValue || {};
              renderStats(newStats, settings);
            }
          });
        }

        if ($exportBtn) {
          $exportBtn.addEventListener('click', function () { requestExport(tab.id); });
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();

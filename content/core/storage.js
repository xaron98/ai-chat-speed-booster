(function (root) {
  var ALLOWED_THRESHOLDS = ['auto', 30, 50, 100, 200];

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

  root.ACSB = root.ACSB || {};
  root.ACSB.storage = {
    ALLOWED_THRESHOLDS: ALLOWED_THRESHOLDS,
    defaultSettings: defaultSettings,
    validateSettings: validateSettings
    // chrome.storage glue added in Task 6
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

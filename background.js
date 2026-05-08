(function () {
  var browserApi = (typeof chrome !== 'undefined' && chrome.runtime) ? chrome
                 : (typeof browser !== 'undefined' && browser.runtime) ? browser
                 : null;
  if (!browserApi) return;

  function setBadge(tabId, count) {
    if (!browserApi.action || !browserApi.action.setBadgeText) return;
    var text = count > 0 ? String(count) : '';
    browserApi.action.setBadgeText({ tabId: tabId, text: text });
    if (browserApi.action.setBadgeBackgroundColor) {
      browserApi.action.setBadgeBackgroundColor({ tabId: tabId, color: '#5b4bff' });
    }
  }

  browserApi.runtime.onMessage.addListener(function (msg, sender) {
    if (!msg || msg.type !== 'acsb:stats') return;
    var tabId = sender && sender.tab && sender.tab.id;
    if (tabId == null) return;
    var collapsed = (msg.stats && msg.stats.collapsed) || 0;
    setBadge(tabId, collapsed);
    var payload = {};
    payload['tab_' + tabId] = Object.assign({ updatedAt: Date.now() }, msg.stats, { host: msg.host });
    browserApi.storage.local.set(payload);
  });

  if (browserApi.tabs && browserApi.tabs.onRemoved) {
    browserApi.tabs.onRemoved.addListener(function (tabId) {
      browserApi.storage.local.remove('tab_' + tabId);
    });
  }
})();

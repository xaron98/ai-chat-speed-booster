(function (root) {
  var adapter = {
    id: 'gemini',
    hosts: ['gemini.google.com'],
    containerSelectors: [
      'chat-window',
      'main [data-test-id="conversation"]',
      'main'
    ],
    messageSelectors: [
      'user-query, model-response',
      'message-content'
    ],
    avatarSelector: 'a[aria-label*="account" i] img, img.gb_d',
    nameSelector: 'a[aria-label*="account" i]'
  };
  root.ACSB = root.ACSB || {};
  root.ACSB.adapters = root.ACSB.adapters || {};
  root.ACSB.adapters.gemini = adapter;
})(typeof globalThis !== 'undefined' ? globalThis : this);

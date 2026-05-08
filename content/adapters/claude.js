(function (root) {
  var adapter = {
    id: 'claude',
    hosts: ['claude.ai'],
    containerSelectors: [
      '[data-testid="chat-container"]',
      'main [class*="conversation"]',
      'main'
    ],
    messageSelectors: [
      '[data-test-render-count]',
      '[data-testid="user-message"], [data-testid="assistant-message"]',
      '.font-claude-message, .font-user-message'
    ],
    avatarSelector: 'button[aria-label*="profile" i] img, header img[alt]',
    nameSelector: 'button[aria-label*="profile" i] [data-testid="user-name"]'
  };
  root.ACSB = root.ACSB || {};
  root.ACSB.adapters = root.ACSB.adapters || {};
  root.ACSB.adapters.claude = adapter;
})(typeof globalThis !== 'undefined' ? globalThis : this);

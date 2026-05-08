(function (root) {
  var adapter = {
    id: 'claude',
    hosts: ['claude.ai'],
    containerSelectors: [
      'div[data-autoscroll-container]',
      '#main-content',
      '#root'
    ],
    messageSelectors: [
      '[data-test-render-count]',
      '[data-testid="user-message"], [data-testid="assistant-message"]'
    ],
    avatarSelector: 'button[aria-label*="profile" i] img, button[aria-label*="account" i] img, header img[alt]',
    nameSelector: 'button[aria-label*="profile" i] span',
    roleSelectors: {
      user: '[data-testid="user-message"]',
      assistant: '[data-testid="assistant-message"]'
    }
  };
  root.ACSB = root.ACSB || {};
  root.ACSB.adapters = root.ACSB.adapters || {};
  root.ACSB.adapters.claude = adapter;
})(typeof globalThis !== 'undefined' ? globalThis : this);

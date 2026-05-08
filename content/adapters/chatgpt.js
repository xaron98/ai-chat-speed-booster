(function (root) {
  var adapter = {
    id: 'chatgpt',
    hosts: ['chatgpt.com', 'chat.openai.com'],
    containerSelectors: [
      'main [data-testid="conversation-turns"]',
      'main div[role="presentation"]',
      'main'
    ],
    messageSelectors: [
      '[data-message-author-role]',
      '[data-testid^="conversation-turn"]'
    ],
    avatarSelector: 'button[aria-label*="account" i] img, header img[alt]',
    nameSelector: 'button[aria-label*="account" i] span, header [data-testid="username"]'
  };
  root.ACSB = root.ACSB || {};
  root.ACSB.adapters = root.ACSB.adapters || {};
  root.ACSB.adapters.chatgpt = adapter;
})(typeof globalThis !== 'undefined' ? globalThis : this);

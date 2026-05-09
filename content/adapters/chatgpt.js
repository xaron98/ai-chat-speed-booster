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
    avatarSelector: 'nav img[alt="Profile image"], [data-testid*="profile"] img, nav img[alt]',
    nameSelector: '[data-testid*="profile"] [class*="truncate"], nav button[aria-label]',
    roleSelectors: {
      user: '[data-message-author-role="user"]',
      assistant: '[data-message-author-role="assistant"]'
    }
  };
  root.ACSB = root.ACSB || {};
  root.ACSB.adapters = root.ACSB.adapters || {};
  root.ACSB.adapters.chatgpt = adapter;
})(typeof globalThis !== 'undefined' ? globalThis : this);

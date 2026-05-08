# AI Chat Speed Booster — Design Spec

- **Date:** 2026-05-08
- **Status:** Approved (brainstorming phase complete)
- **Branding:** "AI Chat Speed Booster — FREE — Fix lag & freezing in long chats"
- **Distribution:** Public, free, on addons.mozilla.org and Chrome Web Store. Structure ready for a future PRO version.

## 1. Problem

Long conversations on ChatGPT, Claude, and Gemini lag the browser because the entire message history is kept in the DOM. Hundreds or thousands of messages with code highlighting, markdown, and embedded media accumulate, making scroll, typing, and even tab switching sluggish.

## 2. Goals

- Restore fluid scrolling and typing in long AI chats with zero user intervention by default.
- Work transparently across ChatGPT (`chatgpt.com`, `chat.openai.com`), Claude (`claude.ai`), and Gemini (`gemini.google.com`).
- Cross-browser: Firefox + Chrome/Edge with a single codebase.
- Zero data collection. No external network requests.
- Be approvable on AMO and Chrome Web Store on first submission.
- Lay foundations for a future PRO version without bloating v1.

## 3. Non-goals (YAGNI for v1)

- Per-site overrides of the global toggle.
- Persistent stats across sessions or a stats dashboard.
- Onboarding tutorial.
- Cloud sync beyond what `chrome.storage.sync` provides for free.
- Export of conversations.
- Theming/dark-mode customization beyond following the popup's system preference.

## 4. Architecture

### 4.1 Project layout

```
ai-chat-speed-booster/
├── manifest.json              MV3, cross-browser
├── icons/                     16, 32, 48, 96, 128
├── background.js              badge counter, tab events
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── content/
│   ├── core/
│   │   ├── optimizer.js       content-visibility logic
│   │   ├── collapser.js       collapses old messages into <details>
│   │   ├── observer.js        MutationObserver wrapper
│   │   ├── perf.js            jank detection for Auto mode
│   │   ├── profile.js         extracts avatar + display name
│   │   └── storage.js         chrome.storage wrapper (sync + local)
│   ├── adapters/
│   │   ├── chatgpt.js
│   │   ├── claude.js
│   │   └── gemini.js
│   └── bootstrap.js           selects the right adapter and runs core
├── styles/
│   └── injected.css           the .acsb-msg rules and details styling
├── test/
│   └── mock-chat.html         300-message fixture for manual perf tests
├── docs/
│   └── superpowers/specs/2026-05-08-ai-chat-speed-booster-design.md
├── PRIVACY.md
└── README.md
```

### 4.2 Module boundaries

| Module | Purpose | Depends on |
|---|---|---|
| `bootstrap.js` | Detects host, picks adapter, wires core modules. | adapters, core/* |
| `adapters/<site>.js` | Exposes `{ host, containerSelectors, messageSelectors, avatarSelector, nameSelector }`. Stateless data only. | none |
| `core/optimizer.js` | Adds `acsb-msg` class to messages, ensures injected CSS is present. | none |
| `core/collapser.js` | Wraps the oldest `n - threshold` messages into a `<details>` element. Reversible. | none |
| `core/observer.js` | Wraps `MutationObserver` with debounce. Notifies `optimizer` and `collapser` of new messages. | none |
| `core/perf.js` | Measures long animation frames or rAF deltas. Decides Auto threshold. | none |
| `core/profile.js` | Reads avatar img + display name from the DOM, writes to local storage. | none |
| `core/storage.js` | Wrapper providing `getSettings`, `setSettings`, `getTabStats`, `setTabStats`, `getProfile`, `setProfile`. | none |
| `popup/popup.js` | Reads settings + active tab stats + profile, renders UI, writes settings. | none |
| `background.js` | Listens for tab updates and `runtime.onMessage` from content; updates extension badge with collapsed count. | none |

A new site can be added by writing one adapter file (~30 lines) and a host entry in `manifest.json`.

### 4.3 Cross-browser MV3

A single `manifest.json` works for both via `browser_specific_settings`:

```json
{
  "manifest_version": 3,
  "name": "AI Chat Speed Booster",
  "short_name": "ACSB",
  "version": "1.0.0",
  "description": "Fix lag & freezing in long ChatGPT, Claude, and Gemini chats.",
  "permissions": ["storage", "activeTab"],
  "host_permissions": [
    "https://chatgpt.com/*",
    "https://chat.openai.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*"
  ],
  "background": {
    "service_worker": "background.js",
    "scripts": ["background.js"]
  },
  "content_scripts": [{
    "matches": [
      "https://chatgpt.com/*",
      "https://chat.openai.com/*",
      "https://claude.ai/*",
      "https://gemini.google.com/*"
    ],
    "js": ["content/bootstrap.js"],
    "css": ["styles/injected.css"],
    "run_at": "document_idle"
  }],
  "action": { "default_popup": "popup/popup.html" },
  "icons": { "16": "icons/16.png", "48": "icons/48.png", "128": "icons/128.png" },
  "browser_specific_settings": {
    "gecko": { "id": "ai-chat-speed-booster@xaron", "strict_min_version": "115.0" }
  }
}
```

Chrome ignores `background.scripts`; Firefox ignores `background.service_worker`. Both accept this.

## 5. Optimization engine

### 5.1 Layer A — `content-visibility`

Every message receives the class `acsb-msg`, defined in `styles/injected.css`:

```css
.acsb-msg {
  content-visibility: auto;
  contain-intrinsic-size: 0 600px;
}
```

The browser skips layout and paint for any `.acsb-msg` outside the viewport. This alone restores most of the smoothness. It is always on while the toggle is ON.

### 5.2 Layer B — Collapser

When the message count exceeds the active threshold (Auto, 30, 50, 100, or 200), the oldest `count - threshold` messages are wrapped inside a single `<details class="acsb-collapsed">`:

```html
<details class="acsb-collapsed">
  <summary>Show 73 older messages</summary>
  <!-- 73 messages here -->
</details>
```

When the user opens the `<details>`, the messages render normally. The wrapper is reversible: turning the toggle OFF or raising the threshold restores the original DOM order without page reload.

### 5.3 MutationObserver

`core/observer.js` watches the conversation container for added subtrees, debounced at 100 ms. On each batch:

1. New messages get the `acsb-msg` class.
2. `core/collapser.js` recomputes the split if needed (only re-runs when `count > threshold`).
3. Tab stats are updated and broadcast to the popup via `runtime.sendMessage`.

### 5.4 Auto threshold (default)

`core/perf.js` chooses the threshold using two signals:

- A `PerformanceObserver` for `'long-animation-frame'` entries when supported; fallback to a `requestAnimationFrame` delta sampler.
- The current message count.

It measures during two windows: (a) right after the chat container is detected, for 2 s; (b) opportunistically while the user is scrolling, for windows of >2 s.

Decision rule (deterministic, no ML):

| Jank ratio (long frames / total) | Action |
|---|---|
| > 25% | drop one step (200 → 100 → 50 → 30) |
| 5–25% | hold |
| < 5% for 30 s and threshold not at 200 | raise one step |

Manual choice (30/50/100/200) overrides Auto until the user picks Auto again.

## 6. Popup UI

### 6.1 Layout (final)

```
┌─────────────────────────────────┐
│ ⚡ AI Chat Speed Booster        │
├─────────────────────────────────┤
│  ╭───╮                          │
│  │👤 │  user@example.com        │
│  ╰───╯  Active on chatgpt.com   │
│                          [ ON ]│
│  ─────────────────────────────  │
│  Collapse messages after:       │
│  ● Auto (currently: 50)         │
│  ○ 30   ○ 50   ○ 100   ○ 200   │
│  ─────────────────────────────  │
│  👁  Virtualized: 142 messages  │
│  📦 Collapsed:    73 messages   │
│  💾 Status: Active              │
│  ─────────────────────────────  │
│  🔒 PRO features (coming soon)  │
│     · Stats dashboard           │
│     · Export chats              │
│     · More AI sites             │
└─────────────────────────────────┘
```

### 6.2 Behavior

- **Profile row:** shows avatar (img URL) and display name read from the active tab's host. Falls back to a neutral `👤` icon and the host name when no profile is found.
- **Toggle:** global ON/OFF, applied live without reload. Off → strips `.acsb-msg` from messages and unwraps `<details>`.
- **Threshold radios:** five mutually exclusive options. Selecting Auto enables the perf-driven scaling; the label shows the current chosen value in parentheses.
- **Counters:** Virtualized = number of messages currently carrying `.acsb-msg`. Collapsed = number of messages currently inside the `<details>`. Both reset when the user navigates to a different chat or reloads.
- **Out-of-scope tab:** if the active tab is not one of the four supported hosts, the body changes to "Open ChatGPT, Claude or Gemini to use" and the controls disable.
- **PRO section:** disabled, non-clickable preview of v2 features. No upsell URL in v1.

### 6.3 Storage

| Key | Scope | Contents |
|---|---|---|
| `settings` | `chrome.storage.sync` | `{ enabled: true, threshold: "auto" \| 30 \| 50 \| 100 \| 200 }` |
| `tab_<tabId>` | `chrome.storage.local` | `{ host, virtualized, collapsed, currentAutoValue, updatedAt }` |
| `profile_<host>` | `chrome.storage.local` | `{ avatarUrl, displayName, updatedAt }` |

`background.js` cleans `tab_<tabId>` entries on `tabs.onRemoved`.

## 7. Site adapters

Each adapter is a plain object exporting selectors, ordered by preference (most stable first). Bootstrap iterates until one matches; if none match within 3 s, the script disables itself silently for that session and logs a single warning.

```js
// content/adapters/chatgpt.js
export default {
  host: ["chatgpt.com", "chat.openai.com"],
  containerSelectors: [
    'main [data-testid="conversation-turns"]',
    'main div[role="presentation"]'
  ],
  messageSelectors: [
    '[data-message-author-role]',
    '[data-testid^="conversation-turn"]'
  ],
  avatarSelector: 'button[aria-label*="account" i] img, header img[alt]',
  nameSelector: 'button[aria-label*="account" i] [data-testid="username"]'
};
```

Selectors for Claude (`[data-test-render-count], .font-claude-message`) and Gemini (`message-content, user-query`) follow the same pattern. Concrete selectors are validated during implementation against the live DOM and may need updates if any site ships a refactor.

## 8. Privacy

- No `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, or `navigator.sendBeacon` anywhere in the codebase.
- Avatar URL is read from the page's existing `<img src>` and stored locally only. It is never re-fetched by the extension; the popup binds it as the `src` of its own `<img>`, and only the user's browser hits the AI site's CDN.
- A short `PRIVACY.md` ships with the extension and is linked from the AMO and Chrome Web Store listings: "This extension does not collect, store, or transmit any user data. All settings and stats are stored locally in your browser."
- Permissions requested: `storage` and `activeTab`. No `tabs`, no `<all_urls>`, no `scripting` (content scripts use the static manifest declaration).

## 9. Error handling

- All DOM mutations wrapped in `try/catch`. A failure in one module disables that module for the session but does not bring down the others.
- Adapter selector failure → silent disable for the session, single `console.warn`.
- `chrome.storage` failures → defaults are used in memory; the popup shows "Storage unavailable" if reads fail twice.
- The popup is defensive: if no message arrives from the content script within 500 ms, it shows "Open ChatGPT, Claude or Gemini to use".

## 10. Testing

### 10.1 Mock fixture

`test/mock-chat.html` ships with 300 fake messages mimicking ChatGPT's structure. Loading it with the extension allows scrolling-perf measurement in DevTools without rate limits or login.

### 10.2 Manual integration checklist (per site)

1. Open a conversation with >50 messages (or instruct the model: "respond with 100 short numbered messages").
2. Confirm `.acsb-msg` is applied to every message.
3. Confirm `<details class="acsb-collapsed">` wraps the oldest messages once threshold is crossed.
4. Toggle ON/OFF — verify it applies live without reload.
5. Switch to Auto and induce jank by scrolling rapidly — verify threshold steps down.
6. Verify the popup shows correct counters, profile photo, and active host.
7. Reload — verify counters reset and re-populate from the visible DOM.

### 10.3 Linters

- `web-ext lint` for Firefox.
- Manual review against Chrome Web Store policies.

## 11. Build, package, ship

- No bundler. The folder is the source. `web-ext build` produces a signed `.zip` for Firefox; the same folder is dragged into Chrome's "Pack extension" dialog for the `.crx`/`.zip` for the Chrome Store.
- Versioning: SemVer in `manifest.json`. v1 ships as `1.0.0`.
- Store assets to prepare separately (not in scope for the code spec): icon set, 2–3 screenshots per store, promo tile, short and long descriptions, link to `PRIVACY.md`.

## 12. Future PRO hooks (informational, not in v1)

- Stats persistence and history dashboard.
- Export current chat as Markdown or JSON.
- Additional adapters: Mistral Le Chat, Perplexity, DeepSeek, Grok.
- License gate read from a future settings key. The free version simply ignores anything PRO.

## 13. Open items

None blocking implementation. Selectors in §7 are best-effort and will be confirmed against live DOMs during the implementation plan; that work belongs in the plan, not the spec.

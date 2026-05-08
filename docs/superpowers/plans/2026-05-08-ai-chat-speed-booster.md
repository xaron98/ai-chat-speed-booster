# AI Chat Speed Booster — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-browser MV3 extension that fixes lag in long ChatGPT, Claude, and Gemini conversations using `content-visibility` + a collapser, with an Auto threshold mode and a popup that shows the user's profile and live counters.

**Architecture:** Vanilla JS, no bundler. Content script bootstraps a per-site adapter that points at message containers. A core engine adds `content-visibility` to messages and wraps old ones in a `<details>` once the threshold is exceeded. Auto mode tunes the threshold from jank measurements. Popup reads settings + per-tab stats + cached profile from `chrome.storage`.

**Tech Stack:** Manifest V3, vanilla ES5/ES2017 (IIFE pattern, namespaced under `globalThis.ACSB`), `chrome.storage.sync` + `chrome.storage.local`, `MutationObserver`, `PerformanceObserver`. Tests use Node 18+'s built-in `node --test` runner with `vm` to load production sources without duplication. No npm runtime dependencies.

**Spec:** [`docs/superpowers/specs/2026-05-08-ai-chat-speed-booster-design.md`](../specs/2026-05-08-ai-chat-speed-booster-design.md)

---

## File map

| Path | Purpose |
|---|---|
| `manifest.json` | MV3, cross-browser (Chrome/Firefox) |
| `package.json` | Test scripts only (no runtime deps) |
| `.gitignore` | Standard ignores |
| `PRIVACY.md` | Privacy policy linked from store listings |
| `README.md` | Repo overview, install instructions |
| `styles/injected.css` | `.acsb-msg` and `.acsb-collapsed` rules |
| `background.js` | Tab cleanup + badge counter |
| `content/bootstrap.js` | Picks adapter, wires core, exposes `ACSB.bootstrap` |
| `content/adapters/chatgpt.js` | Selectors for `chatgpt.com` and `chat.openai.com` |
| `content/adapters/claude.js` | Selectors for `claude.ai` |
| `content/adapters/gemini.js` | Selectors for `gemini.google.com` |
| `content/core/storage.js` | `chrome.storage` wrapper + schema |
| `content/core/perf.js` | Pure jank decision rule |
| `content/core/collapser.js` | Pure split math + DOM glue |
| `content/core/optimizer.js` | Adds `.acsb-msg` to messages |
| `content/core/observer.js` | Debounced `MutationObserver` |
| `content/core/profile.js` | Reads avatar + name |
| `popup/popup.html` | Popup markup |
| `popup/popup.css` | Popup styles (light + dark) |
| `popup/popup.js` | Popup behavior |
| `test/_load.mjs` | `vm`-based loader for ACSB scripts |
| `test/perf.test.mjs` | Tests `ACSB.perf.decideThreshold` |
| `test/collapser.test.mjs` | Tests `ACSB.collapser.computeSplit` |
| `test/storage.test.mjs` | Tests `ACSB.storage.validateSettings` |
| `test/mock-chat.html` | 300-message fixture for manual perf tests |
| `MANUAL_QA.md` | Per-site manual checklist |

Code style: each browser-side file is an IIFE attached to `globalThis.ACSB`. This keeps content scripts as classic scripts (MV3 default) while letting Node's `vm` module load and test the same source.

---

## Task 1: Project scaffold

**Files:**
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/manifest.json`
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/package.json`
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/.gitignore`
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/PRIVACY.md`
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/README.md`
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/styles/injected.css` (empty for now; populated in Task 6)
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/icons/.gitkeep`

- [ ] **Step 1: Write `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "AI Chat Speed Booster",
  "short_name": "ACSB",
  "version": "1.0.0",
  "description": "Fix lag & freezing in long ChatGPT, Claude, and Gemini chats. 100% local, no data collection.",
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
  "content_scripts": [
    {
      "matches": [
        "https://chatgpt.com/*",
        "https://chat.openai.com/*",
        "https://claude.ai/*",
        "https://gemini.google.com/*"
      ],
      "js": [
        "content/core/storage.js",
        "content/core/perf.js",
        "content/core/optimizer.js",
        "content/core/observer.js",
        "content/core/collapser.js",
        "content/core/profile.js",
        "content/adapters/chatgpt.js",
        "content/adapters/claude.js",
        "content/adapters/gemini.js",
        "content/bootstrap.js"
      ],
      "css": ["styles/injected.css"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_title": "AI Chat Speed Booster"
  },
  "icons": {
    "16": "icons/16.png",
    "48": "icons/48.png",
    "128": "icons/128.png"
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "ai-chat-speed-booster@xaron",
      "strict_min_version": "115.0"
    }
  }
}
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "ai-chat-speed-booster",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test test/*.test.mjs",
    "lint": "web-ext lint --self-hosted"
  }
}
```

- [ ] **Step 3: Write `.gitignore`**

```
node_modules/
web-ext-artifacts/
.DS_Store
*.zip
*.xpi
```

- [ ] **Step 4: Write `PRIVACY.md`**

```markdown
# Privacy Policy — AI Chat Speed Booster

This extension does not collect, store, or transmit any user data.

- All settings (toggle, threshold) are stored locally in your browser via `chrome.storage`.
- Per-tab statistics (number of messages virtualized or collapsed) are stored locally and discarded when the tab closes.
- The user's avatar URL and display name shown in the popup are read from the page you are already visiting and kept locally; the extension never re-fetches them.
- The extension makes zero outbound network requests.
- The extension requests only the `storage` and `activeTab` permissions, plus host access to `chatgpt.com`, `chat.openai.com`, `claude.ai`, and `gemini.google.com`.

Contact: xaron98@gmail.com
```

- [ ] **Step 5: Write `README.md`**

```markdown
# AI Chat Speed Booster

Fix lag and freezing in long ChatGPT, Claude, and Gemini conversations. Free and 100% local.

## How it works

The extension applies CSS `content-visibility: auto` to messages outside the viewport so the browser can skip their layout and paint. Once a chat exceeds your threshold (Auto by default), older messages are folded into a `<details>` element you can re-open at any time.

## Install (development)

### Firefox
1. Visit `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on" and pick `manifest.json`.

### Chrome / Edge
1. Visit `chrome://extensions`.
2. Enable Developer mode.
3. Click "Load unpacked" and pick the project folder.

## Tests

```bash
npm test
```

## Privacy

See [PRIVACY.md](./PRIVACY.md). Zero data collection.
```

- [ ] **Step 6: Create empty CSS and icons placeholder**

Create `/Users/xaron/Desktop/ai-chat-speed-booster/styles/injected.css` with the contents:
```
/* populated in Task 6 */
```

Create `/Users/xaron/Desktop/ai-chat-speed-booster/icons/.gitkeep` with empty contents (real PNGs ship later as part of store assets).

- [ ] **Step 7: Verify the manifest parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('/Users/xaron/Desktop/ai-chat-speed-booster/manifest.json','utf8'))" && echo OK`
Expected output: `OK`

- [ ] **Step 8: Commit**

```bash
cd /Users/xaron/Desktop/ai-chat-speed-booster
git add manifest.json package.json .gitignore PRIVACY.md README.md styles/injected.css icons/.gitkeep
git commit -m "chore: scaffold MV3 extension (manifest, privacy, readme)"
```

---

## Task 2: Test harness

**Goal:** A small loader that runs an `ACSB` IIFE source file inside Node's `vm` and returns the populated `ACSB` object. This is what every test file uses.

**Files:**
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/test/_load.mjs`

- [ ] **Step 1: Write the loader**

```javascript
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

export function loadACSB(...relativePaths) {
  const sandbox = { globalThis: {}, console };
  sandbox.globalThis.globalThis = sandbox.globalThis;
  const ctx = createContext(sandbox);
  for (const rel of relativePaths) {
    const src = readFileSync(resolve(repoRoot, rel), 'utf8');
    runInContext(src, ctx, { filename: rel });
  }
  return sandbox.globalThis.ACSB || {};
}
```

- [ ] **Step 2: Smoke-check the loader compiles**

Run: `node --check /Users/xaron/Desktop/ai-chat-speed-booster/test/_load.mjs && echo OK`
Expected output: `OK`

- [ ] **Step 3: Commit**

```bash
cd /Users/xaron/Desktop/ai-chat-speed-booster
git add test/_load.mjs
git commit -m "test: add vm-based loader for ACSB sources"
```

---

## Task 3: Pure logic — Perf decision (TDD)

**Files:**
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/content/core/perf.js`
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/test/perf.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `test/perf.test.mjs`:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadACSB } from './_load.mjs';

const ACSB = loadACSB('content/core/perf.js');
const { decideThreshold } = ACSB.perf;

const STEPS = [30, 50, 100, 200];

test('drops one step when jank ratio > 25%', () => {
  assert.equal(decideThreshold({ jankRatio: 0.4, currentThreshold: 200, sustainedLowJankSeconds: 0 }), 100);
  assert.equal(decideThreshold({ jankRatio: 0.4, currentThreshold: 100, sustainedLowJankSeconds: 0 }), 50);
  assert.equal(decideThreshold({ jankRatio: 0.4, currentThreshold: 50,  sustainedLowJankSeconds: 0 }), 30);
});

test('clamps at the lowest step', () => {
  assert.equal(decideThreshold({ jankRatio: 0.9, currentThreshold: 30, sustainedLowJankSeconds: 0 }), 30);
});

test('holds in the 5%-25% band', () => {
  for (const t of STEPS) {
    assert.equal(decideThreshold({ jankRatio: 0.1, currentThreshold: t, sustainedLowJankSeconds: 0 }), t);
    assert.equal(decideThreshold({ jankRatio: 0.05, currentThreshold: t, sustainedLowJankSeconds: 0 }), t);
  }
});

test('raises one step when jank < 5% sustained 30s', () => {
  assert.equal(decideThreshold({ jankRatio: 0.0, currentThreshold: 30,  sustainedLowJankSeconds: 30 }), 50);
  assert.equal(decideThreshold({ jankRatio: 0.0, currentThreshold: 50,  sustainedLowJankSeconds: 30 }), 100);
  assert.equal(decideThreshold({ jankRatio: 0.0, currentThreshold: 100, sustainedLowJankSeconds: 30 }), 200);
});

test('does not raise without 30s sustained', () => {
  assert.equal(decideThreshold({ jankRatio: 0.0, currentThreshold: 50, sustainedLowJankSeconds: 29 }), 50);
});

test('clamps at the highest step', () => {
  assert.equal(decideThreshold({ jankRatio: 0.0, currentThreshold: 200, sustainedLowJankSeconds: 60 }), 200);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/xaron/Desktop/ai-chat-speed-booster && node --test test/perf.test.mjs`
Expected: All tests fail because `content/core/perf.js` does not exist or `decideThreshold` is undefined.

- [ ] **Step 3: Implement `content/core/perf.js`**

```javascript
(function (root) {
  var STEPS = [30, 50, 100, 200];

  function clampIndex(i) {
    if (i < 0) return 0;
    if (i > STEPS.length - 1) return STEPS.length - 1;
    return i;
  }

  function decideThreshold(state) {
    var jank = state.jankRatio;
    var current = state.currentThreshold;
    var sustained = state.sustainedLowJankSeconds || 0;
    var idx = STEPS.indexOf(current);
    if (idx < 0) idx = 1; // unknown → assume 50

    if (jank > 0.25) {
      return STEPS[clampIndex(idx - 1)];
    }
    if (jank < 0.05 && sustained >= 30) {
      return STEPS[clampIndex(idx + 1)];
    }
    return STEPS[idx];
  }

  root.ACSB = root.ACSB || {};
  root.ACSB.perf = {
    STEPS: STEPS,
    decideThreshold: decideThreshold
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/xaron/Desktop/ai-chat-speed-booster && node --test test/perf.test.mjs`
Expected: All 6 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/xaron/Desktop/ai-chat-speed-booster
git add content/core/perf.js test/perf.test.mjs
git commit -m "feat(core): add perf threshold decision rule"
```

---

## Task 4: Pure logic — Collapser split (TDD)

**Files:**
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/content/core/collapser.js`
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/test/collapser.test.mjs`

The collapser has two halves: a pure function `computeSplit` (this task) and DOM glue `applySplit` (Task 9). We TDD the pure half here.

- [ ] **Step 1: Write the failing test**

Create `test/collapser.test.mjs`:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadACSB } from './_load.mjs';

const ACSB = loadACSB('content/core/collapser.js');
const { computeSplit } = ACSB.collapser;

test('no split below threshold', () => {
  assert.deepEqual(computeSplit({ messageCount: 10, threshold: 50 }), { collapseCount: 0, keepCount: 10 });
  assert.deepEqual(computeSplit({ messageCount: 50, threshold: 50 }), { collapseCount: 0, keepCount: 50 });
});

test('collapses overflow above threshold', () => {
  assert.deepEqual(computeSplit({ messageCount: 73,  threshold: 50 }), { collapseCount: 23, keepCount: 50 });
  assert.deepEqual(computeSplit({ messageCount: 200, threshold: 30 }), { collapseCount: 170, keepCount: 30 });
});

test('null threshold disables collapse', () => {
  assert.deepEqual(computeSplit({ messageCount: 500, threshold: null }), { collapseCount: 0, keepCount: 500 });
});

test('handles zero and negative defensively', () => {
  assert.deepEqual(computeSplit({ messageCount: 0,  threshold: 50 }), { collapseCount: 0, keepCount: 0 });
  assert.deepEqual(computeSplit({ messageCount: -5, threshold: 50 }), { collapseCount: 0, keepCount: 0 });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/xaron/Desktop/ai-chat-speed-booster && node --test test/collapser.test.mjs`
Expected: tests fail (`computeSplit` not defined).

- [ ] **Step 3: Implement minimal `content/core/collapser.js`**

```javascript
(function (root) {
  function computeSplit(state) {
    var n = state.messageCount;
    var t = state.threshold;
    if (typeof n !== 'number' || n <= 0) return { collapseCount: 0, keepCount: 0 };
    if (t == null) return { collapseCount: 0, keepCount: n };
    if (n <= t) return { collapseCount: 0, keepCount: n };
    return { collapseCount: n - t, keepCount: t };
  }

  // DOM glue is added in Task 9 below applySplit / unwrapAll.

  root.ACSB = root.ACSB || {};
  root.ACSB.collapser = {
    computeSplit: computeSplit
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/xaron/Desktop/ai-chat-speed-booster && node --test test/collapser.test.mjs`
Expected: All 4 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/xaron/Desktop/ai-chat-speed-booster
git add content/core/collapser.js test/collapser.test.mjs
git commit -m "feat(core): add collapser split math"
```

---

## Task 5: Pure logic — Settings schema (TDD)

**Files:**
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/content/core/storage.js`
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/test/storage.test.mjs`

`storage.js` exposes both pure validation (testable) and `chrome.storage` glue (manual). This task ships only the pure part; glue extends it in Task 6.

- [ ] **Step 1: Write the failing test**

Create `test/storage.test.mjs`:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadACSB } from './_load.mjs';

const ACSB = loadACSB('content/core/storage.js');
const { defaultSettings, validateSettings } = ACSB.storage;

test('default settings are enabled and Auto', () => {
  assert.deepEqual(defaultSettings(), { enabled: true, threshold: 'auto' });
});

test('valid settings pass through unchanged', () => {
  assert.deepEqual(validateSettings({ enabled: false, threshold: 100 }), { enabled: false, threshold: 100 });
  assert.deepEqual(validateSettings({ enabled: true,  threshold: 'auto' }), { enabled: true, threshold: 'auto' });
});

test('invalid threshold falls back to auto', () => {
  assert.equal(validateSettings({ enabled: true, threshold: 42 }).threshold, 'auto');
  assert.equal(validateSettings({ enabled: true, threshold: 'tons' }).threshold, 'auto');
  assert.equal(validateSettings({ enabled: true, threshold: null }).threshold, 'auto');
});

test('non-boolean enabled falls back to true', () => {
  assert.equal(validateSettings({ enabled: 'yes', threshold: 50 }).enabled, true);
  assert.equal(validateSettings({ enabled: undefined, threshold: 50 }).enabled, true);
});

test('completely missing settings yields defaults', () => {
  assert.deepEqual(validateSettings(undefined), defaultSettings());
  assert.deepEqual(validateSettings(null), defaultSettings());
  assert.deepEqual(validateSettings({}), defaultSettings());
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd /Users/xaron/Desktop/ai-chat-speed-booster && node --test test/storage.test.mjs`
Expected: failures (storage.js missing or empty).

- [ ] **Step 3: Implement minimal `content/core/storage.js`**

```javascript
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd /Users/xaron/Desktop/ai-chat-speed-booster && node --test test/storage.test.mjs`
Expected: All 5 tests pass.

- [ ] **Step 5: Run the full suite**

Run: `cd /Users/xaron/Desktop/ai-chat-speed-booster && npm test`
Expected: 15 tests pass across 3 files.

- [ ] **Step 6: Commit**

```bash
cd /Users/xaron/Desktop/ai-chat-speed-booster
git add content/core/storage.js test/storage.test.mjs
git commit -m "feat(core): add settings validation + defaults"
```

---

## Task 6: Storage glue + injected CSS

**Goal:** Add `chrome.storage` accessors to `storage.js` and write the CSS that the optimizer/collapser will rely on.

**Files:**
- Modify: `/Users/xaron/Desktop/ai-chat-speed-booster/content/core/storage.js`
- Modify: `/Users/xaron/Desktop/ai-chat-speed-booster/styles/injected.css`

- [ ] **Step 1: Extend `content/core/storage.js`**

Replace the file contents with:

```javascript
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
```

- [ ] **Step 2: Re-run the storage test (validation should still pass)**

Run: `cd /Users/xaron/Desktop/ai-chat-speed-booster && node --test test/storage.test.mjs`
Expected: All 5 tests still pass; the new `chrome.storage` glue is untouched by these tests because they only call pure functions.

- [ ] **Step 3: Write `styles/injected.css`**

Replace the file contents with:

```css
.acsb-msg {
  content-visibility: auto;
  contain-intrinsic-size: 0 600px;
}

details.acsb-collapsed {
  margin: 8px 0;
  padding: 4px 0;
  border-top: 1px dashed rgba(127, 127, 127, 0.3);
  border-bottom: 1px dashed rgba(127, 127, 127, 0.3);
}

details.acsb-collapsed > summary {
  cursor: pointer;
  user-select: none;
  padding: 6px 12px;
  font-size: 13px;
  opacity: 0.7;
  list-style: none;
}

details.acsb-collapsed > summary::before {
  content: "▸ ";
  display: inline-block;
  width: 1em;
}

details.acsb-collapsed[open] > summary::before { content: "▾ "; }
```

- [ ] **Step 4: Commit**

```bash
cd /Users/xaron/Desktop/ai-chat-speed-booster
git add content/core/storage.js styles/injected.css
git commit -m "feat(core): chrome.storage glue + injected CSS rules"
```

---

## Task 7: Optimizer

**Goal:** Add a function that ensures every message in a list carries the `.acsb-msg` class, and a reverse function for the toggle-OFF path.

**Files:**
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/content/core/optimizer.js`

- [ ] **Step 1: Write `content/core/optimizer.js`**

```javascript
(function (root) {
  var CLS = 'acsb-msg';

  function virtualize(messages) {
    if (!messages) return 0;
    var added = 0;
    for (var i = 0; i < messages.length; i++) {
      var el = messages[i];
      if (el && el.classList && !el.classList.contains(CLS)) {
        el.classList.add(CLS);
        added++;
      }
    }
    return added;
  }

  function devirtualizeAll(rootEl) {
    var doc = rootEl || (typeof document !== 'undefined' ? document : null);
    if (!doc) return 0;
    var els = doc.querySelectorAll('.' + CLS);
    for (var i = 0; i < els.length; i++) els[i].classList.remove(CLS);
    return els.length;
  }

  function countVirtualized(rootEl) {
    var doc = rootEl || (typeof document !== 'undefined' ? document : null);
    if (!doc) return 0;
    return doc.querySelectorAll('.' + CLS).length;
  }

  root.ACSB = root.ACSB || {};
  root.ACSB.optimizer = {
    CLASS: CLS,
    virtualize: virtualize,
    devirtualizeAll: devirtualizeAll,
    countVirtualized: countVirtualized
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 2: Smoke-check the file parses**

Run: `node --check /Users/xaron/Desktop/ai-chat-speed-booster/content/core/optimizer.js && echo OK`
Expected output: `OK`

- [ ] **Step 3: Commit**

```bash
cd /Users/xaron/Desktop/ai-chat-speed-booster
git add content/core/optimizer.js
git commit -m "feat(core): optimizer applies content-visibility class"
```

---

## Task 8: MutationObserver wrapper

**Files:**
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/content/core/observer.js`

- [ ] **Step 1: Write `content/core/observer.js`**

```javascript
(function (root) {
  function debounce(fn, ms) {
    var t = null;
    return function () {
      if (t) clearTimeout(t);
      t = setTimeout(function () { t = null; fn(); }, ms);
    };
  }

  function watch(targetEl, onChange) {
    if (!targetEl || typeof MutationObserver === 'undefined') {
      return { disconnect: function () {} };
    }
    var trigger = debounce(onChange, 100);
    var mo = new MutationObserver(function () { trigger(); });
    mo.observe(targetEl, { childList: true, subtree: true });
    return { disconnect: function () { mo.disconnect(); } };
  }

  root.ACSB = root.ACSB || {};
  root.ACSB.observer = { watch: watch, _debounce: debounce };
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 2: Smoke-check the file parses**

Run: `node --check /Users/xaron/Desktop/ai-chat-speed-booster/content/core/observer.js && echo OK`
Expected output: `OK`

- [ ] **Step 3: Commit**

```bash
cd /Users/xaron/Desktop/ai-chat-speed-booster
git add content/core/observer.js
git commit -m "feat(core): debounced MutationObserver wrapper"
```

---

## Task 9: Collapser DOM glue

**Goal:** Implement `applySplit(container, messages, threshold)` and `unwrapAll(container)` on top of the pure `computeSplit` already shipped.

**Files:**
- Modify: `/Users/xaron/Desktop/ai-chat-speed-booster/content/core/collapser.js`

- [ ] **Step 1: Extend `content/core/collapser.js`**

Replace the file contents with:

```javascript
(function (root) {
  var WRAP_CLS = 'acsb-collapsed';

  function computeSplit(state) {
    var n = state.messageCount;
    var t = state.threshold;
    if (typeof n !== 'number' || n <= 0) return { collapseCount: 0, keepCount: 0 };
    if (t == null) return { collapseCount: 0, keepCount: n };
    if (n <= t) return { collapseCount: 0, keepCount: n };
    return { collapseCount: n - t, keepCount: t };
  }

  function unwrapAll(container) {
    if (!container) return 0;
    var wrappers = container.querySelectorAll('details.' + WRAP_CLS);
    var count = 0;
    for (var i = 0; i < wrappers.length; i++) {
      var w = wrappers[i];
      var summary = w.querySelector('summary');
      while (w.firstChild) {
        if (w.firstChild === summary) { w.removeChild(summary); continue; }
        w.parentNode.insertBefore(w.firstChild, w);
      }
      w.parentNode.removeChild(w);
      count++;
    }
    return count;
  }

  function applySplit(container, messages, threshold) {
    if (!container) return { collapseCount: 0, keepCount: 0 };
    unwrapAll(container);
    var split = computeSplit({ messageCount: messages.length, threshold: threshold });
    if (split.collapseCount === 0) return split;

    var doc = container.ownerDocument || document;
    var wrap = doc.createElement('details');
    wrap.className = WRAP_CLS;
    var summary = doc.createElement('summary');
    summary.textContent = 'Show ' + split.collapseCount + ' older messages';
    wrap.appendChild(summary);

    var first = messages[0];
    if (!first || !first.parentNode) return split;
    first.parentNode.insertBefore(wrap, first);
    for (var i = 0; i < split.collapseCount; i++) {
      wrap.appendChild(messages[i]);
    }
    return split;
  }

  function countCollapsed(container) {
    if (!container) return 0;
    var wrappers = container.querySelectorAll('details.' + WRAP_CLS);
    var total = 0;
    for (var i = 0; i < wrappers.length; i++) {
      total += wrappers[i].children.length - 1; // minus the summary
    }
    return total;
  }

  root.ACSB = root.ACSB || {};
  root.ACSB.collapser = {
    WRAP_CLASS: WRAP_CLS,
    computeSplit: computeSplit,
    applySplit: applySplit,
    unwrapAll: unwrapAll,
    countCollapsed: countCollapsed
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 2: Run the collapser test (pure logic still covered)**

Run: `cd /Users/xaron/Desktop/ai-chat-speed-booster && node --test test/collapser.test.mjs`
Expected: All 4 tests pass; the new DOM helpers are not invoked.

- [ ] **Step 3: Commit**

```bash
cd /Users/xaron/Desktop/ai-chat-speed-booster
git add content/core/collapser.js
git commit -m "feat(core): collapser DOM glue (applySplit, unwrapAll)"
```

---

## Task 10: Profile extractor

**Files:**
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/content/core/profile.js`

- [ ] **Step 1: Write `content/core/profile.js`**

```javascript
(function (root) {
  function readImg(selector) {
    if (!selector || typeof document === 'undefined') return null;
    var img = document.querySelector(selector);
    if (!img || !img.src) return null;
    return { url: img.src, alt: img.alt || '' };
  }

  function readText(selector) {
    if (!selector || typeof document === 'undefined') return null;
    var el = document.querySelector(selector);
    if (!el) return null;
    var t = (el.textContent || '').trim();
    return t || null;
  }

  function extract(adapter) {
    if (!adapter) return null;
    var img = readImg(adapter.avatarSelector);
    var name = readText(adapter.nameSelector) || (img && img.alt) || null;
    if (!img && !name) return null;
    return {
      avatarUrl: img ? img.url : null,
      displayName: name
    };
  }

  root.ACSB = root.ACSB || {};
  root.ACSB.profile = { extract: extract };
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 2: Smoke-check the file parses**

Run: `node --check /Users/xaron/Desktop/ai-chat-speed-booster/content/core/profile.js && echo OK`
Expected output: `OK`

- [ ] **Step 3: Commit**

```bash
cd /Users/xaron/Desktop/ai-chat-speed-booster
git add content/core/profile.js
git commit -m "feat(core): profile extractor (avatar + name)"
```

---

## Task 11: Site adapters

Each adapter is a small object on `ACSB.adapters`. Selectors are best-effort and ordered most-stable first; bootstrap will iterate.

**Files:**
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/content/adapters/chatgpt.js`
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/content/adapters/claude.js`
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/content/adapters/gemini.js`

- [ ] **Step 1: Write `content/adapters/chatgpt.js`**

```javascript
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
```

- [ ] **Step 2: Write `content/adapters/claude.js`**

```javascript
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
```

- [ ] **Step 3: Write `content/adapters/gemini.js`**

```javascript
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
```

- [ ] **Step 4: Smoke-check all three parse**

Run: `for f in /Users/xaron/Desktop/ai-chat-speed-booster/content/adapters/*.js; do node --check "$f" || exit 1; done && echo OK`
Expected output: `OK`

- [ ] **Step 5: Commit**

```bash
cd /Users/xaron/Desktop/ai-chat-speed-booster
git add content/adapters/
git commit -m "feat(adapters): add ChatGPT, Claude, Gemini adapters"
```

---

## Task 12: Bootstrap (entry point)

**Goal:** Wire everything: pick adapter by host, find the container, attach observer, apply optimizer + collapser, run perf sampler when threshold is `auto`, broadcast stats.

**Files:**
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/content/bootstrap.js`

- [ ] **Step 1: Write `content/bootstrap.js`**

```javascript
(function (root) {
  var ACSB = root.ACSB || {};
  var doc = (typeof document !== 'undefined') ? document : null;
  if (!doc) return;

  var state = {
    adapter: null,
    container: null,
    observer: null,
    settings: ACSB.storage.defaultSettings(),
    autoThreshold: 50,
    perf: { jankFrames: 0, totalFrames: 0, sustainedLowJankSeconds: 0, lastSampleStart: 0 },
    stats: { virtualized: 0, collapsed: 0 }
  };

  function pickAdapter() {
    var host = location.hostname;
    var all = ACSB.adapters || {};
    for (var k in all) {
      var a = all[k];
      if (a.hosts.indexOf(host) >= 0) return a;
    }
    return null;
  }

  function querySelectors(selectors) {
    for (var i = 0; i < selectors.length; i++) {
      var el = doc.querySelector(selectors[i]);
      if (el) return el;
    }
    return null;
  }

  function findContainer(adapter, deadlineMs, cb) {
    var startedAt = Date.now();
    function tick() {
      var el = querySelectors(adapter.containerSelectors);
      if (el) return cb(el);
      if (Date.now() - startedAt >= deadlineMs) return cb(null);
      setTimeout(tick, 250);
    }
    tick();
  }

  function findMessages(adapter, container) {
    if (!container) return [];
    for (var i = 0; i < adapter.messageSelectors.length; i++) {
      var nodes = container.querySelectorAll(adapter.messageSelectors[i]);
      if (nodes.length > 0) return Array.prototype.slice.call(nodes);
    }
    return [];
  }

  function activeThreshold() {
    return state.settings.threshold === 'auto' ? state.autoThreshold : state.settings.threshold;
  }

  function broadcast() {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'acsb:stats',
          host: location.hostname,
          stats: {
            virtualized: state.stats.virtualized,
            collapsed: state.stats.collapsed,
            currentAutoValue: state.autoThreshold,
            settings: state.settings
          }
        }, function () { void chrome.runtime.lastError; });
      }
    } catch (_) {}
  }

  function runOnce() {
    if (!state.container) return;
    var msgs = findMessages(state.adapter, state.container);
    if (state.settings.enabled) {
      ACSB.optimizer.virtualize(msgs);
      ACSB.collapser.applySplit(state.container, msgs, activeThreshold());
    } else {
      ACSB.optimizer.devirtualizeAll(state.container);
      ACSB.collapser.unwrapAll(state.container);
    }
    state.stats.virtualized = ACSB.optimizer.countVirtualized(state.container);
    state.stats.collapsed = ACSB.collapser.countCollapsed(state.container);
    broadcast();
  }

  function startPerfSampler(durationMs) {
    if (state.settings.threshold !== 'auto') return;
    var start = performance.now();
    var lastFrame = start;
    state.perf.jankFrames = 0;
    state.perf.totalFrames = 0;

    function frame(t) {
      var delta = t - lastFrame;
      lastFrame = t;
      if (delta > 50) state.perf.jankFrames++;
      state.perf.totalFrames++;
      if (t - start < durationMs) {
        requestAnimationFrame(frame);
      } else {
        var ratio = state.perf.totalFrames ? state.perf.jankFrames / state.perf.totalFrames : 0;
        if (ratio < 0.05) state.perf.sustainedLowJankSeconds += Math.round(durationMs / 1000);
        else state.perf.sustainedLowJankSeconds = 0;
        state.autoThreshold = ACSB.perf.decideThreshold({
          jankRatio: ratio,
          currentThreshold: state.autoThreshold,
          sustainedLowJankSeconds: state.perf.sustainedLowJankSeconds
        });
        runOnce();
      }
    }
    requestAnimationFrame(frame);
  }

  function attachScrollSampling() {
    var scrollTimer = null;
    window.addEventListener('scroll', function () {
      if (scrollTimer) return;
      scrollTimer = setTimeout(function () {
        scrollTimer = null;
        if (state.settings.threshold === 'auto') startPerfSampler(2000);
      }, 250);
    }, { passive: true });
  }

  function applyProfile() {
    var p = ACSB.profile.extract(state.adapter);
    if (p) ACSB.storage.setProfile(location.hostname, p);
  }

  function start() {
    state.adapter = pickAdapter();
    if (!state.adapter) return;

    ACSB.storage.getSettings(function (s) {
      state.settings = s;
      findContainer(state.adapter, 3000, function (container) {
        if (!container) {
          console.warn('[ACSB] container not found for', state.adapter.id);
          return;
        }
        state.container = container;
        applyProfile();
        runOnce();
        startPerfSampler(2000);
        attachScrollSampling();
        state.observer = ACSB.observer.watch(container, runOnce);
      });
    });

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener(function (msg) {
        if (msg && msg.type === 'acsb:settings-changed') {
          state.settings = ACSB.storage.validateSettings(msg.settings);
          runOnce();
          if (state.settings.threshold === 'auto') startPerfSampler(2000);
        }
        if (msg && msg.type === 'acsb:request-stats') broadcast();
      });
    }
  }

  ACSB.bootstrap = { start: start, _state: state };
  if (doc.readyState === 'complete' || doc.readyState === 'interactive') {
    start();
  } else {
    doc.addEventListener('DOMContentLoaded', start);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

- [ ] **Step 2: Smoke-check the file parses**

Run: `node --check /Users/xaron/Desktop/ai-chat-speed-booster/content/bootstrap.js && echo OK`
Expected output: `OK`

- [ ] **Step 3: Commit**

```bash
cd /Users/xaron/Desktop/ai-chat-speed-booster
git add content/bootstrap.js
git commit -m "feat(content): bootstrap wires adapter + core engine"
```

---

## Task 13: Background script

**Goal:** Maintain a per-tab badge with the collapsed count and clean up tab-scoped storage when a tab closes.

**Files:**
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/background.js`

- [ ] **Step 1: Write `background.js`**

```javascript
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
```

- [ ] **Step 2: Smoke-check the file parses**

Run: `node --check /Users/xaron/Desktop/ai-chat-speed-booster/background.js && echo OK`
Expected output: `OK`

- [ ] **Step 3: Commit**

```bash
cd /Users/xaron/Desktop/ai-chat-speed-booster
git add background.js
git commit -m "feat(background): per-tab badge + storage cleanup"
```

---

## Task 14: Popup HTML + CSS

**Files:**
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/popup/popup.html`
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/popup/popup.css`

- [ ] **Step 1: Write `popup/popup.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>AI Chat Speed Booster</title>
  <link rel="stylesheet" href="popup.css" />
</head>
<body>
  <header class="acsb-header">
    <span class="acsb-bolt" aria-hidden="true">⚡</span>
    <h1>AI Chat Speed Booster</h1>
  </header>

  <section class="acsb-profile">
    <img id="acsb-avatar" alt="" />
    <div class="acsb-profile-text">
      <div id="acsb-name">—</div>
      <div id="acsb-host" class="acsb-muted">Open ChatGPT, Claude or Gemini to use</div>
    </div>
    <label class="acsb-toggle">
      <input type="checkbox" id="acsb-enabled" />
      <span class="acsb-track"><span class="acsb-thumb"></span></span>
    </label>
  </section>

  <hr />

  <section class="acsb-threshold">
    <h2>Collapse messages after</h2>
    <div id="acsb-radios" class="acsb-radios">
      <label><input type="radio" name="t" value="auto" /> <span>Auto (<em id="acsb-auto-current">—</em>)</span></label>
      <label><input type="radio" name="t" value="30" /> <span>30</span></label>
      <label><input type="radio" name="t" value="50" /> <span>50</span></label>
      <label><input type="radio" name="t" value="100" /> <span>100</span></label>
      <label><input type="radio" name="t" value="200" /> <span>200</span></label>
    </div>
  </section>

  <hr />

  <section class="acsb-stats">
    <div>👁️ Virtualized: <strong id="acsb-virt">0</strong> messages</div>
    <div>📦 Collapsed: <strong id="acsb-coll">0</strong> messages</div>
    <div>💾 Status: <strong id="acsb-status">Inactive</strong></div>
  </section>

  <hr />

  <section class="acsb-pro">
    <h2>🔒 PRO features (coming soon)</h2>
    <ul>
      <li>Stats dashboard</li>
      <li>Export chats</li>
      <li>More AI sites</li>
    </ul>
  </section>

  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `popup/popup.css`**

```css
:root {
  color-scheme: light dark;
  --bg: #ffffff;
  --fg: #1a1a1a;
  --muted: #6b6b6b;
  --accent: #5b4bff;
  --hr: rgba(127,127,127,0.2);
}
@media (prefers-color-scheme: dark) {
  :root { --bg: #1a1a1d; --fg: #f0f0f0; --muted: #9b9b9b; --hr: rgba(255,255,255,0.1); }
}
* { box-sizing: border-box; }
body {
  width: 320px;
  margin: 0;
  padding: 14px 16px;
  font: 13px/1.4 system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--fg);
}
h1 { font-size: 14px; font-weight: 600; margin: 0; }
h2 { font-size: 12px; font-weight: 600; margin: 0 0 8px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
hr { border: none; border-top: 1px solid var(--hr); margin: 12px 0; }
.acsb-muted { color: var(--muted); font-size: 12px; }

.acsb-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.acsb-bolt { font-size: 18px; }

.acsb-profile { display: flex; align-items: center; gap: 10px; }
.acsb-profile img { width: 36px; height: 36px; border-radius: 50%; background: var(--hr); object-fit: cover; }
.acsb-profile-text { flex: 1; min-width: 0; }
.acsb-profile-text > div:first-child { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.acsb-toggle input { display: none; }
.acsb-track { display: inline-block; width: 36px; height: 20px; background: var(--hr); border-radius: 10px; position: relative; transition: background 0.15s; }
.acsb-thumb { display: block; width: 16px; height: 16px; background: white; border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: left 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
.acsb-toggle input:checked + .acsb-track { background: var(--accent); }
.acsb-toggle input:checked + .acsb-track .acsb-thumb { left: 18px; }

.acsb-radios { display: flex; flex-wrap: wrap; gap: 6px 12px; }
.acsb-radios label { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; }

.acsb-stats > div { margin-bottom: 4px; }
.acsb-stats strong { font-variant-numeric: tabular-nums; }

.acsb-pro ul { margin: 0; padding-left: 18px; color: var(--muted); }
.acsb-pro { opacity: 0.7; }
```

- [ ] **Step 3: Commit**

```bash
cd /Users/xaron/Desktop/ai-chat-speed-booster
git add popup/popup.html popup/popup.css
git commit -m "feat(popup): markup + styles"
```

---

## Task 15: Popup behavior

**Files:**
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/popup/popup.js`

- [ ] **Step 1: Write `popup/popup.js`**

```javascript
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

  function renderProfile(profile, host) {
    if (profile && profile.avatarUrl) {
      $avatar.src = profile.avatarUrl;
      $avatar.alt = profile.displayName || '';
    } else {
      $avatar.removeAttribute('src');
      $avatar.alt = '';
    }
    $name.textContent = (profile && profile.displayName) || (host ? '' : '—');
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

        $enabled.addEventListener('change', function () {
          settings.enabled = $enabled.checked;
          saveSettings(settings, function () {
            notifyContent(tab.id, settings);
            renderStats({ virtualized: 0, collapsed: 0 }, settings);
          });
        });

        var inputs = $radios.querySelectorAll('input[type="radio"]');
        for (var i = 0; i < inputs.length; i++) {
          inputs[i].addEventListener('change', function () {
            settings.threshold = readRadio();
            saveSettings(settings, function () { notifyContent(tab.id, settings); });
            $autoCurrent.textContent = settings.threshold === 'auto' ? ('currently: 50') : '—';
          });
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
```

- [ ] **Step 2: Smoke-check the file parses**

Run: `node --check /Users/xaron/Desktop/ai-chat-speed-booster/popup/popup.js && echo OK`
Expected output: `OK`

- [ ] **Step 3: Commit**

```bash
cd /Users/xaron/Desktop/ai-chat-speed-booster
git add popup/popup.js
git commit -m "feat(popup): wire settings, stats, profile rendering"
```

---

## Task 16: Mock chat fixture

**Goal:** A standalone HTML page with 300 fake messages styled like ChatGPT, used for manual perf measurement and quick smoke tests of the optimizer/collapser.

**Files:**
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/test/mock-chat.html`

- [ ] **Step 1: Write `test/mock-chat.html`**

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>ACSB mock chat</title>
  <style>
    body { font: 14px system-ui, sans-serif; max-width: 720px; margin: 0 auto; padding: 16px; }
    main [data-testid="conversation-turns"] { display: flex; flex-direction: column; gap: 12px; }
    [data-message-author-role] { padding: 12px 14px; border-radius: 8px; background: #f4f4f7; }
    [data-message-author-role="user"] { background: #e8e6ff; align-self: flex-end; max-width: 80%; }
    [data-message-author-role="assistant"] { background: #f4f4f7; }
  </style>
  <link rel="stylesheet" href="../styles/injected.css" />
</head>
<body>
  <h2>Mock chat (300 messages)</h2>
  <p>Open DevTools → Performance, record a scroll, compare with/without the <code>acsb-msg</code> class.</p>
  <main>
    <div data-testid="conversation-turns" id="turns"></div>
  </main>
  <script>
    var turns = document.getElementById('turns');
    var lorem = 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ';
    for (var i = 0; i < 300; i++) {
      var d = document.createElement('div');
      d.setAttribute('data-message-author-role', i % 2 === 0 ? 'user' : 'assistant');
      d.setAttribute('data-testid', 'conversation-turn-' + i);
      d.textContent = '#' + (i + 1) + ' ' + lorem.repeat(2 + (i % 5));
      turns.appendChild(d);
    }
  </script>
</body>
</html>
```

- [ ] **Step 2: Sanity-open the file (manual)**

Run: `open /Users/xaron/Desktop/ai-chat-speed-booster/test/mock-chat.html`
Expected: A page with 300 alternating message bubbles renders.

- [ ] **Step 3: Commit**

```bash
cd /Users/xaron/Desktop/ai-chat-speed-booster
git add test/mock-chat.html
git commit -m "test: add 300-message mock chat fixture"
```

---

## Task 17: Manual QA checklist + final integration commit

**Files:**
- Create: `/Users/xaron/Desktop/ai-chat-speed-booster/MANUAL_QA.md`

- [ ] **Step 1: Run the full automated suite**

Run: `cd /Users/xaron/Desktop/ai-chat-speed-booster && npm test`
Expected: 15 tests pass across `perf.test.mjs` (6), `collapser.test.mjs` (4), `storage.test.mjs` (5).

- [ ] **Step 2: Run `web-ext lint`**

Run (only if `web-ext` is installed globally; otherwise skip with a note):
```
cd /Users/xaron/Desktop/ai-chat-speed-booster && npx --yes web-ext lint --self-hosted
```
Expected: zero errors. Warnings about missing icons are acceptable until Task 18 / store assets.

- [ ] **Step 3: Write `MANUAL_QA.md`**

```markdown
# Manual QA Checklist

Run this before publishing each release. The automated tests cover pure logic only — DOM behavior must be checked by hand.

## Setup
- Firefox: `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → pick `manifest.json`.
- Chrome: `chrome://extensions` → Developer mode → Load unpacked → pick the project folder.

## Per-site pass (repeat on chatgpt.com, claude.ai, gemini.google.com)

1. Open a long conversation (>50 messages). If you don't have one, prompt the model: "Reply with 100 short numbered messages, one per turn."
2. Inspect a message in DevTools → confirm class `acsb-msg` is present.
3. Confirm a `<details class="acsb-collapsed">` wraps the oldest messages once the threshold is exceeded.
4. Click the popup icon → confirm:
   - Profile photo and display name show.
   - Active host line reads `Active on <host>`.
   - Toggle is ON.
   - Auto radio is selected with a "currently: NN" label.
   - Virtualized and Collapsed counters are non-zero.
5. Toggle OFF → all messages lose `acsb-msg` and the `<details>` is unwrapped without reload.
6. Toggle back ON → the optimizations re-apply within 200 ms.
7. Switch to a manual threshold (e.g., 30) → collapser re-runs and folds more messages.
8. Switch to Auto → after fast-scrolling for ~2 s the threshold may step down; verify in the popup.
9. Open a tab on a non-supported site → popup body changes to "Open ChatGPT, Claude or Gemini to use" and controls are disabled.
10. Close the chat tab → in DevTools → Application → Storage, confirm `tab_<id>` is removed (background cleanup).

## Cross-browser
- Repeat the per-site pass on Firefox AND Chrome.

## Selector regression
If a site fails step 2, the selectors in `content/adapters/<site>.js` are out of date. Update them, bump version, and re-run.
```

- [ ] **Step 4: Commit the QA doc and tag v1**

```bash
cd /Users/xaron/Desktop/ai-chat-speed-booster
git add MANUAL_QA.md
git commit -m "docs: manual QA checklist for releases"
git tag v1.0.0
```

- [ ] **Step 5: Verify the tree is clean and tag is in place**

Run: `cd /Users/xaron/Desktop/ai-chat-speed-booster && git status && git tag --list`
Expected: `working tree clean`, tag `v1.0.0` listed.

---

## Self-review summary

- **Spec coverage:** every section of the spec maps to at least one task — architecture (1, 11–13), engine (3, 4, 6, 7, 9), Auto mode (3, 12), popup (14, 15), profile (10, 12, 15), privacy (1), errors (12), testing (3–5, 16, 17), build/ship (1, 17). No gaps.
- **Type/name consistency:** `decideThreshold`, `computeSplit`, `applySplit`, `unwrapAll`, `virtualize`, `devirtualizeAll`, `countVirtualized`, `countCollapsed`, `validateSettings`, `defaultSettings`, `getSettings`, `setSettings`, `setTabStats`, `clearTabStats`, `setProfile`, `getProfile`, `extract`, message types `acsb:stats`, `acsb:settings-changed`, `acsb:request-stats`, storage keys `settings`, `tab_<id>`, `profile_<host>` — all consistent across tasks.
- **Placeholder scan:** no TBDs, every code step contains real code; selectors in adapters are noted as "best-effort" but actual values are present and the engineer can update them as part of Task 11 if a smoke test fails.
- **Scope:** single MV3 extension, one plan is the right granularity.

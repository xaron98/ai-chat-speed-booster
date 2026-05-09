# Changelog

## [1.1.7] - 2026-05-09

### Changed
- Manifest declares an explicit `gecko_android.strict_min_version: 142.0` so the AMO validator stops flagging the Android compat gap on `data_collection_permissions`. The desktop Firefox minimum stays at 140.0.

## [1.1.6] - 2026-05-09

### Changed
- Firefox `strict_min_version` raised from 115.0 to 140.0. This silences AMO validator warnings about `data_collection_permissions` (introduced in Firefox 140) and matches the actual minimum where the manifest's full feature set is honored.

## [1.1.5] - 2026-05-09

### Changed
- Icons: replaced the algorithmically-generated bolt with a hand-designed lightning bolt over a rounded purple square. Source PNG kept at `icons-source/bolt-source.png`; the five rendered sizes (16/32/48/96/128) come from `sips`-resizing the source.

### Fixed
- The popup display name no longer falls through to the avatar's generic `alt` text ("Profile image", "Avatar", "User"…). When the page exposes only a generic alt and no real name, the popup now leaves the name field empty instead of literally rendering "Profile image".

## [1.1.4] - 2026-05-09

### Fixed
- Export now captures the **complete** conversation, not just what's currently rendered. Before exporting, the extension scrolls the conversation to the top and waits for the message count to stabilize, forcing the host site to lazy-load any older messages. The original scroll position is restored after the export completes. Upper bound: ~12 s for very long chats.
- Popup status now reads "Loading older messages…" while the scroll-to-top runs, so the wait is intelligible.

## [1.1.3] - 2026-05-09

### Privacy
- The popup no longer renders remote avatar images. It computes initials from the user's display name (read locally) and shows them in a colored circle. This eliminates the only path that caused the user's browser to make a request from the extension origin to a third-party CDN, aligning the implementation with the "zero outbound network requests" claim in PRIVACY.md.

### Fixed
- `bootstrap` now upgrades the MutationObserver from container-wide `subtree:true` to a shallow observer on the messages parent the moment the first messages appear. Previously, if the chat was empty when bootstrap ran, the observer stayed in fallback mode forever.

### Docs
- PRIVACY.md tightened: spells out that no profile photos are stored, transmitted, or displayed; only initials.
- MANUAL_QA.md updated to remove the obsolete fast-scroll Auto-mode step and to add an Export verification step.

## [1.1.2] - 2026-05-09

### Fixed
- Eliminates Firefox's "this extension is slowing down the page" warning, which was caused by two remaining hot paths after 1.1.1:
  - `MutationObserver` was watching the conversation container with `subtree: true`, which forced the browser to track every descendant mutation during streaming. Now the bootstrap detects the actual immediate parent of the messages and observes that with `subtree: false`, so streaming text inside an existing message no longer fires events at all.
  - The scroll-based perf sampler was chaining 2 s `requestAnimationFrame` loops back-to-back during continuous scrolling. Removed entirely. Auto mode still samples once on page settle; the value persists until the user explicitly toggles or picks a manual threshold.

## [1.1.1] - 2026-05-09

### Fixed
- Performance: Firefox was reporting the extension was slowing pages down. Three fixes:
  - `runOnce` now early-exits when `(enabled, message count, threshold)` is unchanged, so MutationObserver bursts during streaming no longer re-walk the DOM.
  - `applySplit` no longer unwraps and re-wraps the `<details>` on every change. It detects the existing wrapper, computes the delta, and only appends/shrinks. Streaming now causes a single `appendChild` per new collapsed message.
  - `MutationObserver` debounce raised from 100 ms to 400 ms, reducing wake-ups during streaming responses.
- Performance: `findMessages` caches the winning selector after the first match so subsequent calls only run one `querySelectorAll`.
- ChatGPT avatar: switched to `nav img[alt="Profile image"]` (the live selector) so the popup actually shows your avatar instead of a placeholder circle.

## [1.1.0] - 2026-05-09

### Added
- Export chat: download the current conversation as Markdown, JSON, or plain text. Each export includes role labels (user/assistant), conversation host, and a UTC timestamp. Filenames follow `<host>-YYYY-MM-DD-HHMM.<ext>`.
- Manifest now declares 32 and 96 px icons in addition to 16/48/128, so toolbar rendering picks the closest match on every display density.

### Fixed
- `claude.ai` selectors: the previous `main`-based container selectors silently failed because Claude renders inside `#root` with a `[data-autoscroll-container]` scroll viewport. Counters now report correctly on Claude.
- Duplicate perf samplers: rapid Auto-toggle no longer leaks parallel `requestAnimationFrame` loops.

## [1.0.0] - 2026-05-08

Initial public release.

### Features
- `content-visibility: auto` applied to messages outside the viewport.
- Adaptive collapser folds older messages into a `<details>` once a per-user threshold is exceeded.
- Auto threshold mode that tunes itself from measured frame jank.
- Popup with toggle, threshold radios, profile photo, and live counters.
- Adapters for chatgpt.com, chat.openai.com, claude.ai, gemini.google.com.
- Cross-browser: Firefox 115+ and Chrome/Edge MV3.
- Zero data collection.

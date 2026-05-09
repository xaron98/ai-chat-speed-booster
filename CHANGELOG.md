# Changelog

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

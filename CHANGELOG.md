# Changelog

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

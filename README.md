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

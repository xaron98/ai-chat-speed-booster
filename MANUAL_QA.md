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

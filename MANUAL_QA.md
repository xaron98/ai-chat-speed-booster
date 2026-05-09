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
   - Avatar shows initials of the logged-in user (no remote image fetched).
   - Display name appears (or is empty if not extractable).
   - Active host line reads `Active on <host>`.
   - Toggle is ON.
   - Auto radio is selected with a "currently: NN" label.
   - Virtualized and Collapsed counters are non-zero.
5. Toggle OFF → all messages lose `acsb-msg` and the `<details>` is unwrapped without reload.
6. Toggle back ON → the optimizations re-apply within 200 ms.
7. Switch to a manual threshold (e.g., 30) → collapser re-runs and folds more messages.
8. Switch to Auto → the perf sampler runs for 2 s and decides a threshold; the popup shows `Auto (currently: NN)`. Auto only re-samples when the user re-enters Auto.
9. Export each format (Markdown / JSON / Plain text). Verify file lands in Downloads with `<host>-YYYY-MM-DD-HHMM.<ext>` and content covers all messages including those inside the collapser.
10. Open a tab on a non-supported site → popup body changes to "Open ChatGPT, Claude or Gemini to use" and controls are disabled.
11. Close the chat tab → in DevTools → Application → Storage, confirm `tab_<id>` is removed (background cleanup).

## Cross-browser
- Repeat the per-site pass on Firefox AND Chrome.

## Selector regression
If a site fails step 2, the selectors in `content/adapters/<site>.js` are out of date. Update them, bump version, and re-run.

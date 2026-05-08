# Store Listing — Copy & Submission Guide

Drop-in copy for AMO and Chrome Web Store. All text in English (you can translate later through the localized listings each store offers).

---

## AMO submission (addons.mozilla.org)

### Add-on name
```
AI Chat Speed Booster
```

### URL slug
```
ai-chat-speed-booster
```

### Summary (max 250 chars)
```
Fix lag and freezing in long ChatGPT, Claude, and Gemini chats. Older messages fold into a single block, and modern CSS skips the rendering of off-screen ones. 100% local, zero data collection.
```

### Description (full, supports HTML)
```
Long AI chats become unbearable: typing lags, scroll stutters, even tab switching feels slow. The cause is simple — the entire conversation is kept in the DOM, including hundreds of off-screen messages with code highlighting and rich content.

AI Chat Speed Booster fixes this with two complementary techniques:

• Browser-native virtualization: every message receives a CSS rule that lets the browser skip the layout and paint of anything outside the viewport.

• Adaptive collapser: once a chat exceeds your threshold, older messages fold into a single "Show N older messages" block. The DOM stays small, the page stays fast.

The default Auto mode measures frame timing and adjusts the threshold for you. You can also pick a fixed value (30, 50, 100, 200) from the popup.

EXTRA in v1.1: export any conversation to Markdown, JSON, or plain text with a single click.

WORKS ON
• ChatGPT (chatgpt.com and chat.openai.com)
• Claude (claude.ai)
• Gemini (gemini.google.com)

PRIVACY
• No analytics, no telemetry, no tracking.
• No outbound network requests of any kind.
• Settings live in your browser's local storage.
• Permissions limited to "storage" and "activeTab" plus host access to the four AI sites above.
• Open to audit: https://github.com/xaron98/ai-chat-speed-booster

WHO IT'S FOR
Heavy ChatGPT/Claude/Gemini users who run into lag in long technical discussions, code review sessions, or research threads.

FREE
This extension is free and stays free. The popup mentions future PRO features (stats dashboard, more AI sites, custom themes); the existing virtualizer, collapser, and exporter are part of the free tier and will remain so.
```

### Categories (pick up to 2)
```
1. Productivity
2. Other
```

### Tags (up to 10)
```
chatgpt, claude, gemini, performance, speed, lag, productivity, ai, chat, virtualization
```

### Support email
```
xaron98@gmail.com
```

### Support website / Homepage URL
```
https://github.com/xaron98/ai-chat-speed-booster
```

### Privacy Policy URL
```
https://raw.githubusercontent.com/xaron98/ai-chat-speed-booster/main/PRIVACY.md
```
*(Requires the GitHub repo to be public, OR upload PRIVACY.md to a gist and use that URL. Currently the repo is private — see "Repo visibility" note below.)*

### License (AMO requires explicitly choosing one)
```
MIT
```
*(If you don't have a LICENSE file in the repo, AMO will accept "All Rights Reserved" too — but MIT signals openness without obligating maintenance.)*

### Source code submission
AMO sometimes asks for the source code separately when the extension contains minified or transpiled JS. **This extension is plain unbundled JS**, so the submitted zip IS the source. If asked, attach the same zip again.

---

## Chrome Web Store submission (when you do it later)

### Item name (max 75 chars)
```
AI Chat Speed Booster
```

### Summary (max 132 chars)
```
Fix lag in long ChatGPT, Claude, and Gemini chats. Virtualizes off-screen messages and folds older ones. 100% local.
```

### Description (max 16,000 chars) — same as AMO description above

### Category
```
Productivity
```

### Language
```
English (Spanish, etc. — add later as locale)
```

---

## Repo visibility note

Your GitHub repo (`xaron98/ai-chat-speed-booster`) is **private**, but AMO needs a publicly reachable Privacy Policy URL.

Two options:

1. **Make the repo public** before submitting. Recommended for the trust signal — open audit, contributors possible.

2. **Keep it private + use a Gist for the privacy policy**:
   ```
   gh gist create PRIVACY.md --public --desc "AI Chat Speed Booster — Privacy Policy"
   ```
   Use the resulting URL.

Choose option 1 unless you have a specific reason to keep the code closed.

---

## Submission checklist (AMO)

- [ ] `npm test` passes (15 + 6 = 21 tests)
- [ ] `npm run build` produced `dist/ai-chat-speed-booster-1.1.0.zip`
- [ ] Have at least 1 screenshot at 1280x800 or 640x400 (popup + an active chat side by side recommended)
- [ ] Privacy policy reachable at a public URL
- [ ] Repo public OR PRIVACY.md hosted as a Gist
- [ ] AMO developer account set up at https://addons.mozilla.org/developers/
- [ ] Submitted via the "Submit a New Add-on" flow:
  1. Choose "On this site" (AMO-listed) — gets you discovery.
  2. Upload `dist/ai-chat-speed-booster-1.1.0.zip`.
  3. Wait for the automated validator (~30 seconds). Should pass with no errors. Warnings about icons or missing locale are fine.
  4. Fill in name, summary, description, categories, tags, support info.
  5. Submit for review.

Review typically takes 1-3 days for a first submission. Mozilla may ask for clarifications about permissions usage — the answer is "host_permissions cover only the 4 AI sites where the extension provides value; activeTab is for the popup to query the current tab; storage is for settings persistence". Pre-write that response.

---

## Screenshots (you'll take these)

Recommended 3:

1. **Popup with the toolbar visible**, showing the bolt icon and an open popup with non-zero counters on chatgpt.com.
2. **Side-by-side**: a long ChatGPT chat with the `<details>` "Show 73 older messages" block visible at the top of the conversation.
3. **Export action**: popup open, format dropdown showing options.

Take with browser zoom at 100%, no extensions clutter, and a real but non-sensitive conversation in the background. macOS: `Cmd+Shift+5` → Capture Selected Window. Crop to 1280x800 if needed (Preview app: Tools → Crop).

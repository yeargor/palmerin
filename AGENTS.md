Сервер всегда оставлять включенным, пока явно не попросят выключить.

# AGENTS.md

## Purpose
This file is the working protocol for coding agents in this project.
Keep changes aligned with current demo behavior and validate UI output before handoff.

## Project Snapshot
- Type: Telegram Mini App frontend demo (no backend).
- Screen model: single screen only.
- Layout:
  - Sticky top character block.
  - Scrollable battle log below.
- Style baseline:
  - Background: `#000000`
  - Main text: `#FFFFFF`
  - Accent: `#FE0F0E`
  - Monospace-only typography.
- ASCII sprite is rendered in `<pre>` with colored sword/shield parts.

## Current Functional Rules
- Log simulation interval: 10 seconds.
- Log messages: short plain words, no emoji/symbol-heavy text.
- Log list cap: maximum 5 entries.
- Only the newest log entry has an accent left border.
- Newest log text color is normal (not red).
- Auto-scroll to bottom on log updates.
- Demo profile selection by query/start params:
  - `startapp`
  - `start_param`
  - `profile`

## Key Files
- `index.html` - page structure and sprite markup.
- `styles.css` - all visual rules.
- `app.js` - state, rendering, timer simulation, log behavior.
- `scripts/preview-mobile.sh` - local preview for desktop + phone.
- `scripts/capture-mobile.mjs` - Playwright mobile screenshots.

## Install / Run
```bash
cd /home/yahor/telegram-miniapp-demo
npm install
```

Preview (keeps server in foreground):
```bash
npm run preview:mobile
```

Quick direct server (no helper script):
```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

## QA Workflow (Agent Self-Check)
1. Read changed files only and ensure scope is minimal.
2. Syntax check JS:
   ```bash
   node --check app.js
   ```
3. Start preview server:
   ```bash
   npm run preview:mobile
   ```
4. In another terminal, capture mobile snapshots:
   ```bash
   npm run capture:mobile
   ```
5. Confirm screenshots were updated in `artifacts/mobile/`.
6. Manually verify these behaviors:
   - Sticky top section stays fixed while log scrolls.
   - New events appear every 10 seconds.
   - Log count never exceeds 5.
   - Only latest log has red left border.
   - Older logs keep neutral styling.
   - Auto-scroll always lands at latest entry.
   - `?startapp=club` and `?startapp=ghost` both render correctly.
7. If behavior changed intentionally, update this file.

## Development Boundaries
- Keep project as frontend demo unless explicitly asked otherwise.
- Do not add backend auth/data assumptions without request.
- Preserve single-screen UX (no tabs/routes) unless requested.
- Keep modifications consistent with Telegram Mini App constraints (`tg.ready()`, `tg.expand()`).

## Handoff Notes
When reporting completion, include:
- Changed files list.
- What behavior changed.
- Exact URL(s) to test locally.
- Whether preview server is still running.

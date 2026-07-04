# DAY3 BLUEPRINT

App VJ show-control (Electron + React + TS) cho installation projection-mapped 6 ngày.
3 cửa sổ: **Operator Control Panel**, **Wall output** (10990×1080), **Floor output** (4096×4096). OSC :9000 + NDI (`Day3Wall`/`Day3Floor`).

Xem `PLAN.md` (ở `~/day3-blueprint/PLAN.md`) cho thiết kế đầy đủ theo phase.

## Chạy
```bash
npm install
npm run dev        # electron-vite dev (mở control window; wall/floor mở từ panel "04 · Đầu Ra")
npm run build      # bundle production
npm run typecheck  # kiểm tra type node + web
```

## Trạng thái phase
- [x] **P0 — Scaffold**: Electron 3 cửa sổ, ShowStore ở main, tick engine 200ms, IPC bridge, fit-to-viewport, design tokens. Control panel đã dựng gần đủ (seed cho P2).
- [ ] P1 design system (một phần đã có: tokens, useFitToViewport, useShowState)
- [ ] P2 control panel hi-fi hoàn thiện
- [ ] P3 OSC + NDI thật
- [ ] P4 Wall scenes (Blueprints / Drafting / Ascension)
- [ ] P5 Floor scenes (House Rises / Uploaded)
- [ ] P6 tích hợp show + multi-display
- [ ] P7 hardening 6 ngày

## Kiến trúc
- `src/main/` — process chính: `store.ts` (nguồn chân lý + reducer + tick), `windows.ts` (WindowManager đa màn hình), `index.ts` (nối store↔window↔IPC).
- `src/preload/` — `window.day3` qua contextBridge.
- `src/shared/types.ts` — state shape, Action, OSC vocabulary.
- `src/renderer/{control,wall,floor}/` — 3 view React; `renderer/shared/` hook + tokens dùng chung.

## Caveat cài Electron (macOS)
Nếu `npm run dev` báo `Electron uninstall` hoặc `Library not loaded: Electron Framework`, binary Electron chưa giải nén đủ. Sửa:
```bash
rm -rf node_modules/electron/dist node_modules/electron/path.txt
unzip -q ~/Library/Caches/electron/electron-v33.4.11-darwin-arm64.zip -d node_modules/electron/dist
printf 'Electron.app/Contents/MacOS/Electron' > node_modules/electron/path.txt
```
(hoặc `node node_modules/electron/install.js` khi có mạng.)

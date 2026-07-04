# DAY3 BLUEPRINT — Kế hoạch thiết kế & triển khai theo Phase

> Nguồn yêu cầu (source of truth): `design_handoff_day3_blueprint/` (README + 9 file `.dc.html` + `support.js`).
> Mục tiêu: dựng lại **đúng pixel & đúng motion** trong app thật (Electron + React + canvas/WebGL), thay simulation bằng OSC/NDI thật.
> Fidelity: **hi-fi**. Màu, typography, spacing, timing, interaction đều đã chốt trong handoff — bám sát tuyệt đối.

---

## 0. Tổng quan hệ thống

App VJ desktop điều khiển 1 installation projection-mapped chạy **6 ngày**. Người tham gia ngồi vào "blueprint station" → sensor bắn OSC → visual đổi state.

**3 cửa sổ / output:**
| Cửa sổ | Vai trò | Độ phân giải nội bộ |
|---|---|---|
| Operator Control Panel | VJ vận hành | 1440×880 (min 1280×800) |
| Wall output | Chiếu lên tường, siêu rộng | **10990 × 1080** |
| Floor output | Chiếu xuống sàn, vuông | **4096 × 4096** |

**Máy chạy:** Mac (M-series). Output scale-to-fit về màn/máy chiếu thật, giữ native res bên trong để mapping chuẩn.

**State toàn cục (globalState):** `field → ascend → settled`
- `field` — trường đang mở, mọi người vẽ blueprint.
- `ascend` — tất cả bản vẽ bay lên (giữ 4.2s).
- `settled` — ngôi nhà mới an vị.

---

## Kiến trúc tổng (chốt theo README)

```
Electron main process
├── OSC service   (udp :9000, node-osc/osc.js)      ── nghe sensor + phát address vocabulary
├── NDI service   (grandiose / node NDI binding)     ── Day3Wall + Day3Floor senders
├── Show store    (nguồn chân lý duy nhất về state)  ── participants[], globalState, outputs, ndi...
├── Window manager (BrowserWindow ×3, đa màn hình)
└── IPC bridge    (contextBridge, preload)
        │
        ├─► Control window  (React) ── đọc/ghi store, render UI operator
        ├─► Wall window     (React + canvas) ── subscribe store → scene machine
        └─► Floor window    (React + canvas) ── subscribe store → scene machine
```

**Nguyên tắc:** Store sống ở **main process**. Cả 3 window chỉ là view + gửi action. Mọi thay đổi state → broadcast xuống 3 window qua IPC → đồng thời phát OSC out + cập nhật frame NDI. Điều này thay thế trọn phần "simulation" trong prototype.

**Stack đề xuất:** Electron + Vite + React + TypeScript. Renderer output dùng `<canvas>` 2D (đúng như prototype — starfield, wireframe, ticks đều là canvas 2D) + lớp DOM/CSS cho card & animation (CSS keyframes như prototype). Không cần WebGL/Three cho bản đầu; canvas2D + CSS đủ khớp 100% design.

---

# PHASE 0 — Scaffold & khung kiến trúc

**Mục tiêu:** Có app Electron 3 cửa sổ mở được, có store trung tâm + IPC, chưa cần visual.

**Việc làm:**
1. Khởi tạo `electron + vite + react + ts`. 3 entry renderer: `control/`, `wall/`, `floor/`.
2. `WindowManager`: tạo 3 `BrowserWindow`. Control mở mặc định; Wall/Floor mở theo lệnh (khớp `outputs[].open`).
3. `ShowStore` ở main: đúng shape state trong prototype (mục dưới) + `dispatch(action)` + `subscribe`.
4. Preload + `contextBridge`: expose `day3.getState()`, `day3.dispatch()`, `day3.onState(cb)`.
5. Broadcast: mỗi lần store đổi → `webContents.send('state', snapshot)` tới cả 3 window.

**State shape (khớp `Day3 Control Panel.dc.html`):**
```ts
participants: { name, state:'idle'|'drafting'|'uploaded', progress:0..1, manual:boolean }[]
globalState: 'field'|'ascend'|'settled'
blacked: boolean
outputs: { label, stream, display, mode:'fullscreen'|'windowed', open }[]   // WALL, FLOOR
ndi: { running:boolean, fps:30|60 }
oscPort: 9000
oscListening: boolean
oscLog: { time, addr, args }[]          // ring buffer, giữ 80 dòng cuối
draftDuration: 30    // giây
autoAscend: boolean
ascendHold: 3        // giây
```

**Tick engine (thay `setInterval(this.tick,200)` của prototype):** vòng 200ms ở main:
- Mỗi participant `drafting && !manual`: `progress += 0.2 / max(3, draftDuration)`; đạt 1 → `uploaded`.
- Nếu `field && autoAscend && mọi người uploaded`: cộng dồn `doneMs`; ≥ `ascendHold*1000` → `ascend()`.
- (Tùy chọn) `simulateTraffic` để chạy khô khi chưa có sensor.

**Nghiệm thu:** Bật app → 3 cửa sổ. Đổi state ở main (test) → cả 3 window nhận được snapshot. Chưa có UI đẹp cũng được.

---

# PHASE 1 — Design System nền tảng (dùng chung 3 window)

**Mục tiêu:** Token + primitive dùng lại cho cả control lẫn output, khớp handoff.

**Tokens (chốt cứng):**
```
--void: #070912;  --stage-a: #080b16;  --stage-b: #05070f;
--glass: rgba(14,19,34,.72);  --glass-border: rgba(140,165,210,.22);
--cyan: #5be8ff;   --violet: #b9a6ff;  --gold: #f1c875;
--gold-lt: #f7d98c; --gold-lt2: #f7d58c;
--green: #6ee7a8;  --muted: #8d96b3;  --dim: #5b6280;  --text: #eef1f8;
--danger: #e88a80;  --danger-bg: rgba(200,70,60,.10);   /* CHỈ dùng cho Panic */
radius: card 14–17px, tile 8–12px, pill 999px
```
**Typography:**
- Mono/label: `ui-monospace,'SF Mono','Cascadia Mono',Consolas,monospace`, UPPERCASE, letter-spacing `.12em–.42em` — "giọng bản vẽ kỹ thuật" cho MỌI label/eyebrow/status/log.
- Body/heading: `-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif`.
- Số trên card: to, tương phản cao (đọc từ **1 mét** trong phòng tối).

**Card shadow pattern:** `0 12–20px 40–60px rgba(0,0,0,.5)` + glow accent `0 0 22–40px <accent>@.10–.16` + `inset 0 1px 0 rgba(255,255,255,.08)`.

**Primitive tái sử dụng:**
- `<GlassCard>`, `<MonoLabel>`, `<StatusDot color>`, `<Pill>`, `<SegToggle>`.
- **`useFitToViewport(W, H)`** — hook cốt lõi cho 2 output: `scale = min(innerWidth/W, innerHeight/H)`, gắn resize + load + `ResizeObserver`, retry qua `rAF` tới khi layout sẵn (chặn `scale(0)`). Dùng chung 10990×1080 và 4096×4096.
- **`useStarfield(canvas, opts)`** — starfield canvas parallax (drift + twinkle `sin`), cleanup `cancelAnimationFrame`. Base cho mọi cảnh cosmic.

**Nghiệm thu:** Trang demo render đủ token + 1 GlassCard + fit hook chạy đúng khi resize.

---

# PHASE 2 — Operator Control Panel

> File nguồn: `Day3 Control Panel.dc.html`. **Copy UI dùng TIẾNG ANH** (theo yêu cầu user — bản prototype tiếng Việt chỉ tham chiếu layout/hành vi). Design 1440×880, grid 2 cột `minmax(380px,36%) 1fr`, gap 16, status bar fixed đáy cao 38px.

**Cột trái:**
- **01 · Thiết Lập Show** — textarea tên (phân tách dấu phẩy) + nút "Áp Dụng Danh Sách"; input "Thời lượng vẽ (giây)"; input "Giữ trước thăng (giây)"; toggle BẬT/TẮT "Tự thăng khi tất cả đã tải lên".
- **03 · Điều Khiển Chính** — nút hero **THĂNG** (cyan gradient, pad 22px, letter-spacing .3em, glow), **ĐẶT LẠI** (neutral), **KHẨN → TỐI ĐEN** (đỏ, *chỉ chỗ này dùng màu danger*). 3 pill trạng thái góc phải: **TRƯỜNG / THĂNG / AN VỊ** (cyan/violet/gold).
- **04 · Đầu Ra** — mỗi surface (TƯỜNG/SÀN) 1 hàng: dropdown màn hình, seg Toàn-màn-hình/Cửa-sổ, nút Mở/Đóng, dot xanh(mở)/xám(đóng). Khối **NDI**: Bật/Dừng, tên stream `Day3Wall`/`Day3Floor`, chọn 30/60 fps.

**Cột phải:**
- **02 · Bảng Người Tham Gia** (lớn nhất) — grid `repeat(auto-fill,minmax(215px,1fr))`. Mỗi card: tên (19px/700), badge (CHỜ xám / ĐANG VẼ cyan / ĐÃ TẢI gold), progress bar + % live, nút **Ngồi** + **Hoàn tất**, slider ghi đè 0–100% (kéo slider bật cờ `manual` → dừng auto-fill).
- **05 · OSC** — input cổng (default 9000), dot xanh nhấp nháy khi listening, log terminal cuộn: `time  /address  args` mono nhỏ, auto-scroll dòng mới nhất.

**06 · Sync status bar** (fixed đáy) — WALL mở/đóng · FLOOR mở/đóng · OSC :port · NDI fps/dừng · trạng thái toàn cục; mỗi mục 1 dot màu. Phải: "DAY3 BLUEPRINT · OPERATOR CONSOLE".

**Hành vi (nối vào store Phase 0, KHÔNG dùng simulation nữa):**
- `Ngồi` → drafting; auto tăng theo `draftDuration` → uploaded. Slider → `setProgress(manual)`.
- `THĂNG` → tất cả uploaded, global `field→ascend→(4.2s)→settled`.
- Auto-ascend sau `ascendHold` giây khi mọi người uploaded.
- `KHẨN → TỐI ĐEN` → `blacked=true` (banner đỏ + 2 output fade đen). `ĐẶT LẠI` khôi phục field.
- **Mọi action ghi 1 dòng OSC log** + phát OSC out tương ứng.

**Nghiệm thu:** Thao tác đầy đủ vòng đời một người: Ngồi → tự vẽ → Đã tải; THĂNG chạy đúng chuỗi màu/pill; Panic/Reset đúng; log cập nhật realtime; sync bar phản chiếu đúng.

---

# PHASE 3 — OSC + NDI thật

**Mục tiêu:** Thay hết mô phỏng bằng I/O thật.

**OSC (in + out), port mặc định 9000.** Giữ nguyên vocabulary làm **giao thức thật**:
```
/day3/boot            /day3/osc              /day3/config/participants
/day3/config/auto     /day3/sit              /day3/upload
/day3/progress        /day3/ascend           /day3/settled
/day3/reset           /day3/panic            /day3/output/<key>
/day3/window          /day3/ndi              /day3/ndi/fps
/day3/sensor/seat     (inbound từ sensor)
```
- **Inbound:** `/day3/sensor/seat <name> weight=<f>` → map người → `sit()` (hoặc theo ngưỡng weight). Nghe/tắt theo `oscListening`. Đổi port realtime.
- **Outbound:** mỗi action ở Phase 2 phát address tương ứng (để TouchDesigner / thiết bị khác nghe được).
- Log: mọi in/out đẩy vào `oscLog` ring-buffer 80 dòng, format `HH:MM:SS.mmm /addr args`.

**NDI:** 2 sender **`Day3Wall`** (10990×1080) và **`Day3Floor`** (4096×4096), 30/60 fps chọn được. Nguồn frame = capture canvas/window của Wall & Floor renderer. Bật/dừng theo `ndi.running`. (Mac M-series: cân nhắc downscale khung NDI nếu 10990px vượt băng thông — xem Phase 7.)

**Nghiệm thu:** Bắn OSC test `/day3/sensor/seat ria weight=0.7` từ ngoài → card RIA vào drafting. NDI stream `Day3Wall`/`Day3Floor` thấy được trên NDI monitor.

---

# PHASE 4 — Wall Output + Scene Machine (10990 × 1080)

**Khung chung:** stage `10990×1080`, `useFitToViewport`, nền cosmic (radial nebula cyan/violet/gold + starfield canvas parallax + floor grid tùy chọn). 3 cảnh, chọn theo `globalState` + tiến độ người tham gia:

| Scene | Kích hoạt | File nguồn |
|---|---|---|
| **Blueprints** | `field`, chưa ai ngồi (idle/pre-show) | `Wall - 1 Blueprints` |
| **Drafting** | `field`, có người đang vẽ/tải | `Wall - 2 Drafting` |
| **Ascension** | `ascend` + `settled` | `Wall - 3 Ascension` |

### 4a. Blueprints
14 card blueprint bay lơ lửng, mỗi card = SVG floor-plan **sinh thủ tục** (seed theo index, PRNG `s0=(s0*16807)%2147483647`): shell phòng, fill phòng có tint (breathing `bppulse`), furniture rects (drift `bpdrift`), circular fixture, sensor crosses vàng (blink `bpblink`), dimension lines tím có tick (marching-ants `bpflow`), corner registration ticks, scan sweep `bpscan`. Depth qua scale/opacity per-card; tên trong pill mono dưới card. Accent chủ đạo cyan, rải violet/gold. Props: `floorGrid`, `drift`.

### 4b. Drafting
14 folder card: icon folder, `{Name}'s Blueprint`, KB, spinner + "Drafting…", % live + progress bar. Đạt 100% → **Uploaded** (gold + checkmark). Chuyển màu cyan→gold. **% lấy từ store participants thật**, không tự sim (bản prototype tự chạy `setInterval 120ms` — thay bằng progress thật).
> Biến thể có sẵn để chọn nếu muốn nâng cấp thẩm mỹ: `2b Drafting WOW` (loop 0→100, burst, shimmer, sparks — multi-accent), `2d Drafting Card` (arty, ruler ticks, desk brackets). `2c Drafting Core` = concept thay thế, **không phải hướng đã chọn** → bỏ qua trừ khi bạn đổi ý.

### 4c. Ascension (cảnh trọng tâm — final)
Mọi banner "Blueprint Uploaded" (gold + checkmark + bar vàng đầy). **24 folder card** (rộng 340px) trải đều 3 hàng khắp tường; mỗi card **liên tục bay lên hội tụ về 1 UPLOAD node** ở giữa-trên tường `≈ (5495, 170)`, scale từ full → ~0.05 + fade — dòng chảy đều, respawn từ dưới.
- **Kỹ thuật hội tụ:** per-card CSS var `--dx = PX - x`, `--dy = PY - sy`; keyframe `rise` nội suy `translate(var(--dx),var(--dy)) scale(1→.05)` + fade; `animation-delay: -(i/N)*CYCLE` để stream đều liên tục. **CYCLE = 12s**, easing `cubic-bezier(.45,.02,.55,.98)`.
- **UPLOAD node** = lõi lục giác "uplink" vàng: pulsing rings, dashed + segmented gold arcs xoay (spin 22s / spinrev 14s), 3 dot vàng quỹ đạo (spin 8s), hexagon core (`clip-path` polygon) + icon cloud-upload, label nhấp nháy **UPLOADING…**.
- **Nền:** nebula nhiều lớp + 2 aurora blob trôi chậm (`auroradrift`) + starfield twinkle sắc (`sin³`) + gold bloom + cột sáng vàng xuyên đỉnh (`beamflow`). Canvas vẽ starfield + dust + radial gold pulse quanh node mỗi frame.

**Chuyển cảnh:** khi `globalState` đổi → crossfade giữa scene (fade opacity ~600ms). `blacked` → cả stage fade về đen.

**Nghiệm thu (verify LIVE — screenshot DOM sẽ đứng ở frame 0):** 3 cảnh render đúng ở 10990×1080 scale-to-fit; Ascension stream đều, node pulse, hội tụ đúng điểm (5495,170); đổi globalState từ control panel → wall đổi cảnh mượt.

---

# PHASE 5 — Floor Output (4096 × 4096)

**Khung chung:** stage `4096×4096`, `useFitToViewport`, nền radial cosmic + starfield. 2 cảnh:

### 5a. House Rises
File `Floor - House Rises`. Isometric wireframe apartment **tự dựng theo loop**:
`FOUNDATION` (floor grid vẽ dần theo frontier chéo) → `WALLS RISING` (tường perimeter + partition dựng **từng panel**, cạnh trên leading sáng) → `FURNISHING` (nội thất pop lên: giường, sofa, bàn ăn + ghế, đảo bếp + stool, bồn tắm, cầu thang bậc) → `ROOFING` (dầm mái) → `HOUSE COMPLETE` → fade → loop.
- **Iso params (giữ nguyên):** `TW=272, TH=164, ZS=180`, origin `oy=H*0.545`, footprint `GX=14, GY=10`, `WALLH=3`.
- Toàn cấu trúc **xoay chậm liên tục** `ROT = t*0.08` (người đứng quanh sàn nhìn mọi hướng). Linework cyan/violet/gold, leading edge trắng.
- Timeline: `T_FLOOR 3.0, T_WALL 5.5, T_FURN 4.0, T_ROOF 2.2, T_HOLD 2.4, T_FADE 1.6`. Props: `floorGrid`, `rotate`.

### 5b. Uploaded (+ operator overlay)
File `Floor - Uploaded`. 14 card "Uploaded" vàng xếp **vòng tròn** (radius **1430** quanh tâm **2048,2048**), mỗi card xoay hướng ra ngoài (đọc từ mọi mép sàn). Hub trung tâm: `X / 14 · BLUEPRINTS UPLOADED · RECEIVING`. **Sending ticks** vàng chạy dọc conduit từ card → hub (packet + arrival ripple); người chưa upload hiện cyan "Drafting…" bar indeterminate.
- **Kỹ thuật ticks:** phase packet analytic mỗi card `(t*RATE + offset) % 1`, `RATE=0.34`, offset `(i*0.618)%1`, eased dọc line card→hub; hub glow tăng theo số arrival.
- **Operator overlay (top-right, KÍCH THƯỚC THẬT, KHÔNG scale theo stage):** panel liệt kê 14 người, mỗi người 1 tick toggle, đếm `x/14` live, nút ALL / RESET. Toggle 1 người → card cyan→gold + bật ticks. **Control này quyết định ai được đánh dấu uploaded.**
> Lưu ý tích hợp: overlay này trong prototype có state cục bộ `uploaded[14]`. Trong app thật, **nối vào store participants chung** (không để state rời) để đồng bộ với control panel + wall + OSC.

**Mapping cảnh floor ↔ globalState (đề xuất):**
- `field` → **Uploaded** (đang nhận, hub đếm tăng dần) hoặc House Rises ambient tùy kịch bản show.
- `settled` → **House Rises** chạy tới "HOUSE COMPLETE" như payoff "ngôi nhà mới".
- Chốt mapping chính xác cùng bạn ở Phase 6.

**Nghiệm thu (LIVE):** House build đúng 5 phase + xoay; Uploaded ring 14 card facing-out, ticks chạy, hub đếm; overlay không bị scale, toggle đồng bộ store.

---

# PHASE 6 — Tích hợp Show & Multi-window

**Mục tiêu:** Nối control → 2 output thành một show mạch lạc, quản lý đa màn hình.

1. **Scene state machine chung** dẫn xuất từ store: `(globalState, participants, blacked)` → cảnh Wall + cảnh Floor. Chốt bảng mapping cuối cùng cùng bạn.
2. **Window/display management:** dropdown "Màn hình" thật (enumerate `screen.getAllDisplays()`), Fullscreen/Windowed, Open/Close khớp `outputs[].open`, dot trạng thái đúng.
3. **Panic → Black:** đồng bộ fade đen ở cả 2 output + banner; Reset khôi phục field + clear participants về idle.
4. **Auto-ascend + ascendHold + draftDuration** chạy end-to-end từ config panel.
5. **Crossfade** chuyển cảnh mượt trên cả 2 output.
6. **Đồng bộ Floor operator overlay ↔ participants store** (đã nêu Phase 5b).

**Nghiệm thu:** Dry-run trọn kịch bản: setup roster → người ngồi (hoặc OSC sensor) → drafting → uploaded → THĂNG → Ascension trên tường + payoff sàn → Reset. Chạy trên 2 màn/máy chiếu thật.

---

# PHASE 7 — Hardening cho show 6 ngày

- **Hiệu năng:** giữ 60fps ở 10990px & 4096px. Nếu NDI 10990px quá tải → render NDI ở scale thấp hơn hoặc tách khung. `willChange`, tránh layout thrash, canvas `imageSmoothing` hợp lý.
- **Bền bỉ:** auto-recover nếu 1 output window crash; watchdog; giữ store khi reload renderer.
- **Ổn định OSC/NDI:** reconnect, đổi port không cần restart, chống flood `/day3/sensor/seat`.
- **Fail-safe vận hành:** hotkey Panic, "safe boot" (mọi output đen tới khi VJ sẵn sàng), lưu/restore config (roster, duration, displays) giữa các ngày.
- **Blackout khi idle / giữa ca**, chống burn-in máy chiếu.
- **Preset kịch bản** cho từng ngày nếu cần.

**Nghiệm thu:** Chạy liên tục nhiều giờ không rò rỉ bộ nhớ / tụt fps; khôi phục nhanh sau sự cố; VJ vận hành được chỉ bằng control panel.

---

## Thứ tự ưu tiên & phụ thuộc
```
P0 scaffold ─► P1 design system ─► P2 control panel ─► P3 OSC/NDI
                     │                                     │
                     └─► P4 Wall ──┐                       │
                     └─► P5 Floor ─┴─► P6 tích hợp show ◄──┘ ─► P7 hardening
```
- P4 & P5 có thể làm song song sau P1 (mỗi cái tự chạy được với mock store).
- P3 có thể xen kẽ P2 (mock OSC trước, nối thật sau).

## Điểm cần bạn chốt trước khi vào P6 (không chặn P0–P5)
1. **Mapping cảnh Floor ↔ globalState** (Uploaded vs House Rises ở field/settled).
2. **Nguồn "uploaded" trên sàn**: chỉ operator overlay, hay đồng bộ participants chung (đề xuất: đồng bộ chung).
3. **Biến thể Drafting tường**: bản chuẩn (`2`) hay nâng cấp (`2b`/`2d`).
4. **Kịch bản OSC sensor**: `/day3/sensor/seat` map người theo tên hay theo ghế/ngưỡng weight.

# DAY3 BLUEPRINT — Chạy trên Windows (RTX 5080) cho buổi test

> **Vì sao phải build trên Windows?** Phần NDI dùng native module (`grandiose.node` + `libndi.dll`) **biên dịch riêng theo HĐH**. Bản Mac không chạy được trên Windows → phải cài/biên dịch **trên chính máy Windows**. Làm theo dưới đây là xong.

---

## 0. Chuẩn bị máy Windows (làm 1 lần)

1. **Node.js LTS** (v20 hoặc v22): tải ở https://nodejs.org
   - Khi cài, **TÍCH ô "Automatically install the necessary tools..."** (Tools for Native Modules) — nó cài luôn **Python + Visual Studio Build Tools (C++)** cần để biên dịch NDI. **Rất quan trọng**, thiếu là `npm install` fail.
   - (Nếu quên tích: cài thủ công **"Visual Studio Build Tools 2022"** với workload **"Desktop development with C++"** + **Python 3.x**.)
2. **NDI**: TouchDesigner đã có sẵn runtime NDI để nhận. (App tự kèm `libndi.dll` nên không cần cài thêm cho phần phát.)
3. Chép **cả thư mục dự án** sang máy Windows — **NHƯNG XÓA `node_modules` và `dist`/`out`** trước khi chép (để cài lại sạch cho Windows). Chỉ cần source + `package.json`.

---

## 1. Cài đặt (trong thư mục dự án, mở PowerShell/CMD)

```bat
npm install
```
Lệnh này sẽ tự tải NDI SDK và **biên dịch grandiose cho Windows** (mất 1–2 phút). Nếu báo lỗi node-gyp/C++ → thiếu Build Tools ở bước 0.

---

## 2. Chạy — chọn 1 trong 2 cách

### Cách A — Nhanh & chắc ăn nhất (khuyên dùng cho test)
```bat
npm run build
npm start
```
`npm start` mở thẳng app đã build (không cần installer). Đây là cách **ổn định nhất** cho buổi test.

### Cách B — Xuất file .exe standalone (nếu muốn bản cài)
```bat
npm run dist:win
```
Ra file trong thư mục **`dist/`**:
- `DAY3 BLUEPRINT-0.1.0-portable.exe` — chạy trực tiếp, không cần cài.
- `DAY3 BLUEPRINT-0.1.0-setup.exe` — bản cài đặt.

---

## 3. Trong buổi test

1. Mở app → cửa sổ **Operator Control Panel** hiện ra.
2. **NDI đã bật sẵn** (mặc định ON) → app phát 2 luồng ngay:
   - `Day3Wall` @ **10990×1080**
   - `Day3Floor` @ **4096×4096**
3. Trong **TouchDesigner**: thả **NDI In**, ở **Source Name** chọn `...Day3Wall` / `...Day3Floor`.
   - Nếu không thấy: bấm nút refresh source; đảm bảo cùng máy/cùng mạng; cho phép app qua **Firewall** khi Windows hỏi.
4. Điều khiển visual: trong ô **Outputs** của panel, hàng **SCENE** — bấm AUTO / BP / DRAFT / ASC (tường) · AUTO / HOUSE / UPLOAD (sàn) / OFF.
5. **Resolution**: đổi được live (gõ số → Enter). Đổi res thì scene **tự bố trí lại** (responsive), NDI đổi theo.
6. **Participants**: bấm **Complete** để đánh dấu người đã upload (hiện trên sàn).

---

## 4. Tối ưu đã bật sẵn cho Windows/RTX

- **GPU acceleration cưỡng bức** (chỉ kích hoạt trên Windows): `ignore-gpu-blocklist`, `enable-gpu-rasterization`, `enable-accelerated-2d-canvas`, `enable-zero-copy`, **ANGLE d3d11** (tối ưu cho NVIDIA).
- **Chống throttle khi cửa sổ bị che** (NDI không đứng hình): `disable-background-timer-throttling`, `disable-renderer-backgrounding`, `disable-backgrounding-occluded-windows`.
- **Vòng vẽ canvas GPU-friendly**: dùng `globalAlpha` + `fillRect` + màu memoize (không tạo chuỗi rgba mỗi frame).
- **Bỏ backdrop-filter blur** (hiệu ứng tốn GPU nhất) trên card/hub.
- **Cap số sao** để res cao không bùng nổ.
- **NDI gửi có điều tiết** (không nghẽn main process).

## 5. Nếu cần chỉnh cho mượt hơn
- Với RTX 5080, full res `10990×1080` nên chạy tốt. Nếu vì lý do gì đó còn nặng: hạ **RESOLUTION** trong panel (giữ tỉ lệ) — vd tường `5495×540`, sàn `2048×2048` — nhẹ 4×, đổi live được.
- Chọn **NDI 30fps** (mặc định) cho ổn định; 60fps nếu GPU dư sức.
- Không cần preview khi vận hành thì bấm **PREVIEW → OFF** để nhẹ cửa sổ control.

## 6. Sự cố thường gặp
| Triệu chứng | Cách xử lý |
|---|---|
| `npm install` lỗi node-gyp / C++ | Thiếu VS Build Tools + Python → cài lại (bước 0) |
| TD không thấy `Day3Wall/Floor` | Bấm refresh source; cho app qua Firewall; đảm bảo NDI đã bật (nút **Start NDI** trong ô NDI) |
| NDI đứng hình | Đã fix bằng chống-throttle; nếu vẫn: đảm bảo đang chạy trên Windows (không phải Mac software render) |
| App không mở | Chạy `npm run build` trước rồi `npm start`; xem log trong terminal |

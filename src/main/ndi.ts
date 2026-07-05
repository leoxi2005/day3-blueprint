// ============================================================================
// NdiService — phát 2 luồng NDI (Day3Wall / Day3Floor) ở ĐÚNG độ phân giải gốc.
// Cách làm: render OFFSCREEN riêng mỗi surface ở resW×resH (độc lập cửa sổ chiếu),
// lấy frame qua sự kiện 'paint' (BGRA) rồi đẩy qua sender.video().
// Offscreen luôn chạy (không bị throttle khi bị che) → không đứng hình, đúng res.
// ============================================================================
import { BrowserWindow, screen } from 'electron'
import { Output, OutputKey } from '../shared/types'
import { PRELOAD_PATH, loadRoleRenderer } from './windows'

const FOURCC_BGRA = 1095911234
const FRAME_PROGRESSIVE = 1

/* eslint-disable @typescript-eslint/no-explicit-any */
let grandiose: any = null
try {
  grandiose = require('@stagetimerio/grandiose')
  if (grandiose && grandiose.default && !grandiose.send) grandiose = grandiose.default
} catch (e) {
  console.log('[ndi] module không nạp được:', (e as Error).message)
}

type Role = OutputKey

interface Stream {
  sender: any
  win: BrowserWindow
  fps: number
  resW: number
  resH: number
  streamName: string
  inflight: boolean
}

export class NdiService {
  private streams: Partial<Record<Role, Stream>> = {}

  available(): boolean {
    return !!(grandiose && grandiose.send)
  }

  /** Cửa sổ offscreen cần nhận broadcast state như cửa sổ thường. */
  broadcastWindows(): BrowserWindow[] {
    return Object.values(this.streams)
      .filter((s): s is Stream => !!s)
      .map((s) => s.win)
      .filter((w) => !w.isDestroyed())
  }

  private syncing = false
  private pending: { running: boolean; fps: number; outputs: Output[] } | null = null

  /** Reconcile — SERIALIZE để không có 2 lần chạy chồng nhau (tránh tạo sender trùng/bỏ rơi cửa sổ). */
  async sync(running: boolean, fps: number, outputs: Output[]): Promise<void> {
    if (!this.available()) return
    this.pending = { running, fps, outputs }
    if (this.syncing) return
    this.syncing = true
    try {
      while (this.pending) {
        const p = this.pending
        this.pending = null
        await this.doSync(p.running, p.fps, p.outputs)
      }
    } finally {
      this.syncing = false
    }
  }

  private async doSync(running: boolean, fps: number, outputs: Output[]): Promise<void> {
    for (const o of outputs) {
      const role = o.key
      const cur = this.streams[role]
      if (running && !cur) {
        await this.start(role, o.stream, fps, o.resW, o.resH)
      } else if (!running && cur) {
        this.stop(role)
      } else if (running && cur) {
        if (cur.resW !== o.resW || cur.resH !== o.resH || cur.fps !== fps) {
          this.stop(role)
          await this.start(role, o.stream, fps, o.resW, o.resH)
        }
      }
    }
  }

  private async start(role: Role, streamName: string, fps: number, resW: number, resH: number): Promise<void> {
    try {
      // clockVideo:false vì mình tự nhịp gửi bằng timer (đều hơn → TD không giật).
      const sender = await grandiose.send({ name: streamName, clockVideo: false, clockAudio: false })
      // Offscreen render ở device-px = resW×resH. Vì paint trả device px = CSS×DPR,
      // đặt CSS = resW/dpr để frame ra đúng resW (và không vượt max texture 16384).
      const dpr = Math.min(3, Math.max(1, screen.getPrimaryDisplay().scaleFactor || 1))
      const win = new BrowserWindow({
        width: Math.round(resW / dpr),
        height: Math.round(resH / dpr),
        show: false,
        webPreferences: {
          preload: PRELOAD_PATH,
          sandbox: false,
          offscreen: true,
          backgroundThrottling: false,
          additionalArguments: [`--day3-role=${role}`]
        }
      })
      const stream: Stream = { sender, win, fps, resW, resH, streamName, inflight: false }
      this.streams[role] = stream

      // TỰ HIỆU CHỈNH kích thước: DPR màn hình khác nhau (Windows 125/150%, Mac Retina 2×)
      // khiến frame paint không đúng resW×resH. Đo frame thật rồi resize cửa sổ cho khớp.
      let correcting = false
      let stableFrames = 0
      let attempts = 0 // cap số lần resize để không loop vô hạn

      win.webContents.setFrameRate(fps)
      // Gửi theo paint, nhưng CHỈ copy+gửi khi không còn frame đang bay (inflight)
      // → copy 47MB được điều tiết theo tốc độ gửi thật, không nghẽn main process.
      win.webContents.on('paint', (_e, _dirty, image) => {
        const st = this.streams[role]
        if (!st || st.sender !== sender || st.inflight || correcting) return
        const size = image.getSize()
        if (!size.width || !size.height) return
        // hiệu chỉnh cho tới khi frame đúng res đã nhập (tối đa vài lần rồi chấp nhận)
        if (stableFrames < 3 && attempts < 6 && (Math.abs(size.width - resW) > 2 || Math.abs(size.height - resH) > 2)) {
          if (win.isDestroyed()) return
          const [cw, ch] = win.getContentSize()
          const newW = Math.max(1, Math.round(resW / (size.width / cw)))
          const newH = Math.max(1, Math.round(resH / (size.height / ch)))
          if (newW !== cw || newH !== ch) {
            correcting = true
            attempts++
            console.log(`[ndi] ${role}: frame ${size.width}x${size.height} != ${resW}x${resH} → resize ${cw}x${ch}→${newW}x${newH}`)
            win.setContentSize(newW, newH)
            setTimeout(() => { correcting = false }, 250)
            return // bỏ frame sai kích thước, chờ frame đúng
          }
        }
        if (stableFrames === 0 && Math.abs(size.width - resW) <= 2 && Math.abs(size.height - resH) <= 2) {
          console.log(`[ndi] ${role}: OK phát đúng ${size.width}x${size.height}`)
        }
        stableFrames++
        st.inflight = true
        const data = Buffer.from(image.getBitmap()) // BGRA
        sender
          .video({
            xres: size.width,
            yres: size.height,
            frameRateN: st.fps * 1000,
            frameRateD: 1000,
            fourCC: FOURCC_BGRA,
            pictureAspectRatio: size.width / size.height,
            frameFormatType: FRAME_PROGRESSIVE,
            lineStrideBytes: size.width * 4,
            data
          })
          .catch(() => {})
          .finally(() => {
            const s2 = this.streams[role]
            if (s2) s2.inflight = false
          })
      })
      loadRoleRenderer(win, role)
      console.log(`[ndi] started sender "${streamName}" (${role}) @ ${resW}x${resH} ${fps}fps`)
    } catch (e) {
      console.log(`[ndi] start lỗi (${role}):`, (e as Error).message)
    }
  }

  private stop(role: Role): void {
    const st = this.streams[role]
    if (!st) return
    delete this.streams[role]
    try {
      if (!st.win.isDestroyed()) st.win.destroy()
    } catch { /* đã chết */ }
    st.sender.destroy().catch(() => {})
    console.log(`[ndi] stopped sender "${st.streamName}" (${role})`)
  }

  stopAll(): void {
    for (const role of Object.keys(this.streams) as Role[]) this.stop(role)
  }
}

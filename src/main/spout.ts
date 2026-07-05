// ============================================================================
// SpoutService (Windows) — phát output qua Spout dùng GPU (không copy CPU như NDI).
// Render offscreen với useSharedTexture:true → lấy shared D3D11 handle → addon gửi
// qua SpoutDX. TouchDesigner nhận bằng "Spout In". Song song với NDI.
// ============================================================================
import { BrowserWindow, screen } from 'electron'
import { Output, OutputKey } from '../shared/types'
import { PRELOAD_PATH, loadRoleRenderer } from './windows'

/* eslint-disable @typescript-eslint/no-explicit-any */
let spout: any = null
try {
  spout = require('day3-spout')
} catch (e) {
  console.log('[spout] module không nạp:', (e as Error).message)
}

type Role = OutputKey

interface Stream {
  win: BrowserWindow
  streamName: string
  resW: number
  resH: number
  opened: boolean
}

export class SpoutService {
  private streams: Partial<Record<Role, Stream>> = {}

  available(): boolean {
    return !!(spout && spout.available && spout.available())
  }

  broadcastWindows(): BrowserWindow[] {
    return Object.values(this.streams)
      .filter((s): s is Stream => !!s)
      .map((s) => s.win)
      .filter((w) => !w.isDestroyed())
  }

  /** Reconcile theo spoutRunning. */
  sync(running: boolean, fps: number, outputs: Output[]): void {
    if (!this.available()) return
    for (const o of outputs) {
      const role = o.key
      const cur = this.streams[role]
      if (running && !cur) {
        this.start(role, o.stream, fps, o.resW, o.resH)
      } else if (!running && cur) {
        this.stop(role)
      } else if (running && cur) {
        if (cur.resW !== o.resW || cur.resH !== o.resH) {
          this.stop(role)
          this.start(role, o.stream, fps, o.resW, o.resH)
        } else {
          cur.win.webContents.setFrameRate(fps)
        }
      }
    }
  }

  private start(role: Role, streamName: string, fps: number, resW: number, resH: number): void {
    try {
      const dpr = Math.min(3, Math.max(1, screen.getPrimaryDisplay().scaleFactor || 1))
      const win = new BrowserWindow({
        width: Math.round(resW / dpr),
        height: Math.round(resH / dpr),
        show: false,
        webPreferences: {
          preload: PRELOAD_PATH,
          sandbox: false,
          offscreen: { useSharedTexture: true } as any, // GPU offscreen → shared texture
          backgroundThrottling: false,
          additionalArguments: [`--day3-role=${role}`]
        }
      })
      const stream: Stream = { win, streamName, resW, resH, opened: false }
      this.streams[role] = stream

      win.webContents.setFrameRate(fps)
      win.webContents.on('paint', (e: any, _dirty: any, _image: any) => {
        const st = this.streams[role]
        if (!st || st.win !== win) return
        const tex = e && e.texture
        if (!tex) return
        try {
          const info = tex.textureInfo
          const handle = info && info.sharedTextureHandle
          if (handle) {
            if (!st.opened) st.opened = !!spout.open(streamName)
            if (st.opened) spout.sendHandle(streamName, handle)
          }
        } catch { /* ignore frame */ } finally {
          try { tex.release() } catch { /* đã release */ }
        }
      })
      loadRoleRenderer(win, role)
      console.log(`[spout] started "${streamName}" (${role}) @ ${resW}x${resH}`)
    } catch (e) {
      console.log(`[spout] start lỗi (${role}):`, (e as Error).message)
    }
  }

  private stop(role: Role): void {
    const st = this.streams[role]
    if (!st) return
    delete this.streams[role]
    try { if (spout && spout.close) spout.close(st.streamName) } catch { /* ignore */ }
    try { if (!st.win.isDestroyed()) st.win.destroy() } catch { /* đã chết */ }
    console.log(`[spout] stopped "${st.streamName}" (${role})`)
  }

  stopAll(): void {
    for (const role of Object.keys(this.streams) as Role[]) this.stop(role)
  }
}

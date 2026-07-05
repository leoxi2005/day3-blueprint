// ============================================================================
// Main entry — nối ShowStore ↔ WindowManager ↔ IPC bridge.
// Store broadcast snapshot xuống mọi window; renderer gửi Action lên.
// ============================================================================
import { app, ipcMain, BrowserWindow } from 'electron'
import { ShowStore } from './store'
import { WindowManager } from './windows'
import { NdiService } from './ndi'
import { Action } from '../shared/types'

// Giữ output window chạy animation dù bị che/không focus (để frame NDI không đứng hình).
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion')
// Ép GPU acceleration — CHỈ trên Windows (RTX/NVIDIA). Trên macOS dùng GPU Metal mặc định
// (các switch ANGLE/rasterization aggressive gây crash GPU process trên M-series).
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('ignore-gpu-blocklist')
  app.commandLine.appendSwitch('enable-gpu-rasterization')
  app.commandLine.appendSwitch('enable-zero-copy')
  app.commandLine.appendSwitch('enable-accelerated-2d-canvas')
  app.commandLine.appendSwitch('disable-gpu-driver-bug-workarounds')
  app.commandLine.appendSwitch('use-angle', 'd3d11')
}

const store = new ShowStore()
const wm = new WindowManager()
const ndi = new NdiService()
let quitting = false

function broadcast(): void {
  const snapshot = store.getState()
  for (const w of [...wm.getAll(), ...ndi.broadcastWindows()]) {
    if (!w.webContents.isDestroyed()) w.webContents.send('day3:state', snapshot)
  }
}

// Dọn SẠCH mọi thứ: sender NDI + cửa sổ offscreen + cửa sổ output + tick.
function shutdown(): void {
  store.stop()
  ndi.stopAll()
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.destroy()
  }
}

// Thoát hẳn: dọn sạch rồi ép kill process nếu native NDI cố giữ tiến trình sống.
function forceQuit(): void {
  if (quitting) return
  quitting = true
  shutdown()
  app.quit()
  setTimeout(() => {
    try { app.exit(0) } catch { process.exit(0) }
  }, 1200)
}

// Chỉ cho phép 1 instance chạy (tránh 2 sender NDI cùng tên xung đột / stream ma).
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const c = wm.getControl()
    if (c) { if (c.isMinimized()) c.restore(); c.focus() }
  })

  app.whenReady().then(() => {
    ipcMain.handle('day3:getState', () => store.getState())
    ipcMain.handle('day3:listDisplays', () => WindowManager.listDisplays())
    ipcMain.handle('day3:ndiAvailable', () => ndi.available())
    ipcMain.on('day3:dispatch', (_e, action: Action) => store.dispatch(action))

    let lastOutputsRef = store.getState().outputs
    let lastNdiRef = store.getState().ndi
    const syncNdi = (): void => {
      const s = store.getState()
      ndi.sync(s.ndi.running, s.ndi.fps, s.outputs)
    }
    store.subscribe((state) => {
      if (state.outputs !== lastOutputsRef) {
        lastOutputsRef = state.outputs
        wm.syncOutputs(state.outputs)
        syncNdi()
      }
      if (state.ndi !== lastNdiRef) {
        lastNdiRef = state.ndi
        syncNdi()
      }
      broadcast()
    })

    wm.onOutputClosed = (role) => store.markOutputClosed(role)

    store.start()
    const control = wm.createControl()
    // Đóng Control Panel = thoát hẳn app (kill luôn offscreen NDI + sender).
    control.on('closed', () => forceQuit())
    wm.syncOutputs(store.getState().outputs)
    syncNdi()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) wm.createControl()
    })
  })
}

app.on('window-all-closed', () => forceQuit())

app.on('before-quit', () => shutdown())

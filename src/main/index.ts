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

function broadcast(): void {
  const snapshot = store.getState()
  for (const w of [...wm.getAll(), ...ndi.broadcastWindows()]) {
    if (!w.webContents.isDestroyed()) w.webContents.send('day3:state', snapshot)
  }
}

app.whenReady().then(() => {
  // IPC: renderer đọc state đồng bộ khi mount
  ipcMain.handle('day3:getState', () => store.getState())
  ipcMain.handle('day3:listDisplays', () => WindowManager.listDisplays())
  ipcMain.handle('day3:ndiAvailable', () => ndi.available())

  // IPC: renderer gửi action
  ipcMain.on('day3:dispatch', (_e, action: Action) => {
    store.dispatch(action)
  })

  // Store đổi → đồng bộ cửa sổ output + NDI + broadcast
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

  store.start()
  wm.createControl()
  wm.syncOutputs(store.getState().outputs)
  syncNdi()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) wm.createControl()
  })
})

app.on('window-all-closed', () => {
  store.stop()
  ndi.stopAll()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  ndi.stopAll()
})

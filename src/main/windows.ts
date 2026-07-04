// ============================================================================
// WindowManager — tạo/đóng 3 BrowserWindow, đặt lên màn hình đúng, fullscreen.
// Control mở mặc định; Wall/Floor mở theo outputs[].open.
// ============================================================================
import { join } from 'path'
import { BrowserWindow, screen, shell } from 'electron'
import { Output, OutputKey } from '../shared/types'

type Role = 'control' | 'wall' | 'floor'

const isDev = !!process.env['ELECTRON_RENDERER_URL']

export const PRELOAD_PATH = join(__dirname, '../preload/index.js')

function rendererFor(role: Role): { url?: string; file?: string } {
  if (isDev) {
    return { url: `${process.env['ELECTRON_RENDERER_URL']}/${role}/index.html` }
  }
  return { file: join(__dirname, `../renderer/${role}/index.html`) }
}

export function loadRoleRenderer(win: BrowserWindow, role: 'wall' | 'floor'): void {
  const r = rendererFor(role)
  if (r.url) win.loadURL(r.url)
  else if (r.file) win.loadFile(r.file)
}

function load(win: BrowserWindow, role: Role): void {
  const r = rendererFor(role)
  if (r.url) win.loadURL(r.url)
  else if (r.file) win.loadFile(r.file)
}

// Kích thước cửa sổ windowed = resW×resH, thu nhỏ giữ tỉ lệ để lọt màn hình.
function windowedSize(o: Output, display: ReturnType<typeof screen.getPrimaryDisplay>): [number, number] {
  const wa = display.workAreaSize
  const maxW = wa.width - 80
  const maxH = wa.height - 80
  const s = Math.min(1, maxW / o.resW, maxH / o.resH)
  return [Math.max(160, Math.round(o.resW * s)), Math.max(90, Math.round(o.resH * s))]
}

// Forward warning/error console messages từ renderer ra terminal (dev aid).
function forwardConsole(win: BrowserWindow, role: Role): void {
  win.webContents.on('console-message', (_e, level, message, line, source) => {
    if (level >= 2) console.log(`[${role}] ${message} (${source}:${line})`)
  })
}

export class WindowManager {
  private wins: Partial<Record<Role, BrowserWindow>> = {}

  getAll(): BrowserWindow[] {
    return Object.values(this.wins).filter((w): w is BrowserWindow => !!w && !w.isDestroyed())
  }

  getOutput(role: 'wall' | 'floor'): BrowserWindow | undefined {
    const w = this.wins[role]
    return w && !w.isDestroyed() ? w : undefined
  }

  createControl(): BrowserWindow {
    if (this.wins.control && !this.wins.control.isDestroyed()) return this.wins.control
    const win = new BrowserWindow({
      width: 1440,
      height: 880,
      minWidth: 1280,
      minHeight: 800,
      backgroundColor: '#070912',
      title: 'DAY3 BLUEPRINT · Operator Console',
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        additionalArguments: ['--day3-role=control']
      }
    })
    win.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })
    forwardConsole(win, 'control')
    load(win, 'control')
    this.wins.control = win
    return win
  }

  /** Đồng bộ cửa sổ output với state (mở/đóng, màn hình, fullscreen). */
  syncOutputs(outputs: Output[]): void {
    for (const o of outputs) {
      const role = o.key as Role
      if (o.open) this.openOutput(role, o)
      else this.closeOutput(role)
    }
  }

  private openOutput(role: Role, o: Output): void {
    let win = this.wins[role]
    if (win && !win.isDestroyed()) {
      this.placeOnDisplay(win, o)
      return
    }
    const displays = screen.getAllDisplays()
    const target = displays.find((d) => d.id === o.display) ?? screen.getPrimaryDisplay()
    const [ww, wh] = windowedSize(o, target)
    win = new BrowserWindow({
      x: target.bounds.x + 60,
      y: target.bounds.y + 60,
      width: ww,
      height: wh,
      backgroundColor: '#05070f',
      title: role === 'wall' ? 'DAY3 · WALL' : 'DAY3 · FLOOR',
      autoHideMenuBar: true,
      fullscreen: o.mode === 'fullscreen',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        additionalArguments: [`--day3-role=${role}`]
      }
    })
    forwardConsole(win, role)
    load(win, role)
    this.placeOnDisplay(win, o)
    this.wins[role] = win
  }

  private placeOnDisplay(win: BrowserWindow, o: Output): void {
    const displays = screen.getAllDisplays()
    const target = displays.find((d) => d.id === o.display) ?? screen.getPrimaryDisplay()
    if (o.mode === 'fullscreen') {
      win.setBounds(target.bounds)
      if (!win.isFullScreen()) win.setFullScreen(true)
    } else {
      if (win.isFullScreen()) win.setFullScreen(false)
      const [ww, wh] = windowedSize(o, target)
      win.setContentSize(ww, wh)
    }
  }

  private closeOutput(role: Role): void {
    const win = this.wins[role]
    if (win && !win.isDestroyed()) {
      win.close()
    }
    delete this.wins[role]
  }

  /** Danh sách màn hình để control panel render dropdown. */
  static listDisplays(): { id: number; label: string }[] {
    const primary = screen.getPrimaryDisplay().id
    return screen.getAllDisplays().map((d, i) => ({
      id: d.id,
      label: `Display ${i + 1} · ${d.size.width}×${d.size.height}${d.id === primary ? ' · Built-in' : ''}`
    }))
  }
}

export type { OutputKey }

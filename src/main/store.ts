// ============================================================================
// ShowStore — nguồn chân lý duy nhất về state, sống ở main process.
// Reducer + tick engine port từ `Day3 Control Panel.dc.html`.
// Renderer chỉ gửi Action; store áp dụng rồi broadcast snapshot.
// ============================================================================
import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import {
  Action,
  CONSTANTS,
  GlobalState,
  OSC,
  OSC_LOG_MAX,
  Output,
  Participant,
  PresetConfig,
  SceneSel,
  ShowState
} from '../shared/types'

type Listener = (state: ShowState) => void
type OscEmit = (addr: string, args: string) => void

function nowStamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) + '.' +
    String(d.getMilliseconds()).padStart(3, '0')
  )
}

function mkParticipant(name: string): Participant {
  return { name, state: 'idle', progress: 0, manual: false }
}

const DEFAULT_OUTPUTS: Output[] = [
  { key: 'wall', label: 'WALL', stream: 'Day3Wall', display: 0, displayLabel: 'Display 2 · 1920×1080', mode: 'fullscreen', open: false, resW: 10990, resH: 1080 },
  { key: 'floor', label: 'FLOOR', stream: 'Day3Floor', display: 0, displayLabel: 'Display 3 · 1920×1080', mode: 'fullscreen', open: false, resW: 4096, resH: 4096 }
]

function defaultState(): ShowState {
  const names = ['RIA', 'ANA', 'KAI', 'MINH', 'LEO', 'ZOE', 'NAM', 'EVA', 'DAO', 'IVY', 'THU', 'REN', 'LAN', 'VIN']
  return {
    participants: names.map(mkParticipant),
    namesText: names.join(', '),
    globalState: 'field',
    blacked: false,
    sceneSel: { wall: 'auto', floor: 'auto' },
    ascendX: 0.5,
    presets: [],
    outputs: DEFAULT_OUTPUTS.map((o) => ({ ...o })),
    ndi: { running: true, fps: 30 },
    oscPort: 9000,
    oscListening: true,
    oscLog: [],
    draftDuration: 30,
    autoAscend: false,
    ascendHold: 3,
    simulateTraffic: true
  }
}

export class ShowStore {
  private state: ShowState = defaultState()
  private listeners = new Set<Listener>()
  private oscEmit: OscEmit | null = null

  // bộ đếm phụ cho tick engine
  private tk = 0
  private doneMs = 0
  private settleTimer: NodeJS.Timeout | null = null
  private tickTimer: NodeJS.Timeout | null = null
  private presetsMap: Record<string, PresetConfig> = {}

  getState(): ShowState {
    return this.state
  }

  subscribe(cb: Listener): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  /** Cầu nối tới OSC service (Phase 3). Chưa nối thì action vẫn ghi log nội bộ. */
  setOscEmitter(fn: OscEmit): void {
    this.oscEmit = fn
  }

  private set(patch: Partial<ShowState>): void {
    this.state = { ...this.state, ...patch }
    this.emit()
  }

  private emit(): void {
    for (const cb of this.listeners) cb(this.state)
  }

  /** Ghi 1 dòng vào oscLog (ring buffer) + phát ra ngoài nếu là 'out'. */
  log(addr: string, args = '', dir: 'in' | 'out' = 'out'): void {
    const entry = { time: nowStamp(), addr, args: String(args), dir }
    const oscLog = [...this.state.oscLog.slice(-(OSC_LOG_MAX - 1)), entry]
    this.state = { ...this.state, oscLog }
    if (dir === 'out' && this.oscEmit) this.oscEmit(addr, String(args))
    this.emit()
  }

  // ---- vòng đời tick -------------------------------------------------------
  // ---- presets (lưu ra đĩa userData) --------------------------------------
  private presetsFile(): string {
    return join(app.getPath('userData'), 'day3-presets.json')
  }
  private loadPresetsFromDisk(): void {
    try {
      const f = this.presetsFile()
      if (existsSync(f)) this.presetsMap = JSON.parse(readFileSync(f, 'utf-8')) || {}
    } catch { this.presetsMap = {} }
    this.state = { ...this.state, presets: Object.keys(this.presetsMap).sort() }
  }
  private writePresetsToDisk(): void {
    try { writeFileSync(this.presetsFile(), JSON.stringify(this.presetsMap, null, 2)) } catch { /* ignore */ }
  }
  private snapshotConfig(): PresetConfig {
    const S = this.state
    return {
      namesText: S.namesText,
      sceneSel: { ...S.sceneSel },
      ascendX: S.ascendX,
      outputs: S.outputs.map((o) => ({ key: o.key, resW: o.resW, resH: o.resH, display: o.display, displayLabel: o.displayLabel, mode: o.mode })),
      ndiFps: S.ndi.fps,
      oscPort: S.oscPort,
      draftDuration: S.draftDuration
    }
  }
  private applyConfig(c: PresetConfig): void {
    const outputs = this.state.outputs.map((o) => {
      const p = c.outputs?.find((x) => x.key === o.key)
      return p ? { ...o, resW: p.resW, resH: p.resH, display: p.display, displayLabel: p.displayLabel, mode: p.mode } : o
    })
    const names = c.namesText.split(',').map((x) => x.trim()).filter(Boolean)
    this.set({
      namesText: c.namesText,
      participants: (names.length ? names : ['RIA']).map(mkParticipant),
      sceneSel: { ...c.sceneSel },
      ascendX: c.ascendX ?? 0.5,
      outputs,
      ndi: { ...this.state.ndi, fps: c.ndiFps ?? 60 },
      oscPort: c.oscPort ?? 9000,
      draftDuration: c.draftDuration ?? 30,
      globalState: 'field',
      blacked: false
    })
  }

  start(): void {
    this.loadPresetsFromDisk()
    this.log(OSC.boot, 'ready')
    this.log(OSC.osc, 'listening :' + this.state.oscPort)
    this.tickTimer = setInterval(() => this.tick(), CONSTANTS.TICK_MS)
  }

  stop(): void {
    if (this.tickTimer) clearInterval(this.tickTimer)
    if (this.settleTimer) clearTimeout(this.settleTimer)
  }

  private tick(): void {
    this.tk++
    const s = this.state

    if (s.globalState === 'field') {
      let changed = false
      const participants = s.participants.map((p) => {
        if (p.state === 'drafting' && !p.manual) {
          const np = Math.min(1, p.progress + 0.2 / Math.max(3, s.draftDuration))
          changed = true
          if (np >= 1) return { ...p, progress: 1, state: 'uploaded' as const }
          return { ...p, progress: np }
        }
        return p
      })
      if (changed) this.set({ participants })
    }

    // giả lập lưu lượng sensor khi chưa có thiết bị thật
    if (this.state.simulateTraffic && this.tk % 14 === 0) {
      const ps = this.state.participants
      if (ps.length && !this.state.blacked) {
        const p = ps[Math.floor(Math.random() * ps.length)]
        this.log(OSC.sensorSeat, p.name.toLowerCase() + ' weight=' + (0.4 + Math.random() * 0.6).toFixed(2), 'in')
      }
    }

    // auto-ascend
    const st = this.state
    if (
      st.globalState === 'field' &&
      st.autoAscend &&
      st.participants.length &&
      st.participants.every((p) => p.state === 'uploaded')
    ) {
      this.doneMs += CONSTANTS.TICK_MS
      if (this.doneMs >= st.ascendHold * 1000) {
        this.doneMs = 0
        this.ascend()
      }
    } else {
      this.doneMs = 0
    }
  }

  // ---- reducer -------------------------------------------------------------
  dispatch(a: Action): void {
    const S = this.state
    switch (a.type) {
      case 'setNamesText':
        this.set({ namesText: a.namesText })
        break
      case 'applyRoster': {
        const names = a.namesText.split(',').map((x) => x.trim()).filter(Boolean)
        const list = names.length ? names : ['RIA', 'ANA', 'KAI']
        this.doneMs = 0
        this.set({
          namesText: a.namesText,
          participants: list.map(mkParticipant),
          globalState: 'field',
          blacked: false
        })
        this.log(OSC.configParticipants, list.join(' '))
        break
      }
      case 'setDraftDuration':
        this.set({ draftDuration: Math.max(3, a.value || 30) })
        break
      case 'setAscendHold':
        this.set({ ascendHold: Math.max(0, a.value || 0) })
        break
      case 'setAutoAscend':
        this.set({ autoAscend: a.value })
        this.log(OSC.configAuto, a.value ? 'on' : 'off')
        break
      case 'sit': {
        if (S.globalState !== 'field') break
        const p = S.participants[a.index]
        if (!p || p.state !== 'idle') break
        const ps = S.participants.slice()
        ps[a.index] = { ...p, state: 'drafting', progress: 0, manual: false }
        this.set({ participants: ps })
        this.log(OSC.sit, 'seat=' + a.index)
        break
      }
      case 'complete': {
        if (S.globalState !== 'field') break
        const p = S.participants[a.index]
        if (!p || p.state === 'uploaded') break
        const ps = S.participants.slice()
        ps[a.index] = { ...p, state: 'uploaded', progress: 1, manual: false }
        this.set({ participants: ps })
        this.log(OSC.upload, 'seat=' + a.index + ' done')
        break
      }
      case 'setProgress': {
        if (S.globalState !== 'field') break
        const p = S.participants[a.index]
        if (!p) break
        const ps = S.participants.slice()
        const st: Participant['state'] = a.value >= 1 ? 'uploaded' : p.state === 'idle' ? 'drafting' : p.state
        ps[a.index] = { ...p, progress: a.value, manual: true, state: st }
        this.set({ participants: ps })
        this.log(OSC.progress, 'seat=' + a.index + ' pct=' + Math.round(a.value * 100))
        break
      }
      case 'setUploaded': {
        const p = S.participants[a.index]
        if (!p) break
        const ps = S.participants.slice()
        ps[a.index] = a.value
          ? { ...p, state: 'uploaded', progress: 1, manual: false }
          : { ...p, state: 'idle', progress: 0, manual: false }
        this.set({ participants: ps })
        this.log(a.value ? OSC.upload : OSC.reset, 'seat=' + a.index)
        break
      }
      case 'markAllUploaded':
        this.set({ participants: S.participants.map((p) => ({ ...p, state: 'uploaded', progress: 1, manual: false })) })
        this.log(OSC.upload, 'all')
        break
      case 'resetUploaded':
        this.set({ participants: S.participants.map((p) => ({ ...p, state: 'idle', progress: 0, manual: false })) })
        this.log(OSC.reset, 'floor')
        break
      case 'ascend':
        this.ascend()
        break
      case 'reset':
        this.reset()
        break
      case 'panic':
        this.set({ blacked: true })
        this.log(OSC.panic, 'FADE → BLACK')
        break
      case 'setOutput': {
        const o = S.outputs.slice()
        const cur = { ...o[a.index] } as Output
        if (a.key === 'display') {
          cur.display = a.value as number
          if (a.displayLabel) cur.displayLabel = a.displayLabel
        } else {
          cur.mode = a.value as Output['mode']
        }
        o[a.index] = cur
        this.set({ outputs: o })
        this.log(OSC.output + '/' + cur.key, cur.label.toLowerCase() + ' ' + String(a.value))
        break
      }
      case 'setResolution': {
        const o = S.outputs.slice()
        const cur = { ...o[a.index] }
        cur.resW = Math.max(64, Math.round(a.resW) || cur.resW)
        cur.resH = Math.max(64, Math.round(a.resH) || cur.resH)
        o[a.index] = cur
        this.set({ outputs: o })
        this.log(OSC.output + '/' + cur.key, cur.label.toLowerCase() + ' res ' + cur.resW + 'x' + cur.resH)
        break
      }
      case 'setScene': {
        this.set({ sceneSel: { ...S.sceneSel, [a.surface]: a.value } as SceneSel })
        this.log(OSC.output + '/' + a.surface, 'scene ' + a.value)
        break
      }
      case 'setAscendX': {
        this.set({ ascendX: Math.max(0, Math.min(1, a.value)) })
        break
      }
      case 'savePreset': {
        const name = a.name.trim()
        if (!name) break
        this.presetsMap[name] = this.snapshotConfig()
        this.writePresetsToDisk()
        this.set({ presets: Object.keys(this.presetsMap).sort() })
        this.log(OSC.boot, 'preset saved ' + name)
        break
      }
      case 'loadPreset': {
        const c = this.presetsMap[a.name]
        if (!c) break
        this.applyConfig(c)
        this.log(OSC.boot, 'preset loaded ' + a.name)
        break
      }
      case 'deletePreset': {
        if (!this.presetsMap[a.name]) break
        delete this.presetsMap[a.name]
        this.writePresetsToDisk()
        this.set({ presets: Object.keys(this.presetsMap).sort() })
        break
      }
      case 'toggleWindow': {
        const o = S.outputs.slice()
        o[a.index] = { ...o[a.index], open: !o[a.index].open }
        this.set({ outputs: o })
        const cur = o[a.index]
        this.log(OSC.window, cur.label.toLowerCase() + ' ' + (cur.open ? 'open' : 'close'))
        break
      }
      case 'toggleNdi':
        this.set({ ndi: { ...S.ndi, running: !S.ndi.running } })
        this.log(OSC.ndi, this.state.ndi.running ? 'on' : 'off')
        break
      case 'setNdiFps':
        this.set({ ndi: { ...S.ndi, fps: a.fps } })
        this.log(OSC.ndiFps, String(a.fps))
        break
      case 'setOscPort':
        this.set({ oscPort: a.port || 9000 })
        break
      case 'toggleListen':
        this.set({ oscListening: !S.oscListening })
        this.log(OSC.osc, this.state.oscListening ? 'listen' : 'stop')
        break
    }
  }

  private ascend(): void {
    if (this.state.globalState !== 'field') return
    this.set({
      participants: this.state.participants.map((p) => ({ ...p, state: 'uploaded', progress: 1, manual: false })),
      globalState: 'ascend'
    })
    this.log(OSC.ascend, 'all rising')
    if (this.settleTimer) clearTimeout(this.settleTimer)
    this.settleTimer = setTimeout(() => {
      if (this.state.globalState === 'ascend') this.set({ globalState: 'settled' as GlobalState })
      this.log(OSC.settled, 'the new house')
    }, CONSTANTS.ASCEND_HOLD_TO_SETTLE_MS)
  }

  private reset(): void {
    this.doneMs = 0
    if (this.settleTimer) clearTimeout(this.settleTimer)
    this.set({
      participants: this.state.participants.map((p) => ({ ...p, state: 'idle', progress: 0, manual: false })),
      globalState: 'field',
      blacked: false
    })
    this.log(OSC.reset, 'field cleared')
  }
}

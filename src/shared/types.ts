// ============================================================================
// DAY3 BLUEPRINT — shared types (nguồn chân lý về state & giao thức IPC/OSC)
// Khớp state shape trong prototype `Day3 Control Panel.dc.html`.
// ============================================================================

export type ParticipantState = 'idle' | 'drafting' | 'uploaded'
export type GlobalState = 'field' | 'ascend' | 'settled'
export type OutputMode = 'fullscreen' | 'windowed'
export type OutputKey = 'wall' | 'floor'

export interface Participant {
  name: string
  state: ParticipantState
  progress: number // 0..1
  manual: boolean // slider override → tạm dừng auto-fill
}

export interface Output {
  key: OutputKey
  label: string // 'TƯỜNG' | 'SÀN'
  stream: string // 'Day3Wall' | 'Day3Floor'
  display: number // id màn hình (electron display id), 0 = primary/tích hợp
  displayLabel: string
  mode: OutputMode
  open: boolean
  resW: number // độ phân giải render/NDI (px) — thiết kế scale đều vào đây
  resH: number
}

export interface NdiState {
  running: boolean
  fps: 30 | 60
}

export interface OscLogEntry {
  time: string // 'HH:MM:SS.mmm'
  addr: string // '/day3/...'
  args: string
  dir: 'in' | 'out'
}

export type WallSceneSel = 'auto' | 'blueprints' | 'drafting' | 'ascension' | 'off'
export type FloorSceneSel = 'auto' | 'house' | 'uploaded' | 'off'

export interface SceneSel {
  wall: WallSceneSel
  floor: FloorSceneSel
}

export interface ShowState {
  participants: Participant[]
  namesText: string
  globalState: GlobalState
  blacked: boolean
  sceneSel: SceneSel
  ascendX: number // vị trí điểm hút ngang của scene Ascend (0=trái, .5=giữa, 1=phải)
  presets: string[] // tên các preset đã lưu
  outputs: Output[]
  ndi: NdiState
  oscPort: number
  oscListening: boolean
  oscLog: OscLogEntry[] // ring buffer, giữ tối đa OSC_LOG_MAX dòng cuối
  draftDuration: number // giây
  autoAscend: boolean
  ascendHold: number // giây
  simulateTraffic: boolean
}

export const OSC_LOG_MAX = 80

// ---- Preset: snapshot cấu hình người dùng chỉnh ---------------------------
export interface PresetConfig {
  namesText: string
  sceneSel: SceneSel
  ascendX: number
  outputs: Array<Pick<Output, 'key' | 'resW' | 'resH' | 'display' | 'displayLabel' | 'mode'>>
  ndiFps: 30 | 60
  oscPort: number
  draftDuration: number
}

// ---- OSC address vocabulary (giữ nguyên làm giao thức thật) --------------
export const OSC = {
  boot: '/day3/boot',
  osc: '/day3/osc',
  configParticipants: '/day3/config/participants',
  configAuto: '/day3/config/auto',
  sit: '/day3/sit',
  upload: '/day3/upload',
  progress: '/day3/progress',
  ascend: '/day3/ascend',
  settled: '/day3/settled',
  reset: '/day3/reset',
  panic: '/day3/panic',
  output: '/day3/output', // + /<key>
  window: '/day3/window',
  ndi: '/day3/ndi',
  ndiFps: '/day3/ndi/fps',
  sensorSeat: '/day3/sensor/seat' // inbound
} as const

// ---- Actions gửi từ renderer → main qua IPC ------------------------------
export type Action =
  | { type: 'applyRoster'; namesText: string }
  | { type: 'setNamesText'; namesText: string }
  | { type: 'setDraftDuration'; value: number }
  | { type: 'setAscendHold'; value: number }
  | { type: 'setAutoAscend'; value: boolean }
  | { type: 'sit'; index: number }
  | { type: 'complete'; index: number }
  | { type: 'setProgress'; index: number; value: number } // 0..1, đánh dấu manual
  | { type: 'ascend' }
  | { type: 'reset' }
  | { type: 'panic' }
  | { type: 'setUploaded'; index: number; value: boolean } // Floor operator overlay
  | { type: 'markAllUploaded' }
  | { type: 'resetUploaded' }
  | { type: 'setOutput'; index: number; key: 'display' | 'mode'; value: number | OutputMode; displayLabel?: string }
  | { type: 'setResolution'; index: number; resW: number; resH: number }
  | { type: 'setScene'; surface: 'wall'; value: WallSceneSel }
  | { type: 'setScene'; surface: 'floor'; value: FloorSceneSel }
  | { type: 'setAscendX'; value: number }
  | { type: 'savePreset'; name: string }
  | { type: 'loadPreset'; name: string }
  | { type: 'deletePreset'; name: string }
  | { type: 'toggleWindow'; index: number }
  | { type: 'toggleNdi' }
  | { type: 'setNdiFps'; fps: 30 | 60 }
  | { type: 'setOscPort'; port: number }
  | { type: 'toggleListen' }

// ---- API expose qua contextBridge (window.day3) ---------------------------
export interface Day3Api {
  role: 'control' | 'wall' | 'floor'
  getState(): Promise<ShowState>
  dispatch(action: Action): void
  onState(cb: (state: ShowState) => void): () => void
}

export const CONSTANTS = {
  WALL_W: 10990,
  WALL_H: 1080,
  FLOOR_W: 4096,
  FLOOR_H: 4096,
  ASCEND_HOLD_TO_SETTLE_MS: 4200,
  TICK_MS: 200
} as const

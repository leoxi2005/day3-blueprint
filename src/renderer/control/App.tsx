import { useEffect, useState } from 'react'
import { useShowState } from '../shared/useShowState'
import { BADGE, MONO, SANS, STATE_COLOR, T } from '../shared/tokens'
import type { Action, Output, Participant, ShowState } from '../../shared/types'
import { OutputPreview } from './OutputPreview'

const WALL_SCENES = [
  { k: 'auto', l: 'AUTO' },
  { k: 'blueprints', l: 'BP' },
  { k: 'drafting', l: 'DRAFT' },
  { k: 'ascension', l: 'ASC' },
  { k: 'off', l: 'OFF' }
] as const
const FLOOR_SCENES = [
  { k: 'auto', l: 'AUTO' },
  { k: 'house', l: 'HOUSE' },
  { k: 'uploaded', l: 'UPLOAD' },
  { k: 'off', l: 'OFF' }
] as const

const d = window.day3.dispatch

// ---- primitives -----------------------------------------------------------
function Card(props: { title: string; right?: React.ReactNode; children: React.ReactNode; pad?: number }) {
  return (
    <div style={{ background: T.glass, border: `1px solid ${T.glassBorder}`, borderRadius: 14, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: props.pad ?? 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(185,166,255,.85)' }}>{props.title}</div>
        {props.right}
      </div>
      {props.children}
    </div>
  )
}

function seg(active: boolean, c: string): React.CSSProperties {
  return { flex: 1, padding: 8, borderRadius: 8, fontFamily: MONO, fontSize: 11, letterSpacing: '.1em', cursor: 'pointer', border: `1px solid ${active ? c + '88' : 'rgba(140,165,210,.18)'}`, background: active ? c + '18' : 'rgba(7,9,18,.4)', color: active ? c : T.muted }
}
function btn(c: string, disabled?: boolean): React.CSSProperties {
  return { flex: 1, padding: 9, borderRadius: 8, fontFamily: MONO, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', cursor: disabled ? 'default' : 'pointer', border: `1px solid ${disabled ? 'rgba(140,165,210,.14)' : c + '66'}`, background: disabled ? 'rgba(7,9,18,.3)' : c + '14', color: disabled ? '#3f465e' : c }
}

function ParticipantCard({ p, i }: { p: Participant; i: number }) {
  const c = STATE_COLOR[p.state]
  const pct = Math.round(p.progress * 100)
  const sitDis = p.state !== 'idle'
  const compDis = p.state === 'uploaded'
  return (
    <div style={{ background: T.glass, border: `1px solid ${p.state === 'idle' ? T.glassBorder : c + '66'}`, borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 11, boxShadow: p.state === 'uploaded' ? '0 0 22px rgba(241,200,117,.10)' : p.state === 'drafting' ? '0 0 22px rgba(91,232,255,.10)' : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{p.name}</div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', padding: '4px 9px', borderRadius: 6, color: c, border: `1px solid ${c}55`, background: c + '14', whiteSpace: 'nowrap' }}>{BADGE[p.state]}</div>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', color: T.dim, marginBottom: 6 }}>
          <span>PROGRESS</span>
          <span style={{ color: c, fontWeight: 700 }}>{pct}%</span>
        </div>
        <div style={{ height: 10, borderRadius: 5, background: 'rgba(140,165,210,.10)', overflow: 'hidden' }}>
          <div style={{ width: pct + '%', height: '100%', background: c, borderRadius: 5, boxShadow: `0 0 10px ${c}88`, transition: 'width .2s linear' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button disabled={sitDis} onClick={() => d({ type: 'sit', index: i })} style={btn(T.cyan, sitDis)}>Sit</button>
        <button disabled={compDis} onClick={() => d({ type: 'complete', index: i })} style={btn(T.gold, compDis)}>Complete</button>
      </div>
      <input type="range" min={0} max={100} value={pct} onChange={(e) => d({ type: 'setProgress', index: i, value: (parseInt(e.target.value) || 0) / 100 })} style={{ width: '100%', accentColor: c }} />
    </div>
  )
}

// ---- Outputs: ô PREVIEW (monitor + scene + resolution + cửa sổ) -----------
function sceneBtn(active: boolean, k: string): React.CSSProperties {
  const c = k === 'off' ? T.danger : k === 'auto' ? T.violet : T.cyan
  return { flex: '1 0 auto', padding: '6px 0', borderRadius: 7, fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', cursor: 'pointer', border: `1px solid ${active ? c + '99' : 'rgba(140,165,210,.18)'}`, background: active ? c + '22' : 'rgba(7,9,18,.4)', color: active ? c : T.muted, boxShadow: active ? `0 0 12px ${c}33` : 'none' }
}

// Ô nhập độ phân giải: gõ tự do, chỉ áp dụng (dispatch) khi blur / Enter → không churn NDI từng ký tự.
function ResInput({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
  const [txt, setTxt] = useState(String(value))
  useEffect(() => { setTxt(String(value)) }, [value])
  const style: React.CSSProperties = { width: '100%', background: 'rgba(7,9,18,.6)', border: `1px solid ${T.glassBorder}`, borderRadius: 7, color: T.text, fontFamily: MONO, fontSize: 11, padding: '6px 8px', outline: 'none' }
  const commit = (): void => {
    const n = parseInt(txt)
    if (n && n >= 64) onCommit(n)
    else setTxt(String(value))
  }
  return (
    <input
      type="number"
      min={64}
      value={txt}
      onChange={(e) => setTxt(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      style={style}
    />
  )
}

function PreviewBox({ S, displays, enabled, onToggle }: { S: ShowState; displays: { id: number; label: string }[]; enabled: boolean; onToggle: () => void }) {

  const surfaceRow = (o: Output, i: number, surface: 'wall' | 'floor', w: number) => {
    const sel = S.sceneSel[surface]
    const opts = surface === 'wall' ? WALL_SCENES : FLOOR_SCENES
    return (
      <div key={o.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: MONO, fontSize: 12, letterSpacing: '.18em', fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: o.open ? T.green : T.dim, boxShadow: o.open ? `0 0 8px ${T.green}` : 'none' }} />
            {o.label}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', color: o.open ? T.green : T.dim }}>{o.open ? (o.mode === 'fullscreen' ? 'FULLSCREEN' : 'WINDOWED') : 'CLOSED'}</div>
        </div>

        <OutputPreview S={S} surface={surface} width={w} enabled={enabled} />

        {/* Scene: click chọn tay / AUTO / OFF */}
        <div>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: T.dim, margin: '0 0 5px' }}>SCENE</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {opts.map((op) => (
              <button key={op.k} onClick={() => d({ type: 'setScene', surface, value: op.k } as Action)} style={sceneBtn(sel === op.k, op.k)}>{op.l}</button>
            ))}
          </div>
        </div>

        {/* Ascend: điểm hút qua trái ⟷ phải (chỉ tường) */}
        {surface === 'wall' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 5px' }}>
              <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: T.dim }}>ASCEND · ĐIỂM HÚT ◄ ►</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: T.muted }}>{Math.round(S.ascendX * 100)}%</span>
            </div>
            <input type="range" min={0} max={100} value={Math.round(S.ascendX * 100)} onChange={(e) => d({ type: 'setAscendX', value: (parseInt(e.target.value) || 0) / 100 })} style={{ width: '100%', accentColor: T.violet }} />
          </div>
        )}

        {/* Resolution */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 5px' }}>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.16em', color: T.dim }}>RESOLUTION</span>
            <button onClick={() => d({ type: 'setResolution', index: i, resW: surface === 'wall' ? 10990 : 4096, resH: surface === 'wall' ? 1080 : 4096 })} style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', color: T.muted, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>NATIVE ↺</button>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <ResInput value={o.resW} onCommit={(n) => d({ type: 'setResolution', index: i, resW: n, resH: o.resH })} />
            <span style={{ color: T.dim, fontFamily: MONO, fontSize: 11 }}>×</span>
            <ResInput value={o.resH} onCommit={(n) => d({ type: 'setResolution', index: i, resW: o.resW, resH: n })} />
          </div>
        </div>

        {/* Window + display */}
        <div style={{ display: 'flex', gap: 6 }}>
          <select value={o.display} onChange={(e) => { const id = parseInt(e.target.value); const lbl = displays.find((x) => x.id === id)?.label; d({ type: 'setOutput', index: i, key: 'display', value: id, displayLabel: lbl }) }} style={{ flex: 1, minWidth: 0, background: 'rgba(7,9,18,.6)', border: `1px solid ${T.glassBorder}`, borderRadius: 7, color: T.text, fontFamily: MONO, fontSize: 11, padding: '7px 9px', outline: 'none', cursor: 'pointer' }}>
            {displays.map((disp) => (<option key={disp.id} value={disp.id}>{disp.label}</option>))}
          </select>
          <button onClick={() => d({ type: 'setOutput', index: i, key: 'mode', value: o.mode === 'fullscreen' ? 'windowed' : 'fullscreen' })} style={{ ...seg(false, T.cyan), flex: '0 0 auto', padding: '6px 10px', fontSize: 10 }}>{o.mode === 'fullscreen' ? 'FS' : 'WIN'}</button>
          <button onClick={() => d({ type: 'toggleWindow', index: i })} style={{ flex: '0 0 auto', padding: '6px 12px', borderRadius: 7, fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', border: `1px solid ${o.open ? 'rgba(232,138,128,.5)' : 'rgba(91,232,255,.5)'}`, background: o.open ? 'rgba(232,138,128,.1)' : 'rgba(91,232,255,.1)', color: o.open ? T.danger : T.cyan }}>{o.open ? 'Close' : 'Open'}</button>
        </div>
      </div>
    )
  }
  return (
    <div style={{ background: 'rgba(7,9,18,.32)', border: '1px solid rgba(140,165,210,.16)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.18em', color: T.violet }}>PREVIEW</div>
        <button onClick={onToggle} style={{ padding: '5px 12px', borderRadius: 7, fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', cursor: 'pointer', border: `1px solid ${enabled ? T.cyan + '88' : 'rgba(140,165,210,.18)'}`, background: enabled ? T.cyan + '18' : 'rgba(7,9,18,.4)', color: enabled ? T.cyan : T.muted }}>{enabled ? 'ON' : 'OFF'}</button>
      </div>
      {surfaceRow(S.outputs[0], 0, 'wall', 300)}
      <div style={{ height: 1, background: 'rgba(140,165,210,.1)' }} />
      {surfaceRow(S.outputs[1], 1, 'floor', 170)}
    </div>
  )
}

// ---- Outputs: ô NDI -------------------------------------------------------
function NdiBox({ S }: { S: ShowState }) {
  const [avail, setAvail] = useState<boolean | null>(null)
  const [spoutAvail, setSpoutAvail] = useState<boolean | null>(null)
  useEffect(() => { window.day3ndi.available().then(setAvail); window.day3spout.available().then(setSpoutAvail) }, [])
  const fpsBtn = (f: 30 | 60) => (
    <button onClick={() => d({ type: 'setNdiFps', fps: f })} style={{ flex: 1, padding: '8px 0', borderRadius: 7, fontFamily: MONO, fontSize: 12, cursor: 'pointer', border: `1px solid ${S.ndi.fps === f ? T.cyan + '88' : 'rgba(140,165,210,.18)'}`, background: S.ndi.fps === f ? T.cyan + '18' : 'rgba(7,9,18,.4)', color: S.ndi.fps === f ? T.cyan : T.muted }}>{f}</button>
  )
  return (
    <div style={{ background: 'rgba(7,9,18,.32)', border: '1px solid rgba(140,165,210,.16)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.18em', color: T.violet }}>NDI OUTPUT</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: S.ndi.running ? T.green : T.dim }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: S.ndi.running ? T.green : T.dim, boxShadow: S.ndi.running ? `0 0 8px ${T.green}` : 'none', animation: S.ndi.running ? 'pulseDot 1.6s ease-in-out infinite' : 'none' }} />
          {S.ndi.running ? 'STREAMING' : 'STOPPED'}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {S.outputs.map((o) => (
          <div key={o.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 11px', borderRadius: 8, background: 'rgba(4,6,13,.5)', border: '1px solid rgba(140,165,210,.12)' }}>
            <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.14em', color: T.text }}>{o.stream}</span>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: S.ndi.running ? T.green : T.dim }}>{S.ndi.running ? S.ndi.fps + 'fps' : '—'}</span>
          </div>
        ))}
      </div>
      <button disabled={avail === false} onClick={() => d({ type: 'toggleNdi' })} style={{ width: '100%', padding: '11px 0', borderRadius: 8, fontFamily: MONO, fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', cursor: avail === false ? 'default' : 'pointer', border: `1px solid ${avail === false ? 'rgba(140,165,210,.14)' : S.ndi.running ? 'rgba(232,138,128,.5)' : 'rgba(91,232,255,.5)'}`, background: avail === false ? 'rgba(7,9,18,.3)' : S.ndi.running ? 'rgba(232,138,128,.1)' : 'rgba(91,232,255,.1)', color: avail === false ? '#3f465e' : S.ndi.running ? T.danger : T.cyan }}>{S.ndi.running ? 'Stop NDI' : 'Start NDI'}</button>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', color: avail === false ? T.danger : T.dim, textAlign: 'center' }}>
        {avail === false ? 'NATIVE MODULE MISSING' : ''}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', color: T.dim, paddingRight: 2 }}>FPS</span>
        {fpsBtn(30)}
        {fpsBtn(60)}
      </div>

      {/* Spout (Windows GPU, song song NDI) */}
      <div style={{ height: 1, background: 'rgba(140,165,210,.12)', margin: '2px 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.18em', color: T.violet }}>SPOUT <span style={{ color: T.dim, fontSize: 9 }}>· GPU</span></div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: S.spoutRunning ? T.green : T.dim }}>{spoutAvail === false ? 'WINDOWS ONLY' : S.spoutRunning ? 'STREAMING' : 'STOPPED'}</div>
      </div>
      <button disabled={spoutAvail === false} onClick={() => d({ type: 'toggleSpout' })} style={{ width: '100%', padding: '10px 0', borderRadius: 8, fontFamily: MONO, fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', cursor: spoutAvail === false ? 'default' : 'pointer', border: `1px solid ${spoutAvail === false ? 'rgba(140,165,210,.14)' : S.spoutRunning ? 'rgba(232,138,128,.5)' : 'rgba(185,166,255,.5)'}`, background: spoutAvail === false ? 'rgba(7,9,18,.3)' : S.spoutRunning ? 'rgba(232,138,128,.1)' : 'rgba(185,166,255,.12)', color: spoutAvail === false ? '#3f465e' : S.spoutRunning ? T.danger : T.violet }}>{S.spoutRunning ? 'Stop Spout' : 'Start Spout'}</button>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', color: T.dim, textAlign: 'center' }}>
        {spoutAvail === false ? 'chỉ chạy trên Windows' : 'TouchDesigner → Spout In (GPU, full-res mượt)'}
      </div>
    </div>
  )
}

// ---- Presets: lưu/nạp toàn bộ cấu hình ------------------------------------
function PresetsCard({ S }: { S: ShowState }) {
  const [name, setName] = useState('')
  const save = (): void => {
    const n = name.trim()
    if (!n) return
    d({ type: 'savePreset', name: n })
    setName('')
  }
  return (
    <Card title="Presets">
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={name} placeholder="Tên preset…" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save() }} style={{ flex: 1, minWidth: 0, background: 'rgba(7,9,18,.6)', border: `1px solid ${T.glassBorder}`, borderRadius: 8, color: T.text, fontFamily: MONO, fontSize: 12, padding: '9px 11px', outline: 'none' }} />
        <button onClick={save} style={{ flex: '0 0 auto', padding: '9px 18px', borderRadius: 8, border: '1px solid rgba(110,231,168,.5)', background: 'rgba(110,231,168,.1)', color: T.green, fontFamily: MONO, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', cursor: 'pointer' }}>Save</button>
      </div>
      {S.presets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
          {S.presets.map((p) => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(7,9,18,.4)', border: '1px solid rgba(140,165,210,.16)' }}>
              <span style={{ flex: 1, minWidth: 0, fontFamily: MONO, fontSize: 12, letterSpacing: '.06em', color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p}</span>
              <button onClick={() => d({ type: 'loadPreset', name: p })} style={{ flex: '0 0 auto', padding: '6px 14px', borderRadius: 7, border: '1px solid rgba(91,232,255,.5)', background: 'rgba(91,232,255,.1)', color: T.cyan, fontFamily: MONO, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer' }}>Load</button>
              <button onClick={() => d({ type: 'deletePreset', name: p })} title="Xóa" style={{ flex: '0 0 auto', width: 26, height: 26, borderRadius: 7, border: '1px solid rgba(232,138,128,.4)', background: 'rgba(200,70,60,.08)', color: T.danger, fontSize: 14, lineHeight: 1, cursor: 'pointer' }}>×</button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export function App() {
  const S = useShowState()
  const [displays, setDisplays] = useState<{ id: number; label: string }[]>([])
  const [preview, setPreview] = useState(true)

  useEffect(() => { window.day3displays().then(setDisplays) }, [])

  if (!S) return <div style={{ color: T.muted, fontFamily: MONO, padding: 40 }}>Connecting…</div>

  const ok = T.green
  const sync: { label: string; c: string }[] = [
    { label: 'WALL ' + (S.outputs[0].open ? 'OPEN' : 'CLOSED'), c: S.outputs[0].open ? ok : T.dim },
    { label: 'FLOOR ' + (S.outputs[1].open ? 'OPEN' : 'CLOSED'), c: S.outputs[1].open ? ok : T.dim },
    { label: S.ndi.running ? 'NDI ' + S.ndi.fps + 'FPS' : 'NDI STOPPED', c: S.ndi.running ? ok : T.dim }
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(1400px 900px at 28% -12%, #0c1020 0%, #070912 62%)', color: T.text, fontFamily: SANS, padding: '20px 20px 62px', minWidth: 1240 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18, gap: 20 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(185,166,255,.85)' }}>DAY3 BLUEPRINT · WORLD 3 · NIGHT FINALE</div>
          <div style={{ fontSize: 23, fontWeight: 800, marginTop: 5, textShadow: '0 0 26px rgba(91,232,255,.16)' }}>Operator Control Panel</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px,32%) 1fr', gap: 16, alignItems: 'start' }}>
        {/* left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="Roster">
            <label style={{ display: 'block', fontFamily: MONO, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: T.dim, margin: '0 0 6px' }}>Participants — comma separated</label>
            <textarea value={S.namesText} onChange={(e) => d({ type: 'setNamesText', namesText: e.target.value })} style={{ width: '100%', background: 'rgba(7,9,18,.6)', border: `1px solid ${T.glassBorder}`, borderRadius: 8, color: T.text, fontFamily: MONO, fontSize: 13, padding: '9px 11px', outline: 'none', resize: 'none', height: 64, lineHeight: 1.6 }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button onClick={() => d({ type: 'applyRoster', namesText: S.namesText })} style={{ flex: 1, padding: 11, borderRadius: 9, border: '1px solid rgba(91,232,255,.5)', background: 'rgba(91,232,255,.08)', color: T.cyan, fontFamily: MONO, fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', cursor: 'pointer' }}>Apply Roster</button>
              <button onClick={() => d({ type: 'reset' })} style={{ flex: '0 0 auto', padding: '11px 20px', borderRadius: 9, border: '1px solid rgba(140,165,210,.28)', background: 'rgba(7,9,18,.4)', color: T.muted, fontFamily: MONO, fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', cursor: 'pointer' }}>Reset</button>
            </div>
          </Card>

          <PresetsCard S={S} />

        </div>

        {/* right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="Outputs">
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 12 }}>
              <PreviewBox S={S} displays={displays} enabled={preview} onToggle={() => setPreview((v) => !v)} />
              <NdiBox S={S} />
            </div>
          </Card>

          <Card title="Participants Board" right={<div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.14em', color: T.dim }}>{S.participants.length} SEATS</div>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(205px,1fr))', gap: 12 }}>
              {S.participants.map((p, i) => (<ParticipantCard key={i} p={p} i={i} />))}
            </div>
          </Card>
        </div>
      </div>

      {/* sync bar */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, height: 38, display: 'flex', alignItems: 'center', gap: 24, padding: '0 22px', background: 'rgba(8,11,20,.94)', borderTop: '1px solid rgba(140,165,210,.18)', backdropFilter: 'blur(12px)', fontFamily: MONO, fontSize: 10, letterSpacing: '.13em', color: T.muted, zIndex: 20 }}>
        {sync.map((s, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.c, boxShadow: `0 0 8px ${s.c}` }} />
            {s.label}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', color: '#4a5170', letterSpacing: '.2em', whiteSpace: 'nowrap' }}>DAY3 BLUEPRINT · OPERATOR CONSOLE</span>
      </div>
    </div>
  )
}

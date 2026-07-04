import { useEffect, useMemo, useRef } from 'react'
import { MONO } from '../../shared/tokens'
import { CONSTANTS, Participant } from '../../../shared/types'

const DW = CONSTANTS.FLOOR_W
const DH = CONSTANTS.FLOOR_H

const FLOOR_BG =
  'radial-gradient(2400px 2400px at 50% 50%, rgba(241,200,117,.1), transparent 58%),radial-gradient(2600px 2000px at 22% 14%, rgba(185,166,255,.12), transparent 60%),radial-gradient(2400px 2000px at 82% 86%, rgba(91,232,255,.1), transparent 60%),#080b16'

function buildModel(names: string[], W: number, H: number) {
  const CX = W / 2
  const CY = H / 2
  const R = Math.min(W, H) * 0.349 // 1430/4096
  const N = Math.max(1, names.length)
  return names.map((name, i) => {
    const th = -Math.PI / 2 + i * (2 * Math.PI / N)
    const cx = CX + R * Math.cos(th)
    const cy = CY + R * Math.sin(th)
    const kb = String(8 + ((i * 7) % 28)).padStart(3, '0') + 'KB'
    const ax = cx + (CX - cx) * 0.16
    const ay = cy + (CY - cy) * 0.16
    return { idx: i, name, kb, th, cx, cy, ax, ay, rotDeg: th * 180 / Math.PI + 90 }
  })
}

type Model = ReturnType<typeof buildModel>

function useUploadedCanvas(model: Model, upRef: React.MutableRefObject<boolean[]>, W: number, H: number) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    cv.width = W
    cv.height = H
    const ctx = cv.getContext('2d')!
    const CX = W / 2
    const CY = H / 2
    const GD = '241,200,117'
    const M = model
    const stars: { x: number; y: number; r: number; ph: number; tw: number; spark: boolean }[] = []
    const nStars = Math.min(1700, Math.max(300, Math.round(1400 * (W * H) / (DW * DH))))
    for (let i = 0; i < nStars; i++) {
      const spark = Math.random() < 0.05
      stars.push({ x: Math.random() * W, y: Math.random() * H, r: (spark ? 1.4 : 0.5) + Math.random() * 1.7, ph: Math.random() * 6.28, tw: 0.5 + Math.random() * 1.5, spark })
    }
    const ease = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
    const off = M.map((_, i) => (i * 0.618) % 1)
    const RATE = 0.34
    const t0 = performance.now()
    let raf = 0
    const draw = (now: number): void => {
      const t = (now - t0) / 1000
      const up = upRef.current || []
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = 'rgb(207,224,255)'
      ctx.strokeStyle = 'rgb(222,236,255)'
      ctx.lineWidth = 1
      for (const s of stars) {
        const raw = Math.max(0, Math.sin(t * s.tw + s.ph))
        const tw3 = raw * raw * raw
        ctx.globalAlpha = (0.14 + 0.72 * tw3) * (0.4 + s.r * 0.28)
        ctx.fillRect(s.x - s.r * 0.5, s.y - s.r * 0.5, s.r, s.r)
        if (s.spark && tw3 > 0.18) {
          const len = s.r * (2 + tw3 * 8)
          ctx.globalAlpha = 0.55 * tw3
          ctx.beginPath()
          ctx.moveTo(s.x - len, s.y)
          ctx.lineTo(s.x + len, s.y)
          ctx.moveTo(s.x, s.y - len)
          ctx.lineTo(s.x, s.y + len)
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
      for (const c of M) {
        ctx.strokeStyle = 'rgba(' + GD + ',' + (up[c.idx] ? 0.1 : 0.04) + ')'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(c.ax, c.ay)
        ctx.lineTo(CX, CY)
        ctx.stroke()
      }
      let hubEnergy = 0
      for (let i = 0; i < M.length; i++) {
        if (!up[i]) continue
        const c = M[i]
        const phase = (t * RATE + off[i]) % 1
        const e = ease(phase)
        const px = c.ax + (CX - c.ax) * e
        const py = c.ay + (CY - c.ay) * e
        if (phase < 0.1) {
          const pp = 1 - phase / 0.1
          ctx.strokeStyle = 'rgba(' + GD + ',' + (0.5 * pp).toFixed(3) + ')'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(c.ax, c.ay, 20 + (1 - pp) * 40, 0, 6.283)
          ctx.stroke()
        }
        const te = ease(Math.max(0, phase - 0.05))
        const tx = c.ax + (CX - c.ax) * te
        const ty = c.ay + (CY - c.ay) * te
        ctx.strokeStyle = 'rgba(' + GD + ',0.5)'
        ctx.lineWidth = 4
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(tx, ty)
        ctx.lineTo(px, py)
        ctx.stroke()
        const sz = 16
        ctx.save()
        ctx.translate(px, py)
        ctx.shadowColor = 'rgba(' + GD + ',0.9)'
        ctx.shadowBlur = 26
        ctx.strokeStyle = '#f7d98f'
        ctx.lineWidth = 5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(-sz * 0.7, 0)
        ctx.lineTo(-sz * 0.15, sz * 0.55)
        ctx.lineTo(sz * 0.75, -sz * 0.6)
        ctx.stroke()
        ctx.restore()
        if (phase > 0.9) hubEnergy += (phase - 0.9) / 0.1
      }
      const anyUp = up.some(Boolean)
      const base = (anyUp ? 0.34 : 0.14) + 0.16 * Math.sin(t * 1.6) + Math.min(0.5, hubEnergy * 0.18)
      for (let k = 0; k < 3; k++) {
        const rr = 360 + k * 70 + Math.sin(t * 1.2 + k) * 10
        ctx.strokeStyle = 'rgba(' + GD + ',' + (base * (1 - k * 0.26)).toFixed(3) + ')'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(CX, CY, rr, 0, 6.283)
        ctx.stroke()
      }
      if (anyUp) {
        const rip = (t * 0.6) % 1
        ctx.strokeStyle = 'rgba(' + GD + ',' + (0.3 * (1 - rip)).toFixed(3) + ')'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.arc(CX, CY, 360 + rip * 260, 0, 6.283)
        ctx.stroke()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [model, W, H])
  return ref
}

export function Uploaded({ participants, W = DW, H = DH }: { participants: Participant[]; W?: number; H?: number }) {
  const k = Math.min(W / DW, H / DH)
  const names = participants.map((p) => p.name)
  const model = useMemo(() => buildModel(names, W, H), [names.join('|'), W, H])
  const upRef = useRef<boolean[]>([])
  upRef.current = participants.map((p) => p.state === 'uploaded')
  const canvasRef = useUploadedCanvas(model, upRef, W, H)
  const upCount = upRef.current.filter(Boolean).length
  const total = participants.length

  return (
    <div style={{ position: 'absolute', inset: 0, background: FLOOR_BG, animation: 'sceneIn .6s ease' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }} />

      {/* center hub */}
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%,-50%) scale(${k})`, zIndex: 3, width: 760, height: 760, borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', border: '1px solid rgba(241,200,117,.3)', background: 'radial-gradient(closest-side, rgba(20,26,44,.82), rgba(9,13,26,.55))', boxShadow: '0 0 90px rgba(241,200,117,.16), inset 0 0 80px rgba(241,200,117,.08)' }}>
        <div style={{ fontFamily: MONO, fontSize: 200, fontWeight: 700, lineHeight: 1, color: '#f1c875', textShadow: '0 0 60px rgba(241,200,117,.5)' }}>{upCount}<span style={{ fontSize: 96, color: 'rgba(241,200,117,.5)' }}>/{total}</span></div>
        <div style={{ fontFamily: MONO, fontSize: 38, letterSpacing: '.34em', color: '#f1c875', marginTop: 20 }}>BLUEPRINTS UPLOADED</div>
        <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: '.22em', color: 'rgba(141,150,179,.7)', marginTop: 26, display: 'flex', alignItems: 'center', gap: 14 }}><span style={{ width: 16, height: 16, borderRadius: '50%', background: '#6ee7a8', boxShadow: '0 0 16px #6ee7a8' }} />RECEIVING · LIVE</div>
      </div>

      {/* radial cards */}
      {model.map((c) => {
        const isUp = upRef.current[c.idx]
        const AC = isUp ? '#f1c875' : '#5be8ff'
        return (
          <div key={c.idx} style={{ position: 'absolute', left: c.cx, top: c.cy, ['--rot' as string]: c.rotDeg + 'deg', transform: `translate(-50%,-50%) rotate(${c.rotDeg}deg)`, zIndex: 4, animation: `floatyF ${7 + (c.idx % 5) * 0.6}s ease-in-out ${-c.idx * 0.7}s infinite` }}>
            <div style={{ width: 560, transform: `scale(${k})`, padding: '40px 44px', borderRadius: 26, border: `1px solid ${isUp ? 'rgba(241,200,117,.4)' : 'rgba(91,232,255,.32)'}`, background: 'linear-gradient(158deg, rgba(22,24,34,.9), rgba(12,14,24,.85))', boxShadow: `0 20px 60px rgba(0,0,0,.55), 0 0 40px ${isUp ? 'rgba(241,200,117,.14)' : 'rgba(91,232,255,.1)'}, inset 0 1px 0 rgba(255,255,255,.08)`, transition: 'border-color .4s, box-shadow .4s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
                <div style={{ color: AC, flex: '0 0 auto', filter: `drop-shadow(0 0 10px ${isUp ? 'rgba(241,200,117,.5)' : 'rgba(91,232,255,.45)'})` }}>
                  <svg width="64" height="53" viewBox="0 0 36 30" style={{ display: 'block' }}><path d="M2 6.5 a3.5 3.5 0 0 1 3.5 -3.5 h8.5 l3.2 4.2 h13.3 a3.5 3.5 0 0 1 3.5 3.5 v13.3 a3.5 3.5 0 0 1 -3.5 3.5 h-24.8 a3.5 3.5 0 0 1 -3.5 -3.5 z" fill="currentColor" fillOpacity="0.95" /></svg>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 44, fontWeight: 700, color: '#eef1f8', whiteSpace: 'nowrap', letterSpacing: '.01em' }}>{c.name}&apos;s Blueprint</div>
                  <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: '.14em', color: '#5b6280', marginTop: 8 }}>{c.kb}</div>
                </div>
              </div>
              {isUp ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 30 }}>
                    <div style={{ width: 52, height: 52, flex: '0 0 auto', borderRadius: '50%', border: '2.5px solid #f1c875', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 18px rgba(241,200,117,.45)' }}>
                      <svg width="30" height="30" viewBox="0 0 24 24" style={{ display: 'block' }}><path d="M6 12.5 l4 4 l8 -9" fill="none" stroke="#f1c875" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="26" style={{ animation: 'tickdraw 3s ease-in-out infinite' }} /></svg>
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 34, letterSpacing: '.06em', color: '#f1c875' }}>Uploaded</span>
                  </div>
                  <div style={{ marginTop: 26, height: 16, borderRadius: 8, background: 'rgba(241,200,117,.14)', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: 8, background: 'linear-gradient(90deg, rgba(241,200,117,.6), #f1c875)', boxShadow: '0 0 16px rgba(241,200,117,.5)' }} />
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '38%', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)', animation: 'shimmermove 2.4s linear infinite' }} />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 30 }}>
                    <div style={{ width: 52, height: 52, flex: '0 0 auto', color: '#5be8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="34" height="34" viewBox="0 0 22 22" style={{ display: 'block', animation: 'spin 1.1s linear infinite' }}><circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeOpacity="0.22" /><path d="M11 3 a8 8 0 0 1 8 8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 34, letterSpacing: '.06em', color: '#5be8ff' }}>Drafting…</span>
                  </div>
                  <div style={{ marginTop: 26, height: 16, borderRadius: 8, background: 'rgba(91,232,255,.12)', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%', borderRadius: 8, background: 'linear-gradient(90deg,transparent,rgba(91,232,255,.75),transparent)', animation: 'indet 1.8s ease-in-out infinite' }} />
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })}

    </div>
  )
}

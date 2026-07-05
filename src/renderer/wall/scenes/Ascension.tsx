import { useEffect, useMemo, useRef } from 'react'
import { MONO } from '../../shared/tokens'
import { CONSTANTS } from '../../../shared/types'

const DW = CONSTANTS.WALL_W
const DH = CONSTANTS.WALL_H
const CYCLE = 12

const ASC_BG =
  'radial-gradient(2100px 1300px at 50% -18%, rgba(91,232,255,.22), transparent 58%),radial-gradient(1700px 1100px at 16% 24%, rgba(150,120,255,.18), transparent 62%),radial-gradient(1700px 1100px at 86% 74%, rgba(60,180,235,.14), transparent 62%),radial-gradient(2200px 1400px at 50% 134%, rgba(12,20,48,.66), transparent 72%),linear-gradient(180deg,#0a1022 0%,#070b16 60%,#04060e 100%)'

function buildCards(baseNames: string[], W: number, H: number, cx: number) {
  const PX = W * cx
  const PY = H * 0.157
  const base = baseNames.length ? baseNames : ['RIA', 'ANA', 'KAI']
  const target = base.length >= 12 ? base.length : 24 // giữ mật độ dòng chảy khi roster nhỏ
  const names = Array.from({ length: target }, (_, i) => base[i % base.length])
  const N = names.length
  const spanL = W * 0.051
  const spanR = W - spanL
  const step = (spanR - spanL) / (N - 1)
  return names.map((name, i) => {
    const x = spanL + i * step
    const sy = H * (0.407 + (i % 3) * 0.139)
    const kb = String(8 + ((i * 7) % 28)).padStart(3, '0') + 'KB'
    const delay = -(i / N) * CYCLE
    return { name, kb, x, sy, dx: PX - x, dy: PY - sy, delay }
  })
}

function useAscensionCanvas(W: number, H: number, cxRef: React.MutableRefObject<number>) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    cv.width = W
    cv.height = H
    const ctx = cv.getContext('2d')!
    const PY = H * 0.157
    const nStars = Math.min(2000, Math.max(400, Math.round(1750 * (W * H) / (DW * DH))))
    const nDust = Math.min(320, Math.max(60, Math.round(260 * (W * H) / (DW * DH))))
    const stars: { x: number; y: number; r: number; ph: number; tw: number; sp: number; spark: boolean }[] = []
    for (let i = 0; i < nStars; i++) {
      const d = Math.random()
      const spark = Math.random() < 0.05
      stars.push({ x: Math.random() * W, y: Math.random() * H, r: (spark ? 1.4 : 0.4) + d * 1.9, ph: Math.random() * 6.28, tw: 0.5 + Math.random() * 1.4, sp: 1 + d * 6, spark })
    }
    const dust: { x: number; y: number; r: number; v: number; solid: string }[] = []
    for (let i = 0; i < nDust; i++) dust.push({ x: Math.random() * W, y: Math.random() * H, r: 0.6 + Math.random() * 1.8, v: 20 + Math.random() * 54, solid: Math.random() < 0.5 ? 'rgb(241,200,117)' : 'rgb(150,214,255)' })
    let last = performance.now()
    const t0 = last
    let raf = 0
    const draw = (now: number): void => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = (now - t0) / 1000
      const PX = W * cxRef.current // đọc điểm hút live (không restart canvas)
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = 'rgb(216,234,255)'
      ctx.strokeStyle = 'rgb(230,242,255)'
      ctx.lineWidth = 1
      for (const s of stars) {
        s.x -= s.sp * dt * 0.5
        if (s.x < -3) {
          s.x = W + 3
          s.y = Math.random() * H
        }
        const tw = Math.max(0, Math.sin(t * s.tw + s.ph))
        const tw3 = tw * tw * tw
        ctx.globalAlpha = (0.1 + 0.9 * tw3) * (0.4 + s.r * 0.3)
        ctx.fillRect(s.x - s.r * 0.5, s.y - s.r * 0.5, s.r, s.r)
        if (s.spark && tw3 > 0.18) {
          const len = s.r * (2 + tw3 * 8)
          ctx.globalAlpha = 0.6 * tw3
          ctx.beginPath()
          ctx.moveTo(s.x - len, s.y)
          ctx.lineTo(s.x + len, s.y)
          ctx.moveTo(s.x, s.y - len)
          ctx.lineTo(s.x, s.y + len)
          ctx.stroke()
        }
      }
      for (const dparticle of dust) {
        dparticle.y -= dparticle.v * dt
        dparticle.x += (PX - dparticle.x) * 0.05 * dt + Math.sin(t * 0.5 + dparticle.y * 0.004) * 4 * dt
        if (dparticle.y < PY) {
          dparticle.y = H + 4
          dparticle.x = Math.random() * W
        }
        const fade = Math.min(1, (dparticle.y - PY) / 260) * 0.8 + 0.2
        ctx.globalAlpha = 0.15 * fade * (0.5 + dparticle.r * 0.2)
        ctx.fillStyle = dparticle.solid
        ctx.fillRect(dparticle.x - dparticle.r * 0.5, dparticle.y - dparticle.r * 0.5, dparticle.r, dparticle.r)
      }
      ctx.globalAlpha = 1
      const g = ctx.createRadialGradient(PX, PY, 0, PX, PY, 420)
      const pulse = 0.5 + 0.16 * Math.sin(t * 2.0)
      g.addColorStop(0, 'rgba(247,215,150,' + (0.24 * pulse).toFixed(3) + ')')
      g.addColorStop(0.4, 'rgba(241,200,117,' + (0.1 * pulse).toFixed(3) + ')')
      g.addColorStop(1, 'rgba(241,200,117,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(PX, PY, 420, 0, 6.283)
      ctx.fill()
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [W, H])
  return ref
}

export function Ascension({ names, W = DW, H = DH, cx = 0.5 }: { names: string[]; W?: number; H?: number; cx?: number }) {
  const cxRef = useRef(cx)
  cxRef.current = cx
  const canvasRef = useAscensionCanvas(W, H, cxRef)
  const k = Math.min(W / DW, H / DH)
  const PX = W * cx
  const PY = H * 0.157
  const cards = useMemo(() => buildCards(names, W, H, cx), [names.join('|'), W, H, cx])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: ASC_BG, animation: 'sceneIn .6s ease' }}>
      {/* aurora */}
      <div style={{ position: 'absolute', left: '-8%', top: '-30%', width: '60%', height: '120%', zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(closest-side, rgba(120,110,255,.16), transparent 70%)', filter: 'blur(60px)', animation: 'auroradrift 22s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', right: '-10%', top: '-10%', width: '55%', height: '120%', zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(closest-side, rgba(64,190,235,.13), transparent 70%)', filter: 'blur(70px)', animation: 'auroradrift 28s ease-in-out 3s infinite reverse' }} />

      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }} />

      {/* light column */}
      <div style={{ position: 'absolute', left: PX, top: 0, width: 380 * k, height: 560 * k, transform: 'translateX(-50%)', zIndex: 2, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(241,200,117,.26) 0%, rgba(241,200,117,.09) 48%, rgba(241,200,117,0) 100%)', filter: 'blur(7px)', animation: 'colpulse 4.5s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', left: PX, top: 0, width: 130 * k, height: 470 * k, transform: 'translateX(-50%)', zIndex: 2, pointerEvents: 'none', background: 'repeating-linear-gradient(180deg, rgba(255,238,190,.26) 0 3px, rgba(255,238,190,0) 3px 22px)', animation: 'beamflow 2.4s linear infinite', WebkitMaskImage: 'linear-gradient(180deg,#000,transparent)', maskImage: 'linear-gradient(180deg,#000,transparent)' }} />

      {/* rising folders */}
      {cards.map((c, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: c.x,
            top: c.sy,
            width: 340,
            marginLeft: -170,
            transformOrigin: 'center center',
            zIndex: 5,
            willChange: 'transform,opacity',
            ['--dx' as string]: c.dx + 'px',
            ['--dy' as string]: c.dy + 'px',
            animation: `rise ${CYCLE}s cubic-bezier(.45,.02,.55,.98) ${c.delay}s infinite`
          }}
        >
          <div style={{ transform: `scale(${k})`, transformOrigin: 'center top' }}>
          <div style={{ position: 'absolute', inset: '-30px -20px', borderRadius: 30, background: 'radial-gradient(closest-side, rgba(241,200,117,.22), transparent 74%)', filter: 'blur(18px)', pointerEvents: 'none', zIndex: 0 }} />
          <div style={{ position: 'relative', zIndex: 1, width: 340, padding: '22px 24px', borderRadius: 17, border: '1px solid rgba(241,200,117,.5)', background: 'linear-gradient(158deg, rgba(24,26,38,.93), rgba(12,14,24,.87))', boxShadow: '0 16px 44px rgba(0,0,0,.52), 0 0 34px rgba(241,200,117,.18), inset 0 1px 0 rgba(255,255,255,.09)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ color: '#f1c875', flex: '0 0 auto', filter: 'drop-shadow(0 0 9px rgba(241,200,117,.55))' }}>
                <svg width="46" height="38" viewBox="0 0 36 30" style={{ display: 'block' }}><path d="M2 6.5 a3.5 3.5 0 0 1 3.5 -3.5 h8.5 l3.2 4.2 h13.3 a3.5 3.5 0 0 1 3.5 3.5 v13.3 a3.5 3.5 0 0 1 -3.5 3.5 h-24.8 a3.5 3.5 0 0 1 -3.5 -3.5 z" fill="currentColor" fillOpacity="0.95" /></svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 27, fontWeight: 700, color: '#eef1f8', whiteSpace: 'nowrap' }}>{c.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: '.12em', color: '#5b6280', marginTop: 4 }}>{c.kb}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginTop: 18 }}>
              <div style={{ width: 32, height: 32, flex: '0 0 auto', borderRadius: '50%', border: '2px solid #f1c875', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(241,200,117,.4)' }}>
                <svg width="19" height="19" viewBox="0 0 24 24" style={{ display: 'block' }}><path d="M6 12.5 l4 4 l8 -9" fill="none" stroke="#f1c875" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="26" style={{ animation: 'tickdraw 3s ease-in-out infinite' }} /></svg>
              </div>
              <span style={{ fontFamily: MONO, fontSize: 19, letterSpacing: '.05em', color: '#f1c875' }}>Blueprint Uploaded</span>
            </div>
            <div style={{ marginTop: 16, height: 10, borderRadius: 5, background: 'rgba(241,200,117,.14)', overflow: 'hidden' }}>
              <div style={{ width: '100%', height: '100%', borderRadius: 5, background: 'linear-gradient(90deg, rgba(241,200,117,.6), #f1c875)' }} />
            </div>
          </div>
          </div>
        </div>
      ))}

      {/* UPLOAD node */}
      <div style={{ position: 'absolute', left: PX, top: PY, transform: `translate(-50%,-50%) scale(${k})`, zIndex: 6, pointerEvents: 'none' }}>
        {/* bloom thở */}
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(247,215,150,.30), rgba(241,200,117,.09) 45%, transparent 72%)', filter: 'blur(34px)', animation: 'bloomG 4.2s ease-in-out infinite' }} />
        {/* vòng ngoài xoay chậm */}
        <svg width="372" height="372" viewBox="0 0 372 372" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', animation: 'spin 34s linear infinite' }}><circle cx="186" cy="186" r="178" fill="none" stroke="rgba(241,200,117,.28)" strokeWidth="1.5" strokeDasharray="3 20" /></svg>
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 230, height: 230, borderRadius: '50%', border: '2px solid rgba(241,200,117,.45)', animation: 'pulsering 3s ease-out infinite' }} />
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 230, height: 230, borderRadius: '50%', border: '2px solid rgba(241,200,117,.45)', animation: 'pulsering 3s ease-out 1.5s infinite' }} />
        <svg width="300" height="300" viewBox="0 0 300 300" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', animation: 'spin 22s linear infinite' }}><circle cx="150" cy="150" r="142" fill="none" stroke="rgba(241,200,117,.5)" strokeWidth="3" strokeLinecap="round" strokeDasharray="56 46" /></svg>
        <svg width="256" height="256" viewBox="0 0 256 256" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', animation: 'spinrev 14s linear infinite' }}>
          <circle cx="128" cy="128" r="118" fill="none" stroke="rgba(241,200,117,.22)" strokeWidth="2" strokeDasharray="2 12" />
          <circle cx="128" cy="128" r="118" fill="none" stroke="rgba(247,215,150,.8)" strokeWidth="4" strokeLinecap="round" strokeDasharray="70 372" />
        </svg>
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 274, height: 274, transform: 'translate(-50%,-50%)', animation: 'spin 8s linear infinite' }}>
          <span style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', width: 10, height: 10, borderRadius: '50%', background: '#f7d98c', boxShadow: '0 0 14px #f1c875' }} />
          <span style={{ position: 'absolute', left: '100%', top: '50%', transform: 'translate(-50%,-50%)', width: 7, height: 7, borderRadius: '50%', background: '#fff2cf', boxShadow: '0 0 12px #f1c875' }} />
          <span style={{ position: 'absolute', left: '12%', top: '88%', width: 7, height: 7, borderRadius: '50%', background: '#f1c875', boxShadow: '0 0 12px #f1c875' }} />
        </div>
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 184, height: 184, transform: 'translate(-50%,-50%)', clipPath: 'polygon(50% 2%,93% 26%,93% 74%,50% 98%,7% 74%,7% 26%)', background: 'linear-gradient(160deg, rgba(58,44,20,.92), rgba(20,15,8,.9))', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'corebreatheG 3s ease-in-out infinite' }}>
          <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(50% 2%,93% 26%,93% 74%,50% 98%,7% 74%,7% 26%)', border: '2px solid rgba(247,213,140,.7)' }} />
          <svg width="72" height="72" viewBox="0 0 24 24" style={{ display: 'block', color: '#f7d98c', filter: 'drop-shadow(0 0 12px rgba(241,200,117,.85))', animation: 'arrowup 1.9s ease-in-out infinite' }}>
            <path d="M7.5 18 a4 4 0 0 1 -.6 -7.95 a5 5 0 0 1 9.7 -1.3 a3.6 3.6 0 0 1 .4 7.25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 21 V11 M12 11 l-3 3 M12 11 l3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ position: 'absolute', left: '50%', top: 'calc(50% + 130px)', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 4, fontFamily: MONO, fontSize: 19, letterSpacing: '.34em', color: '#f7d98c', whiteSpace: 'nowrap', textShadow: '0 0 18px rgba(241,200,117,.7)' }}>
          UPLOADING<span style={{ animation: 'dotblink 1.4s ease-in-out infinite' }}>.</span><span style={{ animation: 'dotblink 1.4s ease-in-out .25s infinite' }}>.</span><span style={{ animation: 'dotblink 1.4s ease-in-out .5s infinite' }}>.</span>
        </div>
      </div>

    </div>
  )
}

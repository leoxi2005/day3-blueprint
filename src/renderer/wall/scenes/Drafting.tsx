import { useEffect, useMemo, useRef } from 'react'
import { MONO } from '../../shared/tokens'
import { WALL_BG, useWallBackdrop } from './useWallBackdrop'
import { CONSTANTS, Participant } from '../../../shared/types'

const DW = CONSTANTS.WALL_W
const DH = CONSTANTS.WALL_H

// Bảng màu đa sắc — mỗi card một màu.
const PALETTE = [
  '#5be8ff', // cyan
  '#b9a6ff', // violet
  '#f1c875', // gold
  '#6ee7a8', // green
  '#ff9ec7', // pink
  '#7cc4ff', // blue
  '#ffb37a', // orange
  '#a0f0e0', // teal
  '#d7a6ff', // lavender
  '#ffe27a', // yellow
  '#8affc1', // mint
  '#ff8f8f', // coral
  '#9ad0ff', // sky
  '#c8ff8a' // lime
]

// Bố cục + tham số loop cho từng card — trải theo W×H thật.
function build(i: number, n: number, W: number, H: number) {
  const spanL = W * 0.031
  const spanR = W - spanL
  const step = n > 1 ? (spanR - spanL) / (n - 1) : 0
  const cx = n > 1 ? spanL + i * step : W / 2
  let cy = H * (0.5 + Math.sin(i * 0.8 + 1) * 0.14 + (i % 2 ? 0.06 : -0.045))
  cy = Math.max(H * 0.28, Math.min(H * 0.72, cy))
  const dep = ((i * 5) % 7) / 6
  const scale = 0.72 + dep * 0.5
  const opacity = 0.88 + dep * 0.12
  const z = Math.round(scale * 100)
  const rot = (((i * 53) % 100) / 100 - 0.5) * 6
  const dur = 5 + (i % 5) * 1.1
  const delay = -(i * 0.9)
  const kb = String(8 + ((i * 7) % 28)).padStart(3, '0') + 'KB'
  const color = PALETTE[i % PALETTE.length]
  const rate = 0.12 + (i % 5) * 0.03 // 0→100 trong ~5.5–8s
  const offset = (i * 0.137) % 1
  return { cx, cy, scale, opacity, z, rot, dur, delay, kb, color, rate, offset }
}

export function Drafting({ participants, W = DW, H = DH }: { participants: Participant[]; W?: number; H?: number }) {
  const canvasRef = useWallBackdrop(W, H, true, 0.6)
  const k = Math.min(W / DW, H / DH)
  const n = participants.length
  const cards = useMemo(() => participants.map((_, i) => build(i, n, W, H)), [n, W, H])
  const fillRefs = useRef<(HTMLDivElement | null)[]>([])
  const pctRefs = useRef<(HTMLSpanElement | null)[]>([])

  // Loop tiến độ 0→100→0 liên tục, cập nhật DOM trực tiếp (không re-render).
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number): void => {
      const t = (now - t0) / 1000
      for (let i = 0; i < cards.length; i++) {
        const prog = (t * cards[i].rate + cards[i].offset) % 1
        const pct = Math.round(prog * 100)
        const f = fillRefs.current[i]
        if (f) f.style.width = pct + '%'
        const p = pctRefs.current[i]
        if (p) p.textContent = pct + '%'
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [cards])

  return (
    <div style={{ position: 'absolute', inset: 0, background: WALL_BG, animation: 'sceneIn .6s ease' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }} />

      {participants.map((p, i) => {
        const c = cards[i]
        const col = c.color
        return (
          <div key={i} style={{ position: 'absolute', left: c.cx, top: c.cy, width: 380, transform: `translate(-50%,-50%) scale(${c.scale * k}) rotate(${c.rot}deg)`, transformOrigin: 'center center', opacity: c.opacity, zIndex: c.z }}>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: `floaty ${c.dur}s ease-in-out ${c.delay}s infinite` }}>
              <div style={{ position: 'absolute', left: '50%', top: 92, width: 420, height: 270, transform: 'translate(-50%,-50%)', background: `radial-gradient(closest-side, ${col}88, transparent 72%)`, filter: 'blur(22px)', zIndex: 0, pointerEvents: 'none', animation: `glowbreathe ${(c.dur * 0.8).toFixed(1)}s ease-in-out infinite` }} />
              <div style={{ position: 'relative', width: 380, padding: '22px 24px 24px', borderRadius: 18, border: `1px solid ${col}6b`, background: 'linear-gradient(158deg, rgba(20,28,50,.9), rgba(9,14,28,.85))', boxShadow: `0 12px 40px rgba(0,0,0,.5), 0 0 26px ${col}29, inset 0 1px 0 rgba(255,255,255,.08)`, zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ color: col, flex: '0 0 auto', filter: `drop-shadow(0 0 6px ${col}cc)` }}>
                    <svg width="36" height="30" viewBox="0 0 36 30" style={{ display: 'block' }}>
                      <path d="M2 6.5 a3.5 3.5 0 0 1 3.5 -3.5 h8.5 l3.2 4.2 h13.3 a3.5 3.5 0 0 1 3.5 3.5 v13.3 a3.5 3.5 0 0 1 -3.5 3.5 h-24.8 a3.5 3.5 0 0 1 -3.5 -3.5 z" fill="currentColor" fillOpacity="0.92" />
                    </svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: '#eef1f8', whiteSpace: 'nowrap', letterSpacing: '.01em' }}>{p.name}&apos;s Blueprint</div>
                    <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: '.12em', color: '#5b6280', marginTop: 4 }}>{c.kb}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ color: col, display: 'flex', flex: '0 0 auto' }}>
                      <svg width="22" height="22" viewBox="0 0 22 22" style={{ display: 'block', animation: 'spin 1s linear infinite' }}>
                        <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeOpacity="0.22" />
                        <path d="M11 3 a8 8 0 0 1 8 8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 21, letterSpacing: '.05em', color: col }}>Drafting…</span>
                  </div>
                  <span ref={(el) => { pctRefs.current[i] = el }} style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: col }}>0%</span>
                </div>
                <div style={{ marginTop: 14, height: 12, borderRadius: 6, background: 'rgba(140,165,210,.14)', overflow: 'hidden' }}>
                  <div ref={(el) => { fillRefs.current[i] = el }} style={{ width: '0%', height: '100%', borderRadius: 6, background: `linear-gradient(90deg, ${col}55, ${col})`, boxShadow: `0 0 10px ${col}cc` }} />
                </div>
              </div>
            </div>
          </div>
        )
      })}

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: H * 0.31, zIndex: 6, pointerEvents: 'none', background: 'linear-gradient(180deg, transparent 0%, rgba(7,9,18,.32) 64%, rgba(7,9,18,.72) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 7, pointerEvents: 'none', boxShadow: 'inset 0 0 260px 30px rgba(4,6,13,.45)' }} />
    </div>
  )
}

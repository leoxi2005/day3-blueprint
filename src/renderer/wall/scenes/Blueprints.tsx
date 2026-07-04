import { useMemo } from 'react'
import { MONO } from '../../shared/tokens'
import { WALL_BG, useWallBackdrop } from './useWallBackdrop'
import { CONSTANTS } from '../../../shared/types'

const DW = CONSTANTS.WALL_W
const DH = CONSTANTS.WALL_H

type Accent = 'cyan' | 'violet' | 'gold'

function ACC(a: Accent) {
  if (a === 'violet') return { c: '#c4b4ff', border: 'rgba(185,166,255,.55)', glow: 'rgba(185,166,255,.5)', soft: 'rgba(185,166,255,.2)' }
  if (a === 'gold') return { c: '#f7d38a', border: 'rgba(241,200,117,.55)', glow: 'rgba(241,200,117,.48)', soft: 'rgba(241,200,117,.18)' }
  return { c: '#7cefff', border: 'rgba(91,232,255,.6)', glow: 'rgba(91,232,255,.55)', soft: 'rgba(91,232,255,.22)' }
}

// Sinh SVG floor-plan thủ tục (PRNG theo seed) — port từ prototype planSVG.
function planSVG(seed: number, accent: Accent): string {
  let s0 = seed * 2749 + 13
  const R = (): number => (s0 = (s0 * 16807) % 2147483647) / 2147483647
  const cyan = '#5be8ff'
  const violet = '#b9a6ff'
  const gold = '#f1c875'
  const acc = accent === 'violet' ? violet : accent === 'gold' ? gold : cyan
  const Wd = 460
  const Hd = 300
  const x0 = 48
  const y0 = 58
  const x1 = Wd - 48
  const y1 = Hd - 42
  const iw = x1 - x0
  const ih = y1 - y0
  const spd = (3.6 + (seed % 4) * 0.6).toFixed(1)
  const scanDur = (5.5 + (seed % 5) * 0.7).toFixed(1)
  const scanDelay = ((seed % 4) * 0.5).toFixed(1)
  const flowEx = ' style="stroke-dasharray:4 7;animation:bpflow ' + spd + 's linear infinite"'
  let s = ''
  const L = (a: number, b: number, c: number, d: number, col: string, w: number, op: number, ex?: string): void => {
    s += '<line x1="' + a.toFixed(1) + '" y1="' + b.toFixed(1) + '" x2="' + c.toFixed(1) + '" y2="' + d.toFixed(1) + '" stroke="' + col + '" stroke-width="' + w + '" stroke-opacity="' + op + '" stroke-linecap="round"' + (ex || '') + '/>'
  }
  const RC = (a: number, b: number, w: number, h: number, col: string, sw: number, op: number, ex?: string): void => {
    s += '<rect x="' + a.toFixed(1) + '" y="' + b.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="none" stroke="' + col + '" stroke-width="' + sw + '" stroke-opacity="' + op + '"' + (ex || '') + '/>'
  }
  const FILL = (a: number, b: number, w: number, h: number, col: string, op: number, ex?: string): void => {
    s += '<rect x="' + a.toFixed(1) + '" y="' + b.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="' + col + '" fill-opacity="' + op + '"' + (ex || '') + '/>'
  }

  const vx = x0 + iw * (0.38 + R() * 0.24)
  const hy = y0 + ih * (0.42 + R() * 0.2)
  const fillLeft = R() < 0.5
  const pulseEx = ' style="animation:bppulse ' + scanDur + 's ease-in-out infinite"'
  if (fillLeft) FILL(x0, y0, vx - x0, hy - y0, acc, 0.16, pulseEx)
  else FILL(vx, hy, x1 - vx, y1 - hy, acc, 0.16, pulseEx)
  RC(x0, y0, iw, ih, cyan, 2.4, 1)
  const dvy = y0 + ih * (0.2 + R() * 0.42)
  const dvw = ih * 0.16
  L(vx, y0, vx, dvy, cyan, 2.2, 0.98)
  L(vx, dvy + dvw, vx, y1, cyan, 2.2, 0.98)
  const dhx = vx + (x1 - vx) * (0.25 + R() * 0.4)
  const dhw = (x1 - vx) * 0.24
  L(vx, hy, dhx, hy, cyan, 2.2, 0.98)
  L(dhx + dhw, hy, x1, hy, cyan, 2.2, 0.98)
  const ly = y0 + ih * (0.56 + R() * 0.18)
  L(x0, ly, vx, ly, cyan, 1.9, 0.82)
  const fc = 2 + (seed % 2)
  for (let i = 0; i < fc; i++) {
    const fw = iw * (0.11 + R() * 0.09)
    const fh = ih * (0.1 + R() * 0.08)
    const fx = x0 + 6 + R() * (iw - fw - 12)
    const fy = y0 + 6 + R() * (ih - fh - 12)
    const driftDur = (4.5 + (i + (seed % 3)) * 0.8).toFixed(1)
    RC(fx, fy, fw, fh, acc, 1.7, 0.95, ' style="animation:bpdrift ' + driftDur + 's ease-in-out ' + (i * 0.7).toFixed(1) + 's infinite"')
  }
  const rcx = x0 + iw * (0.2 + R() * 0.6)
  const rcy = y0 + ih * (0.2 + R() * 0.6)
  s += '<circle cx="' + rcx.toFixed(1) + '" cy="' + rcy.toFixed(1) + '" r="' + (9 + R() * 5).toFixed(1) + '" fill="none" stroke="' + acc + '" stroke-width="1.7" stroke-opacity="0.85" style="animation:bpdrift ' + (6 + (seed % 3)).toFixed(1) + 's ease-in-out infinite"/>'
  for (let i = 0; i < 2; i++) {
    const cx = x0 + 8 + R() * (iw - 16)
    const cy = y0 + 8 + R() * (ih - 16)
    const r = 5
    L(cx - r, cy, cx + r, cy, gold, 1.5, 0.85)
    L(cx, cy - r, cx, cy + r, gold, 1.5, 0.85)
    s += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="2.3" fill="' + gold + '" fill-opacity="0.85" style="animation:bpblink ' + (1.8 + i * 0.7).toFixed(1) + 's ease-in-out infinite"/>'
  }
  const dOff = y0 - 18
  L(x0, dOff, x1, dOff, violet, 1.1, 0.6, flowEx)
  ;[x0, vx, x1].forEach((tx) => L(tx, dOff - 4, tx, dOff + 4, violet, 1.3, 0.75))
  const dLx = x0 - 18
  L(dLx, y0, dLx, y1, violet, 1.1, 0.6, flowEx)
  ;[y0, hy, y1].forEach((ty) => L(dLx - 4, ty, dLx + 4, ty, violet, 1.3, 0.75))
  const tk = 13
  L(x0, y0, x0 - tk, y0, acc, 2.4, 1)
  L(x0, y0, x0, y0 - tk, acc, 2.4, 1)
  L(x1, y0, x1 + tk, y0, acc, 2.4, 1)
  L(x1, y0, x1, y0 - tk, acc, 2.4, 1)
  L(x0, y1, x0 - tk, y1, acc, 2.4, 1)
  L(x0, y1, x0, y1 + tk, acc, 2.4, 1)
  L(x1, y1, x1 + tk, y1, acc, 2.4, 1)
  L(x1, y1, x1, y1 + tk, acc, 2.4, 1)
  s += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y0 + '" stroke="' + acc + '" stroke-width="1.3" stroke-opacity="0.5" style="animation:bpscan ' + scanDur + 's ease-in-out ' + scanDelay + 's infinite"/>'
  return '<svg viewBox="0 0 460 300" width="100%" height="100%" style="display:block;overflow:visible">' + s + '</svg>'
}

function buildCards(names: string[], W: number, H: number) {
  const N = Math.max(1, names.length)
  const spanL = W * 0.031
  const spanR = W - spanL
  const step = N > 1 ? (spanR - spanL) / (N - 1) : 0
  return names.map((name, i) => {
    const cx = spanL + i * step
    let cy = H * (0.5 + Math.sin(i * 0.8 + 1) * 0.14 + (i % 2 ? 0.06 : -0.045))
    cy = Math.max(H * 0.28, Math.min(H * 0.72, cy))
    const dep = ((i * 5) % 7) / 6
    const scale = 0.7 + dep * 0.52
    const opacity = 0.86 + dep * 0.14
    const z = Math.round(scale * 100)
    const rot = (((i * 53) % 100) / 100 - 0.5) * 7
    const dur = 5 + (i % 5) * 1.1
    const delay = -(i * 0.9)
    const accent: Accent = i % 5 === 0 ? 'violet' : (i % 7 === 3 ? 'gold' : 'cyan')
    return { name, cx, cy, scale, opacity, z, rot, dur, delay, accent, svg: planSVG(i + 1, accent) }
  })
}

export function Blueprints({ names, W = DW, H = DH }: { names: string[]; W?: number; H?: number }) {
  const canvasRef = useWallBackdrop(W, H, true, 0.6)
  const k = Math.min(W / DW, H / DH)
  const cards = useMemo(() => buildCards(names, W, H), [names.join('|'), W, H])

  return (
    <div style={{ position: 'absolute', inset: 0, background: WALL_BG, animation: 'sceneIn .6s ease' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }} />

      {cards.map((c, i) => {
        const A = ACC(c.accent)
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: c.cx,
              top: c.cy,
              width: 380,
              transform: `translate(-50%,-50%) scale(${c.scale * k}) rotate(${c.rot}deg)`,
              transformOrigin: 'center center',
              opacity: c.opacity,
              filter: 'saturate(1.14) brightness(1.06)',
              zIndex: c.z
            }}
          >
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, animation: `floaty ${c.dur}s ease-in-out ${c.delay}s infinite` }}>
              <div style={{ position: 'absolute', left: '50%', top: 132, width: 430, height: 300, transform: 'translate(-50%,-50%)', background: `radial-gradient(closest-side, ${A.glow}, transparent 72%)`, filter: 'blur(20px)', zIndex: 0, pointerEvents: 'none', animation: `glowbreathe ${(c.dur * 0.8).toFixed(1)}s ease-in-out infinite` }} />
              <div
                style={{ position: 'relative', width: 380, height: 250, padding: 24, borderRadius: 16, border: `1px solid ${A.border}`, background: 'linear-gradient(158deg, rgba(22,31,54,.6), rgba(10,16,32,.42))', filter: `drop-shadow(0 0 2.5px ${A.glow})`, boxShadow: `0 0 30px ${A.soft}, inset 0 1px 0 rgba(255,255,255,.09)`, zIndex: 1, overflow: 'visible' }}
                dangerouslySetInnerHTML={{ __html: c.svg }}
              />
              <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: '.3em', textTransform: 'uppercase', color: '#eef1f8', padding: '8px 20px 8px 26px', borderRadius: 999, border: `1px solid ${A.border}`, background: 'rgba(7,10,20,.82)', boxShadow: `0 6px 26px rgba(0,0,0,.45), 0 0 18px ${A.soft}`, zIndex: 2, whiteSpace: 'nowrap' }}>{c.name}</div>
            </div>
          </div>
        )
      })}

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: H * 0.31, zIndex: 6, pointerEvents: 'none', background: 'linear-gradient(180deg, transparent 0%, rgba(7,9,18,.32) 64%, rgba(7,9,18,.72) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 7, pointerEvents: 'none', boxShadow: 'inset 0 0 260px 30px rgba(4,6,13,.45)' }} />
    </div>
  )
}

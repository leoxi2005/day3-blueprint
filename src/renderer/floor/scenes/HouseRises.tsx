import { useEffect, useRef } from 'react'
import { CONSTANTS } from '../../../shared/types'

const DW = CONSTANTS.FLOOR_W
const DH = CONSTANTS.FLOOR_H

const FLOOR_BG =
  'radial-gradient(2600px 2600px at 50% 50%, rgba(91,232,255,.12), transparent 62%),radial-gradient(2800px 2400px at 24% 14%, rgba(185,166,255,.13), transparent 60%),radial-gradient(2600px 2200px at 82% 86%, rgba(91,232,255,.1), transparent 60%),radial-gradient(3200px 2600px at 50% 128%, rgba(20,30,60,.5), transparent 72%),#080b16'

type Vec = { x: number; y: number; d: number }
type Seg = { x: number; y: number; or: 'x' | 'y'; col: string }
type Box = { x: number; y: number; w: number; d: number; h: number; c: string; stair?: boolean }

function useHouseCanvas(W: number, H: number, rotate: boolean, onPhase: (p: string) => void) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const rotRef = useRef(rotate)
  rotRef.current = rotate

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    cv.width = W
    cv.height = H
    const ctx = cv.getContext('2d')!
    const k = Math.min(W / DW, H / DH) // scale nhà theo độ phân giải

    // footprint
    const GX = 14
    const GY = 10
    const hx = GX / 2
    const hy = GY / 2
    const WALLH = 3
    const TW = 272 * k
    const TH = 164 * k
    const ZS = 214 * k // tường cao hơn cho có khối
    const ox = W / 2
    const oy = H * 0.545
    const CY = '91,232,255'
    const VI = '185,166,255'
    const GD = '241,200,117'
    const WT = '226,240,255'

    let ROT = 0
    // CAM = "khoảng cách camera": nhỏ hơn = phối cảnh mạnh hơn. Phải > max(rx+ry) (~17).
    const CAM = 44
    const proj = (x: number, y: number, z: number): Vec => {
      const px = x - hx
      const py = y - hy
      const c = Math.cos(ROT)
      const s = Math.sin(ROT)
      const rx = px * c - py * s
      const ry = px * s + py * c
      const depth = rx + ry
      const persp = CAM / (CAM - depth) // gần (depth+) phóng to, xa (depth-) thu nhỏ & hội tụ
      const sx = (rx - ry) * TW / 2
      const sy = (rx + ry) * TH / 2 - z * ZS
      return { x: ox + sx * persp, y: oy + sy * persp, d: depth }
    }

    const partV = 6
    const partH = 5
    const doorV = [3, 5]
    const doorH = [10, 12]
    const rooms = [
      { x0: 0, y0: 0, x1: partV, y1: GY, t: CY, a: 0.05 },
      { x0: partV, y0: 0, x1: GX, y1: partH, t: VI, a: 0.05 },
      { x0: partV, y0: partH, x1: GX, y1: GY, t: CY, a: 0.045 }
    ]

    const segs: Seg[] = []
    for (let x = 0; x < GX; x++) {
      segs.push({ x, y: 0, or: 'x', col: CY })
      segs.push({ x, y: GY, or: 'x', col: CY })
    }
    for (let y = 0; y < GY; y++) {
      segs.push({ x: 0, y, or: 'y', col: VI })
      segs.push({ x: GX, y, or: 'y', col: VI })
    }
    for (let y = 0; y < GY; y++) {
      if (y >= doorV[0] && y < doorV[1]) continue
      segs.push({ x: partV, y, or: 'y', col: CY })
    }
    for (let x = partV; x < GX; x++) {
      if (x >= doorH[0] && x < doorH[1]) continue
      segs.push({ x, y: partH, or: 'x', col: VI })
    }

    const wallFaces: { sg: Seg; h: number; seq: number }[] = []
    for (let h = 0; h < WALLH; h++) segs.forEach((sg, si) => wallFaces.push({ sg, h, seq: h * segs.length + si }))
    const totalWall = wallFaces.length

    const F: Box[] = [
      { x: 0.6, y: 0.6, w: 3.4, d: 2.2, h: 0.7, c: CY },
      { x: 4.4, y: 0.7, w: 1.1, d: 1.1, h: 1.0, c: CY },
      { x: 0.7, y: 3.4, w: 1.4, d: 0.8, h: 0.5, c: CY },
      { x: 0.7, y: 6.6, w: 1.4, d: 1.0, h: 0.5, c: VI },
      { x: 2.6, y: 6.7, w: 0.8, d: 0.8, h: 0.7, c: VI },
      { x: 6.6, y: 0.6, w: 5.0, d: 0.9, h: 1.0, c: VI },
      { x: 8.0, y: 2.4, w: 2.6, d: 1.1, h: 0.9, c: GD },
      { x: 8.2, y: 3.7, w: 0.5, d: 0.5, h: 1.0, c: GD },
      { x: 9.2, y: 3.7, w: 0.5, d: 0.5, h: 1.0, c: GD },
      { x: 10.2, y: 3.7, w: 0.5, d: 0.5, h: 1.0, c: GD },
      { x: 7.0, y: 6.2, w: 3.0, d: 1.3, h: 0.6, c: CY },
      { x: 7.6, y: 7.9, w: 1.8, d: 1.0, h: 0.4, c: CY },
      { x: 10.6, y: 6.2, w: 2.4, d: 1.6, h: 0.5, c: GD },
      { x: 10.5, y: 6.0, w: 0.5, d: 0.5, h: 0.9, c: GD },
      { x: 11.4, y: 6.0, w: 0.5, d: 0.5, h: 0.9, c: GD },
      { x: 12.3, y: 6.0, w: 0.5, d: 0.5, h: 0.9, c: GD },
      { x: 10.5, y: 8.0, w: 0.5, d: 0.5, h: 0.9, c: GD },
      { x: 11.4, y: 8.0, w: 0.5, d: 0.5, h: 0.9, c: GD },
      { x: 12.3, y: 8.0, w: 0.5, d: 0.5, h: 0.9, c: GD }
    ]
    for (let i = 0; i < 6; i++) F.push({ x: 4.6, y: 6.4 + i * 0.42, w: 1.6, d: 0.42, h: 0.28 + i * 0.28, c: WT, stair: true })

    const beams: { a: [number, number, number]; b: [number, number, number]; col: string }[] = []
    for (let x = 0; x <= GX; x += 1) beams.push({ a: [x, 0, WALLH], b: [x, GY, WALLH], col: CY })
    for (let y = 0; y <= GY; y += 2) beams.push({ a: [0, y, WALLH], b: [GX, y, WALLH], col: VI })

    // fade toàn cục (giai đoạn RESETTING) áp qua globalAlpha; màu solid memoize để khỏi build chuỗi mỗi lệnh.
    let fade = 1
    const solidCache = new Map<string, string>()
    const solidOf = (col: string): string => {
      let s = solidCache.get(col)
      if (!s) { s = 'rgb(' + col + ')'; solidCache.set(col, s) }
      return s
    }
    // depth-fog: điểm gần viewer (rx+ry lớn) sáng/đậm hơn, xa thì mờ → tạo chiều sâu
    const fog = (d: number): number => Math.max(0.28, Math.min(1, 0.5 + d * 0.045))
    const line = (a: Vec, b: Vec, col: string, w: number, al: number): void => {
      const fg = fog((a.d + b.d) * 0.5)
      ctx.globalAlpha = fade * al * fg
      ctx.strokeStyle = solidOf(col)
      ctx.lineWidth = w * (0.55 + 0.7 * fg) // gần dày hơn
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
    const quad = (p: Vec[], col: string, al: number): void => {
      let dsum = 0
      for (const pt of p) dsum += pt.d
      ctx.globalAlpha = fade * al * fog(dsum / p.length)
      ctx.fillStyle = solidOf(col)
      ctx.beginPath()
      ctx.moveTo(p[0].x, p[0].y)
      for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y)
      ctx.closePath()
      ctx.fill()
    }
    const box = (f: Box, z0: number, z1: number, al: number, lead: boolean): void => {
      const b = [proj(f.x, f.y, z0), proj(f.x + f.w, f.y, z0), proj(f.x + f.w, f.y + f.d, z0), proj(f.x, f.y + f.d, z0)]
      const t = [proj(f.x, f.y, z1), proj(f.x + f.w, f.y, z1), proj(f.x + f.w, f.y + f.d, z1), proj(f.x, f.y + f.d, z1)]
      quad(t, f.c, 0.1 * al)
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4
        line(b[i], b[j], f.c, 2, 0.36 * al)
        line(t[i], t[j], f.c, 2, 0.5 * al)
        line(b[i], t[i], f.c, 2, 0.42 * al)
      }
      if (lead) for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; line(t[i], t[j], WT, 2.4, 0.9) }
    }

    const stars: { x: number; y: number; r: number; ph: number; tw: number; spark: boolean }[] = []
    const nStars = Math.min(1300, Math.max(300, Math.round(1050 * (W * H) / (DW * DH))))
    for (let i = 0; i < nStars; i++) {
      const spark = Math.random() < 0.05
      stars.push({ x: Math.random() * W, y: Math.random() * H, r: (spark ? 1.4 : 0.5) + Math.random() * 1.7, ph: Math.random() * 6.28, tw: 0.5 + Math.random() * 1.5, spark })
    }

    const T_FLOOR = 3.0
    const T_WALL = 5.5
    const T_FURN = 4.0
    const T_ROOF = 2.2
    const T_HOLD = 2.4
    const T_FADE = 1.6
    const T_TOTAL = T_FLOOR + T_WALL + T_FURN + T_ROOF + T_HOLD + T_FADE
    const maxD = GX - 1 + (GY - 1)
    const t0 = performance.now()
    let raf = 0
    let curPhase = ''

    const draw = (now: number): void => {
      const tg = (now - t0) / 1000
      const cyc = tg % T_TOTAL
      ROT = rotRef.current ? tg * 0.08 : 0.0
      ctx.clearRect(0, 0, W, H)

      ctx.fillStyle = 'rgb(207,224,255)'
      ctx.strokeStyle = 'rgb(222,236,255)'
      ctx.lineWidth = 1
      for (const s of stars) {
        const raw = Math.max(0, Math.sin(tg * s.tw + s.ph))
        const tw3 = raw * raw * raw
        ctx.globalAlpha = (0.16 + 0.72 * tw3) * (0.4 + s.r * 0.28)
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

      let globalA = 1
      const fadeStart = T_FLOOR + T_WALL + T_FURN + T_ROOF + T_HOLD
      if (cyc > fadeStart) globalA = 1 - (cyc - fadeStart) / T_FADE

      const floorP = Math.min(1, cyc / T_FLOOR)
      const wallP = Math.max(0, Math.min(1, (cyc - T_FLOOR) / T_WALL))
      const furnP = Math.max(0, Math.min(1, (cyc - T_FLOOR - T_WALL) / T_FURN))
      const roofP = Math.max(0, Math.min(1, (cyc - T_FLOOR - T_WALL - T_FURN) / T_ROOF))

      fade = globalA

      for (const r of rooms) {
        const p = [proj(r.x0, r.y0, 0), proj(r.x1, r.y0, 0), proj(r.x1, r.y1, 0), proj(r.x0, r.y1, 0)]
        quad(p, r.t, r.a * floorP)
      }
      const frontier = floorP
      for (let x = 0; x <= GX; x++) for (let y = 0; y < GY; y++) { if ((x + y) / (maxD + 1) > frontier + 0.02) continue; line(proj(x, y, 0), proj(x, y + 1, 0), CY, 1.5, 0.26) }
      for (let y = 0; y <= GY; y++) for (let x = 0; x < GX; x++) { if ((x + y) / (maxD + 1) > frontier + 0.02) continue; line(proj(x, y, 0), proj(x + 1, y, 0), CY, 1.5, 0.26) }
      if (floorP < 1) {
        const df = frontier * (maxD + 1)
        ctx.globalAlpha = fade * 0.85
        ctx.fillStyle = solidOf(CY)
        for (let x = 0; x <= GX; x++) { const y = df - x; if (y >= 0 && y <= GY) { const pt = proj(x, y, 0); ctx.beginPath(); ctx.arc(pt.x, pt.y, 3.2, 0, 6.283); ctx.fill() } }
      }

      const nWall = Math.floor(wallP * totalWall + 0.0001)
      const wf = wallP * totalWall - nWall
      const drawWall = (f: { sg: Seg; h: number }, al: number, lead: boolean): void => {
        const sg = f.sg
        let a: Vec, b: Vec, c: Vec, d: Vec
        if (sg.or === 'x') { a = proj(sg.x, sg.y, f.h); b = proj(sg.x + 1, sg.y, f.h); c = proj(sg.x + 1, sg.y, f.h + 1); d = proj(sg.x, sg.y, f.h + 1) }
        else { a = proj(sg.x, sg.y, f.h); b = proj(sg.x, sg.y + 1, f.h); c = proj(sg.x, sg.y + 1, f.h + 1); d = proj(sg.x, sg.y, f.h + 1) }
        quad([a, b, c, d], sg.col, 0.05 * al)
        line(a, b, sg.col, 1.7, 0.32 * al)
        line(b, c, sg.col, 1.7, 0.36 * al)
        line(c, d, sg.col, 1.7, 0.4 * al)
        line(d, a, sg.col, 1.7, 0.36 * al)
        if (lead) { quad([a, b, c, d], sg.col, 0.14); line(c, d, WT, 2.6, 0.9) }
      }
      const built = wallFaces.slice(0, nWall).sort((A, B) => proj(A.sg.x + 0.5, A.sg.y + 0.5, A.h).d - proj(B.sg.x + 0.5, B.sg.y + 0.5, B.h).d)
      for (const f of built) drawWall(f, 1, false)
      if (nWall < totalWall && wallP > 0) drawWall(wallFaces[nWall], Math.max(0.15, wf), true)

      if (furnP > 0) {
        const nF = Math.floor(furnP * F.length + 0.0001)
        const ff = furnP * F.length - nF
        const visible: { f: Box; grow: number }[] = []
        for (let k = 0; k < F.length; k++) { if (k < nF) visible.push({ f: F[k], grow: 1 }); else if (k === nF && ff > 0) visible.push({ f: F[k], grow: ff }) }
        visible.sort((a, b) => proj(a.f.x + a.f.w / 2, a.f.y + a.f.d / 2, 0).d - proj(b.f.x + b.f.w / 2, b.f.y + b.f.d / 2, 0).d)
        for (const v of visible) { const z1 = v.f.h * (0.15 + 0.85 * v.grow); box(v.f, 0, z1, 1, v.grow < 1) }
      }

      if (roofP > 0) {
        const nB = Math.floor(roofP * beams.length + 0.0001)
        for (let k = 0; k < nB; k++) { const bm = beams[k]; line(proj(...bm.a), proj(...bm.b), bm.col, 1.6, 0.3) }
        if (nB < beams.length) { const bm = beams[nB]; line(proj(...bm.a), proj(...bm.b), WT, 2.4, 0.7) }
      }

      if (wallP > 0) {
        const ph = WALLH * Math.min(1, wallP * 1.1)
        line(proj(0, 0, 0), proj(0, 0, ph), WT, 2.6, 0.5)
        line(proj(GX, 0, 0), proj(GX, 0, ph), CY, 2, 0.4)
        line(proj(0, GY, 0), proj(0, GY, ph), VI, 2, 0.4)
        line(proj(GX, GY, 0), proj(GX, GY, ph), WT, 2, 0.4)
      }

      ctx.globalAlpha = 1

      let ph = 'FOUNDATION'
      if (cyc > T_FLOOR) ph = 'WALLS RISING'
      if (cyc > T_FLOOR + T_WALL) ph = 'FURNISHING'
      if (cyc > T_FLOOR + T_WALL + T_FURN) ph = 'ROOFING'
      if (cyc > T_FLOOR + T_WALL + T_FURN + T_ROOF) ph = 'HOUSE COMPLETE'
      if (cyc > fadeStart) ph = 'RESETTING'
      if (ph !== curPhase) { curPhase = ph; onPhase(ph) }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [W, H])

  return ref
}

const noop = (): void => {}

export function HouseRises({ rotate = true, W = DW, H = DH }: { rotate?: boolean; W?: number; H?: number }) {
  const canvasRef = useHouseCanvas(W, H, rotate, noop)

  return (
    <div style={{ position: 'absolute', inset: 0, background: FLOOR_BG, animation: 'sceneIn .6s ease' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }} />
    </div>
  )
}

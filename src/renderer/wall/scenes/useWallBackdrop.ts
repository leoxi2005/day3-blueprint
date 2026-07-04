import { useEffect, useRef } from 'react'

/**
 * Starfield parallax + floor perspective grid — responsive theo W×H thật của output.
 * Port từ initScene của `Wall - 1 Blueprints` / `Wall - 2 Drafting`.
 */
export function useWallBackdrop(W: number, H: number, floorGrid = true, drift = 0.6) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    cv.width = W
    cv.height = H
    const ctx = cv.getContext('2d')!
    // mật độ sao theo diện tích, cap để res cao không bùng nổ (nhẹ)
    const N = Math.min(1900, Math.max(300, Math.round(1600 * (W * H) / (10990 * 1080))))
    const solids = ['rgb(223,232,255)', 'rgb(91,232,255)', 'rgb(185,166,255)', 'rgb(241,200,117)']
    const stars: { x: number; y: number; r: number; ph: number; tw: number; sp: number; solid: string; spark: boolean }[] = []
    for (let i = 0; i < N; i++) {
      const spark = Math.random() < 0.05
      const rnd = Math.random()
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.92,
        r: spark ? 1.5 + Math.random() * 1.9 : 0.4 + Math.random() * 1.5,
        ph: Math.random() * 6.28,
        tw: 0.5 + Math.random() * 1.6,
        sp: 3 + Math.random() * 12,
        solid: solids[rnd < 0.62 ? 0 : rnd < 0.82 ? 1 : rnd < 0.93 ? 2 : 3],
        spark
      })
    }
    let last = performance.now()
    let raf = 0
    const draw = (now: number): void => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = now / 1000
      ctx.clearRect(0, 0, W, H)
      if (floorGrid) {
        const vpx = W / 2
        const vpy = H * 0.52
        ctx.lineWidth = 1
        for (let i = 0; i <= 48; i++) {
          const x = i * (W / 48)
          const a = 0.05 * (1 - Math.abs(x - vpx) / (W * 0.6))
          if (a <= 0) continue
          ctx.strokeStyle = 'rgba(91,232,255,' + a.toFixed(3) + ')'
          ctx.beginPath()
          ctx.moveTo(x, H)
          ctx.lineTo(vpx, vpy)
          ctx.stroke()
        }
        const scroll = (t * 0.06) % 1
        for (let k = 0; k <= 12; k++) {
          const f = ((k / 12) + scroll) % 1
          const y = vpy + (H - vpy) * (f * f)
          const a = 0.06 * f
          ctx.strokeStyle = 'rgba(91,232,255,' + a.toFixed(3) + ')'
          ctx.beginPath()
          ctx.moveTo(0, y)
          ctx.lineTo(W, y)
          ctx.stroke()
        }
      }
      for (const s of stars) {
        s.x -= s.sp * dt * drift * (0.5 + s.r * 0.4)
        if (s.x < -4) {
          s.x = W + 4
          s.y = Math.random() * H * 0.92
        }
        const raw = Math.max(0, Math.sin(t * s.tw + s.ph))
        const tw = raw * raw * raw
        ctx.globalAlpha = (0.16 + 0.84 * tw) * (0.45 + s.r * 0.32)
        ctx.fillStyle = s.solid
        ctx.fillRect(s.x - s.r * 0.5, s.y - s.r * 0.5, s.r, s.r)
        if (s.spark && tw > 0.22) {
          const len = s.r * (2 + tw * 7)
          ctx.globalAlpha = 0.55 * tw
          ctx.strokeStyle = s.solid
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(s.x - len, s.y)
          ctx.lineTo(s.x + len, s.y)
          ctx.moveTo(s.x, s.y - len)
          ctx.lineTo(s.x, s.y + len)
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [W, H, floorGrid, drift])

  return canvasRef
}

export const WALL_BG =
  'radial-gradient(1300px 850px at 16% 34%, rgba(91,232,255,.18), transparent 60%),radial-gradient(1500px 950px at 58% 18%, rgba(185,166,255,.24), transparent 60%),radial-gradient(1200px 750px at 86% 62%, rgba(91,232,255,.16), transparent 62%),radial-gradient(1300px 800px at 40% 78%, rgba(241,200,117,.10), transparent 60%),radial-gradient(1800px 1100px at 50% 130%, rgba(24,36,72,.6), transparent 72%),#080b16'

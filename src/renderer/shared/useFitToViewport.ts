import { useEffect, useRef } from 'react'

/**
 * Scale stage nội bộ (W×H) vừa khít viewport: scale = min(vw/W, vh/H).
 * Gắn resize + load + ResizeObserver, retry qua rAF tới khi layout sẵn (chặn scale(0)).
 * Khớp hành vi fit() trong các prototype output.
 */
export function useFitToViewport<T extends HTMLElement>(W: number, H: number) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const fit = (): void => {
      const el = ref.current
      if (!el) return
      const s = Math.min(window.innerWidth / W, window.innerHeight / H)
      if (!s || !isFinite(s)) {
        requestAnimationFrame(fit)
        return
      }
      el.style.transform = `scale(${s})`
    }

    fit()
    ;[0, 60, 200, 500].forEach((d) => setTimeout(fit, d))
    window.addEventListener('resize', fit)
    window.addEventListener('load', fit)
    let ro: ResizeObserver | null = null
    if (window.ResizeObserver) {
      ro = new ResizeObserver(fit)
      ro.observe(document.documentElement)
    }
    return () => {
      window.removeEventListener('resize', fit)
      window.removeEventListener('load', fit)
      if (ro) ro.disconnect()
    }
  }, [W, H])

  return ref
}

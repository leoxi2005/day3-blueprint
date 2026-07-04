import { useEffect, useState } from 'react'
import type { ShowState } from '../../shared/types'

/** Subscribe snapshot state từ main. Trả về null tới khi có state đầu tiên. */
export function useShowState(): ShowState | null {
  const [state, setState] = useState<ShowState | null>(null)

  useEffect(() => {
    let alive = true
    window.day3.getState().then((s) => {
      if (alive) setState(s)
    })
    const off = window.day3.onState((s) => setState(s))
    return () => {
      alive = false
      off()
    }
  }, [])

  return state
}

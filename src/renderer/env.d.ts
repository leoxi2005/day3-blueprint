/// <reference types="vite/client" />
import type { Day3Api } from '../shared/types'

declare global {
  interface Window {
    day3: Day3Api
    day3displays: () => Promise<{ id: number; label: string }[]>
    day3ndi: { available: () => Promise<boolean> }
  }
}

export {}

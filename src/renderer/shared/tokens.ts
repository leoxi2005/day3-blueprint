// Design tokens — chốt theo handoff README (DAY3 BLUEPRINT).
export const T = {
  void: '#070912',
  stageA: '#080b16',
  stageB: '#05070f',
  glass: 'rgba(14,19,34,.72)',
  glassBorder: 'rgba(140,165,210,.22)',
  cyan: '#5be8ff',
  violet: '#b9a6ff',
  gold: '#f1c875',
  goldLt: '#f7d98c',
  green: '#6ee7a8',
  muted: '#8d96b3',
  dim: '#5b6280',
  text: '#eef1f8',
  danger: '#e88a80',
  dangerBg: 'rgba(200,70,60,.10)'
} as const

export const MONO = "ui-monospace,'SF Mono','Cascadia Mono',Consolas,monospace"
export const SANS = "-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif"

// màu theo trạng thái participant / global
export const STATE_COLOR = { idle: T.dim, drafting: T.cyan, uploaded: T.gold } as const
export const GLOBAL_COLOR = { field: T.cyan, ascend: T.violet, settled: T.gold } as const
export const GLOBAL_NAME = { field: 'FIELD', ascend: 'ASCEND', settled: 'SETTLED' } as const
export const BADGE = { idle: 'IDLE', drafting: 'DRAFTING', uploaded: 'UPLOADED' } as const

import { ShowState } from '../../shared/types'

export type WallSceneKey = 'blueprints' | 'drafting' | 'ascension' | 'off'
export type FloorSceneKey = 'house' | 'uploaded' | 'off'

// Scene Wall cuối cùng: nếu chọn 'auto' thì suy từ globalState, ngược lại dùng lựa chọn tay.
export function resolveWall(S: ShowState): WallSceneKey {
  const sel = S.sceneSel.wall
  if (sel !== 'auto') return sel
  if (S.globalState !== 'field') return 'ascension'
  return S.participants.some((p) => p.state !== 'idle') ? 'drafting' : 'blueprints'
}

export function resolveFloor(S: ShowState): FloorSceneKey {
  const sel = S.sceneSel.floor
  if (sel !== 'auto') return sel
  return S.globalState === 'settled' ? 'house' : 'uploaded'
}

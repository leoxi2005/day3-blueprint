import { useShowState } from '../shared/useShowState'
import { useFitToViewport } from '../shared/useFitToViewport'
import { resolveFloor } from '../shared/sceneResolve'
import { Crossfade } from '../shared/Crossfade'
import { CONSTANTS } from '../../shared/types'
import { HouseRises } from './scenes/HouseRises'
import { Uploaded } from './scenes/Uploaded'

export function App() {
  const S = useShowState()
  const floor = S?.outputs.find((o) => o.key === 'floor')
  const W = floor?.resW ?? CONSTANTS.FLOOR_W
  const H = floor?.resH ?? CONSTANTS.FLOOR_H
  const stageRef = useFitToViewport<HTMLDivElement>(W, H)
  const scene = S ? resolveFloor(S) : 'uploaded'

  const renderScene = (key: string) => {
    if (!S) return null
    switch (key) {
      case 'uploaded': return <Uploaded participants={S.participants} W={W} H={H} />
      case 'house': return <HouseRises rotate W={W} H={H} />
      default: return null // off
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#080b16', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          ref={stageRef}
          style={{ position: 'relative', width: W, height: H, flex: '0 0 auto', overflow: 'hidden', transformOrigin: 'center center', transition: 'opacity .6s', opacity: S?.blacked || scene === 'off' ? 0 : 1 }}
        >
          {S && <Crossfade sceneKey={scene} render={renderScene} />}
        </div>
      </div>
    </div>
  )
}

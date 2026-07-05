import { useShowState } from '../shared/useShowState'
import { useFitToViewport } from '../shared/useFitToViewport'
import { resolveWall } from '../shared/sceneResolve'
import { CONSTANTS } from '../../shared/types'
import { Blueprints } from './scenes/Blueprints'
import { Drafting } from './scenes/Drafting'
import { Ascension } from './scenes/Ascension'

export function App() {
  const S = useShowState()
  const wall = S?.outputs.find((o) => o.key === 'wall')
  const W = wall?.resW ?? CONSTANTS.WALL_W
  const H = wall?.resH ?? CONSTANTS.WALL_H
  const stageRef = useFitToViewport<HTMLDivElement>(W, H)

  const scene = S ? resolveWall(S) : 'blueprints'
  const names = S ? S.participants.map((p) => p.name) : []

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#05070f', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        ref={stageRef}
        style={{ position: 'relative', width: W, height: H, flex: '0 0 auto', overflow: 'hidden', transformOrigin: 'center center', transition: 'opacity .6s', opacity: S?.blacked || scene === 'off' ? 0 : 1 }}
      >
        {S && scene === 'blueprints' && <Blueprints key="bp" names={names} W={W} H={H} />}
        {S && scene === 'drafting' && <Drafting key="df" participants={S.participants} W={W} H={H} />}
        {S && scene === 'ascension' && <Ascension key="as" names={names} W={W} H={H} cx={S.ascendX} />}
      </div>
    </div>
  )
}

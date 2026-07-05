import { CONSTANTS, ShowState } from '../../shared/types'
import { resolveWall, resolveFloor } from '../shared/sceneResolve'
import { Blueprints } from '../wall/scenes/Blueprints'
import { Drafting } from '../wall/scenes/Drafting'
import { Ascension } from '../wall/scenes/Ascension'
import { HouseRises } from '../floor/scenes/HouseRises'
import { Uploaded } from '../floor/scenes/Uploaded'

function wallScene(S: ShowState, W: number, H: number) {
  switch (resolveWall(S)) {
    case 'blueprints': return <Blueprints names={S.participants.map((p) => p.name)} W={W} H={H} />
    case 'drafting': return <Drafting participants={S.participants} W={W} H={H} />
    case 'ascension': return <Ascension names={S.participants.map((p) => p.name)} W={W} H={H} cx={S.ascendX} />
    default: return null // off
  }
}
function floorScene(S: ShowState, W: number, H: number) {
  switch (resolveFloor(S)) {
    case 'house': return <HouseRises rotate W={W} H={H} />
    case 'uploaded': return <Uploaded participants={S.participants} W={W} H={H} />
    default: return null // off
  }
}

/**
 * Preview WYSIWYG: khung + scene đều dùng ĐÚNG resW×resH → giống hệt output.
 * Scene tự bố trí responsive theo res, không letterbox/méo.
 */
export function OutputPreview({ S, surface, width, enabled }: { S: ShowState; surface: 'wall' | 'floor'; width: number; enabled: boolean }) {
  const o = S.outputs.find((x) => x.key === surface)
  const resW = o?.resW || (surface === 'wall' ? CONSTANTS.WALL_W : CONSTANTS.FLOOR_W)
  const resH = o?.resH || (surface === 'wall' ? CONSTANTS.WALL_H : CONSTANTS.FLOOR_H)

  // Render preview ở độ phân giải THẤP (giữ tỉ lệ) — scene responsive nên bố cục vẫn đúng,
  // nhẹ hơn full-res cả trăm lần → giữ preview bật mà không tốn GPU.
  const PMAX = 700
  const aspect = resH / resW
  const W = resW >= resH ? PMAX : Math.round(PMAX / aspect)
  const H = resW >= resH ? Math.round(PMAX * aspect) : PMAX

  const s = width / W // preview scale
  const frameH = Math.max(1, Math.round(H * s))
  const off = (surface === 'wall' ? resolveWall(S) : resolveFloor(S)) === 'off'

  return (
    <div style={{ position: 'relative', width, height: frameH, borderRadius: 8, overflow: 'hidden', background: '#05070f', border: '1px solid rgba(140,165,210,.16)' }}>
      {enabled ? (
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, transform: `scale(${s})`, transformOrigin: 'top left', transition: 'opacity .4s', opacity: S.blacked || off ? 0 : 1 }}>
          {surface === 'wall' ? wallScene(S, W, H) : floorScene(S, W, H)}
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "ui-monospace,'SF Mono',monospace", fontSize: 10, letterSpacing: '.2em', color: '#3f465e' }}>PREVIEW OFF</div>
      )}
      {enabled && off && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "ui-monospace,'SF Mono',monospace", fontSize: 10, letterSpacing: '.24em', color: '#3f465e' }}>OFF</div>
      )}
    </div>
  )
}

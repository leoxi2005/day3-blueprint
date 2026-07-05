import { useEffect, useRef, useState, ReactNode } from 'react'

/**
 * Crossfade chuyển cảnh: khi sceneKey đổi, giữ cảnh cũ mounted trong lúc cảnh mới
 * dissolve vào (mỗi scene tự có animation `sceneIn`), rồi bỏ cảnh cũ.
 */
export function Crossfade({ sceneKey, render, duration = 700 }: { sceneKey: string; render: (key: string) => ReactNode; duration?: number }) {
  const [layers, setLayers] = useState<{ id: number; key: string }[]>([{ id: 0, key: sceneKey }])
  const idRef = useRef(0)
  const prev = useRef(sceneKey)

  useEffect(() => {
    if (sceneKey === prev.current) return
    prev.current = sceneKey
    const id = ++idRef.current
    setLayers((ls) => [...ls, { id, key: sceneKey }])
    const t = setTimeout(() => setLayers((ls) => ls.filter((l) => l.id >= id)), duration)
    return () => clearTimeout(t)
  }, [sceneKey, duration])

  return (
    <>
      {layers.map((l) => (
        <div key={l.id} style={{ position: 'absolute', inset: 0 }}>
          {render(l.key)}
        </div>
      ))}
    </>
  )
}

// ============================================================================
// Preload — expose window.day3 an toàn qua contextBridge.
// ============================================================================
import { contextBridge, ipcRenderer } from 'electron'
import type { Action, Day3Api, ShowState } from '../shared/types'

const roleArg = process.argv.find((a) => a.startsWith('--day3-role='))
const role = (roleArg ? roleArg.split('=')[1] : 'control') as Day3Api['role']

const api: Day3Api = {
  role,
  getState: () => ipcRenderer.invoke('day3:getState'),
  dispatch: (action: Action) => ipcRenderer.send('day3:dispatch', action),
  onState: (cb: (state: ShowState) => void) => {
    const handler = (_e: unknown, state: ShowState): void => cb(state)
    ipcRenderer.on('day3:state', handler)
    return () => ipcRenderer.removeListener('day3:state', handler)
  }
}

const listDisplays = (): Promise<{ id: number; label: string }[]> => ipcRenderer.invoke('day3:listDisplays')
const ndiAvailable = (): Promise<boolean> => ipcRenderer.invoke('day3:ndiAvailable')

contextBridge.exposeInMainWorld('day3', api)
contextBridge.exposeInMainWorld('day3displays', listDisplays)
contextBridge.exposeInMainWorld('day3ndi', { available: ndiAvailable })

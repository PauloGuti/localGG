import { contextBridge, ipcRenderer } from 'electron'
import { STATE_CHANNEL, type OverlayState } from '../shared'

contextBridge.exposeInMainWorld('localgg', {
  onState: (cb: (s: OverlayState) => void) => {
    ipcRenderer.on(STATE_CHANNEL, (_e, s: OverlayState) => cb(s))
  }
})

import path from 'node:path'
import { BrowserWindow, app, globalShortcut, screen } from 'electron'
import { autoUpdater } from 'electron-updater'
import { loadCatalog } from '@localgg/data'
import { advise, type Catalog } from '@localgg/engine'
import { fetchAllGameData, toSnapshot } from '@localgg/liveclient'
import { STATE_CHANNEL, type OverlayState } from '../shared'
import { mockGame } from './mock'

const MOCK = process.env.LOCALGG_MOCK === '1'
const POLL_MS = 1000

let overlay: BrowserWindow | null = null
let last = ''

function send(state: OverlayState): void {
  const json = JSON.stringify(state)
  if (json === last) return // avoid pointless renders: keep CPU near zero
  last = json
  overlay?.webContents.send(STATE_CHANNEL, state)
}

function createOverlay(): BrowserWindow {
  const { workArea } = screen.getPrimaryDisplay()
  const width = 340
  const win = new BrowserWindow({
    width,
    height: 200,
    x: Math.round(workArea.x + workArea.width / 2 - width / 2),
    y: workArea.y + 8,
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    focusable: false,
    fullscreenable: false,
    // macOS: only a non-activating panel can float above another app's fullscreen Space.
    ...(process.platform === 'darwin' ? { type: 'panel' as const } : {}),
    alwaysOnTop: true,
    webPreferences: { preload: path.join(__dirname, '../preload/index.js'), sandbox: true, contextIsolation: true }
  })
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true })
  win.setAlwaysOnTop(true, 'screen-saver', 1)
  win.setIgnoreMouseEvents(true) // click-through: never steals input from the game
  if (process.env.ELECTRON_RENDERER_URL) win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/overlay.html`)
  else win.loadFile(path.join(__dirname, '../renderer/overlay.html'))
  return win
}

async function startMonitor(): Promise<void> {
  send({ status: 'loading-data' })
  let data: { catalog: Catalog; version: string }
  try {
    data = await loadCatalog(path.join(app.getPath('userData'), 'ddragon'))
  } catch (e) {
    send({ status: 'error', message: `No se pudieron cargar los datos: ${(e as Error).message}` })
    return
  }

  const mockStart = Date.now()
  const tick = async (): Promise<void> => {
    try {
      const raw = MOCK ? mockGame(mockStart) : await fetchAllGameData()
      const snapshot = toSnapshot(raw)
      if (!snapshot) return send({ status: 'waiting' })
      send({ status: 'in-game', gameTime: snapshot.gameTime, advice: advise(snapshot, data.catalog), patch: data.version })
    } catch {
      send({ status: 'waiting' }) // no game running: the port is closed
    }
  }
  // Sequential timer (not setInterval) so slow responses never pile up.
  const loop = async (): Promise<void> => {
    await tick()
    setTimeout(loop, POLL_MS)
  }
  void loop()
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') app.dock?.hide()
  overlay = createOverlay()
  if (app.isPackaged) {
    // Checks GitHub Releases, downloads in the background, installs on quit. Nothing is sent but the version.
    autoUpdater.checkForUpdatesAndNotify().catch(() => {})
  }
  overlay.webContents.once('did-finish-load', () => void startMonitor())

  globalShortcut.register('CommandOrControl+Shift+O', () => {
    if (!overlay) return
    overlay.isVisible() ? overlay.hide() : overlay.showInactive()
  })
  globalShortcut.register('CommandOrControl+Shift+Q', () => app.quit())
})

app.on('window-all-closed', () => app.quit())
app.on('will-quit', () => globalShortcut.unregisterAll())

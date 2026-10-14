import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

// Workspace packages ship TypeScript source, so they must be bundled, not externalized.
const workspace = ['@localgg/engine', '@localgg/liveclient', '@localgg/data']

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin({ exclude: workspace })] },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer: {
    plugins: [react()],
    build: { rollupOptions: { input: { overlay: resolve(__dirname, 'src/renderer/overlay.html') } } }
  }
})

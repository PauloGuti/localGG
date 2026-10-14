import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Suggestion } from '@localgg/engine'
import type { OverlayState } from '../../shared'
import './overlay.css'

declare global {
  interface Window {
    localgg: { onState: (cb: (s: OverlayState) => void) => void }
  }
}

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const icon = (patch: string, id: number) => `https://ddragon.leagueoflegends.com/cdn/${patch}/img/item/${id}.png`

const TAG: Record<Suggestion['kind'], string> = { 'buy-now': 'Comprar ya', component: 'Componente', save: 'Ahorrar' }

function Row({ s, patch }: { s: Suggestion; patch: string }) {
  return (
    <div className="row">
      <img src={icon(patch, s.itemId)} alt="" />
      <div>
        <div className="name">
          {s.itemName}
          <span className={`tag ${s.kind === 'buy-now' ? 'now' : ''}`}>{TAG[s.kind]}</span>
          {s.missingGold > 0 && <span className="muted"> · faltan {s.missingGold}</span>}
        </div>
        <div className="why">{s.reason}</div>
      </div>
    </div>
  )
}

function App() {
  const [state, setState] = useState<OverlayState>({ status: 'waiting' })
  useEffect(() => window.localgg.onState(setState), [])

  if (state.status === 'in-game') {
    const { advice, gameTime, patch } = state
    return (
      <div className="card">
        <div className="head">
          <span>{fmtTime(gameTime)}</span>
          <span className="gold">{advice.gold} oro</span>
        </div>
        {advice.suggestions.length === 0 && <div className="muted">Sin sugerencias: sigue tu build.</div>}
        {advice.suggestions.map((s) => <Row key={`${s.kind}-${s.itemId}`} s={s} patch={patch} />)}
      </div>
    )
  }
  const text =
    state.status === 'error' ? state.message : state.status === 'loading-data' ? 'localGG: cargando datos del parche…' : 'localGG: esperando partida…'
  return <div className="card muted">{text}</div>
}

createRoot(document.getElementById('root')!).render(<App />)

import threatRules from '../rules/threats.json'
import type { Catalog, ChampionData, PlayerSnapshot, ThreatProfile } from './types'

export function findChampion(catalog: Catalog, name: string): ChampionData | undefined {
  if (catalog.champions[name]) return catalog.champions[name]
  const norm = (s: string) => s.replace(/[^a-z0-9]/gi, '').toLowerCase()
  const target = norm(name)
  return Object.values(catalog.champions).find((c) => norm(c.id) === target || norm(c.name) === target)
}

export function buildThreat(enemies: PlayerSnapshot[], catalog: Catalog): ThreatProfile {
  let ad = 0
  let ap = 0
  let tanks = 0
  const healers: string[] = []
  const healerSet = new Set(threatRules.healers.map((h) => h.toLowerCase()))

  for (const enemy of enemies) {
    const champ = findChampion(catalog, enemy.championName)
    if (!champ) continue
    ad += champ.attack
    ap += champ.magic
    if (champ.tags.includes('Tank')) tanks++
    if (healerSet.has(champ.id.toLowerCase())) healers.push(champ.name)
  }
  const total = ad + ap
  return {
    adShare: total ? ad / total : 0.5,
    apShare: total ? ap / total : 0.5,
    healers,
    tanks
  }
}

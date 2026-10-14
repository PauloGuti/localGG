import itemRules from '../rules/items.json'
import threatRules from '../rules/threats.json'
import { buildThreat, findChampion } from './threat'
import type { Advice, Catalog, ChampionData, GameSnapshot, ItemData, Role, Suggestion, ThreatProfile } from './types'

interface Candidate {
  name: string
  weight: number
  reason: string
}

function byName(catalog: Catalog, name: string): ItemData | undefined {
  return Object.values(catalog.items).find((i) => i.name === name && i.gold.purchasable)
}

/** Rough build archetype of the player's champion: decides which items are even relevant. */
export function roleOf(champ: ChampionData | undefined): Role {
  if (!champ) return 'ad'
  if (champ.tags.includes('Tank')) return 'tank'
  if (champ.magic > champ.attack) return 'ap'
  return 'ad'
}

interface RuleItem {
  name: string
  for: string[]
}

function pick(list: RuleItem[], role: Role, weight: number, reason: string): Candidate[] {
  return list.filter((i) => i.for.includes(role)).map((i) => ({ name: i.name, weight, reason }))
}

function candidatesFor(threat: ThreatProfile, role: Role): Candidate[] {
  const out: Candidate[] = []
  const { damageShareHeavy, healersForStrongAntiheal } = threatRules.thresholds

  if (threat.healers.length > 0) {
    const weight = threat.healers.length >= healersForStrongAntiheal ? 0.9 : 0.6
    out.push(...pick(itemRules.antiheal, role, weight, `Antiheal: el rival tiene curación (${threat.healers.join(', ')})`))
  }
  if (threat.adShare >= damageShareHeavy) {
    out.push(...pick(itemRules.armor, role, 0.7, `Equipo rival ${Math.round(threat.adShare * 100)}% daño físico`))
  }
  if (threat.apShare >= damageShareHeavy) {
    out.push(...pick(itemRules.magicResist, role, 0.7, `Equipo rival ${Math.round(threat.apShare * 100)}% daño mágico`))
  }
  return out
}

/** Highest-priced component of `item` the player can afford right now, if any. */
function affordableComponent(item: ItemData, gold: number, owned: Set<number>, catalog: Catalog): ItemData | undefined {
  return item.from
    .filter((id) => !owned.has(id))
    .map((id) => catalog.items[id])
    .filter((c): c is ItemData => !!c && c.gold.total <= gold)
    .sort((a, b) => b.gold.total - a.gold.total)[0]
}

export function advise(snapshot: GameSnapshot, catalog: Catalog, maxSuggestions = 3): Advice {
  const threat = buildThreat(snapshot.enemies, catalog)
  const role = roleOf(findChampion(catalog, snapshot.me.championName))
  const owned = new Set(snapshot.me.items)
  const best = new Map<number, Suggestion>()

  for (const c of candidatesFor(threat, role)) {
    const item = byName(catalog, c.name)
    if (!item || owned.has(item.id)) continue

    // Components already owned count towards the price.
    const ownedValue = item.from.reduce((sum, id) => sum + (owned.has(id) ? catalog.items[id]?.gold.total ?? 0 : 0), 0)
    const missing = Math.max(0, item.gold.total - ownedValue - snapshot.gold)
    let suggestion: Suggestion
    if (missing === 0) {
      suggestion = { kind: 'buy-now', itemId: item.id, itemName: item.name, missingGold: 0, reason: c.reason, score: c.weight + 0.3 }
    } else {
      const comp = affordableComponent(item, snapshot.gold, owned, catalog)
      suggestion = comp
        ? { kind: 'component', itemId: comp.id, itemName: comp.name, missingGold: missing, reason: `${c.reason} → camino a ${item.name}`, score: c.weight + 0.1 }
        : { kind: 'save', itemId: item.id, itemName: item.name, missingGold: missing, reason: c.reason, score: c.weight - missing / 10000 }
    }
    // Far-away purchases are noise; only plan what is reachable soon.
    if (suggestion.kind === 'save' && missing > itemRules.maxMissingGold) continue
    const prev = best.get(suggestion.itemId)
    if (!prev || prev.score < suggestion.score) best.set(suggestion.itemId, suggestion)
  }

  const suggestions = [...best.values()].sort((a, b) => b.score - a.score).slice(0, maxSuggestions)
  return { gold: snapshot.gold, threat, role, suggestions }
}

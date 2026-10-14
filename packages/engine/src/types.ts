export interface ItemData {
  id: number
  name: string
  gold: { base: number; total: number; purchasable: boolean }
  /** Component item ids this item is built from. */
  from: number[]
}

export interface ChampionData {
  /** Data Dragon id, e.g. "DrMundo". */
  id: string
  name: string
  tags: string[]
  /** Data Dragon `info.attack` / `info.magic` (0-10). */
  attack: number
  magic: number
}

export interface PlayerSnapshot {
  championName: string
  team: 'ORDER' | 'CHAOS'
  level: number
  items: number[]
  isDead: boolean
}

export interface GameSnapshot {
  gameTime: number
  gold: number
  me: PlayerSnapshot
  allies: PlayerSnapshot[]
  enemies: PlayerSnapshot[]
}

export interface Catalog {
  items: Record<number, ItemData>
  /** Keyed by Data Dragon id or display name (both lookups supported by `findChampion`). */
  champions: Record<string, ChampionData>
}

export type Role = 'ad' | 'ap' | 'tank'

export interface ThreatProfile {
  adShare: number
  apShare: number
  healers: string[]
  tanks: number
}

export type SuggestionKind = 'buy-now' | 'component' | 'save'

export interface Suggestion {
  kind: SuggestionKind
  itemId: number
  itemName: string
  /** Gold missing to afford `itemId` (0 if affordable). */
  missingGold: number
  reason: string
  score: number
}

export interface Advice {
  gold: number
  threat: ThreatProfile
  /** Archetype of the player's own champion. */
  role: Role
  suggestions: Suggestion[]
}

import { describe, expect, it } from 'vitest'
import { advise } from './advisor'
import type { Catalog, GameSnapshot, PlayerSnapshot } from './types'

const catalog: Catalog = {
  items: {
    1: { id: 1, name: "Executioner's Calling", gold: { base: 800, total: 800, purchasable: true }, from: [] },
    2: { id: 2, name: 'Mortal Reminder', gold: { base: 1300, total: 2600, purchasable: true }, from: [1, 3] },
    3: { id: 3, name: 'Last Whisper', gold: { base: 1300, total: 1300, purchasable: true }, from: [] },
    4: { id: 4, name: 'Plated Steelcaps', gold: { base: 500, total: 1100, purchasable: true }, from: [] },
    5: { id: 5, name: 'Thornmail', gold: { base: 1000, total: 2700, purchasable: true }, from: [] },
    6: { id: 6, name: "Zhonya's Hourglass", gold: { base: 1000, total: 3250, purchasable: true }, from: [] }
  },
  champions: {
    Soraka: { id: 'Soraka', name: 'Soraka', tags: ['Support'], attack: 2, magic: 7 },
    Zed: { id: 'Zed', name: 'Zed', tags: ['Assassin'], attack: 9, magic: 1 },
    Darius: { id: 'Darius', name: 'Darius', tags: ['Fighter', 'Tank'], attack: 9, magic: 1 },
    Jinx: { id: 'Jinx', name: 'Jinx', tags: ['Marksman'], attack: 9, magic: 4 },
    Ahri: { id: 'Ahri', name: 'Ahri', tags: ['Mage', 'Assassin'], attack: 3, magic: 8 }
  }
}

const p = (championName: string, items: number[] = []): PlayerSnapshot => ({
  championName, team: 'CHAOS', level: 6, items, isDead: false
})

const snap = (gold: number, enemies: PlayerSnapshot[], mine: number[] = [], champ = 'Jinx'): GameSnapshot => ({
  gameTime: 600, gold, me: { ...p(champ, mine), team: 'ORDER' }, allies: [], enemies
})

describe('advise', () => {
  it('recommends antiheal when the enemy has a healer', () => {
    const a = advise(snap(900, [p('Soraka'), p('Zed')]), catalog)
    expect(a.threat.healers).toContain('Soraka')
    expect(a.suggestions[0].itemName).toBe("Executioner's Calling")
    expect(a.suggestions[0].kind).toBe('buy-now')
  })

  it('suggests an affordable component towards the full item', () => {
    const a = advise(snap(1400, [p('Soraka'), p('Zed')], [1]), catalog)
    const s = a.suggestions.find((x) => x.itemName === 'Last Whisper')
    expect(s?.kind).toBe('component')
  })

  it('suggests armor against an all-AD team and skips owned items', () => {
    const a = advise(snap(1200, [p('Zed'), p('Darius')], [4]), catalog)
    expect(a.suggestions.find((x) => x.itemName === 'Plated Steelcaps')).toBeUndefined()
  })

  it('does not suggest tank items to a mage and picks AP-appropriate ones', () => {
    const a = advise(snap(3300, [p('Zed'), p('Darius')], [], 'Ahri'), catalog)
    expect(a.role).toBe('ap')
    expect(a.suggestions.map((x) => x.itemName)).not.toContain('Thornmail')
    expect(a.suggestions.map((x) => x.itemName)).toContain("Zhonya's Hourglass")
  })

  it('does not nag about items that are far out of reach', () => {
    const a = advise(snap(0, [p('Zed'), p('Darius')], [], 'Ahri'), catalog)
    expect(a.suggestions).toEqual([])
  })

  it('shows localized names when available, matching rules on English ones', () => {
    const a = advise(snap(900, [p('Soraka'), p('Zed')]), { ...catalog, itemNames: { 1: 'Llamada del Verdugo' } })
    expect(a.suggestions[0].itemName).toBe("Executioner's Calling")
    expect(a.suggestions[0].displayName).toBe('Llamada del Verdugo')
  })
})

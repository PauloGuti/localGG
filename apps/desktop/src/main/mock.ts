import type { AllGameData } from '@localgg/liveclient'

const p = (championName: string, rawChampionName: string, team: 'ORDER' | 'CHAOS', riotId: string, items: number[] = []) => ({
  championName, rawChampionName: `game_character_displayname_${rawChampionName}`, team, level: 7, isDead: false, riotId,
  items: items.map((itemID) => ({ itemID, count: 1 }))
})

/** Fake game for UI/dev work without League running. Gold grows with time. */
export function mockGame(startedAt: number): AllGameData {
  const t = (Date.now() - startedAt) / 1000
  return {
    activePlayer: { currentGold: 400 + t * 25, riotId: 'Tu#EUW' },
    gameData: { gameTime: 420 + t },
    allPlayers: [
      p('Jinx', 'Jinx', 'ORDER', 'Tu#EUW', [1055, 1036]),
      p('Thresh', 'Thresh', 'ORDER', 'Aliado#1'),
      p('Soraka', 'Soraka', 'CHAOS', 'Rival#1'),
      p('Darius', 'Darius', 'CHAOS', 'Rival#2'),
      p('Zed', 'Zed', 'CHAOS', 'Rival#3'),
      p('Vladimir', 'Vladimir', 'CHAOS', 'Rival#4')
    ]
  }
}

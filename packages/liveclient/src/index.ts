import https from 'node:https'
import type { GameSnapshot, PlayerSnapshot } from '@localgg/engine'

/** Subset of https://127.0.0.1:2999/liveclientdata/allgamedata that we use. */
export interface AllGameData {
  activePlayer: { currentGold: number; riotId?: string; summonerName?: string }
  allPlayers: Array<{
    championName: string
    rawChampionName?: string
    team: 'ORDER' | 'CHAOS'
    level: number
    isDead: boolean
    riotId?: string
    summonerName?: string
    items: Array<{ itemID: number; count: number }>
  }>
  gameData: { gameTime: number }
}

// The Live Client API serves a self-signed certificate on localhost only.
const agent = new https.Agent({ rejectUnauthorized: false })

export function fetchAllGameData(host = '127.0.0.1', port = 2999, timeoutMs = 1500): Promise<AllGameData> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      { host, port, path: '/liveclientdata/allgamedata', agent, timeout: timeoutMs },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume()
          return reject(new Error(`Live Client HTTP ${res.statusCode}`))
        }
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
          } catch (e) {
            reject(e)
          }
        })
      }
    )
    req.on('timeout', () => req.destroy(new Error('Live Client timeout')))
    req.on('error', reject)
  })
}

/** "game_character_displayname_DrMundo" -> "DrMundo"; falls back to the localized name. */
function championId(p: AllGameData['allPlayers'][number]): string {
  return p.rawChampionName?.replace(/^game_character_displayname_/, '') || p.championName
}

function toPlayer(p: AllGameData['allPlayers'][number]): PlayerSnapshot {
  const items: number[] = []
  for (const i of p.items) for (let n = 0; n < (i.count || 1); n++) items.push(i.itemID)
  return { championName: championId(p), team: p.team, level: p.level, items, isDead: p.isDead }
}

export function toSnapshot(data: AllGameData): GameSnapshot | null {
  const id = data.activePlayer.riotId ?? data.activePlayer.summonerName
  const meRaw = data.allPlayers.find((p) => (p.riotId ?? p.summonerName) === id)
  if (!meRaw) return null
  const me = toPlayer(meRaw)
  const others = data.allPlayers.filter((p) => p !== meRaw).map(toPlayer)
  return {
    gameTime: data.gameData.gameTime,
    gold: Math.floor(data.activePlayer.currentGold),
    me,
    allies: others.filter((p) => p.team === me.team),
    enemies: others.filter((p) => p.team !== me.team)
  }
}

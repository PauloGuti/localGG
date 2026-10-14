import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Catalog, ChampionData, ItemData } from '@localgg/engine'

const DDRAGON = 'https://ddragon.leagueoflegends.com'

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
  return (await res.json()) as T
}

async function cached<T>(file: string, load: () => Promise<T>): Promise<T> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T
  } catch {
    const value = await load()
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, JSON.stringify(value))
    return value
  }
}

export async function latestVersion(): Promise<string> {
  return (await getJson<string[]>(`${DDRAGON}/api/versions.json`))[0]
}

/** Loads items and champions for the latest patch (English names), cached per patch on disk. */
export async function loadCatalog(cacheDir: string): Promise<{ catalog: Catalog; version: string }> {
  let version: string
  try {
    version = await latestVersion()
  } catch {
    // Offline: reuse the newest cached patch.
    version = JSON.parse(await readFile(path.join(cacheDir, 'latest.json'), 'utf8')).version
  }
  await mkdir(cacheDir, { recursive: true })
  await writeFile(path.join(cacheDir, 'latest.json'), JSON.stringify({ version }))

  const base = `${DDRAGON}/cdn/${version}/data/en_US`
  const rawItems = await cached<{ data: Record<string, any> }>(path.join(cacheDir, `${version}-item.json`), () =>
    getJson(`${base}/item.json`)
  )
  const rawChamps = await cached<{ data: Record<string, any> }>(path.join(cacheDir, `${version}-champion.json`), () =>
    getJson(`${base}/champion.json`)
  )

  const items: Record<number, ItemData> = {}
  for (const [id, i] of Object.entries(rawItems.data)) {
    items[+id] = {
      id: +id,
      name: i.name,
      gold: { base: i.gold.base, total: i.gold.total, purchasable: !!i.gold.purchasable },
      from: (i.from ?? []).map(Number)
    }
  }
  const champions: Record<string, ChampionData> = {}
  for (const c of Object.values<any>(rawChamps.data)) {
    champions[c.id] = { id: c.id, name: c.name, tags: c.tags, attack: c.info.attack, magic: c.info.magic }
  }
  return { catalog: { items, champions }, version }
}

export const itemIconUrl = (version: string, itemId: number) => `${DDRAGON}/cdn/${version}/img/item/${itemId}.png`

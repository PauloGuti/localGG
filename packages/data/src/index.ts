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
export async function loadCatalog(cacheDir: string, locale = 'en_US'): Promise<{ catalog: Catalog; version: string }> {
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

  // Localized names are display-only; failing to fetch them must never break the app.
  let itemNames: Record<number, string> | undefined
  if (locale !== 'en_US') {
    try {
      const loc = await cached<{ data: Record<string, any> }>(path.join(cacheDir, `${version}-item-${locale}.json`), () =>
        getJson(`${DDRAGON}/cdn/${version}/data/${locale}/item.json`)
      )
      itemNames = Object.fromEntries(Object.entries(loc.data).map(([id, i]) => [+id, i.name as string]))
    } catch {
      itemNames = undefined
    }
  }

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
  return { catalog: { items, champions, itemNames }, version }
}

export const itemIconUrl = (version: string, itemId: number) => `${DDRAGON}/cdn/${version}/img/item/${itemId}.png`

/** Maps an OS locale such as "es-MX" or "pt-BR" to a Data Dragon locale; unknown ones fall back to English. */
export function ddragonLocale(osLocale: string): string {
  const supported = ['es_ES', 'es_MX', 'pt_BR', 'fr_FR', 'de_DE', 'it_IT', 'pl_PL', 'tr_TR', 'ru_RU', 'ko_KR', 'ja_JP', 'zh_CN', 'zh_TW', 'en_US']
  const norm = osLocale.replace('-', '_')
  if (supported.includes(norm)) return norm
  const lang = norm.split('_')[0]
  if (lang === 'es') return 'es_ES'
  return supported.find((l) => l.startsWith(lang + '_')) ?? 'en_US'
}

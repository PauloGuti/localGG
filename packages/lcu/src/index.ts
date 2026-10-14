import { existsSync, readFileSync } from 'node:fs'
import https from 'node:https'
import path from 'node:path'

/** Credentials of the running League client, from its lockfile ("name:pid:port:password:protocol"). */
export interface LcuCredentials {
  port: number
  password: string
  protocol: string
}

export function parseLockfile(content: string): LcuCredentials | null {
  const [, , port, password, protocol] = content.trim().split(':')
  if (!port || !password || !protocol || Number.isNaN(+port)) return null
  return { port: +port, password, protocol }
}

/** Likely install folders per platform. `LOL_INSTALL_DIR` overrides them (custom installs). */
export function lockfileCandidates(env = process.env, platform = process.platform): string[] {
  const dirs: string[] = []
  if (env.LOL_INSTALL_DIR) dirs.push(env.LOL_INSTALL_DIR)
  if (platform === 'darwin') dirs.push('/Applications/League of Legends.app/Contents/LoL')
  if (platform === 'win32') {
    for (const drive of ['C', 'D', 'E']) dirs.push(`${drive}:\\Riot Games\\League of Legends`)
  }
  return dirs.map((d) => path.join(d, 'lockfile'))
}

export function readCredentials(candidates = lockfileCandidates()): LcuCredentials | null {
  for (const file of candidates) {
    if (!existsSync(file)) continue
    try {
      const creds = parseLockfile(readFileSync(file, 'utf8'))
      if (creds) return creds
    } catch {
      // unreadable or mid-write: try the next candidate
    }
  }
  return null
}

// The client serves a self-signed certificate on 127.0.0.1 only.
const agent = new https.Agent({ rejectUnauthorized: false })

export function lcuGet<T>(creds: LcuCredentials, route: string, timeoutMs = 2000): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      {
        host: '127.0.0.1',
        port: creds.port,
        path: route,
        agent,
        timeout: timeoutMs,
        headers: { Authorization: 'Basic ' + Buffer.from(`riot:${creds.password}`).toString('base64'), Accept: 'application/json' }
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8')
          if (res.statusCode && res.statusCode >= 400) return reject(new Error(`LCU ${route} -> HTTP ${res.statusCode}`))
          try {
            resolve(JSON.parse(body) as T)
          } catch (e) {
            reject(e)
          }
        })
      }
    )
    req.on('timeout', () => req.destroy(new Error('LCU timeout')))
    req.on('error', reject)
  })
}

/** Language of the game client, e.g. "es_MX": this is what Data Dragon calls a locale. */
export async function getClientLocale(creds: LcuCredentials): Promise<string> {
  return (await lcuGet<{ locale: string }>(creds, '/riotclient/region-locale')).locale
}

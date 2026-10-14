import { describe, expect, it } from 'vitest'
import { lockfileCandidates, parseLockfile } from './index'

describe('lcu', () => {
  it('parses a lockfile', () => {
    expect(parseLockfile('LeagueClient:94834:52722:s3cret:https')).toEqual({ port: 52722, password: 's3cret', protocol: 'https' })
  })
  it('rejects garbage', () => {
    expect(parseLockfile('')).toBeNull()
    expect(parseLockfile('a:b:notaport:pw:https')).toBeNull()
  })
  it('lists platform candidates and honors LOL_INSTALL_DIR', () => {
    expect(lockfileCandidates({}, 'darwin')[0]).toContain('League of Legends.app')
    expect(lockfileCandidates({ LOL_INSTALL_DIR: '/x' }, 'win32')[0]).toMatch(/x.lockfile$/)
    expect(lockfileCandidates({}, 'win32').length).toBe(3)
  })
})

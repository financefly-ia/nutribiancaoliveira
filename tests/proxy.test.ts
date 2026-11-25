import { NextRequest } from 'next/server'
import { beforeAll, expect, test } from 'vitest'
import { criarToken } from '@/lib/auth/session'
import { config, proxy } from '@/proxy'

beforeAll(() => {
  process.env.SESSION_SECRET = 'segredo-de-teste'
})

const req = (path: string, cookie?: string, headers: Record<string, string> = {}) =>
  new NextRequest(new URL(path, 'http://localhost:3000'), { headers: { ...headers, ...(cookie ? { cookie: `bo_sessao=${cookie}` } : {}) } })
const passou = (r: Response) => r.headers.get('x-middleware-next') === '1'

test('painel sem sessão → redirect para login (inclusive requisição RSC)', () => {
  for (const p of ['/painel', '/painel/contato/abc', '/painel/novo']) {
    const r = proxy(req(p, undefined, { RSC: '1', 'Next-Router-State-Tree': '%5B%5D' }))
    expect(r.status).toBe(307)
    expect(new URL(r.headers.get('location')!).pathname).toBe('/painel/login')
  }
})

test('exportar sem sessão → 401', () => {
  expect(proxy(req('/painel/exportar')).status).toBe(401)
})

test('cookie inválido é barrado; válido passa', () => {
  expect(proxy(req('/painel', 'lixo')).status).toBe(307)
  expect(passou(proxy(req('/painel/contato/abc', criarToken('segredo-de-teste'))))).toBe(true)
})

test('login e assets do painel passam sem sessão', () => {
  expect(passou(proxy(req('/painel/login')))).toBe(true)
})

test('matcher cobre o painel', () => {
  expect(config.matcher).toContain('/painel/:path*')
})

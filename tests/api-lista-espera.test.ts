import { beforeEach, expect, test, vi } from 'vitest'
import { memoryStore, type ContatoStore } from '@/lib/contatos/store'

let store: ContatoStore
vi.mock('@/lib/contatos/get-store', () => ({ getStore: () => store }))

const { POST } = await import('@/app/api/lista-espera/route')

const valido = { nome: 'Ana Souza', email: 'ana@x.com', whatsapp: '(11) 98888-7777', objetivo: 'Ganhar massa', consentimento: true }
const req = (body: unknown, raw = false) =>
  new Request('http://localhost/api/lista-espera', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })

beforeEach(() => {
  store = memoryStore()
})

test('200 e grava', async () => {
  const res = await POST(req(valido))
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ ok: true })
  expect(await store.list()).toHaveLength(1)
})

test('400 com erros de campo', async () => {
  const res = await POST(req({ ...valido, whatsapp: '12' }))
  expect(res.status).toBe(400)
  const body = await res.json()
  expect(body.ok).toBe(false)
  expect(body.erros.whatsapp).toBe('Informe um WhatsApp com DDD.')
})

test('honeypot → 200 sem gravar', async () => {
  const res = await POST(req({ ...valido, site: 'http://spam' }))
  expect(res.status).toBe(200)
  expect(await store.list()).toEqual([])
})

test('corpo inválido → 400', async () => {
  const res = await POST(req('xx', true))
  expect(res.status).toBe(400)
  expect(await res.json()).toEqual({ ok: false, erros: { geral: 'Dados inválidos.' } })
})

test('corpo grande demais → 413', async () => {
  const res = await POST(req({ ...valido, objetivo: 'x'.repeat(11_000) }))
  expect(res.status).toBe(413)
})

test('falha do store → 500 com mensagem amigável', async () => {
  store = { ...memoryStore(), atualizar: async () => { throw new Error('blob fora') } }
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const res = await POST(req(valido))
  expect(res.status).toBe(500)
  expect(await res.json()).toEqual({ ok: false, erro: 'Não foi possível enviar agora. Tente novamente em instantes.' })
  expect(spy).toHaveBeenCalled()
  spy.mockRestore()
})

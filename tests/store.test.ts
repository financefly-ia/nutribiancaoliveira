import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { atualizarDocumento, Conflito, memoriaDocs, type Documentos } from '@/lib/dados/documentos'
import { arquivoDocs } from '@/lib/dados/documentos-arquivo'
import { contatoStore, memoryStore } from '@/lib/contatos/store'
import { fileStore } from '@/lib/contatos/store-file'
import type { Contato } from '@/lib/contatos/types'

const c = (id: string, criadoEm: string): Contato => ({
  id, nome: `Contato ${id}`, whatsapp: '11988887777', origem: 'site', etapa: 'lista', notas: [], criadoEm, atualizadoEm: criadoEm,
})

describe.each([
  ['memória', () => memoryStore()],
  ['arquivo', () => fileStore(mkdtempSync(join(tmpdir(), 'ct-')))],
])('contatoStore (%s)', (_, mk) => {
  test('atualizar/get/list ordenado por criadoEm desc', async () => {
    const s = mk()
    await s.atualizar((m) => { m.a = c('a', '2026-01-01T00:00:00Z'); m.b = c('b', '2026-02-01T00:00:00Z') })
    expect((await s.get('a'))?.nome).toBe('Contato a')
    expect((await s.list()).map((x) => x.id)).toEqual(['b', 'a'])
  })
  test('get inexistente → null; lista vazia', async () => {
    const s = mk()
    expect(await s.get('zzz')).toBeNull()
    expect(await s.list()).toEqual([])
  })
  test('id inválido é rejeitado', async () => {
    await expect(mk().get('../x')).rejects.toThrow()
  })
  test('get devolve cópia (mutar não altera o armazenado)', async () => {
    const s = mk()
    await s.atualizar((m) => { m.a = c('a', '2026-01-01T00:00:00Z') })
    const x = (await s.get('a'))!
    x.nome = 'mutado'
    expect((await s.get('a'))?.nome).toBe('Contato a')
  })
})

describe.each([
  ['memória', (): Documentos => memoriaDocs()],
  ['arquivo', (): Documentos => arquivoDocs(mkdtempSync(join(tmpdir(), 'doc-')))],
])('documentos (%s)', (_, mk) => {
  test('gravar com etag antiga lança Conflito', async () => {
    const d = mk()
    const e1 = await d.gravar('x', { n: 1 }, null)
    await d.gravar('x', { n: 2 }, e1)
    await expect(d.gravar('x', { n: 3 }, e1)).rejects.toBeInstanceOf(Conflito)
    await expect(d.gravar('x', { n: 3 }, null)).rejects.toBeInstanceOf(Conflito)
    expect((await d.ler<{ n: number }>('x'))?.dados.n).toBe(2)
  })
  test('nome inválido é rejeitado', async () => {
    await expect(mk().ler('../x')).rejects.toThrow()
  })
})

test('atualizações concorrentes não se perdem (retry otimista)', async () => {
  const d = memoriaDocs()
  await Promise.all(
    Array.from({ length: 8 }, (_, i) => atualizarDocumento(d, 'n', () => ({ itens: [] as number[] }), (r) => { r.itens.push(i) })),
  )
  expect((await d.ler<{ itens: number[] }>('n'))!.dados.itens.sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
})

test('sem mudança não grava (economiza operação)', async () => {
  const d = memoriaDocs()
  await atualizarDocumento(d, 'n', () => ({ v: 1 }), () => {})
  expect(d.gravacoes).toBe(1) // criação
  await atualizarDocumento(d, 'n', () => ({ v: 1 }), () => {})
  expect(d.gravacoes).toBe(1)
})

test('abrir a lista custa 1 leitura, não 1 por contato', async () => {
  const d = memoriaDocs()
  const s = contatoStore(d)
  await s.atualizar((m) => { for (let i = 0; i < 50; i++) m[`c${i}`] = c(`c${i}`, '2026-01-01T00:00:00Z') })
  const antes = d.leituras
  await s.list()
  expect(d.leituras - antes).toBe(1)
})

test('migra o formato antigo (um arquivo por contato) na primeira leitura', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mig-'))
  mkdirSync(join(dir, 'contatos'))
  writeFileSync(join(dir, 'contatos', 'a.json'), JSON.stringify(c('a', '2026-01-01T00:00:00Z')))
  writeFileSync(join(dir, 'contatos', 'b.json'), JSON.stringify(c('b', '2026-02-01T00:00:00Z')))
  const s = fileStore(dir)
  expect((await s.list()).map((x) => x.id)).toEqual(['b', 'a'])
  // Depois da migração o documento único existe e passa a ser a fonte.
  expect((await arquivoDocs(dir).ler<{ contatos: Record<string, Contato> }>('contatos'))?.dados.contatos.a.nome).toBe('Contato a')
})

test('ETag fraco do get do Blob vira a forma forte aceita pelo ifMatch', async () => {
  const { etagForte } = await import('@/lib/dados/documentos-blob')
  expect(etagForte('W/"171124acb2f973e9"')).toBe('"171124acb2f973e9"')
  expect(etagForte('"171124acb2f973e9"')).toBe('"171124acb2f973e9"')
})

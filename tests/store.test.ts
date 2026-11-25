import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { memoryStore } from '@/lib/contatos/store'
import { fileStore } from '@/lib/contatos/store-file'
import type { Contato } from '@/lib/contatos/types'

const c = (id: string, criadoEm: string): Contato => ({
  id, nome: `Contato ${id}`, whatsapp: '11988887777', origem: 'site', etapa: 'lista', notas: [], criadoEm, atualizadoEm: criadoEm,
})

describe.each([
  ['memory', () => memoryStore()],
  ['file', () => fileStore(mkdtempSync(join(tmpdir(), 'ct-')))],
])('%s', (_, mk) => {
  test('put/get/list ordenado por criadoEm desc', async () => {
    const s = mk()
    await s.put(c('a', '2026-01-01T00:00:00Z'))
    await s.put(c('b', '2026-02-01T00:00:00Z'))
    expect((await s.get('a'))?.nome).toBe('Contato a')
    expect((await s.list()).map((x) => x.id)).toEqual(['b', 'a'])
  })
  test('put sobrescreve', async () => {
    const s = mk()
    await s.put(c('a', '2026-01-01T00:00:00Z'))
    await s.put({ ...c('a', '2026-01-01T00:00:00Z'), nome: 'Novo' })
    expect((await s.list()).map((x) => x.nome)).toEqual(['Novo'])
  })
  test('get inexistente → null', async () => expect(await mk().get('zzz')).toBeNull())
  test('del remove; del inexistente não lança', async () => {
    const s = mk(); await s.put(c('a', '2026-01-01T00:00:00Z'))
    await s.del('a'); await s.del('a')
    expect(await s.get('a')).toBeNull()
  })
  test('lista vazia', async () => expect(await mk().list()).toEqual([]))
  test('id inválido é rejeitado', async () => {
    await expect(mk().get('../x')).rejects.toThrow()
    await expect(mk().put(c('../x', '2026-01-01T00:00:00Z'))).rejects.toThrow()
  })
  test('memória não vaza referências', async () => {
    const s = mk(); const x = c('a', '2026-01-01T00:00:00Z')
    await s.put(x); x.nome = 'mutado'
    expect((await s.get('a'))?.nome).toBe('Contato a')
  })
})

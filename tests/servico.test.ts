import { describe, expect, test } from 'vitest'
import { memoryStore } from '@/lib/contatos/store'
import {
  adicionarNota, atualizarDados, criarContatoManual, listarContatos, mudarEtapa, registrarInscricao, resumo,
} from '@/lib/contatos/servico'
import type { Contato, Resultado } from '@/lib/contatos/types'

const base = { nome: 'Ana Souza', email: 'ana@x.com', whatsapp: '11988887777', objetivo: 'Ganhar massa', consentimento: true }
const idDe = (r: Resultado<{ id: string }>) => (r.ok ? r.dados.id : '')

test('nova inscrição entra como lista/site', async () => {
  const s = memoryStore()
  const r = await registrarInscricao(base, s, new Date('2026-12-01T10:00:00Z'))
  const c = await s.get(idDe(r))
  expect(c).toMatchObject({ nome: 'Ana Souza', email: 'ana@x.com', origem: 'site', etapa: 'lista', notas: [], consentimentoEm: '2026-12-01T10:00:00.000Z', criadoEm: '2026-12-01T10:00:00.000Z' })
})

test('inscrição inválida não grava', async () => {
  const s = memoryStore()
  const r = await registrarInscricao({ ...base, whatsapp: '12' }, s)
  expect(r.ok).toBe(false)
  expect(await s.list()).toEqual([])
})

test('reinscrição preserva etapa, notas, origem e criadoEm', async () => {
  const s = memoryStore()
  const id = idDe(await registrarInscricao(base, s, new Date('2026-12-01T10:00:00Z')))
  await mudarEtapa(id, 'conversa', s)
  await adicionarNota(id, 'Liguei', s)
  await registrarInscricao({ ...base, email: ' ANA@X.COM ', objetivo: 'Novo objetivo' }, s, new Date('2026-12-05T10:00:00Z'))
  const c = (await s.get(id))!
  expect(c).toMatchObject({ etapa: 'conversa', origem: 'site', objetivo: 'Novo objetivo', criadoEm: '2026-12-01T10:00:00.000Z', atualizadoEm: '2026-12-05T10:00:00.000Z', consentimentoEm: '2026-12-05T10:00:00.000Z' })
  expect(c.notas.map((n) => n.texto)).toEqual(['Liguei'])
  expect(await s.list()).toHaveLength(1)
})

test('manual com e-mail e depois inscrição pelo site = mesmo contato', async () => {
  const s = memoryStore()
  await criarContatoManual({ nome: 'Ana', whatsapp: '11988887777', email: 'ana@x.com', origem: 'instagram' }, s)
  await registrarInscricao(base, s)
  const all = await s.list()
  expect(all).toHaveLength(1)
  expect(all[0]).toMatchObject({ origem: 'instagram', objetivo: 'Ganhar massa' })
})

test('manual duplicado por e-mail é recusado', async () => {
  const s = memoryStore()
  await criarContatoManual({ nome: 'Ana', whatsapp: '11988887777', email: 'a@x.com' }, s)
  const r = await criarContatoManual({ nome: 'Bea', whatsapp: '11977776666', email: 'A@x.com' }, s)
  expect(r).toEqual({ ok: false, erros: { email: 'Já existe um contato com este e-mail.' } })
})

test('manual sem e-mail gera id aleatório; dois sem e-mail coexistem', async () => {
  const s = memoryStore()
  const a = await criarContatoManual({ nome: 'Ana', whatsapp: '11988887777' }, s)
  const b = await criarContatoManual({ nome: 'Bea', whatsapp: '11988887777' }, s)
  expect(idDe(a)).toMatch(/^m/)
  expect(idDe(a)).not.toBe(idDe(b))
  expect(await s.list()).toHaveLength(2)
})

test('notas mais recentes primeiro; nota vazia ou longa demais recusada', async () => {
  const s = memoryStore()
  const id = idDe(await registrarInscricao(base, s))
  await adicionarNota(id, ' primeira ', s, new Date('2026-12-01T00:00:00Z'))
  await adicionarNota(id, 'segunda', s, new Date('2026-12-02T00:00:00Z'))
  expect((await s.get(id))!.notas).toEqual([
    { texto: 'segunda', criadoEm: '2026-12-02T00:00:00.000Z' },
    { texto: 'primeira', criadoEm: '2026-12-01T00:00:00.000Z' },
  ])
  expect((await adicionarNota(id, '   ', s)).ok).toBe(false)
  expect((await adicionarNota(id, 'x'.repeat(2001), s)).ok).toBe(false)
})

test('mudarEtapa inválida ou id inexistente', async () => {
  const s = memoryStore()
  const id = idDe(await registrarInscricao(base, s))
  expect(await mudarEtapa(id, 'xpto', s)).toEqual({ ok: false, erros: { etapa: 'Etapa inválida.' } })
  expect(await mudarEtapa('nao', 'paciente', s)).toEqual({ ok: false, erros: { id: 'Contato não encontrado.' } })
  expect(await mudarEtapa('../x', 'paciente', s)).toEqual({ ok: false, erros: { id: 'Contato não encontrado.' } })
  expect(await adicionarNota('nao', 'oi', s)).toEqual({ ok: false, erros: { id: 'Contato não encontrado.' } })
})

describe('atualizarDados', () => {
  test('edita campos e preserva etapa/notas', async () => {
    const s = memoryStore()
    const id = idDe(await registrarInscricao(base, s))
    await mudarEtapa(id, 'paciente', s)
    const r = await atualizarDados(id, { nome: 'Ana S.', whatsapp: '41987155105', email: 'ana@x.com', objetivo: 'Outro', origem: 'indicacao' }, s)
    expect(r.ok).toBe(true)
    expect(await s.get(id)).toMatchObject({ nome: 'Ana S.', whatsapp: '41987155105', objetivo: 'Outro', origem: 'indicacao', etapa: 'paciente' })
  })
  test('limpar e-mail/objetivo remove os campos', async () => {
    const s = memoryStore()
    const id = idDe(await registrarInscricao(base, s))
    const up = await atualizarDados(id, { nome: 'Ana', whatsapp: '11988887777', email: '', objetivo: '' }, s)
    const c = (await s.get(idDe(up)))!
    expect(await s.list()).toHaveLength(1)
    expect(c.email).toBeUndefined()
    expect(c.objetivo).toBeUndefined()
  })
  test('e-mail que pertence a outro contato é recusado', async () => {
    const s = memoryStore()
    await registrarInscricao({ ...base, email: 'outra@x.com' }, s)
    const id = idDe(await registrarInscricao(base, s))
    const r = await atualizarDados(id, { nome: 'Ana', whatsapp: '11988887777', email: 'outra@x.com' }, s)
    expect(r).toEqual({ ok: false, erros: { email: 'Já existe um contato com este e-mail.' } })
  })
})

test('busca ignora acento e caixa; filtro por etapa', async () => {
  const s = memoryStore()
  await criarContatoManual({ nome: 'João Pedro', whatsapp: '11988887777' }, s)
  const id = idDe(await criarContatoManual({ nome: 'Maria', whatsapp: '41987155105', objetivo: 'Hipertrofia' }, s))
  await mudarEtapa(id, 'paciente', s)
  expect((await listarContatos(s, { busca: 'joao' })).map((c) => c.nome)).toEqual(['João Pedro'])
  expect((await listarContatos(s, { busca: 'HIPERTROFIA' })).map((c) => c.nome)).toEqual(['Maria'])
  expect((await listarContatos(s, { busca: '98715' })).map((c) => c.nome)).toEqual(['Maria'])
  expect((await listarContatos(s, { etapa: 'paciente' })).map((c) => c.nome)).toEqual(['Maria'])
  expect(await listarContatos(s, {})).toHaveLength(2)
})

test('resumo conta por etapa e site nos últimos 7 dias', () => {
  const mk = (etapa: Contato['etapa'], origem: Contato['origem'], criadoEm: string): Contato =>
    ({ id: 'x', nome: 'x', whatsapp: '1', origem, etapa, notas: [], criadoEm, atualizadoEm: criadoEm })
  const r = resumo([
    mk('lista', 'site', '2026-12-09T00:00:00Z'),
    mk('lista', 'site', '2026-11-20T00:00:00Z'),
    mk('paciente', 'instagram', '2026-12-09T00:00:00Z'),
  ], new Date('2026-12-10T00:00:00Z'))
  expect(r).toEqual({ total: 3, siteUltimos7Dias: 1, porEtapa: { lista: 2, conversa: 0, agendada: 0, paciente: 1, plano_vencido: 0, sem_interesse: 0 } })
})

describe('troca de e-mail mantém id = hash(e-mail)', () => {
  test('inscrição com o novo e-mail atualiza o mesmo contato (sem duplicar)', async () => {
    const s = memoryStore()
    const r = await criarContatoManual({ nome: 'Ana', whatsapp: '11988887777' }, s)
    await adicionarNota(idDe(r), 'veio do Instagram', s)
    const up = await atualizarDados(idDe(r), { nome: 'Ana', whatsapp: '11988887777', email: 'ana@x.com' }, s)
    expect(up.ok).toBe(true)
    await registrarInscricao(base, s)
    const all = await s.list()
    expect(all).toHaveLength(1)
    expect(all[0].notas.map((n) => n.texto)).toEqual(['veio do Instagram'])
    expect(all[0].id).toBe(idDe(up))
  })
  test('inscrição com o e-mail antigo cria outro contato e não mistura com o original', async () => {
    const s = memoryStore()
    const id = idDe(await registrarInscricao(base, s))
    await mudarEtapa(id, 'paciente', s)
    await atualizarDados(id, { nome: 'Ana Souza', whatsapp: '11988887777', email: 'ana.nova@x.com' }, s)
    await registrarInscricao({ ...base, nome: 'Outra Pessoa', whatsapp: '21977776666' }, s)
    const all = await s.list()
    expect(all).toHaveLength(2)
    expect(all.find((c) => c.email === 'ana.nova@x.com')).toMatchObject({ nome: 'Ana Souza', etapa: 'paciente' })
    expect(all.find((c) => c.email === 'ana@x.com')).toMatchObject({ nome: 'Outra Pessoa', etapa: 'lista' })
  })
  test('remover o e-mail libera o id antigo', async () => {
    const s = memoryStore()
    const id = idDe(await registrarInscricao(base, s))
    const up = await atualizarDados(id, { nome: 'Ana Souza', whatsapp: '11988887777', email: '' }, s)
    expect(idDe(up)).not.toBe(id)
    await registrarInscricao({ ...base, nome: 'Nova' }, s)
    expect((await s.list()).map((c) => c.nome).sort()).toEqual(['Ana Souza', 'Nova'])
  })
})

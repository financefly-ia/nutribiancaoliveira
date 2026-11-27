import { describe, expect, test } from 'vitest'
import { diasAteAniversario, idadeAtual, idadeNoAniversario, relativo, somarDias } from '@/lib/contatos/datas'
import { memoryStore } from '@/lib/contatos/store'
import {
  adicionarNota, agendaDoDia, atualizarDados, criarContatoManual, definirRetomada, follows, mudarEtapa, registrarContato, registrarInscricao, rotuloFollow,
} from '@/lib/contatos/servico'
import type { Contato, Resultado } from '@/lib/contatos/types'

const base = { nome: 'Ana Souza', email: 'ana@x.com', whatsapp: '11988887777', objetivo: 'Ganhar massa', consentimento: true }
const idDe = (r: Resultado<{ id: string }>) => (r.ok ? r.dados.id : '')
const AGORA = new Date('2026-12-10T15:00:00Z') // 10/12/2026 em SP

describe('histórico e follow-up', () => {
  test('mudar etapa registra de → para; mesma etapa não registra', async () => {
    const s = memoryStore()
    const id = idDe(await registrarInscricao(base, s))
    await mudarEtapa(id, 'conversa', s, AGORA)
    await mudarEtapa(id, 'conversa', s, AGORA)
    expect((await s.get(id))!.eventos).toEqual([{ tipo: 'etapa', em: AGORA.toISOString(), de: 'lista', para: 'conversa' }])
  })

  test('follows conta contatos desde a última troca de etapa', async () => {
    const s = memoryStore()
    const id = idDe(await registrarInscricao(base, s))
    await registrarContato(id, '', s, AGORA)
    await registrarContato(id, '', s, AGORA)
    expect(follows((await s.get(id))!)).toBe(2)
    await mudarEtapa(id, 'conversa', s, AGORA)
    expect(follows((await s.get(id))!)).toBe(0)
    await registrarContato(id, '', s, AGORA)
    expect(follows((await s.get(id))!)).toBe(1)
  })

  test('rótulos de follow', () => {
    expect([0, 1, 2, 3, 7].map(rotuloFollow)).toEqual(['Sem contato', '1º follow', '2º follow', '3º follow+', '3º follow+'])
  })

  test('registrarContato define ou limpa a data de retomar', async () => {
    const s = memoryStore()
    const id = idDe(await registrarInscricao(base, s))
    await registrarContato(id, '2026-12-13', s, AGORA)
    expect((await s.get(id))!.retomarEm).toBe('2026-12-13')
    await registrarContato(id, '', s, AGORA)
    expect((await s.get(id))!.retomarEm).toBeUndefined()
  })

  test('definirRetomada valida a data', async () => {
    const s = memoryStore()
    const id = idDe(await registrarInscricao(base, s))
    expect((await definirRetomada(id, '2026-13-01', s, AGORA)).ok).toBe(false)
    expect((await definirRetomada(id, '2026-11-01', s, AGORA)).ok).toBe(false)
    expect((await definirRetomada(id, '2026-12-20', s, AGORA)).ok).toBe(true)
    expect((await s.get(id))!.retomarEm).toBe('2026-12-20')
    expect(await definirRetomada('../x', '', s, AGORA)).toEqual({ ok: false, erros: { id: 'Contato não encontrado.' } })
  })

  test('marcar "sem interesse" limpa a data de retomar', async () => {
    const s = memoryStore()
    const id = idDe(await registrarInscricao(base, s))
    await definirRetomada(id, '2026-12-20', s, AGORA)
    await mudarEtapa(id, 'sem_interesse', s, AGORA)
    expect((await s.get(id))!.retomarEm).toBeUndefined()
  })

  test('reinscrição pelo site preserva histórico e data de retomar', async () => {
    const s = memoryStore()
    const id = idDe(await registrarInscricao(base, s))
    await registrarContato(id, '2026-12-20', s, AGORA)
    await adicionarNota(id, 'oi', s)
    await registrarInscricao({ ...base, objetivo: 'Outro' }, s)
    const c = (await s.get(id))!
    expect(c.retomarEm).toBe('2026-12-20')
    expect(c.eventos).toHaveLength(1)
    expect(c.notas).toHaveLength(1)
  })

  test('trocar e-mail mantém histórico ao mover o contato', async () => {
    const s = memoryStore()
    const id = idDe(await registrarInscricao(base, s))
    await registrarContato(id, '2026-12-20', s, AGORA)
    const novo = idDe(await atualizarDados(id, { nome: 'Ana', whatsapp: '11988887777', email: 'nova@x.com' }, s))
    expect(novo).not.toBe(id)
    expect((await s.get(novo))!.eventos).toHaveLength(1)
    expect(await s.get(id)).toBeNull()
  })
})

describe('nascimento', () => {
  test('cadastro e edição aceitam data válida e recusam futura ou inválida', async () => {
    const s = memoryStore()
    const r = await criarContatoManual({ nome: 'Ana', whatsapp: '11988887777', nascimento: '1999-05-20' }, s, AGORA)
    expect((await s.get(idDe(r)))!.nascimento).toBe('1999-05-20')
    expect(await criarContatoManual({ nome: 'Bea', whatsapp: '11988887777', nascimento: '2030-01-01' }, s, AGORA)).toEqual({
      ok: false, erros: { nascimento: 'Data de nascimento inválida.' },
    })
    expect((await atualizarDados(idDe(r), { nome: 'Ana', whatsapp: '11988887777', nascimento: '1999-02-30' }, s, AGORA)).ok).toBe(false)
    await atualizarDados(idDe(r), { nome: 'Ana', whatsapp: '11988887777', nascimento: '' }, s, AGORA)
    expect((await s.get(idDe(r)))!.nascimento).toBeUndefined()
  })
})

describe('datas', () => {
  test('somarDias atravessa mês e ano', () => {
    expect(somarDias('2026-12-30', 3)).toBe('2027-01-02')
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28')
  })
  test('aniversário: hoje, próximos dias, virada de ano, 29/02', () => {
    expect(diasAteAniversario('1990-12-10', '2026-12-10')).toBe(0)
    expect(diasAteAniversario('1990-12-12', '2026-12-10')).toBe(2)
    expect(diasAteAniversario('1990-01-02', '2026-12-30')).toBe(3)
    expect(diasAteAniversario('2000-02-29', '2027-02-27')).toBe(1)
    expect(idadeNoAniversario('1999-12-12', '2026-12-10')).toBe(27)
    expect(idadeNoAniversario('1999-01-01', '2026-12-10')).toBe(28)
    expect(idadeAtual('1999-12-12', '2026-12-10')).toBe(26)
    expect(idadeAtual('1999-12-10', '2026-12-10')).toBe(27)
    expect(idadeAtual('1999-01-01', '2026-12-10')).toBe(27)
  })
  test('relativo', () => {
    expect(['2026-12-10', '2026-12-11', '2026-12-09', '2026-12-15', '2026-12-01'].map((d) => relativo(d, '2026-12-10'))).toEqual([
      'hoje', 'amanhã', 'ontem', 'em 5 dias', 'há 9 dias',
    ])
  })
})

describe('agendaDoDia', () => {
  const mk = (p: Partial<Contato> & { id: string }): Contato => ({
    nome: p.id, whatsapp: '1', origem: 'site', etapa: 'lista', notas: [], criadoEm: '2026-12-01T00:00:00Z', atualizadoEm: '2026-12-01T00:00:00Z', ...p,
  })
  const hoje = '2026-12-10'

  test('separa retomar (atrasados primeiro), próximos 7 dias, novos e aniversariantes', () => {
    const a = agendaDoDia([
      mk({ id: 'atrasado', etapa: 'conversa', retomarEm: '2026-12-05' }),
      mk({ id: 'hoje', etapa: 'conversa', retomarEm: '2026-12-10' }),
      mk({ id: 'semana', etapa: 'agendada', retomarEm: '2026-12-17' }),
      mk({ id: 'longe', etapa: 'conversa', retomarEm: '2026-12-30' }),
      mk({ id: 'novoAntigo', criadoEm: '2026-11-01T00:00:00Z' }),
      mk({ id: 'novoRecente', criadoEm: '2026-12-09T00:00:00Z' }),
      mk({ id: 'jaFalei', eventos: [{ tipo: 'contato', em: '2026-12-02T00:00:00Z' }] }),
      mk({ id: 'semInteresse', etapa: 'sem_interesse', retomarEm: '2026-12-01' }),
      mk({ id: 'niver', etapa: 'paciente', nascimento: '1995-12-12' }),
      mk({ id: 'niverLonge', etapa: 'paciente', nascimento: '1995-06-12' }),
    ], hoje)
    expect(a.retomar.map((c) => c.id)).toEqual(['atrasado', 'hoje'])
    expect(a.proximos.map((c) => c.id)).toEqual(['semana'])
    expect(a.novos.map((c) => c.id)).toEqual(['novoAntigo', 'novoRecente'])
    expect(a.aniversariantes.map((x) => [x.contato.id, x.emDias])).toEqual([['niver', 2]])
  })
})

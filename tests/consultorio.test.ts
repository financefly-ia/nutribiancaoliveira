import { beforeEach, describe, expect, test } from 'vitest'
import { somarMeses } from '@/lib/contatos/datas'
import { lerModelos } from '@/lib/contatos/mensagens'
import { contatoStore, type ContatoStore } from '@/lib/contatos/store'
import type { Contato } from '@/lib/contatos/types'
import { dividir, lerReais, reais } from '@/lib/consultorio/dinheiro'
import {
  andamento, checklist, chaveItem, conflitos, itensDoHoje, resumoFinanceiro, sugerirTipo,
} from '@/lib/consultorio/regras'
import {
  atualizarDadosComReferencias, cancelarContrato, encerrarContrato, fecharPlano, marcarItem, mudarSituacao, registrarRecebimento, salvarConsulta,
  salvarServicos,
} from '@/lib/consultorio/servico'
import { consultorioStore, type ConsultorioStore } from '@/lib/consultorio/store'
import { memoriaDocs, type Documentos } from '@/lib/dados/documentos'

const AGORA = new Date('2026-11-27T15:00:00Z') // 12:00 em SP
const HOJE = '2026-11-27'

let docs: Documentos & { gravacoes: number; leituras: number }
let contatos: ContatoStore
let cons: ConsultorioStore

const contato = (id: string, p: Partial<Contato> = {}): Contato => ({
  id, nome: `Ana ${id}`, whatsapp: '41988887777', origem: 'site', etapa: 'conversa', notas: [], eventos: [], criadoEm: '2026-11-01T00:00:00Z', atualizadoEm: '2026-11-01T00:00:00Z', ...p,
})

beforeEach(async () => {
  docs = memoriaDocs()
  contatos = contatoStore(docs)
  cons = consultorioStore(docs)
  await contatos.atualizar((m) => {
    m.ana = contato('ana')
    m.bia = contato('bia', { etapa: 'lista' })
  })
})

const plano = (p: Partial<Parameters<typeof fecharPlano>[0]> = {}) =>
  fecharPlano({ chave: 'k1', contatoId: 'ana', servicoId: 'trimestral', valor: '750,00', parcelas: '3', primeiroVencimento: HOJE, forma: 'pix', ...p }, cons, contatos, AGORA)

const consulta = (p: Partial<Parameters<typeof salvarConsulta>[0]> = {}) =>
  salvarConsulta({ contatoId: 'ana', data: '2026-12-01', hora: '09:00', duracao: '60', formato: 'online', ...p }, cons, contatos, AGORA)

describe('dinheiro e datas', () => {
  test('lerReais aceita formatos brasileiros e rejeita lixo', () => {
    expect(lerReais('1.380,00')).toBe(138000)
    expect(lerReais('R$ 750,5')).toBe(75050)
    expect(lerReais('1380')).toBe(138000)
    expect(lerReais('1.380')).toBe(138000)
    expect(lerReais('280.50')).toBe(28050)
    expect(lerReais('abc')).toBeNull()
    expect(lerReais('0')).toBeNull()
    expect(reais(138000)).toBe('R$ 1.380,00')
  })
  test('dividir: soma bate e o resto vai na primeira', () => {
    expect(dividir(100000, 3)).toEqual([33334, 33333, 33333])
    expect(dividir(75000, 3).reduce((a, b) => a + b)).toBe(75000)
  })
  test('somarMeses em fim de mês', () => {
    expect(somarMeses('2026-01-31', 1)).toBe('2026-02-28')
    expect(somarMeses('2026-08-31', 6)).toBe('2027-02-28')
    expect(somarMeses('2026-11-27', 3)).toBe('2027-02-27')
  })
})

describe('migração', () => {
  test('mensagens personalizadas do doc antigo `config` vão para o consultório', async () => {
    await docs.gravar('config', { modelos: { lista: 'Olá {nome}' } }, null)
    expect((await lerModelos(docs)).lista).toBe('Olá {nome}')
    const d = await cons.ler()
    expect(d.config.servicos.map((s) => [s.id, s.valorCentavos, s.consultas])).toEqual([['avulsa', 28000, 1], ['trimestral', 75000, 3], ['semestral', 138000, 6]])
    expect(d.config.checklists.entrada[0]).toMatchObject({ texto: 'Pagamento confirmado', auto: 'pagamento' })
  })
})

describe('fechar plano', () => {
  test('cria contrato com parcelas mensais e move o contato para Paciente', async () => {
    expect(await plano({ recebiPrimeira: '1' })).toEqual({ ok: true, dados: { id: 'k1' } })
    const c = (await cons.ler()).contratos.k1
    expect(c.parcelas.map((p) => [p.vencimento, p.valorCentavos, !!p.recebidaEm])).toEqual([
      ['2026-11-27', 25000, true], ['2026-12-27', 25000, false], ['2027-01-27', 25000, false],
    ])
    expect(c.servico.nome).toBe('Plano Trimestral')
    expect((await contatos.get('ana'))?.etapa).toBe('paciente')
  })
  test('reenviar o mesmo formulário não duplica', async () => {
    await plano()
    await plano()
    expect(Object.keys((await cons.ler()).contratos)).toEqual(['k1'])
  })
  test('não abre segundo plano sem encerrar; renovação encerra o anterior', async () => {
    await plano()
    expect((await plano({ chave: 'k2' })).ok).toBe(false)
    expect((await plano({ chave: 'k2', renovarDe: 'k1' })).ok).toBe(true)
    const d = await cons.ler()
    expect(d.contratos.k1.encerradoEm).toBe(HOJE)
    expect(d.contratos.k2.encerradoEm).toBeUndefined()
  })
  test('consulta marcada antes do plano passa a ser dele e define o início', async () => {
    const r = await consulta({ data: '2026-11-20', situacao: 'realizada' })
    expect(r.ok).toBe(true)
    expect((await contatos.get('ana'))?.etapa).toBe('agendada')
    await plano()
    const d = await cons.ler()
    const a = andamento(d, d.contratos.k1, HOJE)
    expect(a.inicio).toBe('2026-11-20')
    expect(a.fim).toBe('2027-02-20')
    expect(a.realizadas).toBe(1)
  })
  test('valor inválido e contato inexistente', async () => {
    expect(await plano({ valor: 'x' })).toEqual({ ok: false, erros: { valor: 'Informe o valor (ex.: 750,00).' } })
    expect((await plano({ contatoId: 'zzz' })).ok).toBe(false)
  })
})

describe('agenda', () => {
  test('tipo sugerido segue a ordem do plano e conta N de M', async () => {
    await plano()
    const ids = []
    for (const data of ['2026-12-01', '2027-01-05', '2027-02-09']) {
      const r = await consulta({ data })
      if (r.ok) ids.push(r.dados.id)
    }
    const d = await cons.ler()
    expect(ids.map((id) => d.consultas[id].tipo)).toEqual(['primeira', 'retorno', 'encerramento'])
    expect(ids.every((id) => d.consultas[id].contratoId === 'k1')).toBe(true)
    expect(sugerirTipo(undefined, [])).toBe('primeira')
  })
  test('conflito de horário pede confirmação; forçar salva', async () => {
    await consulta()
    const r = await consulta({ contatoId: 'bia', hora: '09:30' })
    expect(r.ok).toBe(false)
    expect(r.ok ? '' : r.erros.conflito).toContain('09:00')
    expect((await consulta({ contatoId: 'bia', hora: '09:30', forcar: '1' })).ok).toBe(true)
    expect((await consulta({ contatoId: 'bia', hora: '10:30' })).ok).toBe(true) // encosta na de 09:30, não sobrepõe
  })
  test('desmarcada não conflita', () => {
    const base = { id: 'a', contatoId: 'x', data: HOJE, hora: '09:00', duracaoMin: 60, formato: 'online' as const, tipo: 'retorno' as const, criadoEm: '', atualizadoEm: '' }
    expect(conflitos([{ ...base, situacao: 'desmarcada' }], { data: HOJE, hora: '09:15', duracaoMin: 30 })).toEqual([])
  })
  test('validação de hora e data', async () => {
    expect((await consulta({ hora: '25:00' })).ok).toBe(false)
    expect((await consulta({ data: '2026-02-30' })).ok).toBe(false)
  })
})

describe('checklists e Hoje', () => {
  test('itens condicionais por plano e automáticos', async () => {
    await plano({ servicoId: 'avulsa', valor: '280', parcelas: '1', chave: 'av' })
    const d = await cons.ler()
    const fases = checklist(d, andamento(d, d.contratos.av, HOJE), HOJE, `${HOJE} 12:00`)
    const entrada = fases.find((f) => f.fase === 'entrada')!
    expect(entrada.itens.map((i) => i.texto)).not.toContain('Kit de boas-vindas enviado') // só semestral
    expect(entrada.itens.find((i) => i.texto === 'Pagamento confirmado')).toMatchObject({ auto: true, feito: false })
    expect(fases.find((f) => f.fase === 'pre_consulta')!.itens.map((i) => i.texto)).not.toContain('Primeira estrutura do Mapa Nutricional + Rota de Ação')
    await registrarRecebimento('av', 'p1', HOJE, 'pix', cons, AGORA)
    const d2 = await cons.ler()
    expect(checklist(d2, andamento(d2, d2.contratos.av, HOJE), HOJE, `${HOJE} 12:00`)[0].itens[0].feito).toBe(true)
  })
  test('marcar item manual; entrega atrasada depois de 48h', async () => {
    await plano()
    await marcarItem('k1', chaveItem('entrada', 'grupo'), true, cons, AGORA)
    const r = await consulta({ data: '2026-11-24', hora: '10:00', situacao: 'realizada' })
    expect(r.ok).toBe(true)
    const d = await cons.ler()
    const fases = checklist(d, andamento(d, d.contratos.k1, HOJE), HOJE, `${HOJE} 12:00`)
    expect(fases.find((f) => f.fase === 'entrada')!.itens.find((i) => i.texto === 'Grupo individual criado')!.feito).toBe(true)
    expect(fases.find((f) => f.fase === 'entrega')).toMatchObject({ prazo: '2026-11-26 10:00', atrasada: true })
    const h = itensDoHoje(d, HOJE, `${HOJE} 12:00`)
    expect(h.entregasAtrasadas).toHaveLength(1)
    expect(h.retornos.map((r) => r.sugerida)).toEqual(['2026-12-24'])
  })
  test('retorno a agendar quando não há próxima consulta', async () => {
    await plano()
    await consulta({ data: '2026-11-10', situacao: 'realizada' })
    const d = await cons.ler()
    const h = itensDoHoje(d, HOJE, `${HOJE} 12:00`)
    expect(h.retornos.map((r) => r.sugerida)).toEqual(['2026-12-10'])
  })
  test('parcelas: atrasadas e de hoje aparecem; cartão e dispensadas não', async () => {
    await plano({ primeiroVencimento: '2026-10-27', parcelas: '3' })
    await plano({ chave: 'c2', contatoId: 'bia', forma: 'cartao', primeiroVencimento: '2026-10-27' })
    const d = await cons.ler()
    const h = itensDoHoje(d, HOJE, `${HOJE} 12:00`)
    expect(h.parcelas.map((p) => [p.contrato.id, p.parcela.vencimento, p.atrasada])).toEqual([['k1', '2026-10-27', true], ['k1', '2026-11-27', false]])
    await cancelarContrato('k1', true, '', cons, contatos, AGORA)
    expect(itensDoHoje(await cons.ler(), HOJE, `${HOJE} 12:00`).parcelas).toEqual([])
    expect((await contatos.get('ana'))?.etapa).toBe('plano_vencido')
  })
  test('renovação da avulsa entre os dias 23 e 30', async () => {
    await plano({ servicoId: 'avulsa', valor: '280', parcelas: '1', chave: 'av', emAndamento: '1', inicio: '2026-11-05' })
    const d = await cons.ler()
    expect(itensDoHoje(d, HOJE, `${HOJE} 12:00`).renovacaoAvulsa.map((r) => r.dia)).toEqual([23])
    expect(itensDoHoje(d, '2026-11-26', '2026-11-26 12:00').renovacaoAvulsa).toEqual([])
  })
  test('encerrar leva a Plano vencido com data para retomar', async () => {
    await plano()
    await encerrarContrato('k1', '2027-02-25', cons, contatos, AGORA)
    const c = await contatos.get('ana')
    expect([c?.etapa, c?.retomarEm]).toEqual(['plano_vencido', '2027-02-25'])
    expect((await encerrarContrato('k1', '', cons, contatos, AGORA)).ok).toBe(false)
  })
})

describe('financeiro', () => {
  test('regime de caixa, a receber, atrasado e vendido', async () => {
    await plano({ primeiroVencimento: '2026-10-27', recebiPrimeira: '1' })
    await registrarRecebimento('k1', 'p2', '2026-11-25', 'pix', cons, AGORA)
    await plano({ chave: 'c2', contatoId: 'bia', servicoId: 'avulsa', valor: '280', parcelas: '1', primeiroVencimento: '2026-11-20' })
    const d = await cons.ler()
    const r = resumoFinanceiro(d, '2026-11', HOJE)
    expect(r.recebido).toBe(25000)
    expect(r.aReceber).toBe(28000)
    expect(r.totalAtrasado).toBe(28000)
    expect(r.vendido).toBe(75000 + 28000)
    expect(r.meses.map((m) => m.recebido)).toEqual([0, 0, 0, 0, 25000, 25000])
    expect(r.meses.at(-1)!.mes).toBe('2026-11')
  })
})

describe('troca de e-mail', () => {
  test('contratos e consultas acompanham o novo id', async () => {
    await plano()
    await consulta()
    const r = await atualizarDadosComReferencias('ana', { nome: 'Ana Nova', whatsapp: '41988887777', email: 'ana@novo.com', objetivo: '', nascimento: '', origem: 'site' }, contatos, cons, AGORA)
    expect(r.ok).toBe(true)
    const novo = r.ok ? r.dados.id : ''
    expect(novo).not.toBe('ana')
    const d = await cons.ler()
    expect(d.contratos.k1.contatoId).toBe(novo)
    expect(Object.values(d.consultas).every((c) => c.contatoId === novo)).toBe(true)
  })
  test('e-mail já usado por outro contato: nada muda', async () => {
    await plano()
    const r1 = await atualizarDadosComReferencias('bia', { nome: 'Bia', whatsapp: '41988887777', email: 'x@y.com', origem: 'site' }, contatos, cons, AGORA)
    expect(r1.ok).toBe(true)
    const r = await atualizarDadosComReferencias('ana', { nome: 'Ana', whatsapp: '41988887777', email: 'x@y.com', origem: 'site' }, contatos, cons, AGORA)
    expect(r.ok).toBe(false)
    expect((await cons.ler()).contratos.k1.contatoId).toBe('ana')
  })
})

describe('ajustes', () => {
  test('planos editáveis; contrato antigo mantém o valor da época', async () => {
    await plano()
    const r = await salvarServicos(JSON.stringify([
      { id: 'trimestral', nome: 'Plano Trimestral', valor: '800,00', consultas: 3, prazoQtd: 3, prazoUnidade: 'meses', ativo: true },
      { nome: 'Retorno extra', valor: '150', consultas: 1, prazoQtd: 30, prazoUnidade: 'dias' },
    ]), cons)
    expect(r.ok).toBe(true)
    const d = await cons.ler()
    expect(d.config.servicos.map((s) => s.valorCentavos)).toEqual([80000, 15000])
    expect(d.contratos.k1.valorCentavos).toBe(75000)
    expect((await salvarServicos('[{"nome":"x"}]', cons)).ok).toBe(false)
  })
  test('mudar situação da consulta', async () => {
    const r = await consulta()
    const id = r.ok ? r.dados.id : ''
    expect((await mudarSituacao(id, 'confirmada', cons, AGORA)).ok).toBe(true)
    expect((await cons.ler()).consultas[id].situacao).toBe('confirmada')
    expect((await mudarSituacao(id, 'xx', cons, AGORA)).ok).toBe(false)
  })
})

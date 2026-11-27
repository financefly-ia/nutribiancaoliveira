/** Regras puras do consultório: nada aqui lê ou grava; recebe o documento e devolve o que mostrar. */
import { diaDaSemana, diasEntre, hojeSP, somarDias, somarMesAno, somarMeses } from '@/lib/contatos/datas'
import {
  tituloFase, type Consulta, type Contrato, type DocConsultorio, type Fase, type ItemModelo, type Parcela, type TipoConsulta,
} from './tipos'

export const ehAberto = (c: Contrato) => !c.encerradoEm && !c.canceladoEm

/** Consulta que "conta" (não foi desmarcada nem teve falta). */
export const conta = (c: Consulta) => c.situacao !== 'desmarcada' && c.situacao !== 'faltou'
export const futura = (c: Consulta) => c.situacao === 'agendada' || c.situacao === 'confirmada'

const porHorario = (a: Consulta, b: Consulta) => `${a.data} ${a.hora}`.localeCompare(`${b.data} ${b.hora}`)

export function consultasDoContrato(doc: DocConsultorio, contratoId: string): Consulta[] {
  return Object.values(doc.consultas).filter((c) => c.contratoId === contratoId).sort(porHorario)
}

export function consultasDoContato(doc: DocConsultorio, contatoId: string): Consulta[] {
  return Object.values(doc.consultas).filter((c) => c.contatoId === contatoId).sort(porHorario)
}

export function contratosDoContato(doc: DocConsultorio, contatoId: string): Contrato[] {
  return Object.values(doc.contratos).filter((c) => c.contatoId === contatoId).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
}

export const contratoAberto = (doc: DocConsultorio, contatoId: string) => contratosDoContato(doc, contatoId).find(ehAberto)

/** Avulsa (e qualquer serviço de uma consulta): renovação pelo check-in dos dias 23–27, sem consulta de encerramento. */
export const ehCicloCurto = (c: Contrato) => c.servico.consultas <= 1

/** O prazo começa na primeira consulta realizada (ou na data informada para quem já estava em acompanhamento). */
export function inicioDe(c: Contrato, consultas: Consulta[]): string | undefined {
  if (c.inicioManual) return c.inicioManual
  return consultas.find((x) => x.situacao === 'realizada')?.data
}

export function fimDe(c: Contrato, inicio: string): string {
  return 'dias' in c.servico.prazo ? somarDias(inicio, c.servico.prazo.dias) : somarMeses(inicio, c.servico.prazo.meses)
}

export type SituacaoContrato = 'aguardando' | 'ativo' | 'terminando' | 'vencido' | 'encerrado' | 'cancelado'

export const ROTULO_SITUACAO_CONTRATO: Record<SituacaoContrato, string> = {
  aguardando: 'Aguardando 1ª consulta',
  ativo: 'Em acompanhamento',
  terminando: 'Terminando',
  vencido: 'Prazo encerrado',
  encerrado: 'Encerrado',
  cancelado: 'Cancelado',
}

export type Andamento = {
  contrato: Contrato
  consultas: Consulta[]
  inicio?: string
  fim?: string
  situacao: SituacaoContrato
  realizadas: number
  total: number
  /** Agendadas/confirmadas de hoje em diante. */
  proximas: Consulta[]
}

export function andamento(doc: DocConsultorio, contrato: Contrato, hoje: string): Andamento {
  const consultas = consultasDoContrato(doc, contrato.id)
  const inicio = inicioDe(contrato, consultas)
  const fim = inicio ? fimDe(contrato, inicio) : undefined
  let situacao: SituacaoContrato
  if (contrato.canceladoEm) situacao = 'cancelado'
  else if (contrato.encerradoEm) situacao = 'encerrado'
  else if (!inicio || !fim) situacao = 'aguardando'
  else if (hoje > fim) situacao = 'vencido'
  else if (diasEntre(hoje, fim) <= 10) situacao = 'terminando'
  else situacao = 'ativo'
  return {
    contrato,
    consultas,
    inicio,
    fim,
    situacao,
    realizadas: consultas.filter((c) => c.situacao === 'realizada').length,
    total: contrato.servico.consultas,
    proximas: consultas.filter((c) => futura(c) && c.data >= hoje),
  }
}

/** Posição da consulta entre as que contam no contrato ("2 de 3"); null se não conta. */
export function ordinal(consulta: Consulta, doContrato: Consulta[]): number | null {
  if (!conta(consulta)) return null
  const i = doContrato.filter(conta).findIndex((c) => c.id === consulta.id)
  return i < 0 ? null : i + 1
}

/** Tipo sugerido para uma nova consulta no contrato. */
export function sugerirTipo(contrato: Contrato | undefined, doContrato: Consulta[]): TipoConsulta {
  if (!contrato) return 'primeira'
  if (contrato.servico.consultas <= 1) return 'avulsa'
  const n = doContrato.filter(conta).length
  if (n === 0) return 'primeira'
  if (n >= contrato.servico.consultas - 1) return 'encerramento'
  return 'retorno'
}

const minutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5))

/** "09:00" + 60 min → "10:00" */
export function horaFim(c: Pick<Consulta, 'hora' | 'duracaoMin'>): string {
  const t = minutos(c.hora) + c.duracaoMin
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

/** Consultas não desmarcadas do mesmo dia cujo horário se sobrepõe. */
export function conflitos(todas: Consulta[], nova: { id?: string; data: string; hora: string; duracaoMin: number }): Consulta[] {
  const ini = minutos(nova.hora)
  const fim = ini + nova.duracaoMin
  return todas.filter((c) => {
    if (c.id === nova.id || c.data !== nova.data || c.situacao === 'desmarcada') return false
    const a = minutos(c.hora)
    return a < fim && ini < a + c.duracaoMin
  })
}

// ---------- checklists ----------

export const chaveItem = (fase: Fase, itemId: string, consultaId?: string) => (consultaId ? `${fase}:${consultaId}:${itemId}` : `${fase}:${itemId}`)

export type ItemVisto = { chave: string; texto: string; feito: boolean; auto: boolean }

export type FaseVista = {
  fase: Fase
  titulo: string
  /** Para fases por consulta: a qual consulta se refere. */
  consulta?: Consulta
  itens: ItemVisto[]
  concluida: boolean
  /** "YYYY-MM-DD HH:MM" (entrega). */
  prazo?: string
  atrasada: boolean
  /** Merece aparecer nas pendências do Hoje agora. */
  relevante: boolean
}

const vale = (item: ItemModelo, servicoId: string) => !item.servicos || item.servicos.includes(servicoId)

export function checklist(doc: DocConsultorio, a: Andamento, hoje: string, agora: string): FaseVista[] {
  const { contrato, consultas } = a
  const modelos = doc.config.checklists
  const primeiraRealizada = consultas.find((c) => c.situacao === 'realizada')
  const auto = (tipo: ItemModelo['auto'], consulta?: Consulta): boolean => {
    if (tipo === 'pagamento') return contrato.parcelas.some((p) => p.recebidaEm)
    if (tipo === 'consulta_confirmada') {
      const primeira = consultas.find(conta)
      return !!primeira && (primeira.situacao === 'confirmada' || primeira.situacao === 'realizada')
    }
    if (tipo === 'proximo_agendado') {
      const depois = consulta ? `${consulta.data} ${consulta.hora}` : `${hoje} 00:00`
      return consultas.some((c) => futura(c) && `${c.data} ${c.hora}` > depois)
    }
    return false
  }
  const montar = (fase: Fase, extra: Partial<FaseVista> = {}): FaseVista => {
    const itens = modelos[fase]
      .filter((i) => vale(i, contrato.servico.id))
      .map((i) => {
        const chave = chaveItem(fase, i.id, extra.consulta?.id)
        return { chave, texto: i.texto, auto: !!i.auto, feito: i.auto ? auto(i.auto, extra.consulta) : !!contrato.checklist[chave] }
      })
    const concluida = itens.every((i) => i.feito)
    const atrasada = !concluida && !!extra.prazo && agora > extra.prazo
    return { fase, titulo: tituloFase(fase), itens, concluida, atrasada, relevante: !concluida, ...extra }
  }

  const fases: FaseVista[] = []
  if (!contrato.inicioManual) {
    fases.push(montar('entrada'), montar('pre_consulta'))
    if (primeiraRealizada) {
      fases.push(montar('primeira_consulta'))
      fases.push(montar('entrega', { prazo: `${somarDias(primeiraRealizada.data, 2)} ${primeiraRealizada.hora}` }))
    }
  }
  for (const c of consultas) {
    if (c.tipo !== 'retorno') continue
    const quando = `${c.data.slice(8, 10)}/${c.data.slice(5, 7)}`
    if (futura(c)) {
      const f = montar('retorno_antes', { consulta: c, titulo: `${tituloFase('retorno_antes')} de ${quando}` })
      f.relevante = !f.concluida && c.data <= somarDias(hoje, 2)
      fases.push(f)
    } else if (c.situacao === 'realizada') {
      fases.push(montar('retorno_depois', { consulta: c, titulo: `${tituloFase('retorno_depois')} de ${quando}` }))
    }
  }
  if (a.inicio && a.fim) {
    const abre = ehCicloCurto(contrato) ? somarDias(a.inicio, 22) : somarDias(a.fim, -10)
    if (hoje >= abre || contrato.encerradoEm) fases.push(montar('encerramento'))
  }
  if (!ehAberto(contrato)) for (const f of fases) f.relevante = false
  return fases
}

// ---------- tela Hoje ----------

/** Sábado, domingo e segunda (dia administrativo) passam para a terça seguinte. */
export function diaDeAtendimento(d: string): string {
  const dia = diaDaSemana(d)
  return dia === 6 ? somarDias(d, 3) : dia === 0 ? somarDias(d, 2) : dia === 1 ? somarDias(d, 1) : d
}

export type ItensHoje = {
  consultas: { consulta: Consulta; ordem: number | null; total: number | null }[]
  entregasAtrasadas: { andamento: Andamento; prazo: string }[]
  parcelas: { contrato: Contrato; parcela: Parcela; atrasada: boolean }[]
  pendencias: { andamento: Andamento; fases: { titulo: string; faltam: string[] }[] }[]
  retornos: { andamento: Andamento; sugerida: string }[]
  terminando: Andamento[]
  renovacaoAvulsa: { andamento: Andamento; dia: number }[]
}

export function itensDoHoje(doc: DocConsultorio, hoje: string, agora: string): ItensHoje {
  const amanha = somarDias(hoje, 1)
  const r: ItensHoje = { consultas: [], entregasAtrasadas: [], parcelas: [], pendencias: [], retornos: [], terminando: [], renovacaoAvulsa: [] }

  for (const c of Object.values(doc.consultas).sort(porHorario)) {
    if (!futura(c) || c.data < hoje || c.data > amanha) continue
    const contrato = c.contratoId ? doc.contratos[c.contratoId] : undefined
    r.consultas.push({
      consulta: c,
      ordem: contrato ? ordinal(c, consultasDoContrato(doc, contrato.id)) : null,
      total: contrato ? contrato.servico.consultas : null,
    })
  }

  const limiteAtraso = somarDias(hoje, -60)
  for (const contrato of Object.values(doc.contratos)) {
    if (!contrato.canceladoEm) {
      for (const parcela of contrato.parcelas) {
        if (parcela.recebidaEm || parcela.dispensadaEm || parcela.forma === 'cartao') continue
        if (parcela.vencimento <= hoje && parcela.vencimento >= limiteAtraso) r.parcelas.push({ contrato, parcela, atrasada: parcela.vencimento < hoje })
      }
    }
    if (!ehAberto(contrato)) continue
    const a = andamento(doc, contrato, hoje)
    const fases = checklist(doc, a, hoje, agora)
    const entrega = fases.find((f) => f.fase === 'entrega')
    if (entrega?.atrasada && entrega.prazo) r.entregasAtrasadas.push({ andamento: a, prazo: entrega.prazo })
    const pend = fases
      .filter((f) => f.relevante && !(f.fase === 'entrega' && f.atrasada))
      .map((f) => ({ titulo: f.titulo, faltam: f.itens.filter((i) => !i.feito).map((i) => i.texto) }))
    if (pend.length) r.pendencias.push({ andamento: a, fases: pend })

    if ((a.situacao === 'ativo' || a.situacao === 'terminando') && a.realizadas >= 1 && !a.proximas.length && a.realizadas < a.total) {
      const ultima = [...a.consultas].reverse().find((c) => c.situacao === 'realizada')!
      let sugerida = diaDeAtendimento(somarDias(ultima.data, 30))
      if (sugerida < hoje) sugerida = diaDeAtendimento(hoje)
      if (a.fim && sugerida > a.fim) sugerida = a.fim
      r.retornos.push({ andamento: a, sugerida })
    }
    if (a.situacao === 'vencido' || (a.situacao === 'terminando' && !ehCicloCurto(contrato))) r.terminando.push(a)
    if (ehCicloCurto(contrato) && a.inicio && a.situacao !== 'vencido') {
      const dia = diasEntre(a.inicio, hoje) + 1
      if (dia >= 23 && dia <= 30) r.renovacaoAvulsa.push({ andamento: a, dia })
    }
  }
  r.parcelas.sort((a, b) => a.parcela.vencimento.localeCompare(b.parcela.vencimento))
  r.retornos.sort((a, b) => a.sugerida.localeCompare(b.sugerida))
  r.terminando.sort((a, b) => (a.fim ?? '').localeCompare(b.fim ?? ''))
  return r
}

// ---------- financeiro ----------

export type ResumoFinanceiro = {
  recebido: number
  aReceber: number
  qtdAReceber: number
  atrasado: { contrato: Contrato; parcela: Parcela }[]
  totalAtrasado: number
  recebimentos: { contrato: Contrato; parcela: Parcela; n: number; de: number }[]
  aReceberLista: { contrato: Contrato; parcela: Parcela; n: number; de: number }[]
  porServico: { nome: string; qtd: number; valor: number }[]
  vendido: number
  meses: { mes: string; recebido: number }[]
}

/** Regime de caixa: o mês de uma parcela é o mês em que foi recebida. */
export function resumoFinanceiro(doc: DocConsultorio, mes: string, hoje: string): ResumoFinanceiro {
  const r: ResumoFinanceiro = {
    recebido: 0, aReceber: 0, qtdAReceber: 0, atrasado: [], totalAtrasado: 0, recebimentos: [], aReceberLista: [], porServico: [], vendido: 0, meses: [],
  }
  const meses = Array.from({ length: 6 }, (_, i) => somarMesAno(mes, i - 5))
  const porMes = new Map(meses.map((m) => [m, 0]))
  const servicos = new Map<string, { nome: string; qtd: number; valor: number }>()

  for (const contrato of Object.values(doc.contratos)) {
    contrato.parcelas.forEach((parcela, i) => {
      const item = { contrato, parcela, n: i + 1, de: contrato.parcelas.length }
      if (parcela.recebidaEm) {
        const m = parcela.recebidaEm.slice(0, 7)
        if (porMes.has(m)) porMes.set(m, porMes.get(m)! + parcela.valorCentavos)
        if (m === mes) {
          r.recebido += parcela.valorCentavos
          r.recebimentos.push(item)
        }
        return
      }
      if (parcela.dispensadaEm) return
      if (parcela.vencimento.slice(0, 7) === mes) {
        r.aReceber += parcela.valorCentavos
        r.qtdAReceber++
        r.aReceberLista.push(item)
      }
      if (parcela.vencimento < hoje) {
        r.atrasado.push({ contrato, parcela })
        r.totalAtrasado += parcela.valorCentavos
      }
    })
    if (!contrato.canceladoEm && hojeSP(new Date(contrato.criadoEm)).slice(0, 7) === mes) {
      const s = servicos.get(contrato.servico.id) ?? { nome: contrato.servico.nome, qtd: 0, valor: 0 }
      s.qtd++
      s.valor += contrato.valorCentavos
      servicos.set(contrato.servico.id, s)
      r.vendido += contrato.valorCentavos
    }
  }
  r.recebimentos.sort((a, b) => b.parcela.recebidaEm!.localeCompare(a.parcela.recebidaEm!))
  r.aReceberLista.sort((a, b) => a.parcela.vencimento.localeCompare(b.parcela.vencimento))
  r.atrasado.sort((a, b) => a.parcela.vencimento.localeCompare(b.parcela.vencimento))
  r.porServico = [...servicos.values()].sort((a, b) => b.valor - a.valor)
  r.meses = meses.map((m) => ({ mes: m, recebido: porMes.get(m)! }))
  return r
}

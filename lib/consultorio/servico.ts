import { hojeSP, somarDias, somarMeses } from '@/lib/contatos/datas'
import { idPorEmail, normalizarEmail, novoId } from '@/lib/contatos/normalizar'
import { atualizarDados, moverEtapaSe } from '@/lib/contatos/servico'
import type { ContatoStore } from '@/lib/contatos/store'
import type { Resultado } from '@/lib/contatos/types'
import { ehDataValida, validarContatoManual } from '@/lib/contatos/validacao'
import { dividir, lerReais } from './dinheiro'
import { conflitos, consultasDoContrato, contratoAberto, sugerirTipo } from './regras'
import type { ConsultorioStore } from './store'
import {
  ehFormato, ehForma, ehSituacao, ehTipo, FASES, type Consulta, type Contrato, type DocConsultorio, type Fase, type ItemModelo,
  type Parcela, type Servico,
} from './tipos'

type Ok<T = object> = Resultado<T>
const ID_RE = /^[a-z0-9]{1,64}$/
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const erro = (campo: string, msg: string) => ({ ok: false as const, erros: { [campo]: msg } })
const CONTRATO_NAO_ENCONTRADO = erro('geral', 'Plano não encontrado.')

// ---------- fechar plano ----------

export type EntradaPlano = {
  /** Id gerado ao abrir o formulário: reenviar não duplica. */
  chave: string
  contatoId: string
  servicoId: string
  valor: string
  parcelas: string
  primeiroVencimento: string
  forma: string
  recebiPrimeira?: string
  emAndamento?: string
  inicio?: string
  /** Renovação: encerra este contrato e abre o novo na mesma gravação. */
  renovarDe?: string
}

export async function fecharPlano(input: EntradaPlano, cons: ConsultorioStore, contatos: ContatoStore, agora = new Date()): Promise<Ok<{ id: string }>> {
  const hoje = hojeSP(agora)
  const chave = texto(input.chave)
  if (!ID_RE.test(chave) || !ID_RE.test(texto(input.contatoId))) return erro('geral', 'Formulário inválido. Recarregue a página.')
  const valor = lerReais(input.valor)
  if (valor === null) return erro('valor', 'Informe o valor (ex.: 750,00).')
  const n = Number(input.parcelas)
  if (!Number.isInteger(n) || n < 1 || n > 12) return erro('parcelas', 'De 1 a 12 parcelas.')
  if (!ehDataValida(texto(input.primeiroVencimento))) return erro('primeiroVencimento', 'Data inválida.')
  if (!ehForma(input.forma)) return erro('forma', 'Escolha a forma de pagamento.')
  const emAndamento = input.emAndamento === '1'
  if (emAndamento && (!ehDataValida(texto(input.inicio)) || texto(input.inicio) > hoje)) return erro('inicio', 'Informe quando o acompanhamento começou.')
  const contato = await contatos.get(input.contatoId)
  if (!contato) return erro('geral', 'Contato não encontrado.')

  const r = await cons.atualizar((d): Ok<{ id: string }> => {
    if (d.contratos[chave]) return { ok: true, dados: { id: chave } }
    const servico = d.config.servicos.find((s) => s.id === input.servicoId)
    if (!servico) return erro('servicoId', 'Escolha o serviço.')
    const aberto = contratoAberto(d, contato.id)
    if (aberto && aberto.id !== input.renovarDe) return erro('geral', 'Já existe um plano em andamento. Encerre ou renove o atual.')
    if (aberto) aberto.encerradoEm = hoje
    const iso = agora.toISOString()
    const parcelas: Parcela[] = dividir(valor, n).map((v, i) => ({
      id: `p${i + 1}`,
      valorCentavos: v,
      vencimento: somarMeses(input.primeiroVencimento, i),
      forma: input.forma as Parcela['forma'],
      ...(i === 0 && input.recebiPrimeira === '1' ? { recebidaEm: input.primeiroVencimento <= hoje ? input.primeiroVencimento : hoje } : {}),
    }))
    const contrato: Contrato = {
      id: chave,
      contatoId: contato.id,
      servico: structuredClone(servico),
      valorCentavos: valor,
      parcelas,
      checklist: {},
      criadoEm: iso,
      ...(emAndamento ? { inicioManual: texto(input.inicio) } : {}),
    }
    d.contratos[chave] = contrato
    // Consultas marcadas antes de fechar o plano (lead em conversa) passam a ser deste contrato.
    const desde = somarDias(hoje, -30)
    for (const c of Object.values(d.consultas)) {
      if (c.contatoId === contato.id && !c.contratoId && c.situacao !== 'desmarcada' && c.data >= desde) {
        c.contratoId = chave
        c.atualizadoEm = iso
      }
    }
    return { ok: true, dados: { id: chave } }
  })
  if (!r.ok) return r
  await moverEtapaSe(contato.id, 'paciente', contatos, {}, agora)
  return r
}

// ---------- parcelas e fim do contrato ----------

function noContrato<T = object>(cons: ConsultorioStore, id: string, fn: (c: Contrato, d: DocConsultorio) => Ok<T> | void): Promise<Ok<T>> {
  if (!ID_RE.test(id)) return Promise.resolve(CONTRATO_NAO_ENCONTRADO)
  return cons.atualizar((d) => {
    const c = d.contratos[id]
    if (!c) return CONTRATO_NAO_ENCONTRADO
    return fn(c, d) ?? ({ ok: true, dados: {} as T })
  })
}

/** Marca a parcela como recebida em `data` (ou desfaz, com ''). */
export function registrarRecebimento(contratoId: string, parcelaId: string, data: string, forma: string | undefined, cons: ConsultorioStore, agora = new Date()): Promise<Ok> {
  if (data && (!ehDataValida(data) || data > hojeSP(agora))) return Promise.resolve(erro('data', 'Data inválida.'))
  return noContrato(cons, contratoId, (c) => {
    const p = c.parcelas.find((x) => x.id === parcelaId)
    if (!p) return erro('geral', 'Parcela não encontrada.')
    if (data) {
      p.recebidaEm = data
      delete p.dispensadaEm
      if (ehForma(forma)) p.forma = forma
    } else delete p.recebidaEm
  })
}

/** Encerra o acompanhamento (sem renovar): contato vai para "Plano vencido". */
export async function encerrarContrato(contratoId: string, retomarEm: string, cons: ConsultorioStore, contatos: ContatoStore, agora = new Date()): Promise<Ok> {
  if (retomarEm && !ehDataValida(retomarEm)) return erro('retomarEm', 'Data inválida.')
  let contatoId = ''
  const r = await noContrato(cons, contratoId, (c) => {
    if (c.encerradoEm || c.canceladoEm) return erro('geral', 'Este plano já foi encerrado.')
    c.encerradoEm = hojeSP(agora)
    contatoId = c.contatoId
  })
  if (r.ok) await moverEtapaSe(contatoId, 'plano_vencido', contatos, { retomarEm }, agora)
  return r
}

/** Cancela; com `dispensar`, as parcelas não recebidas saem do "a receber" e dos lembretes. */
export async function cancelarContrato(
  contratoId: string, dispensar: boolean, retomarEm: string, cons: ConsultorioStore, contatos: ContatoStore, agora = new Date(),
): Promise<Ok> {
  if (retomarEm && !ehDataValida(retomarEm)) return erro('retomarEm', 'Data inválida.')
  const hoje = hojeSP(agora)
  let contatoId = ''
  const r = await noContrato(cons, contratoId, (c, d) => {
    if (c.canceladoEm) return erro('geral', 'Este plano já foi cancelado.')
    c.canceladoEm = hoje
    if (dispensar) for (const p of c.parcelas) if (!p.recebidaEm) p.dispensadaEm = hoje
    for (const x of consultasDoContrato(d, c.id)) {
      if ((x.situacao === 'agendada' || x.situacao === 'confirmada') && x.data >= hoje) x.situacao = 'desmarcada'
    }
    contatoId = c.contatoId
  })
  if (r.ok) await moverEtapaSe(contatoId, 'plano_vencido', contatos, { retomarEm }, agora)
  return r
}

/** Marca/desmarca um item manual do checklist. */
export function marcarItem(contratoId: string, chave: string, feito: boolean, cons: ConsultorioStore, agora = new Date()): Promise<Ok> {
  if (!/^[a-z_]+:[a-z0-9:-]{1,140}$/.test(chave)) return Promise.resolve(erro('geral', 'Item inválido.'))
  return noContrato(cons, contratoId, (c) => {
    if (feito) c.checklist[chave] ??= agora.toISOString()
    else delete c.checklist[chave]
  })
}

// ---------- consultas ----------

export type EntradaConsulta = {
  id?: string
  contatoId: string
  data: string
  hora: string
  duracao: string
  formato: string
  /** '' = automático. */
  tipo?: string
  situacao?: string
  /** '1' = salvar mesmo com conflito de horário. */
  forcar?: string
}

export async function salvarConsulta(
  input: EntradaConsulta, cons: ConsultorioStore, contatos: ContatoStore, agora = new Date(),
): Promise<Ok<{ id: string }>> {
  const data = texto(input.data)
  const hora = texto(input.hora)
  const duracaoMin = Number(input.duracao)
  if (!ehDataValida(data)) return erro('data', 'Escolha a data.')
  if (!HORA_RE.test(hora)) return erro('hora', 'Escolha o horário.')
  if (!Number.isInteger(duracaoMin) || duracaoMin < 15 || duracaoMin > 240) return erro('duracao', 'Duração inválida.')
  if (!ehFormato(input.formato)) return erro('formato', 'Escolha online ou presencial.')
  if (input.tipo && !ehTipo(input.tipo)) return erro('tipo', 'Tipo inválido.')
  if (input.situacao && !ehSituacao(input.situacao)) return erro('situacao', 'Situação inválida.')
  if (input.id && !ID_RE.test(input.id)) return erro('geral', 'Consulta não encontrada.')
  const contato = ID_RE.test(input.contatoId) ? await contatos.get(input.contatoId) : null
  if (!contato) return erro('contatoId', 'Escolha o paciente.')
  const iso = agora.toISOString()
  const nova = !input.id

  const r = await cons.atualizar((d): Ok<{ id: string }> => {
    const atual = input.id ? d.consultas[input.id] : undefined
    if (input.id && !atual) return erro('geral', 'Consulta não encontrada.')
    const choques = conflitos(Object.values(d.consultas), { id: input.id, data, hora, duracaoMin })
    if (choques.length && input.forcar !== '1') {
      return erro('conflito', `Já existe consulta nesse horário (${choques.map((c) => c.hora).join(', ')}). Toque em salvar de novo para manter assim mesmo.`)
    }
    const contratoId = atual ? (atual.contatoId === contato.id ? atual.contratoId : contratoAberto(d, contato.id)?.id) : contratoAberto(d, contato.id)?.id
    const doContrato = contratoId ? consultasDoContrato(d, contratoId).filter((c) => c.id !== input.id) : []
    const tipo = ehTipo(input.tipo) ? input.tipo : atual?.tipo ?? sugerirTipo(contratoId ? d.contratos[contratoId] : undefined, doContrato)
    const id = atual?.id ?? novoId()
    const c: Consulta = {
      id,
      contatoId: contato.id,
      ...(contratoId ? { contratoId } : {}),
      data,
      hora,
      duracaoMin,
      formato: input.formato as Consulta['formato'],
      tipo,
      situacao: ehSituacao(input.situacao) ? input.situacao : atual?.situacao ?? 'agendada',
      criadoEm: atual?.criadoEm ?? iso,
      atualizadoEm: iso,
    }
    d.consultas[id] = c
    return { ok: true, dados: { id } }
  })
  if (r.ok && nova) await moverEtapaSe(contato.id, 'agendada', contatos, { de: ['lista', 'conversa', 'plano_vencido', 'sem_interesse'] }, agora)
  return r
}

export function mudarSituacao(consultaId: string, situacao: string, cons: ConsultorioStore, agora = new Date()): Promise<Ok> {
  if (!ehSituacao(situacao)) return Promise.resolve(erro('situacao', 'Situação inválida.'))
  if (!ID_RE.test(consultaId)) return Promise.resolve(erro('geral', 'Consulta não encontrada.'))
  return cons.atualizar((d) => {
    const c = d.consultas[consultaId]
    if (!c) return erro('geral', 'Consulta não encontrada.')
    if (c.situacao !== situacao) {
      c.situacao = situacao
      c.atualizadoEm = agora.toISOString()
    }
    return { ok: true, dados: {} }
  })
}

// ---------- ajustes ----------

/** Lista vinda do editor de planos (JSON). Ids novos são gerados; serviços removidos só desaparecem do "Fechar plano". */
export function salvarServicos(json: string, cons: ConsultorioStore): Promise<Ok> {
  let lista: unknown
  try {
    lista = JSON.parse(json)
  } catch {
    return Promise.resolve(erro('geral', 'Dados inválidos.'))
  }
  if (!Array.isArray(lista) || lista.length > 30) return Promise.resolve(erro('geral', 'Dados inválidos.'))
  const servicos: Servico[] = []
  for (const [i, s] of lista.entries()) {
    const o = (s ?? {}) as Record<string, unknown>
    const nome = texto(o.nome)
    const valor = lerReais(String(o.valor ?? ''))
    const consultas = Number(o.consultas)
    const qtd = Number(o.prazoQtd)
    if (nome.length < 2 || nome.length > 60) return Promise.resolve(erro('geral', `Plano ${i + 1}: informe o nome.`))
    if (valor === null) return Promise.resolve(erro('geral', `${nome}: valor inválido.`))
    if (!Number.isInteger(consultas) || consultas < 1 || consultas > 24) return Promise.resolve(erro('geral', `${nome}: número de consultas inválido.`))
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > 730) return Promise.resolve(erro('geral', `${nome}: prazo inválido.`))
    const id = typeof o.id === 'string' && /^[a-z0-9-]{1,40}$/.test(o.id) ? o.id : novoId()
    servicos.push({ id, nome, valorCentavos: valor, consultas, prazo: o.prazoUnidade === 'dias' ? { dias: qtd } : { meses: qtd }, ativo: o.ativo !== false })
  }
  if (!servicos.some((s) => s.ativo)) return Promise.resolve(erro('geral', 'Deixe pelo menos um plano ativo.'))
  if (new Set(servicos.map((s) => s.id)).size !== servicos.length) return Promise.resolve(erro('geral', 'Dados inválidos.'))
  return cons.atualizar((d) => {
    d.config.servicos = servicos
    return { ok: true, dados: {} }
  })
}

/** Modelos de checklist vindos do editor (JSON { fase: ItemModelo[] }). Itens automáticos mantêm o comportamento. */
export function salvarChecklists(json: string, cons: ConsultorioStore): Promise<Ok> {
  let obj: Record<string, unknown>
  try {
    obj = JSON.parse(json)
  } catch {
    return Promise.resolve(erro('geral', 'Dados inválidos.'))
  }
  const novos = {} as Record<Fase, ItemModelo[]>
  for (const { fase, titulo } of FASES) {
    const lista = obj?.[fase]
    if (!Array.isArray(lista) || lista.length > 40) return Promise.resolve(erro('geral', 'Dados inválidos.'))
    const itens: ItemModelo[] = []
    for (const it of lista) {
      const o = (it ?? {}) as Record<string, unknown>
      const t = texto(o.texto)
      if (!t) continue
      if (t.length > 160) return Promise.resolve(erro('geral', `${titulo}: use até 160 caracteres por item.`))
      const id = typeof o.id === 'string' && /^[a-z0-9-]{1,40}$/.test(o.id) ? o.id : novoId().slice(0, 12)
      const item: ItemModelo = { id, texto: t }
      if (Array.isArray(o.servicos) && o.servicos.length) item.servicos = o.servicos.filter((s): s is string => typeof s === 'string').slice(0, 30)
      if (o.auto === 'pagamento' || o.auto === 'consulta_confirmada' || o.auto === 'proximo_agendado') item.auto = o.auto
      itens.push(item)
    }
    if (new Set(itens.map((i) => i.id)).size !== itens.length) return Promise.resolve(erro('geral', 'Dados inválidos.'))
    novos[fase] = itens
  }
  return cons.atualizar((d) => {
    d.config.checklists = novos
    return { ok: true, dados: {} }
  })
}

// ---------- integridade com o id do contato ----------

/** Troca `de` por `para` em contratos e consultas; devolve quantas referências mudaram. */
export function moverReferencias(d: DocConsultorio, de: string, para: string): number {
  let n = 0
  for (const c of Object.values(d.contratos)) if (c.contatoId === de) (c.contatoId = para), n++
  for (const c of Object.values(d.consultas)) if (c.contatoId === de) (c.contatoId = para), n++
  return n
}

/**
 * Editar dados do contato. Se o e-mail mudar, o id do contato muda (id = hash do e-mail); contratos e consultas
 * são levados para o id novo ANTES, e trazidos de volta se a edição falhar. Assim nunca ficam apontando para um id
 * que outra pessoa poderia ocupar ao se inscrever com o e-mail antigo.
 */
export async function atualizarDadosComReferencias(
  id: string, input: Record<string, string>, contatos: ContatoStore, cons: ConsultorioStore, agora = new Date(),
): Promise<Ok<{ id: string }>> {
  const v = validarContatoManual({ ...input, etapa: undefined }, hojeSP(agora))
  if (!v.ok) return v
  const atual = ID_RE.test(id) ? await contatos.get(id) : null
  if (!atual) return erro('id', 'Contato não encontrado.')
  const aleatorio = novoId()
  const email = v.dados.email ? normalizarEmail(v.dados.email) : ''
  const destino = email ? idPorEmail(email) : atual.email ? aleatorio : id
  if (destino === id) return atualizarDados(id, input, contatos, agora, aleatorio)
  if (await contatos.get(destino)) return erro('email', 'Já existe um contato com este e-mail.')

  const movidas = await cons.atualizar((d) => moverReferencias(d, id, destino))
  let r: Ok<{ id: string }> | undefined
  try {
    r = await atualizarDados(id, input, contatos, agora, aleatorio)
  } finally {
    const final = r?.ok ? r.dados.id : id
    if (movidas && final !== destino) await cons.atualizar((d) => moverReferencias(d, destino, final))
  }
  return r
}

import { diasAteAniversario, hojeSP, somarDias } from './datas'
import { idPorEmail, novoId } from './normalizar'
import type { ContatoStore } from './store'
import { ehEtapa, ehOrigem, ETAPAS, type Contato, type Etapa, type Resultado } from './types'
import { ehDataValida, validarContatoManual, validarInscricao } from './validacao'

type Id = Resultado<{ id: string }>

const NAO_ENCONTRADO: Id = { ok: false, erros: { id: 'Contato não encontrado.' } }
const EMAIL_EM_USO: Id = { ok: false, erros: { email: 'Já existe um contato com este e-mail.' } }
const ID_RE = /^[a-z0-9]{1,64}$/

/** Aplica `fn` ao contato `id` dentro de uma gravação atômica. */
function noContato(store: ContatoStore, id: string, fn: (c: Contato, todos: Record<string, Contato>) => Id | void): Promise<Id> {
  if (!ID_RE.test(id)) return Promise.resolve(NAO_ENCONTRADO)
  return store.atualizar((todos) => {
    const c = todos[id]
    if (!c) return NAO_ENCONTRADO
    return fn(c, todos) ?? { ok: true, dados: { id } }
  })
}

/** Inscrição pelo site. Reinscrição com o mesmo e-mail atualiza o contato sem mexer em etapa, notas, histórico, origem e criadoEm. */
export async function registrarInscricao(input: unknown, store: ContatoStore, agora = new Date()): Promise<Id> {
  const v = validarInscricao(input)
  if (!v.ok) return v
  const { nome, email, whatsapp, objetivo } = v.dados
  const id = idPorEmail(email)
  const iso = agora.toISOString()
  return store.atualizar((todos) => {
    const existente = todos[id]
    todos[id] = existente
      ? { ...existente, nome, email, whatsapp, objetivo, consentimentoEm: iso, atualizadoEm: iso }
      : { id, nome, email, whatsapp, objetivo, origem: 'site', etapa: 'lista', notas: [], eventos: [], consentimentoEm: iso, criadoEm: iso, atualizadoEm: iso }
    return { ok: true, dados: { id } }
  })
}

/** Cadastro manual pelo painel. Com e-mail, usa o mesmo id que uma inscrição futura pelo site usaria. */
export async function criarContatoManual(input: unknown, store: ContatoStore, agora = new Date()): Promise<Id> {
  const v = validarContatoManual(input, hojeSP(agora))
  if (!v.ok) return v
  const d = v.dados
  const id = d.email ? idPorEmail(d.email) : novoId()
  const iso = agora.toISOString()
  return store.atualizar((todos) => {
    if (todos[id]) return EMAIL_EM_USO
    const c: Contato = {
      id, nome: d.nome, whatsapp: d.whatsapp, origem: d.origem, etapa: d.etapa, notas: [], eventos: [], criadoEm: iso, atualizadoEm: iso,
    }
    if (d.email) c.email = d.email
    if (d.objetivo) c.objetivo = d.objetivo
    if (d.nascimento) c.nascimento = d.nascimento
    todos[id] = c
    return { ok: true, dados: { id } }
  })
}

/** Edita nome, e-mail, WhatsApp, objetivo, nascimento e (se informada) origem. Etapa, notas e histórico não mudam aqui. */
export async function atualizarDados(id: string, input: unknown, store: ContatoStore, agora = new Date(), idAleatorio = novoId()): Promise<Id> {
  const bruto = input && typeof input === 'object' ? { ...(input as Record<string, unknown>), etapa: undefined } : input
  const v = validarContatoManual(bruto, hojeSP(agora))
  if (!ID_RE.test(id)) return NAO_ENCONTRADO
  const origemInformada = (input as Record<string, unknown> | null)?.origem
  return store.atualizar((todos) => {
    const atual = todos[id]
    if (!atual) return NAO_ENCONTRADO
    if (!v.ok) return v
    const d = v.dados
    if (d.email && d.email !== atual.email && Object.values(todos).some((c) => c.id !== id && c.email === d.email)) return EMAIL_EM_USO
    const novo: Contato = {
      ...atual,
      nome: d.nome,
      whatsapp: d.whatsapp,
      origem: ehOrigem(origemInformada) ? origemInformada : atual.origem,
      atualizadoEm: agora.toISOString(),
    }
    for (const k of ['email', 'objetivo', 'nascimento'] as const) {
      if (d[k]) novo[k] = d[k]
      else delete novo[k]
    }
    // Invariante: contato com e-mail fica em id = hash(e-mail); sem e-mail, id aleatório.
    // Assim uma inscrição futura com o e-mail novo cai neste contato, e o e-mail antigo não aponta mais para ele.
    const idDesejado = d.email ? idPorEmail(d.email) : atual.email ? idAleatorio : id
    if (idDesejado !== id) {
      if (todos[idDesejado]) return EMAIL_EM_USO
      novo.id = idDesejado
      delete todos[id]
    }
    todos[novo.id] = novo
    return { ok: true, dados: { id: novo.id } }
  })
}

export async function mudarEtapa(id: string, etapa: string, store: ContatoStore, agora = new Date()): Promise<Id> {
  if (!ehEtapa(etapa)) return { ok: false, erros: { etapa: 'Etapa inválida.' } }
  const em = agora.toISOString()
  return noContato(store, id, (c) => {
    if (c.etapa === etapa) return
    c.eventos = [{ tipo: 'etapa', em, de: c.etapa, para: etapa }, ...(c.eventos ?? [])]
    c.etapa = etapa
    if (etapa === 'sem_interesse') delete c.retomarEm
    c.atualizadoEm = em
  })
}

/**
 * Muda a etapa só se a atual estiver em `de` (ou sempre, sem `de`), registrando no histórico.
 * Usado pelo consultório: agendar (lista/conversa → agendada), fechar plano (→ paciente), encerrar/cancelar (→ plano vencido).
 */
export async function moverEtapaSe(
  id: string, para: Etapa, store: ContatoStore, opts: { de?: Etapa[]; retomarEm?: string } = {}, agora = new Date(),
): Promise<Id> {
  const em = agora.toISOString()
  return noContato(store, id, (c) => {
    if (opts.retomarEm !== undefined) {
      if (opts.retomarEm) c.retomarEm = opts.retomarEm
      else delete c.retomarEm
      c.atualizadoEm = em
    }
    if (c.etapa === para || (opts.de && !opts.de.includes(c.etapa))) return
    c.eventos = [{ tipo: 'etapa', em, de: c.etapa, para }, ...(c.eventos ?? [])]
    c.etapa = para
    if (para === 'sem_interesse') delete c.retomarEm
    c.atualizadoEm = em
  })
}

export async function adicionarNota(id: string, texto: string, store: ContatoStore, agora = new Date()): Promise<Id> {
  const t = typeof texto === 'string' ? texto.trim() : ''
  if (t.length < 1 || t.length > 2000) return { ok: false, erros: { texto: 'Escreva uma nota de até 2000 caracteres.' } }
  const iso = agora.toISOString()
  return noContato(store, id, (c) => {
    c.notas = [{ texto: t, criadoEm: iso }, ...c.notas]
    c.atualizadoEm = iso
  })
}

function validarRetomada(retomarEm: string, agora: Date): Id | null {
  if (retomarEm === '') return null
  if (!ehDataValida(retomarEm)) return { ok: false, erros: { retomarEm: 'Data inválida.' } }
  if (retomarEm < somarDias(hojeSP(agora), -1)) return { ok: false, erros: { retomarEm: 'Escolha uma data a partir de hoje.' } }
  return null
}

/** Define (ou limpa, com '') a data para retomar a conversa. */
export async function definirRetomada(id: string, retomarEm: string, store: ContatoStore, agora = new Date()): Promise<Id> {
  const erro = validarRetomada(retomarEm, agora)
  if (erro) return erro
  return noContato(store, id, (c) => {
    if (retomarEm) c.retomarEm = retomarEm
    else delete c.retomarEm
    c.atualizadoEm = agora.toISOString()
  })
}

/** "Fiz contato hoje": registra o contato no histórico e (opcionalmente) a próxima data para retomar. */
export async function registrarContato(id: string, retomarEm: string, store: ContatoStore, agora = new Date()): Promise<Id> {
  const erro = validarRetomada(retomarEm, agora)
  if (erro) return erro
  const em = agora.toISOString()
  return noContato(store, id, (c) => {
    c.eventos = [{ tipo: 'contato', em }, ...(c.eventos ?? [])]
    if (retomarEm) c.retomarEm = retomarEm
    else delete c.retomarEm
    c.atualizadoEm = em
  })
}

/** Quantos contatos ela fez desde que a pessoa entrou na etapa atual. */
export function follows(c: Contato): number {
  let n = 0
  for (const e of c.eventos ?? []) {
    if (e.tipo === 'etapa') break
    if (e.tipo === 'contato') n++
  }
  return n
}

/** Follow-up só faz sentido antes de virar paciente. */
export const etapaComFollow = (e: Etapa) => e === 'lista' || e === 'conversa'

export function rotuloFollow(n: number): string {
  if (n === 0) return 'Sem contato'
  if (n >= 3) return '3º follow+'
  return `${n}º follow`
}

const semAcento = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export type Filtro = { etapa?: Etapa; busca?: string }

export async function listarContatos(store: ContatoStore, filtro: Filtro = {}): Promise<Contato[]> {
  return filtrarContatos(await store.list(), filtro)
}

export function filtrarContatos(todos: Contato[], filtro: Filtro = {}): Contato[] {
  let cs = todos
  if (filtro.etapa) cs = cs.filter((c) => c.etapa === filtro.etapa)
  const q = semAcento(filtro.busca?.trim() ?? '')
  if (q) cs = cs.filter((c) => semAcento([c.nome, c.email, c.whatsapp, c.objetivo].filter(Boolean).join(' ')).includes(q))
  return cs
}

const SETE_DIAS = 7 * 24 * 60 * 60 * 1000

export function resumo(contatos: Contato[], agora = new Date()) {
  const porEtapa = Object.fromEntries(ETAPAS.map((e) => [e.valor, 0])) as Record<Etapa, number>
  let siteUltimos7Dias = 0
  for (const c of contatos) {
    porEtapa[c.etapa] = (porEtapa[c.etapa] ?? 0) + 1
    if (c.origem === 'site' && agora.getTime() - new Date(c.criadoEm).getTime() <= SETE_DIAS) siteUltimos7Dias++
  }
  return { total: contatos.length, siteUltimos7Dias, porEtapa }
}

export type Agenda = {
  /** retomarEm <= hoje (atrasados primeiro). */
  retomar: Contato[]
  /** retomarEm nos próximos 7 dias. */
  proximos: Contato[]
  /** Lista de espera sem nenhum contato e sem data marcada (mais antigos primeiro: estão esperando há mais tempo). */
  novos: Contato[]
  aniversariantes: { contato: Contato; emDias: number }[]
}

/** O que a Bianca precisa ver ao abrir o painel. */
export function agendaDoDia(contatos: Contato[], hoje: string): Agenda {
  const ativos = contatos.filter((c) => c.etapa !== 'sem_interesse')
  const porData = (a: Contato, b: Contato) => (a.retomarEm ?? '').localeCompare(b.retomarEm ?? '') || a.nome.localeCompare(b.nome)
  const limite = somarDias(hoje, 7)
  return {
    retomar: ativos.filter((c) => c.retomarEm && c.retomarEm <= hoje).sort(porData),
    proximos: ativos.filter((c) => c.retomarEm && c.retomarEm > hoje && c.retomarEm <= limite).sort(porData),
    novos: ativos
      .filter((c) => c.etapa === 'lista' && !c.retomarEm && follows(c) === 0)
      .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm)),
    aniversariantes: contatos
      .filter((c) => c.nascimento)
      .map((c) => ({ contato: c, emDias: diasAteAniversario(c.nascimento!, hoje) }))
      .filter((a) => a.emDias <= 7)
      .sort((a, b) => a.emDias - b.emDias),
  }
}

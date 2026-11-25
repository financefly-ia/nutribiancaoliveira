import { idPorEmail, novoId } from './normalizar'
import type { ContatoStore } from './store'
import { ehEtapa, ehOrigem, ETAPAS, type Contato, type Etapa, type Resultado } from './types'
import { validarContatoManual, validarInscricao } from './validacao'

type Id = Resultado<{ id: string }>

const NAO_ENCONTRADO: Id = { ok: false, erros: { id: 'Contato não encontrado.' } }
const EMAIL_EM_USO: Id = { ok: false, erros: { email: 'Já existe um contato com este e-mail.' } }

async function carregar(id: string, store: ContatoStore): Promise<Contato | null> {
  try {
    return await store.get(id)
  } catch {
    return null // id malformado
  }
}

/** Inscrição pelo site. Reinscrição com o mesmo e-mail atualiza o contato sem mexer em etapa, notas, origem e criadoEm. */
export async function registrarInscricao(input: unknown, store: ContatoStore, agora = new Date()): Promise<Id> {
  const v = validarInscricao(input)
  if (!v.ok) return v
  const { nome, email, whatsapp, objetivo } = v.dados
  const id = idPorEmail(email)
  const iso = agora.toISOString()
  const existente = await store.get(id)
  const contato: Contato = existente
    ? { ...existente, nome, email, whatsapp, objetivo, consentimentoEm: iso, atualizadoEm: iso }
    : { id, nome, email, whatsapp, objetivo, origem: 'site', etapa: 'lista', notas: [], consentimentoEm: iso, criadoEm: iso, atualizadoEm: iso }
  await store.put(contato)
  return { ok: true, dados: { id } }
}

/** Cadastro manual pelo painel. Com e-mail, usa o mesmo id que uma inscrição futura pelo site usaria. */
export async function criarContatoManual(input: unknown, store: ContatoStore, agora = new Date()): Promise<Id> {
  const v = validarContatoManual(input)
  if (!v.ok) return v
  const d = v.dados
  let id = novoId()
  if (d.email) {
    id = idPorEmail(d.email)
    if (await store.get(id)) return EMAIL_EM_USO
  }
  const iso = agora.toISOString()
  const contato: Contato = {
    id, nome: d.nome, whatsapp: d.whatsapp, origem: d.origem, etapa: d.etapa, notas: [], criadoEm: iso, atualizadoEm: iso,
  }
  if (d.email) contato.email = d.email
  if (d.objetivo) contato.objetivo = d.objetivo
  await store.put(contato)
  return { ok: true, dados: { id } }
}

/** Edita nome, e-mail, WhatsApp, objetivo e (se informada) origem. Etapa e notas não mudam aqui. */
export async function atualizarDados(id: string, input: unknown, store: ContatoStore, agora = new Date()): Promise<Id> {
  const atual = await carregar(id, store)
  if (!atual) return NAO_ENCONTRADO
  const bruto = input && typeof input === 'object' ? { ...(input as Record<string, unknown>), etapa: undefined } : input
  const v = validarContatoManual(bruto)
  if (!v.ok) return v
  const d = v.dados
  if (d.email && d.email !== atual.email) {
    const outros = await store.list()
    if (outros.some((c) => c.id !== id && c.email === d.email)) return EMAIL_EM_USO
  }
  const origemInformada = (input as Record<string, unknown> | null)?.origem
  const novo: Contato = {
    ...atual,
    nome: d.nome,
    whatsapp: d.whatsapp,
    origem: ehOrigem(origemInformada) ? origemInformada : atual.origem,
    atualizadoEm: agora.toISOString(),
  }
  if (d.email) novo.email = d.email
  else delete novo.email
  if (d.objetivo) novo.objetivo = d.objetivo
  else delete novo.objetivo
  // Invariante: contato com e-mail fica em id = hash(e-mail); sem e-mail, id aleatório.
  // Assim uma inscrição futura com o e-mail novo cai neste contato, e o e-mail antigo não aponta mais para ele.
  const idDesejado = d.email ? idPorEmail(d.email) : atual.email ? novoId() : id
  if (idDesejado !== id) {
    if (await store.get(idDesejado)) return EMAIL_EM_USO
    novo.id = idDesejado
    await store.put(novo)
    await store.del(id)
    return { ok: true, dados: { id: idDesejado } }
  }
  await store.put(novo)
  return { ok: true, dados: { id } }
}

export async function mudarEtapa(id: string, etapa: string, store: ContatoStore, agora = new Date()): Promise<Id> {
  if (!ehEtapa(etapa)) return { ok: false, erros: { etapa: 'Etapa inválida.' } }
  const atual = await carregar(id, store)
  if (!atual) return NAO_ENCONTRADO
  await store.put({ ...atual, etapa, atualizadoEm: agora.toISOString() })
  return { ok: true, dados: { id } }
}

export async function adicionarNota(id: string, texto: string, store: ContatoStore, agora = new Date()): Promise<Id> {
  const t = typeof texto === 'string' ? texto.trim() : ''
  if (t.length < 1 || t.length > 2000) return { ok: false, erros: { texto: 'Escreva uma nota de até 2000 caracteres.' } }
  const atual = await carregar(id, store)
  if (!atual) return NAO_ENCONTRADO
  const iso = agora.toISOString()
  await store.put({ ...atual, notas: [{ texto: t, criadoEm: iso }, ...atual.notas], atualizadoEm: iso })
  return { ok: true, dados: { id } }
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

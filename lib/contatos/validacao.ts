import { normalizarEmail, normalizarWhatsapp } from './normalizar'
import { ehEtapa, ehOrigem, type Etapa, type Origem, type Resultado } from './types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MSG = {
  nome: 'Informe seu nome completo.',
  email: 'Informe um e-mail válido.',
  whatsapp: 'Informe um WhatsApp com DDD.',
  objetivo: 'Conte qual é o seu principal objetivo.',
  consentimento: 'É preciso autorizar o uso dos dados para entrar na lista.',
  origem: 'Origem inválida.',
  etapa: 'Etapa inválida.',
}

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

function nome(v: unknown, erros: Record<string, string>) {
  const s = texto(v)
  if (s.length < 2 || s.length > 120) erros.nome = MSG.nome
  return s
}
function email(v: unknown, erros: Record<string, string>) {
  const s = normalizarEmail(texto(v))
  if (!EMAIL_RE.test(s) || s.length > 160) erros.email = MSG.email
  return s
}
function whatsapp(v: unknown, erros: Record<string, string>) {
  const s = normalizarWhatsapp(texto(v))
  if (s.length < 10 || s.length > 11) erros.whatsapp = MSG.whatsapp
  return s
}
function objetivo(v: unknown, erros: Record<string, string>) {
  const s = texto(v)
  if (s.length < 3 || s.length > 1500) erros.objetivo = MSG.objetivo
  return s
}

export type DadosInscricao = { nome: string; email: string; whatsapp: string; objetivo: string; consentimento: true }

export function validarInscricao(input: unknown): Resultado<DadosInscricao> {
  const i = obj(input)
  const erros: Record<string, string> = {}
  const dados = {
    nome: nome(i.nome, erros),
    email: email(i.email, erros),
    whatsapp: whatsapp(i.whatsapp, erros),
    objetivo: objetivo(i.objetivo, erros),
    consentimento: true as const,
  }
  if (i.consentimento !== true) erros.consentimento = MSG.consentimento
  return Object.keys(erros).length ? { ok: false, erros } : { ok: true, dados }
}

const DATA_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Data de calendário válida no formato YYYY-MM-DD (o que um <input type="date"> envia). */
export function ehDataValida(s: string): boolean {
  const m = DATA_RE.exec(s)
  if (!m) return false
  const [a, me, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dt = new Date(Date.UTC(a, me - 1, d))
  return a >= 1900 && a <= 2200 && dt.getUTCFullYear() === a && dt.getUTCMonth() === me - 1 && dt.getUTCDate() === d
}

function nascimento(v: unknown, erros: Record<string, string>, hoje: string) {
  const s = texto(v)
  if (!ehDataValida(s) || s > hoje) erros.nascimento = 'Data de nascimento inválida.'
  return s
}

export type DadosContatoManual = {
  nome: string; whatsapp: string; email?: string; objetivo?: string; nascimento?: string; origem: Origem; etapa: Etapa
}

export function validarContatoManual(input: unknown, hoje = '9999-12-31'): Resultado<DadosContatoManual> {
  const i = obj(input)
  const erros: Record<string, string> = {}
  const dados: DadosContatoManual = {
    nome: nome(i.nome, erros),
    whatsapp: whatsapp(i.whatsapp, erros),
    origem: 'outro',
    etapa: 'lista',
  }
  if (texto(i.email)) dados.email = email(i.email, erros)
  if (texto(i.objetivo)) dados.objetivo = objetivo(i.objetivo, erros)
  if (texto(i.nascimento)) dados.nascimento = nascimento(i.nascimento, erros, hoje)
  if (i.origem !== undefined && i.origem !== '') {
    if (ehOrigem(i.origem)) dados.origem = i.origem
    else erros.origem = MSG.origem
  }
  if (i.etapa !== undefined && i.etapa !== '') {
    if (ehEtapa(i.etapa)) dados.etapa = i.etapa
    else erros.etapa = MSG.etapa
  }
  return Object.keys(erros).length ? { ok: false, erros } : { ok: true, dados }
}

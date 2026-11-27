'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirSessao } from '@/lib/auth/guard'
import { hojeSP, somarDias } from '@/lib/contatos/datas'
import { getStore } from '@/lib/contatos/get-store'
import {
  cancelarContrato, encerrarContrato, fecharPlano, marcarItem, mudarSituacao, registrarRecebimento, salvarChecklists, salvarConsulta, salvarServicos,
} from '@/lib/consultorio/servico'
import { consultorioStore } from '@/lib/consultorio/store'
import { getDocs } from '@/lib/dados/get-docs'
import type { EstadoForm } from './actions'

const cons = () => consultorioStore(getDocs())
const FALHA = { erros: { geral: 'Não foi possível salvar agora. Tente novamente.' } }
const SEM_CONEXAO = 'Não foi possível salvar agora. Verifique a internet e tente de novo.'
const campos = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith('$')).map(([k, v]) => [k, String(v)]))
const primeiroErro = (e: Record<string, string>) => Object.values(e)[0] ?? 'Não foi possível salvar.'
/** Só volta para dentro do painel. */
const volta = (v: unknown, padrao: string) => (typeof v === 'string' && /^\/painel(\/[\w/?=&.-]*)?$/.test(v) ? v : padrao)

function revalidar() {
  revalidatePath('/painel', 'layout')
}

/** '' | nº de dias | 'data' (+ campo `data`). */
function dataRetomar(fd: FormData): string {
  const q = String(fd.get('retomar') ?? '')
  if (q === 'data') return String(fd.get('data') ?? '')
  const n = Number(q)
  return q && Number.isInteger(n) && n > 0 && n <= 730 ? somarDias(hojeSP(), n) : ''
}

export async function fecharPlanoAction(prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirSessao()
  const v = campos(fd)
  const versao = (prev.versao ?? 0) + 1
  try {
    const r = await fecharPlano(
      {
        chave: v.chave, contatoId: v.contatoId, servicoId: v.servicoId, valor: v.valor, parcelas: v.parcelas, primeiroVencimento: v.primeiroVencimento,
        forma: v.forma, recebiPrimeira: v.recebiPrimeira, emAndamento: v.emAndamento, inicio: v.inicio, renovarDe: v.renovarDe || undefined,
      },
      cons(),
      getStore(),
    )
    if (!r.ok) return { erros: r.erros, valores: v, versao }
  } catch (e) {
    console.error('[painel] fechar plano', e)
    return { ...FALHA, valores: v, versao }
  }
  revalidar()
  redirect(`/painel/contato/${v.contatoId}`)
}

export async function recebimentoAction(contratoId: string, parcelaId: string, data: string, forma?: string): Promise<string | null> {
  await exigirSessao()
  try {
    const r = await registrarRecebimento(contratoId, parcelaId, data, forma, cons())
    if (!r.ok) return primeiroErro(r.erros)
  } catch (e) {
    console.error('[painel] recebimento', e)
    return SEM_CONEXAO
  }
  revalidar()
  return null
}

export async function encerrarAction(contratoId: string, prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirSessao()
  const versao = (prev.versao ?? 0) + 1
  try {
    const r = await encerrarContrato(contratoId, dataRetomar(fd), cons(), getStore())
    if (!r.ok) return { erros: r.erros, versao }
  } catch (e) {
    console.error('[painel] encerrar', e)
    return { ...FALHA, versao }
  }
  revalidar()
  return { ok: true, versao, msg: 'Acompanhamento encerrado.' }
}

export async function cancelarAction(contratoId: string, prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirSessao()
  const versao = (prev.versao ?? 0) + 1
  try {
    const r = await cancelarContrato(contratoId, fd.get('dispensar') === '1', dataRetomar(fd), cons(), getStore())
    if (!r.ok) return { erros: r.erros, versao }
  } catch (e) {
    console.error('[painel] cancelar', e)
    return { ...FALHA, versao }
  }
  revalidar()
  return { ok: true, versao, msg: 'Plano cancelado.' }
}

export async function marcarItemAction(contratoId: string, chave: string, feito: boolean): Promise<string | null> {
  await exigirSessao()
  try {
    const r = await marcarItem(contratoId, chave, feito, cons())
    if (!r.ok) return primeiroErro(r.erros)
  } catch (e) {
    console.error('[painel] checklist', e)
    return SEM_CONEXAO
  }
  revalidar()
  return null
}

export async function salvarConsultaAction(prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirSessao()
  const v = campos(fd)
  const versao = (prev.versao ?? 0) + 1
  try {
    const r = await salvarConsulta(
      { id: v.id || undefined, contatoId: v.contatoId, data: v.data, hora: v.hora, duracao: v.duracao, formato: v.formato, tipo: v.tipo, situacao: v.situacao, forcar: v.forcar },
      cons(),
      getStore(),
    )
    if (!r.ok) return { erros: r.erros, valores: v, versao }
  } catch (e) {
    console.error('[painel] salvar consulta', e)
    return { ...FALHA, valores: v, versao }
  }
  revalidar()
  redirect(volta(v.volta, `/painel/agenda?semana=${v.data}`))
}

export async function situacaoAction(consultaId: string, situacao: string): Promise<string | null> {
  await exigirSessao()
  try {
    const r = await mudarSituacao(consultaId, situacao, cons())
    if (!r.ok) return primeiroErro(r.erros)
  } catch (e) {
    console.error('[painel] situação da consulta', e)
    return SEM_CONEXAO
  }
  revalidar()
  return null
}

export async function salvarServicosAction(prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirSessao()
  const versao = (prev.versao ?? 0) + 1
  try {
    const r = await salvarServicos(String(fd.get('json') ?? ''), cons())
    if (!r.ok) return { erros: r.erros, versao }
  } catch (e) {
    console.error('[painel] salvar planos', e)
    return { ...FALHA, versao }
  }
  revalidar()
  return { ok: true, versao, msg: 'Planos salvos.' }
}

export async function salvarChecklistsAction(prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirSessao()
  const versao = (prev.versao ?? 0) + 1
  try {
    const r = await salvarChecklists(String(fd.get('json') ?? ''), cons())
    if (!r.ok) return { erros: r.erros, versao }
  } catch (e) {
    console.error('[painel] salvar checklists', e)
    return { ...FALHA, versao }
  }
  revalidar()
  return { ok: true, versao, msg: 'Checklists salvos.' }
}

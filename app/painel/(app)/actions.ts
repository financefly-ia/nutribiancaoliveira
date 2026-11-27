'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirSessao } from '@/lib/auth/guard'
import { hojeSP, somarDias } from '@/lib/contatos/datas'
import { getStore } from '@/lib/contatos/get-store'
import { salvarModelos } from '@/lib/contatos/mensagens'
import { atualizarDadosComReferencias } from '@/lib/consultorio/servico'
import { consultorioStore } from '@/lib/consultorio/store'
import {
  adicionarNota, criarContatoManual, definirRetomada, mudarEtapa, registrarContato,
} from '@/lib/contatos/servico'
import { getDocs } from '@/lib/dados/get-docs'

export type EstadoForm = { erros?: Record<string, string>; ok?: boolean; versao?: number; valores?: Record<string, string>; msg?: string }

const campos = (fd: FormData, nomes: string[]) => Object.fromEntries(nomes.map((n) => [n, String(fd.get(n) ?? '')]))
const FALHA = { erros: { geral: 'Não foi possível salvar agora. Tente novamente.' } }
const CAMPOS_CONTATO = ['nome', 'whatsapp', 'email', 'objetivo', 'nascimento', 'origem']

export async function criarContatoAction(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirSessao()
  let id: string
  const valores = campos(fd, [...CAMPOS_CONTATO, 'etapa'])
  const versao = (_prev.versao ?? 0) + 1
  try {
    const r = await criarContatoManual(valores, getStore())
    if (!r.ok) return { erros: r.erros, valores, versao }
    id = r.dados.id
  } catch (e) {
    console.error('[painel] criar contato', e)
    return { ...FALHA, valores, versao }
  }
  revalidatePath('/painel', 'layout')
  redirect(`/painel/contato/${id}`)
}

export async function atualizarDadosAction(id: string, prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirSessao()
  const valores = campos(fd, CAMPOS_CONTATO)
  const versao = (prev.versao ?? 0) + 1
  let novoId = id
  try {
    // Se o e-mail mudar, o id do contato muda: planos e consultas vão junto.
    const r = await atualizarDadosComReferencias(id, valores, getStore(), consultorioStore(getDocs()))
    if (!r.ok) return { erros: r.erros, valores, versao }
    novoId = r.dados.id
  } catch (e) {
    console.error('[painel] atualizar dados', e)
    return { ...FALHA, valores, versao }
  }
  revalidatePath('/painel', 'layout')
  if (novoId !== id) redirect(`/painel/contato/${novoId}`) // o contato mudou de id (e-mail trocado)
  return { ok: true, valores, versao }
}

/** Devolve mensagem de erro (ou null) para o seletor mostrar e desfazer a troca. */
export async function mudarEtapaAction(id: string, etapa: string): Promise<string | null> {
  await exigirSessao()
  try {
    const r = await mudarEtapa(id, etapa, getStore())
    if (!r.ok) return Object.values(r.erros)[0] ?? 'Não foi possível mudar a etapa.'
  } catch (e) {
    console.error('[painel] mudar etapa', e)
    return 'Não foi possível mudar a etapa agora. Verifique a internet e tente de novo.'
  }
  revalidatePath('/painel', 'layout')
  return null
}

export async function adicionarNotaAction(id: string, prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirSessao()
  try {
    const r = await adicionarNota(id, String(fd.get('texto') ?? ''), getStore())
    if (!r.ok) return { erros: r.erros, valores: campos(fd, ['texto']), versao: (prev.versao ?? 0) + 1 }
  } catch (e) {
    console.error('[painel] adicionar nota', e)
    return { ...FALHA, valores: campos(fd, ['texto']), versao: (prev.versao ?? 0) + 1 }
  }
  revalidatePath('/painel', 'layout')
  return { ok: true, versao: (prev.versao ?? 0) + 1 }
}

/** `quando`: '' (sem data) | nº de dias a partir de hoje | 'data' (usa o campo `data`). */
function dataEscolhida(fd: FormData): string {
  const quando = String(fd.get('quando') ?? '')
  if (quando === 'data') return String(fd.get('data') ?? '')
  const dias = Number(quando)
  return quando && Number.isInteger(dias) && dias > 0 && dias <= 366 ? somarDias(hojeSP(), dias) : ''
}

/** Formulário "Próximo passo": `acao` = 'contato' (fiz contato hoje) ou 'data' (só mudar a data). */
export async function proximoPassoAction(id: string, prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirSessao()
  const versao = (prev.versao ?? 0) + 1
  const acao = String(fd.get('acao') ?? '')
  const data = dataEscolhida(fd)
  try {
    const r = acao === 'contato' ? await registrarContato(id, data, getStore()) : await definirRetomada(id, data, getStore())
    if (!r.ok) return { erros: r.erros, versao }
  } catch (e) {
    console.error('[painel] próximo passo', e)
    return { ...FALHA, versao }
  }
  revalidatePath('/painel', 'layout')
  return { ok: true, versao, msg: acao === 'contato' ? 'Contato registrado.' : data ? 'Data salva.' : 'Data removida.' }
}

export async function salvarModelosAction(prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirSessao()
  const versao = (prev.versao ?? 0) + 1
  const valores = Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith('$')).map(([k, v]) => [k, String(v)]))
  try {
    const r = await salvarModelos(getDocs(), valores)
    if (!r.ok) return { erros: r.erros, valores, versao }
  } catch (e) {
    console.error('[painel] salvar mensagens', e)
    return { ...FALHA, valores, versao }
  }
  revalidatePath('/painel', 'layout')
  return { ok: true, versao, msg: 'Mensagens salvas.' }
}

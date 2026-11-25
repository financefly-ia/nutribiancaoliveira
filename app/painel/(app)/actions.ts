'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirSessao } from '@/lib/auth/guard'
import { getStore } from '@/lib/contatos/get-store'
import { adicionarNota, atualizarDados, criarContatoManual, mudarEtapa } from '@/lib/contatos/servico'

export type EstadoForm = { erros?: Record<string, string>; ok?: boolean; versao?: number; valores?: Record<string, string> }

const campos = (fd: FormData, nomes: string[]) => Object.fromEntries(nomes.map((n) => [n, String(fd.get(n) ?? '')]))
const FALHA = { erros: { geral: 'Não foi possível salvar agora. Tente novamente.' } }

export async function criarContatoAction(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirSessao()
  let id: string
  const valores = campos(fd, ['nome', 'whatsapp', 'email', 'objetivo', 'origem', 'etapa'])
  const versao = (_prev.versao ?? 0) + 1
  try {
    const r = await criarContatoManual(valores, getStore())
    if (!r.ok) return { erros: r.erros, valores, versao }
    id = r.dados.id
  } catch (e) {
    console.error('[painel] criar contato', e)
    return { ...FALHA, valores, versao }
  }
  revalidatePath('/painel')
  redirect(`/painel/contato/${id}`)
}

export async function atualizarDadosAction(id: string, prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirSessao()
  const valores = campos(fd, ['nome', 'whatsapp', 'email', 'objetivo', 'origem'])
  const versao = (prev.versao ?? 0) + 1
  let novoId = id
  try {
    const r = await atualizarDados(id, valores, getStore())
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

export async function mudarEtapaAction(id: string, etapa: string): Promise<void> {
  await exigirSessao()
  await mudarEtapa(id, etapa, getStore())
  revalidatePath('/painel', 'layout')
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

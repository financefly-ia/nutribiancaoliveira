import 'server-only'
import { cache } from 'react'
import { exigirSessao } from '@/lib/auth/guard'
import { consultorioStore, type ConsultorioStore } from '@/lib/consultorio/store'
import type { DocConsultorio } from '@/lib/consultorio/tipos'
import { getDocs } from '@/lib/dados/get-docs'
import { getStore } from './get-store'
import { comPadroes, type Modelos } from './mensagens'
import type { ContatoStore } from './store'

/** Única porta de leitura dos contatos para páginas do painel: exige sessão junto do dado (não confie no layout). */
export async function storeDoPainel(): Promise<ContatoStore> {
  await exigirSessao()
  return getStore()
}

export async function consultorioStoreDoPainel(): Promise<ConsultorioStore> {
  await exigirSessao()
  return consultorioStore(getDocs())
}

/** Documento do consultório: lido no máximo uma vez por requisição, mesmo que vários trechos da página peçam. */
export const consultorioDoPainel = cache(async (): Promise<DocConsultorio> => (await consultorioStoreDoPainel()).ler())

export async function modelosDoPainel(): Promise<Modelos> {
  return comPadroes((await consultorioDoPainel()).config.modelos)
}

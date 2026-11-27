import 'server-only'
import { exigirSessao } from '@/lib/auth/guard'
import { getStore } from './get-store'
import type { ContatoStore } from './store'

/** Única porta de leitura dos contatos para páginas do painel: exige sessão junto do dado (não confie no layout). */
export async function storeDoPainel(): Promise<ContatoStore> {
  await exigirSessao()
  return getStore()
}

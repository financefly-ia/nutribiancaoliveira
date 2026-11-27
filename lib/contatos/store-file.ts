import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { arquivoDocs } from '@/lib/dados/documentos-arquivo'
import { contatoStore, type ContatoStore } from './store'
import type { Contato } from './types'

/** Desenvolvimento local: documento em <dir>/contatos.json; migra o formato antigo <dir>/contatos/*.json. */
export function fileStore(dir = join(/*turbopackIgnore: true*/ process.cwd(), '.data')): ContatoStore {
  const legado = async (): Promise<Contato[]> => {
    const pasta = join(dir, 'contatos')
    let nomes: string[]
    try {
      nomes = await readdir(/*turbopackIgnore: true*/ pasta)
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw e
    }
    return Promise.all(
      nomes.filter((n) => n.endsWith('.json')).map(async (n) => JSON.parse(await readFile(/*turbopackIgnore: true*/ join(pasta, n), 'utf8')) as Contato),
    )
  }
  return contatoStore(arquivoDocs(dir), legado)
}

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { assertId, ordenarRecentes, type ContatoStore } from './store'
import type { Contato } from './types'

/** Armazenamento local para desenvolvimento (um JSON por contato). */
export function fileStore(dir = join(process.cwd(), '.data', 'contatos')): ContatoStore {
  const caminho = (id: string) => join(dir, `${id}.json`)
  return {
    async get(id) {
      assertId(id)
      try {
        return JSON.parse(await readFile(caminho(id), 'utf8')) as Contato
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
        throw e
      }
    },
    async put(c) {
      assertId(c.id)
      await mkdir(dir, { recursive: true })
      await writeFile(caminho(c.id), JSON.stringify(c, null, 2), 'utf8')
    },
    async list() {
      let nomes: string[]
      try {
        nomes = await readdir(dir)
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []
        throw e
      }
      const cs = await Promise.all(
        nomes.filter((n) => n.endsWith('.json')).map(async (n) => JSON.parse(await readFile(join(dir, n), 'utf8')) as Contato),
      )
      return ordenarRecentes(cs)
    },
  }
}

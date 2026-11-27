import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { assertId, ordenarRecentes, type ContatoStore } from './store'
import type { Contato } from './types'

/** Armazenamento local para desenvolvimento (um JSON por contato). */
export function fileStore(dir = join(/*turbopackIgnore: true*/ process.cwd(), '.data', 'contatos')): ContatoStore {
  const caminho = (id: string) => join(dir, `${id}.json`)
  return {
    async get(id) {
      assertId(id)
      try {
        return JSON.parse(await readFile(/*turbopackIgnore: true*/ caminho(id), 'utf8')) as Contato
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
        throw e
      }
    },
    async put(c) {
      assertId(c.id)
      await mkdir(/*turbopackIgnore: true*/ dir, { recursive: true })
      await writeFile(/*turbopackIgnore: true*/ caminho(c.id), JSON.stringify(c, null, 2), 'utf8')
    },
    async list() {
      let nomes: string[]
      try {
        nomes = await readdir(/*turbopackIgnore: true*/ dir)
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []
        throw e
      }
      const cs = await Promise.all(
        nomes.filter((n) => n.endsWith('.json')).map(async (n) => JSON.parse(await readFile(/*turbopackIgnore: true*/ join(dir, n), 'utf8')) as Contato),
      )
      return ordenarRecentes(cs)
    },
    async del(id) {
      assertId(id)
      await rm(/*turbopackIgnore: true*/ caminho(id), { force: true })
    },
  }
}

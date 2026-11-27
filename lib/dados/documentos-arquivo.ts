import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { assertNome, Conflito, type Documentos } from './documentos'

const hash = (s: string) => createHash('sha1').update(s).digest('hex')

/** Documentos em disco para desenvolvimento local (.data/<nome>.json). */
export function arquivoDocs(dir = join(/*turbopackIgnore: true*/ process.cwd(), '.data')): Documentos {
  const caminho = (nome: string) => join(dir, `${nome}.json`)
  async function bruto(nome: string): Promise<string | null> {
    try {
      return await readFile(/*turbopackIgnore: true*/ caminho(nome), 'utf8')
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw e
    }
  }
  return {
    async ler(nome) {
      assertNome(nome)
      const s = await bruto(nome)
      return s === null ? null : { dados: JSON.parse(s), etag: hash(s) }
    },
    async gravar(nome, dados, etag) {
      assertNome(nome)
      const atual = await bruto(nome)
      if ((atual === null ? null : hash(atual)) !== etag) throw new Conflito(nome)
      const s = JSON.stringify(dados, null, 2)
      await mkdir(/*turbopackIgnore: true*/ dir, { recursive: true })
      const tmp = `${caminho(nome)}.${process.pid}.${Date.now()}.tmp`
      await writeFile(/*turbopackIgnore: true*/ tmp, s, 'utf8')
      await rename(/*turbopackIgnore: true*/ tmp, caminho(nome))
      return hash(s)
    },
  }
}

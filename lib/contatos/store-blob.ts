import { del, get, list, put } from '@vercel/blob'
import { assertId, ordenarRecentes, type ContatoStore } from './store'
import type { Contato } from './types'

const PREFIXO = 'contatos/'
const caminho = (id: string) => `${PREFIXO}${id}.json`

async function ler(pathname: string): Promise<Contato | null> {
  const r = await get(pathname, { access: 'private', useCache: false })
  if (!r || r.statusCode !== 200) return null
  return (await new Response(r.stream).json()) as Contato
}

/** Vercel Blob privado: um JSON por contato, nunca exposto ao navegador. */
export function blobStore(): ContatoStore {
  return {
    async get(id) {
      assertId(id)
      return ler(caminho(id))
    },
    async put(c) {
      assertId(c.id)
      await put(caminho(c.id), JSON.stringify(c), {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
      })
    },
    async list() {
      const caminhos: string[] = []
      let cursor: string | undefined
      do {
        const r = await list({ prefix: PREFIXO, cursor, limit: 1000 })
        caminhos.push(...r.blobs.map((b) => b.pathname))
        cursor = r.hasMore ? r.cursor : undefined
      } while (cursor)
      const out: Contato[] = []
      for (let i = 0; i < caminhos.length; i += 10) {
        const lote = await Promise.all(caminhos.slice(i, i + 10).map(ler))
        for (const c of lote) if (c) out.push(c)
      }
      return ordenarRecentes(out)
    },
    async del(id) {
      assertId(id)
      await del(caminho(id))
    },
  }
}

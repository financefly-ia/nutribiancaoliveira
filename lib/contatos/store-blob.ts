import { get, list } from '@vercel/blob'
import { blobDocs } from '@/lib/dados/documentos-blob'
import { contatoStore, type ContatoStore } from './store'
import type { Contato } from './types'

/** Formato antigo: contatos/<id>.json (um blob por contato). Lido só uma vez, na migração. */
async function legadoBlob(): Promise<Contato[]> {
  const caminhos: string[] = []
  let cursor: string | undefined
  do {
    const r = await list({ prefix: 'contatos/', cursor, limit: 1000 })
    caminhos.push(...r.blobs.map((b) => b.pathname))
    cursor = r.hasMore ? r.cursor : undefined
  } while (cursor)
  const out: Contato[] = []
  for (const p of caminhos) {
    const r = await get(p, { access: 'private', useCache: false })
    if (r && r.statusCode === 200) out.push((await new Response(r.stream).json()) as Contato)
  }
  return out
}

/** Vercel Blob privado, documento único em dados/contatos.json, nunca exposto ao navegador. */
export const blobStore = (): ContatoStore => contatoStore(blobDocs(), legadoBlob)

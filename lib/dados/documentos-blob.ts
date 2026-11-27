import { BlobPreconditionFailedError, get, put } from '@vercel/blob'
import { assertNome, Conflito, type Documentos } from './documentos'

const caminho = (nome: string) => `dados/${nome}.json`

/** Vercel Blob privado. Cada ler = 1 operação simples; cada gravar = 1 operação avançada. */
export function blobDocs(): Documentos {
  return {
    async ler(nome) {
      assertNome(nome)
      const r = await get(caminho(nome), { access: 'private', useCache: false })
      if (!r || r.statusCode !== 200) return null
      return { dados: await new Response(r.stream).json(), etag: r.blob.etag }
    },
    async gravar(nome, dados, etag) {
      assertNome(nome)
      try {
        const r = await put(caminho(nome), JSON.stringify(dados), {
          access: 'private',
          addRandomSuffix: false,
          contentType: 'application/json',
          cacheControlMaxAge: 60,
          ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
        })
        return r.etag
      } catch (e) {
        if (e instanceof BlobPreconditionFailedError) throw new Conflito(nome)
        // Criação concorrente: o blob passou a existir entre a leitura e a gravação.
        if (!etag && e instanceof Error && /already exists|overwrite/i.test(e.message)) throw new Conflito(nome)
        throw e
      }
    },
  }
}

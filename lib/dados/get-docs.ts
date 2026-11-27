import type { Documentos } from './documentos'
import { arquivoDocs } from './documentos-arquivo'
import { blobDocs } from './documentos-blob'

/** Blob em produção (ou sempre que houver token); arquivos em .data/ no desenvolvimento local. */
export function getDocs(): Documentos {
  if (process.env.BLOB_READ_WRITE_TOKEN) return blobDocs()
  // ARMAZENAMENTO=arquivo: só para testar o build de produção localmente.
  if (process.env.NODE_ENV === 'production' && process.env.ARMAZENAMENTO !== 'arquivo') throw new Error('BLOB_READ_WRITE_TOKEN ausente')
  return arquivoDocs()
}

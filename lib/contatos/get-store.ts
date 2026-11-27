import type { ContatoStore } from './store'
import { blobStore } from './store-blob'
import { fileStore } from './store-file'

export function getStore(): ContatoStore {
  if (process.env.BLOB_READ_WRITE_TOKEN) return blobStore()
  // ARMAZENAMENTO=arquivo: só para testar o build de produção localmente.
  if (process.env.NODE_ENV === 'production' && process.env.ARMAZENAMENTO !== 'arquivo') throw new Error('BLOB_READ_WRITE_TOKEN ausente')
  return fileStore()
}

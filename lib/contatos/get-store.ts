import type { ContatoStore } from './store'
import { blobStore } from './store-blob'
import { fileStore } from './store-file'

export function getStore(): ContatoStore {
  if (process.env.BLOB_READ_WRITE_TOKEN) return blobStore()
  if (process.env.NODE_ENV === 'production') throw new Error('BLOB_READ_WRITE_TOKEN ausente')
  return fileStore()
}

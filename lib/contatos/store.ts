import type { Contato } from './types'

export interface ContatoStore {
  get(id: string): Promise<Contato | null>
  put(c: Contato): Promise<void>
  list(): Promise<Contato[]>
  /** Uso interno (mover contato ao trocar e-mail). Não há exclusão no painel. */
  del(id: string): Promise<void>
}

const ID_RE = /^[a-z0-9]{1,64}$/

export function assertId(id: string): void {
  if (!ID_RE.test(id)) throw new Error(`id de contato inválido: ${JSON.stringify(id)}`)
}

export const ordenarRecentes = (cs: Contato[]) => cs.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))

const clone = (c: Contato): Contato => structuredClone(c)

export function memoryStore(): ContatoStore {
  const m = new Map<string, Contato>()
  return {
    async get(id) {
      assertId(id)
      const c = m.get(id)
      return c ? clone(c) : null
    },
    async put(c) {
      assertId(c.id)
      m.set(c.id, clone(c))
    },
    async list() {
      return ordenarRecentes([...m.values()].map(clone))
    },
    async del(id) {
      assertId(id)
      m.delete(id)
    },
  }
}

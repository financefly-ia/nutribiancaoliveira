import { atualizarDocumento, memoriaDocs, type Documentos } from '@/lib/dados/documentos'
import type { Contato } from './types'

/** Todos os contatos num único documento: { contatos: { [id]: Contato } }. */
export type DocContatos = { versao: 1; contatos: Record<string, Contato> }

export interface ContatoStore {
  get(id: string): Promise<Contato | null>
  list(): Promise<Contato[]>
  /** Leitura-modificação-gravação atômica sobre o mapa de contatos. */
  atualizar<R>(fn: (contatos: Record<string, Contato>) => R): Promise<R>
}

const ID_RE = /^[a-z0-9]{1,64}$/
const NOME_DOC = 'contatos'

export function assertId(id: string): void {
  if (!ID_RE.test(id)) throw new Error(`id de contato inválido: ${JSON.stringify(id)}`)
}

export const ordenarRecentes = (cs: Contato[]) => cs.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))

/**
 * @param legado carrega contatos do formato antigo (um arquivo por contato) na primeira vez,
 *               quando o documento único ainda não existe.
 */
export function contatoStore(docs: Documentos, legado: () => Promise<Contato[]> = async () => []): ContatoStore {
  const inicial = async (): Promise<DocContatos> => {
    const antigos = await legado()
    return { versao: 1, contatos: Object.fromEntries(antigos.map((c) => [c.id, c])) }
  }
  async function ler(): Promise<DocContatos> {
    const lido = await docs.ler<DocContatos>(NOME_DOC)
    if (lido) return lido.dados
    // Primeira execução: migra e grava o documento (a gravação também cobre a corrida entre duas instâncias).
    return atualizarDocumento(docs, NOME_DOC, inicial, (d) => d)
  }
  return {
    async get(id) {
      assertId(id)
      return (await ler()).contatos[id] ?? null
    },
    async list() {
      return ordenarRecentes(Object.values((await ler()).contatos))
    },
    atualizar(fn) {
      return atualizarDocumento(docs, NOME_DOC, inicial, (d) => fn(d.contatos))
    },
  }
}

export const memoryStore = () => contatoStore(memoriaDocs())

/**
 * Armazenamento em poucos documentos JSON (um por coleção) com escrita condicional por ETag.
 * Motivo: o plano grátis do Vercel Blob limita OPERAÇÕES por mês (não espaço). Um documento por
 * coleção faz abrir o painel custar 1 leitura e cada salvamento custar 1 gravação.
 */

export type Lido<T> = { dados: T; etag: string }

export interface Documentos {
  /** null quando o documento ainda não existe. */
  ler<T>(nome: string): Promise<Lido<T> | null>
  /** Grava só se a versão atual ainda for `etag` (null = só cria se não existir). Lança Conflito caso contrário. */
  gravar<T>(nome: string, dados: T, etag: string | null): Promise<string>
}

export class Conflito extends Error {
  constructor(nome: string) {
    super(`documento "${nome}" foi alterado por outra gravação`)
    this.name = 'Conflito'
  }
}

const NOME_RE = /^[a-z0-9-]{1,40}$/

export function assertNome(nome: string): void {
  if (!NOME_RE.test(nome)) throw new Error(`nome de documento inválido: ${JSON.stringify(nome)}`)
}

const TENTATIVAS = 6

/**
 * Lê, aplica `fn` e grava de forma atômica (otimista): se outra gravação acontecer no meio,
 * relê e reaplica. `fn` pode mutar o rascunho; se nada mudar, não grava (economiza operação).
 */
export async function atualizarDocumento<T, R>(
  docs: Documentos,
  nome: string,
  inicial: () => T | Promise<T>,
  fn: (rascunho: T) => R | Promise<R>,
): Promise<R> {
  for (let i = 0; ; i++) {
    const lido = await docs.ler<T>(nome)
    const base = lido ? lido.dados : await inicial()
    const antes = JSON.stringify(base)
    const rascunho = structuredClone(base)
    const r = await fn(rascunho)
    if (lido && JSON.stringify(rascunho) === antes) return r
    try {
      await docs.gravar(nome, rascunho, lido?.etag ?? null)
      return r
    } catch (e) {
      if (!(e instanceof Conflito) || i >= TENTATIVAS - 1) throw e
      await new Promise((ok) => setTimeout(ok, 20 * (i + 1) + Math.random() * 40))
    }
  }
}

/** Para testes e como referência de comportamento. */
export function memoriaDocs(): Documentos & { gravacoes: number; leituras: number } {
  const m = new Map<string, { json: string; etag: string }>()
  let seq = 0
  const docs = {
    gravacoes: 0,
    leituras: 0,
    async ler<T>(nome: string) {
      assertNome(nome)
      docs.leituras++
      const v = m.get(nome)
      return v ? { dados: JSON.parse(v.json) as T, etag: v.etag } : null
    },
    async gravar<T>(nome: string, dados: T, etag: string | null) {
      assertNome(nome)
      const atual = m.get(nome)
      if ((atual?.etag ?? null) !== etag) throw new Conflito(nome)
      docs.gravacoes++
      const nova = `m${++seq}`
      m.set(nome, { json: JSON.stringify(dados), etag: nova })
      return nova
    },
  }
  return docs
}

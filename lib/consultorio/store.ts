import { atualizarDocumento, type Documentos } from '@/lib/dados/documentos'
import type { Modelos } from '@/lib/contatos/mensagens'
import { CHECKLISTS_PADRAO, SERVICOS_PADRAO } from './padroes'
import { FASES, type DocConsultorio } from './tipos'

const NOME_DOC = 'consultorio'

export interface ConsultorioStore {
  ler(): Promise<DocConsultorio>
  /** Leitura-modificação-gravação atômica (otimista) do documento inteiro. */
  atualizar<R>(fn: (d: DocConsultorio) => R): Promise<R>
}

/** Garante campos que versões futuras possam acrescentar (fase nova, lista vazia). */
function completar(d: DocConsultorio): DocConsultorio {
  d.config ??= { servicos: [], checklists: structuredClone(CHECKLISTS_PADRAO) }
  d.config.servicos ??= structuredClone(SERVICOS_PADRAO)
  d.config.checklists ??= structuredClone(CHECKLISTS_PADRAO)
  for (const { fase } of FASES) d.config.checklists[fase] ??= structuredClone(CHECKLISTS_PADRAO[fase])
  d.contratos ??= {}
  d.consultas ??= {}
  return d
}

/**
 * Documento único do consultório (agenda, contratos, parcelas, checklists e configurações).
 * Na primeira vez, nasce com os padrões do manual e com as mensagens personalizadas que estavam no doc antigo `config`
 * (que fica como cópia de segurança e deixa de ser lido).
 */
export function consultorioStore(docs: Documentos): ConsultorioStore {
  const inicial = async (): Promise<DocConsultorio> => {
    const antigo = await docs.ler<{ modelos?: Partial<Modelos> }>('config')
    return {
      versao: 1,
      config: {
        ...(antigo?.dados.modelos ? { modelos: antigo.dados.modelos } : {}),
        servicos: structuredClone(SERVICOS_PADRAO),
        checklists: structuredClone(CHECKLISTS_PADRAO),
      },
      contratos: {},
      consultas: {},
    }
  }
  return {
    async ler() {
      const lido = await docs.ler<DocConsultorio>(NOME_DOC)
      if (lido) return completar(lido.dados)
      return completar(await atualizarDocumento(docs, NOME_DOC, inicial, (d) => d))
    },
    atualizar(fn) {
      return atualizarDocumento(docs, NOME_DOC, inicial, (d) => fn(completar(d)))
    },
  }
}

import type { Modelos } from '@/lib/contatos/mensagens'

export type Prazo = { dias: number } | { meses: number }

export type Servico = {
  id: string
  nome: string
  valorCentavos: number
  /** Consultas incluídas (1, 3, 6). */
  consultas: number
  prazo: Prazo
  /** Desativado some do "Fechar plano"; contratos antigos não mudam. */
  ativo: boolean
}

export type Forma = 'pix' | 'cartao' | 'dinheiro' | 'outro'

export type Parcela = {
  id: string
  valorCentavos: number
  /** YYYY-MM-DD */
  vencimento: string
  forma: Forma
  /** YYYY-MM-DD; presença = recebida. */
  recebidaEm?: string
  /** YYYY-MM-DD; "não vou mais receber" (contrato cancelado). */
  dispensadaEm?: string
}

export type Contrato = {
  id: string
  contatoId: string
  /** Cópia congelada no fechamento (valor/consultas/prazo da época). */
  servico: Servico
  valorCentavos: number
  parcelas: Parcela[]
  /** "Acompanhamento já em andamento": início informado à mão; fases iniciais nascem concluídas. */
  inicioManual?: string
  encerradoEm?: string
  canceladoEm?: string
  /** chave do item (ver `chaveItem`) → ISO de quando marcou. */
  checklist: Record<string, string>
  criadoEm: string
}

export type Formato = 'online' | 'presencial'
export type TipoConsulta = 'primeira' | 'retorno' | 'encerramento' | 'avulsa'
export type SituacaoConsulta = 'agendada' | 'confirmada' | 'realizada' | 'faltou' | 'desmarcada'

export type Consulta = {
  id: string
  contatoId: string
  contratoId?: string
  /** YYYY-MM-DD */
  data: string
  /** HH:MM */
  hora: string
  duracaoMin: number
  formato: Formato
  tipo: TipoConsulta
  situacao: SituacaoConsulta
  criadoEm: string
  atualizadoEm: string
}

export type Fase = 'entrada' | 'pre_consulta' | 'primeira_consulta' | 'entrega' | 'retorno_antes' | 'retorno_depois' | 'encerramento'

export type Auto = 'pagamento' | 'consulta_confirmada' | 'proximo_agendado'

export type ItemModelo = {
  id: string
  texto: string
  /** Ausente = vale para todos os serviços. */
  servicos?: string[]
  auto?: Auto
}

export type ConfigConsultorio = {
  modelos?: Partial<Modelos>
  servicos: Servico[]
  checklists: Record<Fase, ItemModelo[]>
}

export type DocConsultorio = {
  versao: 1
  config: ConfigConsultorio
  contratos: Record<string, Contrato>
  consultas: Record<string, Consulta>
}

export const FASES: { fase: Fase; titulo: string }[] = [
  { fase: 'entrada', titulo: 'Entrada' },
  { fase: 'pre_consulta', titulo: 'Pré-consulta' },
  { fase: 'primeira_consulta', titulo: '1ª consulta' },
  { fase: 'entrega', titulo: 'Entrega (até 48h)' },
  { fase: 'retorno_antes', titulo: 'Antes do retorno' },
  { fase: 'retorno_depois', titulo: 'Depois do retorno' },
  { fase: 'encerramento', titulo: 'Encerramento e renovação' },
]
export const tituloFase = (f: Fase) => FASES.find((x) => x.fase === f)?.titulo ?? f

export const FORMAS: { valor: Forma; rotulo: string }[] = [
  { valor: 'pix', rotulo: 'Pix' },
  { valor: 'cartao', rotulo: 'Cartão' },
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
  { valor: 'outro', rotulo: 'Outro' },
]
export const rotuloForma = (f: Forma) => FORMAS.find((x) => x.valor === f)?.rotulo ?? f
export const ehForma = (v: unknown): v is Forma => FORMAS.some((x) => x.valor === v)

export const TIPOS: { valor: TipoConsulta; rotulo: string }[] = [
  { valor: 'primeira', rotulo: 'Primeira consulta' },
  { valor: 'retorno', rotulo: 'Retorno' },
  { valor: 'encerramento', rotulo: 'Encerramento' },
  { valor: 'avulsa', rotulo: 'Consulta avulsa' },
]
export const rotuloTipo = (t: TipoConsulta) => TIPOS.find((x) => x.valor === t)?.rotulo ?? t
export const ehTipo = (v: unknown): v is TipoConsulta => TIPOS.some((x) => x.valor === v)

export const SITUACOES: { valor: SituacaoConsulta; rotulo: string }[] = [
  { valor: 'agendada', rotulo: 'Agendada' },
  { valor: 'confirmada', rotulo: 'Confirmada' },
  { valor: 'realizada', rotulo: 'Realizada' },
  { valor: 'faltou', rotulo: 'Faltou' },
  { valor: 'desmarcada', rotulo: 'Desmarcada' },
]
export const rotuloSituacao = (s: SituacaoConsulta) => SITUACOES.find((x) => x.valor === s)?.rotulo ?? s
export const ehSituacao = (v: unknown): v is SituacaoConsulta => SITUACOES.some((x) => x.valor === v)

export const ehFormato = (v: unknown): v is Formato => v === 'online' || v === 'presencial'

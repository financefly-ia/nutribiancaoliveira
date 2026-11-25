export type Etapa = 'lista' | 'conversa' | 'agendada' | 'paciente' | 'sem_interesse'
export type Origem = 'site' | 'instagram' | 'indicacao' | 'outro'

export type Nota = { texto: string; criadoEm: string }

export type Contato = {
  id: string
  nome: string
  email?: string
  whatsapp: string
  objetivo?: string
  origem: Origem
  etapa: Etapa
  notas: Nota[]
  consentimentoEm?: string
  criadoEm: string
  atualizadoEm: string
}

export const ETAPAS: { valor: Etapa; rotulo: string }[] = [
  { valor: 'lista', rotulo: 'Lista de espera' },
  { valor: 'conversa', rotulo: 'Em conversa' },
  { valor: 'agendada', rotulo: 'Consulta agendada' },
  { valor: 'paciente', rotulo: 'Paciente' },
  { valor: 'sem_interesse', rotulo: 'Sem interesse no momento' },
]

export const ORIGENS: { valor: Origem; rotulo: string }[] = [
  { valor: 'site', rotulo: 'Site' },
  { valor: 'instagram', rotulo: 'Instagram' },
  { valor: 'indicacao', rotulo: 'Indicação' },
  { valor: 'outro', rotulo: 'Outro' },
]

export const rotuloEtapa = (e: Etapa) => ETAPAS.find((x) => x.valor === e)?.rotulo ?? e
export const rotuloOrigem = (o: Origem) => ORIGENS.find((x) => x.valor === o)?.rotulo ?? o
export const ehEtapa = (v: unknown): v is Etapa => ETAPAS.some((x) => x.valor === v)
export const ehOrigem = (v: unknown): v is Origem => ORIGENS.some((x) => x.valor === v)

export type Resultado<T> = { ok: true; dados: T } | { ok: false; erros: Record<string, string> }

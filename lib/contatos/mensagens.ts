import { atualizarDocumento, type Documentos } from '@/lib/dados/documentos'
import { ETAPAS, type Contato, type Etapa, type Resultado } from './types'

export type ChaveModelo = Etapa | 'aniversario'
export type Modelos = Record<ChaveModelo, string>

export const MODELOS: { chave: ChaveModelo; rotulo: string }[] = [
  ...ETAPAS.map((e) => ({ chave: e.valor as ChaveModelo, rotulo: e.rotulo })),
  { chave: 'aniversario', rotulo: 'Aniversário' },
]

export const MODELOS_PADRAO: Modelos = {
  lista:
    'Oi, {nome}! Tudo bem? Aqui é a Bianca Oliveira, nutricionista 😊 Vi que você entrou na minha lista de espera e fiquei muito feliz! Posso te contar como vai funcionar o acompanhamento?',
  conversa:
    'Oi, {nome}! Passando para saber se ficou alguma dúvida sobre o acompanhamento. Se quiser, já podemos combinar um horário para a sua primeira consulta 😊',
  agendada: 'Oi, {nome}! Passando para confirmar a sua consulta. Qualquer coisa, é só me chamar por aqui. Até lá! 💛',
  paciente: 'Oi, {nome}! Como você está? Passando para saber como estão as coisas com o plano. Me conta como foi a sua semana!',
  sem_interesse:
    'Oi, {nome}! Tudo bem? Abri novas vagas para acompanhamento nutricional e lembrei de você. Se fizer sentido agora, é só me chamar por aqui 😊',
  aniversario: 'Feliz aniversário, {nome}! 🎉 Desejo um novo ciclo cheio de saúde, leveza e conquistas. Um beijo, Bianca 💛',
}

export const LIMITE_MODELO = 1000

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? ''

/** Troca {nome} (primeiro nome), {nome_completo} e {objetivo}. */
export function preencher(modelo: string, c: Pick<Contato, 'nome' | 'objetivo'>): string {
  return modelo
    .replaceAll('{nome_completo}', c.nome.trim())
    .replaceAll('{nome}', primeiroNome(c.nome))
    .replaceAll('{objetivo}', c.objetivo?.trim() ?? '')
}

type DocConfig = { modelos?: Partial<Modelos> }

export async function lerModelos(docs: Documentos): Promise<Modelos> {
  const lido = await docs.ler<DocConfig>('config')
  return { ...MODELOS_PADRAO, ...(lido?.dados.modelos ?? {}) }
}

/** Salva os modelos; texto vazio volta ao padrão. */
export async function salvarModelos(docs: Documentos, input: Record<string, unknown>): Promise<Resultado<Modelos>> {
  const erros: Record<string, string> = {}
  const personalizados: Partial<Modelos> = {}
  for (const { chave } of MODELOS) {
    const v = typeof input[chave] === 'string' ? (input[chave] as string).trim() : ''
    if (v.length > LIMITE_MODELO) erros[chave] = `Use até ${LIMITE_MODELO} caracteres.`
    else if (v && v !== MODELOS_PADRAO[chave]) personalizados[chave] = v
  }
  if (Object.keys(erros).length) return { ok: false, erros }
  await atualizarDocumento<DocConfig, void>(docs, 'config', () => ({}), (d) => {
    d.modelos = personalizados
  })
  return { ok: true, dados: { ...MODELOS_PADRAO, ...personalizados } }
}

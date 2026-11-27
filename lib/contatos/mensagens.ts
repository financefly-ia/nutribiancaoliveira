import { consultorioStore } from '@/lib/consultorio/store'
import type { Documentos } from '@/lib/dados/documentos'
import { ETAPAS, type Contato, type Etapa, type Resultado } from './types'

export type ChaveModelo = Etapa | 'aniversario' | 'confirmacao' | 'pagamento' | 'renovacao_avulsa'
export type Modelos = Record<ChaveModelo, string>

export const MODELOS: { chave: ChaveModelo; rotulo: string }[] = [
  ...ETAPAS.map((e) => ({ chave: e.valor as ChaveModelo, rotulo: e.rotulo })),
  { chave: 'confirmacao', rotulo: 'Confirmação de consulta' },
  { chave: 'pagamento', rotulo: 'Lembrete de pagamento' },
  { chave: 'renovacao_avulsa', rotulo: 'Renovação da consulta avulsa' },
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
  plano_vencido:
    'Oi, {nome}! Faz um tempinho que não nos falamos e lembrei de você 💚 Como estão as coisas com a alimentação? Se quiser retomar o acompanhamento, é só me chamar por aqui!',
  confirmacao: 'Oi, {nome}! Passando para confirmar a sua consulta {data}, às {hora} ({formato}). Posso confirmar? 😊',
  pagamento:
    'Oi, {nome}! Tudo bem? Passando para lembrar da parcela de {valor}, com vencimento em {vencimento}. Qualquer dúvida, é só me chamar 💚',
  renovacao_avulsa:
    'Oii, {nome}! 💚 Estamos chegando ao final dos nossos 30 dias de acompanhamento e queria saber como você está se sentindo com tudo o que construímos até aqui.\n\nPelo seu feedback, podemos avaliar se faz sentido continuarmos com mais um período de acompanhamento ou se, neste momento, você se sente segura para seguir com as estratégias que trabalhamos.\n\nSe quiser continuar, posso te explicar as opções para darmos sequência ao seu acompanhamento!',
  aniversario: 'Feliz aniversário, {nome}! 🎉 Desejo um novo ciclo cheio de saúde, leveza e conquistas. Um beijo, Bianca 💛',
}

export const LIMITE_MODELO = 1200

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? ''

/** Variáveis extras: {data}, {hora}, {formato} (consulta) e {valor}, {vencimento} (parcela). */
export type Extras = Partial<Record<'data' | 'hora' | 'formato' | 'valor' | 'vencimento', string>>

/** Troca {nome} (primeiro nome), {nome_completo}, {objetivo} e as variáveis extras que vierem. */
export function preencher(modelo: string, c: Pick<Contato, 'nome' | 'objetivo'>, extras: Extras = {}): string {
  let s = modelo
    .replaceAll('{nome_completo}', c.nome.trim())
    .replaceAll('{nome}', primeiroNome(c.nome))
    .replaceAll('{objetivo}', c.objetivo?.trim() ?? '')
  for (const [k, v] of Object.entries(extras)) if (v !== undefined) s = s.replaceAll(`{${k}}`, v)
  return s
}

export const comPadroes = (personalizados?: Partial<Modelos>): Modelos => ({ ...MODELOS_PADRAO, ...(personalizados ?? {}) })

/** Os modelos ficam no documento do consultório (migrados do antigo `config`). */
export async function lerModelos(docs: Documentos): Promise<Modelos> {
  return comPadroes((await consultorioStore(docs).ler()).config.modelos)
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
  await consultorioStore(docs).atualizar((d) => {
    d.config.modelos = personalizados
  })
  return { ok: true, dados: { ...MODELOS_PADRAO, ...personalizados } }
}

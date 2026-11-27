/** Datas de calendário (YYYY-MM-DD) no fuso de Curitiba/São Paulo, sem horário. */

const TZ = 'America/Sao_Paulo'

export const hojeSP = (agora = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(agora)

const utc = (d: string) => {
  const [a, m, dia] = d.split('-').map(Number)
  return Date.UTC(a, m - 1, dia)
}
const DIA = 86_400_000

export function somarDias(d: string, n: number): string {
  return new Date(utc(d) + n * DIA).toISOString().slice(0, 10)
}

/** b - a em dias. */
export const diasEntre = (a: string, b: string) => Math.round((utc(b) - utc(a)) / DIA)

/** Dias até o próximo aniversário (0 = hoje). 29/02 conta como 28/02 em anos não bissextos. */
export function diasAteAniversario(nascimento: string, hoje: string): number {
  const ano = Number(hoje.slice(0, 4))
  const md = nascimento.slice(5)
  const naData = (a: string | number) => {
    const bissexto = (Number(a) % 4 === 0 && Number(a) % 100 !== 0) || Number(a) % 400 === 0
    return `${a}-${md === '02-29' && !bissexto ? '02-28' : md}`
  }
  let alvo = naData(ano)
  if (alvo < hoje) alvo = naData(ano + 1)
  return diasEntre(hoje, alvo)
}

/** Idade que a pessoa completa (ou completou) no próximo aniversário. */
export function idadeNoAniversario(nascimento: string, hoje: string): number {
  const ano = Number(hoje.slice(0, 4))
  const jaPassou = `${ano}-${nascimento.slice(5)}` < hoje
  return ano - Number(nascimento.slice(0, 4)) + (jaPassou ? 1 : 0)
}

/** Idade hoje. */
export function idadeAtual(nascimento: string, hoje: string): number {
  const anos = Number(hoje.slice(0, 4)) - Number(nascimento.slice(0, 4))
  return hoje.slice(5) >= nascimento.slice(5) ? anos : anos - 1
}

const MESES =['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "12 jan" */
export const diaMes = (d: string) => `${Number(d.slice(8, 10))} ${MESES[Number(d.slice(5, 7)) - 1]}`

/** "hoje", "amanhã", "ontem", "em 3 dias", "há 4 dias" */
export function relativo(d: string, hoje: string): string {
  const n = diasEntre(hoje, d)
  if (n === 0) return 'hoje'
  if (n === 1) return 'amanhã'
  if (n === -1) return 'ontem'
  return n > 0 ? `em ${n} dias` : `há ${-n} dias`
}

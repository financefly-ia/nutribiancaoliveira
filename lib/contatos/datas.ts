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

/** Soma meses mantendo o dia; se o mês não tem o dia (31/01 + 1), usa o último dia do mês. */
export function somarMeses(d: string, n: number): string {
  const [a, m, dia] = d.split('-').map(Number)
  const total = a * 12 + (m - 1) + n
  const ano = Math.floor(total / 12)
  const mes = total % 12
  const ultimo = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate()
  return new Date(Date.UTC(ano, mes, Math.min(dia, ultimo))).toISOString().slice(0, 10)
}

/** 0 = domingo … 6 = sábado. */
export const diaDaSemana = (d: string) => new Date(utc(d)).getUTCDay()

/** Segunda-feira da semana de `d`. */
export const segundaDaSemana = (d: string) => somarDias(d, -((diaDaSemana(d) + 6) % 7))

const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
export const nomeDia = (d: string) => SEMANA[diaDaSemana(d)]

/** "terça, 25/11" */
export const dataCurta = (d: string) => `${nomeDia(d)}, ${d.slice(8, 10)}/${d.slice(5, 7)}`

/** "25/11/2026" */
export const dataBR = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`

/** "YYYY-MM-DD HH:MM" agora em São Paulo (para comparar com data + hora de consultas). */
export function agoraSP(agora = new Date()): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(agora)
      .map((x) => [x.type, x.value]),
  )
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`
}

const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
/** "2026-11" → "novembro 2026" */
export const nomeMes = (ym: string) => `${MESES_LONGOS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`
/** "2026-11" + n meses */
export const somarMesAno = (ym: string, n: number) => somarMeses(`${ym}-01`, n).slice(0, 7)

import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export const COOKIE_SESSAO = 'bo_sessao'
export const VALIDADE_MS = 30 * 24 * 60 * 60 * 1000

const assinar = (dado: string, secret: string) => createHmac('sha256', secret).update(dado).digest('base64url')

/** Token `${expiraEmMs}.${hmac}` — sem dados pessoais, só a validade assinada. */
export function criarToken(secret: string, agora = new Date()): string {
  const exp = String(agora.getTime() + VALIDADE_MS)
  return `${exp}.${assinar(exp, secret)}`
}

export function verificarToken(token: string | undefined, secret: string, agora = new Date()): boolean {
  if (!token || !secret) return false
  const partes = token.split('.')
  if (partes.length !== 2) return false
  const [exp, sig] = partes
  if (!/^\d{10,16}$/.test(exp)) return false
  const esperado = Buffer.from(assinar(exp, secret))
  const recebido = Buffer.from(sig)
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return false
  return Number(exp) > agora.getTime()
}

/** Comparação de senha em tempo constante (hash antes, para igualar tamanhos). */
export function senhaConfere(digitada: string, correta: string): boolean {
  if (!digitada || !correta) return false
  const h = (s: string) => createHash('sha256').update(s).digest()
  return timingSafeEqual(h(digitada), h(correta))
}

import { createHash, randomUUID } from 'node:crypto'

export const normalizarEmail = (s: string) => s.trim().toLowerCase()

export function normalizarWhatsapp(s: string): string {
  let d = s.replace(/\D/g, '')
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2)
  return d
}

export const idPorEmail = (email: string) =>
  createHash('sha256').update(normalizarEmail(email)).digest('hex').slice(0, 32)

export const novoId = () => 'm' + randomUUID().replace(/-/g, '')

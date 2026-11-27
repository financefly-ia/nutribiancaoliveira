const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** 138000 → "R$ 1.380,00" (espaço normal, para caber em mensagens). */
export const reais = (centavos: number) => BRL.format(centavos / 100).replace(/\s/g, ' ')

/** "1.380,00" | "1380" | "R$ 750,5" | "750.50" → centavos; null se inválido. */
export function lerReais(v: unknown): number | null {
  if (typeof v !== 'string' && typeof v !== 'number') return null
  let s = String(v).replace(/R\$|\s/g, '')
  if (!s) return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '') // "1.380" sem centavos
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  const c = Math.round(Number(s) * 100)
  return c > 0 && c <= 100_000_000 ? c : null
}

/** "138000" → "1.380,00" (valor inicial de campo). */
export const reaisCampo = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Divide em `n` partes inteiras; os centavos que sobram vão para a primeira. */
export function dividir(total: number, n: number): number[] {
  const base = Math.floor(total / n)
  const partes = Array.from({ length: n }, () => base)
  partes[0] += total - base * n
  return partes
}

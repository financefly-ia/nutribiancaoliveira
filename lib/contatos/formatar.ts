const TZ = 'America/Sao_Paulo'

export function formatarWhatsapp(d: string): string {
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return d
}

/** Abre a conversa no WhatsApp; com `texto`, a mensagem já vem escrita (ela só confere e envia). */
export const linkWhatsapp = (d: string, texto?: string) => `https://wa.me/55${d}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`

export const formatarData = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))

export const formatarDataHora = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    .format(new Date(iso))
    .replace(',', '')

/** Máscara do campo WhatsApp. Remove o DDI 55 de números colados/autopreenchidos antes de limitar a 11 dígitos. */
export function mascararWhatsapp(v: string): string {
  let d = v.replace(/\D/g, '')
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2)
  d = d.slice(0, 11)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return d
}

export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return 'http://localhost:3000'
}

/** Canais de contato da Bianca (usados na Política de Privacidade). */
export const CONTATO_BIANCA = {
  whatsapp: '(41) 98715-5105',
  whatsappLink: 'https://wa.me/5541987155105',
  instagram: '@nutri.bioliveira',
  instagramLink: 'https://www.instagram.com/nutri.bioliveira/',
}

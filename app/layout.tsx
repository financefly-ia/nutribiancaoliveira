import type { Metadata, Viewport } from 'next'
import { Montserrat, Playfair_Display } from 'next/font/google'
import { siteUrl } from '@/lib/config'
import './site.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-montserrat',
  display: 'swap',
})

const descricao = 'Nutrição com estratégia, individualidade e propósito. Entre na lista de espera.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: 'Bianca Oliveira · Nutrição',
  description: descricao,
  openGraph: {
    title: 'Bianca Oliveira · Nutrição',
    description: descricao,
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Bianca Oliveira · Nutrição' }],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = { themeColor: '#F1E9E0' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${playfair.variable} ${montserrat.variable}`}>
      <body>{children}</body>
    </html>
  )
}

import type { Metadata, Viewport } from 'next'
import { SvgDefs } from '@/components/site/SvgDefs'
import './painel.css'

export const metadata: Metadata = {
  title: 'Painel · Bianca Oliveira',
  robots: { index: false, follow: false },
  manifest: '/painel.webmanifest',
  appleWebApp: { capable: true, title: 'BO Painel', statusBarStyle: 'default' },
}

export const viewport: Viewport = { themeColor: '#4A2E27' }

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pn">
      <SvgDefs />
      {children}
    </div>
  )
}

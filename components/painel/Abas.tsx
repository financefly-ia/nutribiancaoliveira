'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ABAS = [
  { href: '/painel', rotulo: 'Hoje', icone: 'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' },
  { href: '/painel/contatos', rotulo: 'Contatos', icone: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8' },
  { href: '/painel/mensagens', rotulo: 'Mensagens', icone: 'M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z' },
]

const ativa = (href: string, path: string) =>
  href === '/painel' ? path === '/painel' : path.startsWith(href) || (href === '/painel/contatos' && /^\/painel\/(contato|novo)/.test(path))

/** No celular vira barra fixa embaixo (como um app); no computador fica no topo. */
export function Abas() {
  const path = usePathname()
  return (
    <nav className="pn-abas" aria-label="Seções do painel">
      {ABAS.map((a) => (
        <Link key={a.href} href={a.href} className={ativa(a.href, path) ? 'on' : undefined} aria-current={ativa(a.href, path) ? 'page' : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={a.icone} /></svg>
          {a.rotulo}
        </Link>
      ))}
    </nav>
  )
}

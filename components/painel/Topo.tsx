import Link from 'next/link'
import { sair } from '@/app/painel/login/actions'

export function Topo() {
  return (
    <header className="pn-top">
      <div className="pn-wrap">
        <Link href="/painel" className="pn-brand">
          <svg viewBox="0 0 120 130" aria-hidden="true"><use href="#bo" /></svg>
          Painel
        </Link>
        <form action={sair}>
          <button className="pn-sair">Sair</button>
        </form>
      </div>
    </header>
  )
}

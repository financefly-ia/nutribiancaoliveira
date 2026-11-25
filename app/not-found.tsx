import Link from 'next/link'
import { Monograma, SvgDefs } from '@/components/site/SvgDefs'

export default function NotFound() {
  return (
    <main className="nf">
      <SvgDefs />
      <div>
        <Monograma />
        <h1>Página não encontrada</h1>
        <Link href="/" className="btn btn-solid">Voltar ao início</Link>
      </div>
    </main>
  )
}

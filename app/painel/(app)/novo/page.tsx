import Link from 'next/link'
import { NovoContato } from '@/components/painel/Formularios'
import { Topo } from '@/components/painel/Topo'

export default function NovoPage() {
  return (
    <>
      <Topo />
      <main className="pn-wrap pn-main" style={{ maxWidth: 640 }}>
        <Link href="/painel" className="pn-voltar">← Contatos</Link>
        <p className="pn-eyebrow" style={{ marginTop: 8 }}>Cadastro manual</p>
        <h1 style={{ fontSize: '2rem', margin: '4px 0 18px' }}>Novo contato</h1>
        <NovoContato />
      </main>
    </>
  )
}

import Link from 'next/link'
import { EditarChecklists, EditarServicos } from '@/components/painel/Consultorio'
import { EditarModelos } from '@/components/painel/Formularios'
import { Topo } from '@/components/painel/Topo'
import { consultorioDoPainel } from '@/lib/contatos/dados-painel'
import { comPadroes } from '@/lib/contatos/mensagens'

const SECOES = [
  { id: 'mensagens', rotulo: 'Mensagens' },
  { id: 'planos', rotulo: 'Planos e valores' },
  { id: 'checklists', rotulo: 'Checklists' },
] as const

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export default async function Ajustes({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const secao = SECOES.find((s) => s.id === um(sp.secao))?.id ?? 'mensagens'
  const doc = await consultorioDoPainel()
  return (
    <>
      <Topo />
      <main className="pn-wrap pn-main" style={{ maxWidth: 760 }}>
        <p className="pn-eyebrow">Ajustes</p>
        <h1 style={{ fontSize: '2rem', margin: '4px 0 12px' }}>Seu consultório</h1>
        <nav className="pn-chips" aria-label="Seções dos ajustes">
          {SECOES.map((s) => (
            <Link key={s.id} href={`/painel/ajustes?secao=${s.id}`} className={`pn-chip${secao === s.id ? ' on' : ''}`} aria-current={secao === s.id ? 'page' : undefined}>
              {s.rotulo}
            </Link>
          ))}
        </nav>
        {secao === 'mensagens' ? (
          <>
            <p style={{ marginBottom: 18 }}>
              Cada etapa e situação tem uma mensagem sugerida, que aparece já escrita quando você toca em WhatsApp. Use <b>{'{nome}'}</b> (primeiro nome),{' '}
              <b>{'{nome_completo}'}</b>, <b>{'{objetivo}'}</b>; nas de consulta, <b>{'{data}'}</b>, <b>{'{hora}'}</b> e <b>{'{formato}'}</b>; nas de pagamento,{' '}
              <b>{'{valor}'}</b> e <b>{'{vencimento}'}</b>.
            </p>
            <EditarModelos modelos={comPadroes(doc.config.modelos)} />
          </>
        ) : secao === 'planos' ? (
          <>
            <p style={{ marginBottom: 18 }}>Os serviços que aparecem em “Fechar plano”, com valor, número de consultas e duração do acompanhamento.</p>
            <EditarServicos servicos={doc.config.servicos} />
          </>
        ) : (
          <>
            <p style={{ marginBottom: 18 }}>Os itens que aparecem em cada fase do acompanhamento, vindos do seu manual. Ajuste conforme o consultório for evoluindo.</p>
            <EditarChecklists checklists={doc.config.checklists} servicos={doc.config.servicos} />
          </>
        )}
      </main>
    </>
  )
}

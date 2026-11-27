import Link from 'next/link'
import { formatarData, linkWhatsapp } from '@/lib/contatos/formatar'
import { etapaComFollow, follows, rotuloFollow } from '@/lib/contatos/servico'
import { rotuloOrigem, type Contato } from '@/lib/contatos/types'
import { Badge } from './Badge'

export function FollowChip({ c }: { c: Contato }) {
  if (!etapaComFollow(c.etapa)) return null
  const n = follows(c)
  return <span className={`pn-follow${n === 0 ? ' zero' : ''}`}>{rotuloFollow(n)}</span>
}

/** Cartão de contato usado no "Hoje" e na lista. `mensagem` já vem preenchida para o WhatsApp. */
export function Cartao({ c, mensagem, aviso, avisoForte, objetivo = true }: {
  c: Contato
  mensagem: string
  aviso?: string
  avisoForte?: boolean
  objetivo?: boolean
}) {
  return (
    <article className="pn-card">
      <Link href={`/painel/contato/${c.id}`} className="pn-card-link" aria-label={`Abrir ${c.nome}`} />
      <div className="pn-card-top">
        <div>
          <h3>{c.nome}</h3>
          <p className="pn-meta">
            {rotuloOrigem(c.origem)} · {formatarData(c.criadoEm)}
          </p>
        </div>
        <Badge etapa={c.etapa} />
      </div>
      {objetivo && c.objetivo ? <p className="pn-obj">{c.objetivo}</p> : null}
      <div className="pn-card-foot">
        <a href={linkWhatsapp(c.whatsapp, mensagem)} target="_blank" rel="noopener noreferrer" className="pn-btn pn-btn-wa">WhatsApp</a>
        <FollowChip c={c} />
        {aviso ? <span className={`pn-aviso${avisoForte ? ' forte' : ''}`}>{aviso}</span> : null}
      </div>
    </article>
  )
}

/** Cartão genérico do Hoje (consulta, parcela, pendência…): título leva ao contato, WhatsApp opcional com mensagem pronta. */
export function CartaoItem({ href, titulo, meta, aviso, avisoForte, whatsapp, mensagem, children, acoes }: {
  href: string
  titulo: string
  meta?: React.ReactNode
  aviso?: string
  avisoForte?: boolean
  whatsapp?: string
  mensagem?: string
  children?: React.ReactNode
  acoes?: React.ReactNode
}) {
  return (
    <article className="pn-card">
      <Link href={href} className="pn-card-link" aria-label={`Abrir ${titulo}`} />
      <div className="pn-card-top">
        <div>
          <h3>{titulo}</h3>
          {meta ? <p className="pn-meta">{meta}</p> : null}
        </div>
      </div>
      {children ? <div className="pn-card-corpo">{children}</div> : null}
      {whatsapp || aviso || acoes ? (
        <div className="pn-card-foot">
          {whatsapp ? (
            <a href={linkWhatsapp(whatsapp, mensagem)} target="_blank" rel="noopener noreferrer" className="pn-btn pn-btn-wa">WhatsApp</a>
          ) : null}
          {acoes}
          {aviso ? <span className={`pn-aviso${avisoForte ? ' forte' : ''}`}>{aviso}</span> : null}
        </div>
      ) : null}
    </article>
  )
}

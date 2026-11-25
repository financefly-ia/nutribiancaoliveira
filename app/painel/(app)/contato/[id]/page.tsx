import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/painel/Badge'
import { EditarDados, NovaNota, SeletorEtapa } from '@/components/painel/Formularios'
import { Topo } from '@/components/painel/Topo'
import { getStore } from '@/lib/contatos/get-store'
import { formatarDataHora, formatarWhatsapp, linkWhatsapp } from '@/lib/contatos/formatar'
import { rotuloOrigem } from '@/lib/contatos/types'

export default async function ContatoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let c
  try {
    c = await getStore().get(id)
  } catch {
    c = null
  }
  if (!c) notFound()

  return (
    <>
      <Topo />
      <main className="pn-wrap pn-main">
        <Link href="/painel" className="pn-voltar">← Contatos</Link>
        <div className="pn-detalhe">
          <div>
            <section className="pn-box pn-head">
              <Badge etapa={c.etapa} />
              <h1>{c.nome}</h1>
              <div className="pn-card-foot">
                <a href={linkWhatsapp(c.whatsapp)} target="_blank" rel="noopener noreferrer" className="pn-btn pn-btn-wa">WhatsApp</a>
                {c.email ? <a href={`mailto:${c.email}`} className="pn-btn">E-mail</a> : null}
              </div>
              <dl className="pn-dados">
                <div><dt>WhatsApp</dt><dd>{formatarWhatsapp(c.whatsapp)}</dd></div>
                {c.email ? <div><dt>E-mail</dt><dd><a href={`mailto:${c.email}`}>{c.email}</a></dd></div> : null}
                {c.objetivo ? <div><dt>Objetivo</dt><dd>{c.objetivo}</dd></div> : null}
                <div><dt>Origem</dt><dd>{rotuloOrigem(c.origem)}</dd></div>
                <div><dt>Entrou em</dt><dd>{formatarDataHora(c.criadoEm)}</dd></div>
                {c.consentimentoEm ? <div><dt>Consentimento LGPD</dt><dd>{formatarDataHora(c.consentimentoEm)}</dd></div> : null}
              </dl>
            </section>

            <section className="pn-box">
              <h2>Anotações</h2>
              <NovaNota id={c.id} />
              {c.notas.length ? (
                <ul className="pn-notas">
                  {c.notas.map((n, i) => (
                    <li key={`${n.criadoEm}-${i}`}>
                      <time dateTime={n.criadoEm}>{formatarDataHora(n.criadoEm)}</time>
                      <p>{n.texto}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </div>

          <div>
            <section className="pn-box">
              <h2>Etapa</h2>
              <SeletorEtapa key={c.etapa} id={c.id} etapa={c.etapa} />
            </section>
            <section className="pn-box">
              <details className="pn-details">
                <summary>Editar dados</summary>
                <div style={{ marginTop: 12 }}>
                  <EditarDados c={c} />
                </div>
              </details>
            </section>
            <p className="pn-rodape">Atualizado em {formatarDataHora(c.atualizadoEm)}</p>
          </div>
        </div>
      </main>
    </>
  )
}

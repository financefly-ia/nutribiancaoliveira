import Link from 'next/link'
import { Badge } from '@/components/painel/Badge'
import { Topo } from '@/components/painel/Topo'
import { getStore } from '@/lib/contatos/get-store'
import { formatarData, linkWhatsapp } from '@/lib/contatos/formatar'
import { filtrarContatos, resumo } from '@/lib/contatos/servico'
import { ehEtapa, ETAPAS, rotuloOrigem } from '@/lib/contatos/types'

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export default async function Painel({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const etapaParam = um(sp.etapa)
  const etapa = ehEtapa(etapaParam) ? etapaParam : undefined
  const busca = um(sp.q).trim()

  const todos = await getStore().list()
  const r = resumo(todos)
  const contatos = filtrarContatos(todos, { etapa, busca })

  const url = (e?: string) => {
    const p = new URLSearchParams()
    if (e) p.set('etapa', e)
    if (busca) p.set('q', busca)
    const s = p.toString()
    return s ? `/painel?${s}` : '/painel'
  }
  const exportar = new URLSearchParams()
  if (etapa) exportar.set('etapa', etapa)
  if (busca) exportar.set('q', busca)

  return (
    <>
      <Topo />
      <main className="pn-wrap pn-main">
        <div className="pn-hello">
          <div>
            <p className="pn-eyebrow">Mini-CRM</p>
            <h1>Olá, Bianca</h1>
            <p>
              {r.total} {r.total === 1 ? 'contato' : 'contatos'} · +{r.siteUltimos7Dias} pelo site nos últimos 7 dias
            </p>
          </div>
          <div className="pn-acoes">
            <Link href="/painel/novo" className="pn-btn pn-btn-solid">+ Novo contato</Link>
            <a href={`/painel/exportar${exportar.size ? `?${exportar}` : ''}`} className="pn-btn">Exportar planilha</a>
          </div>
        </div>

        <div className="pn-chips" role="navigation" aria-label="Filtrar por etapa">
          <Link href={url()} className={`pn-chip${!etapa ? ' on' : ''}`}>
            Todos <b>{r.total}</b>
          </Link>
          {ETAPAS.map((e) => (
            <Link key={e.valor} href={url(e.valor)} className={`pn-chip${etapa === e.valor ? ' on' : ''}`}>
              {e.rotulo} <b>{r.porEtapa[e.valor]}</b>
            </Link>
          ))}
        </div>

        <form className="pn-busca" action="/painel" role="search">
          {etapa ? <input type="hidden" name="etapa" value={etapa} /> : null}
          <input className="pn-input" type="search" name="q" defaultValue={busca} placeholder="Buscar por nome, e-mail, WhatsApp ou objetivo" aria-label="Buscar" />
          <button className="pn-btn">Buscar</button>
        </form>

        {contatos.length === 0 ? (
          <div className="pn-vazio">
            <svg viewBox="0 0 100 100" aria-hidden="true"><use href="#folha" /></svg>
            {r.total === 0 ? (
              <p>Nenhum contato ainda. Quando alguém entrar na lista de espera, aparece aqui.</p>
            ) : (
              <p>Nenhum contato encontrado com esse filtro.</p>
            )}
          </div>
        ) : (
          <div className="pn-cards">
            {contatos.map((c) => (
              <article key={c.id} className="pn-card">
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
                {c.objetivo ? <p className="pn-obj">{c.objetivo}</p> : null}
                <div className="pn-card-foot">
                  <a href={linkWhatsapp(c.whatsapp)} target="_blank" rel="noopener noreferrer" className="pn-btn pn-btn-wa">WhatsApp</a>
                  {c.notas[0] ? <span className="pn-meta">Última nota: {formatarData(c.notas[0].criadoEm)}</span> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  )
}

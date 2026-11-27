import Link from 'next/link'
import { Cartao } from '@/components/painel/Cartao'
import { Topo } from '@/components/painel/Topo'
import { modelosDoPainel, storeDoPainel } from '@/lib/contatos/dados-painel'
import { diaMes, hojeSP, relativo } from '@/lib/contatos/datas'
import { preencher } from '@/lib/contatos/mensagens'
import { filtrarContatos, resumo } from '@/lib/contatos/servico'
import { ehEtapa, ETAPAS } from '@/lib/contatos/types'

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export default async function Contatos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const etapaParam = um(sp.etapa)
  const etapa = ehEtapa(etapaParam) ? etapaParam : undefined
  const busca = um(sp.q).trim()

  const [todos, modelos] = await Promise.all([(await storeDoPainel()).list(), modelosDoPainel()])
  const r = resumo(todos)
  const contatos = filtrarContatos(todos, { etapa, busca })
  const hoje = hojeSP()

  const url = (e?: string) => {
    const p = new URLSearchParams()
    if (e) p.set('etapa', e)
    if (busca) p.set('q', busca)
    const s = p.toString()
    return s ? `/painel/contatos?${s}` : '/painel/contatos'
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
            <p className="pn-eyebrow">Contatos</p>
            <h1>Todos os contatos</h1>
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

        <form className="pn-busca" action="/painel/contatos" role="search">
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
              <Cartao
                key={c.id}
                c={c}
                mensagem={preencher(modelos[c.etapa], c)}
                aviso={c.retomarEm ? `Retomar ${diaMes(c.retomarEm)} · ${relativo(c.retomarEm, hoje)}` : undefined}
                avisoForte={!!c.retomarEm && c.retomarEm <= hoje}
              />
            ))}
          </div>
        )}
      </main>
    </>
  )
}

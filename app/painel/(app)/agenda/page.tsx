import Link from 'next/link'
import { BotoesSituacao } from '@/components/painel/Consultorio'
import { Topo } from '@/components/painel/Topo'
import { consultorioDoPainel, storeDoPainel } from '@/lib/contatos/dados-painel'
import { diaMes, hojeSP, nomeDia, segundaDaSemana, somarDias } from '@/lib/contatos/datas'
import { ehDataValida } from '@/lib/contatos/validacao'
import { consultasDoContrato, horaFim, ordinal } from '@/lib/consultorio/regras'
import { rotuloSituacao, rotuloTipo } from '@/lib/consultorio/tipos'

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export default async function Agenda({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const hoje = hojeSP()
  const ref = ehDataValida(um(sp.semana)) ? um(sp.semana) : hoje
  const seg = segundaDaSemana(ref)
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(seg, i))
  const [contatos, doc] = await Promise.all([(await storeDoPainel()).list(), consultorioDoPainel()])
  const nomes = new Map(contatos.map((c) => [c.id, c.nome]))
  const daSemana = Object.values(doc.consultas)
    .filter((c) => c.data >= dias[0] && c.data <= dias[6])
    .sort((a, b) => `${a.data} ${a.hora}`.localeCompare(`${b.data} ${b.hora}`))
  const aqui = `/painel/agenda?semana=${seg}`
  const ativas = daSemana.filter((c) => c.situacao !== 'desmarcada').length

  return (
    <>
      <Topo />
      <main className="pn-wrap pn-main">
        <div className="pn-hello">
          <div>
            <p className="pn-eyebrow">Agenda</p>
            <h1>{diaMes(dias[0])} – {diaMes(dias[6])}</h1>
            <p>{ativas} {ativas === 1 ? 'consulta' : 'consultas'} nesta semana</p>
          </div>
          <div className="pn-acoes">
            <Link href={`/painel/consulta/nova?data=${seg > hoje ? seg : hoje}&volta=${encodeURIComponent(aqui)}`} className="pn-btn pn-btn-solid">+ Nova consulta</Link>
          </div>
        </div>
        <nav className="pn-semana-nav" aria-label="Semanas">
          <Link href={`/painel/agenda?semana=${somarDias(seg, -7)}`} className="pn-btn" aria-label="Semana anterior">‹</Link>
          <Link href="/painel/agenda" className={`pn-btn${dias.includes(hoje) ? ' pn-btn-solid' : ''}`}>Esta semana</Link>
          <Link href={`/painel/agenda?semana=${somarDias(seg, 7)}`} className="pn-btn" aria-label="Próxima semana">›</Link>
        </nav>

        <div className="pn-dias">
          {dias.map((d) => {
            const doDia = daSemana.filter((c) => c.data === d)
            return (
              <section key={d} className={`pn-dia${d === hoje ? ' hoje' : ''}${d < hoje ? ' passado' : ''}`}>
                <header>
                  <h2>
                    <span>{nomeDia(d)}</span> {diaMes(d)}
                  </h2>
                  {nomeDia(d) === 'segunda' ? <small>dia administrativo</small> : null}
                  <Link href={`/painel/consulta/nova?data=${d}&volta=${encodeURIComponent(aqui)}`} className="pn-link" aria-label={`Agendar em ${diaMes(d)}`}>+ agendar</Link>
                </header>
                {doDia.length === 0 ? <p className="pn-livre">Livre</p> : null}
                <ul>
                  {doDia.map((c) => {
                    const contrato = c.contratoId ? doc.contratos[c.contratoId] : undefined
                    const n = contrato ? ordinal(c, consultasDoContrato(doc, contrato.id)) : null
                    return (
                      <li key={c.id} className={`pn-consulta s-${c.situacao}`}>
                        <div className="pn-consulta-hora">
                          <b>{c.hora}</b>
                          <span>{horaFim(c)}</span>
                        </div>
                        <div className="pn-consulta-info">
                          <Link href={`/painel/contato/${c.contatoId}`} className="pn-consulta-nome">{nomes.get(c.contatoId) ?? 'Contato removido'}</Link>
                          <p>
                            {rotuloTipo(c.tipo)}
                            {n && contrato && contrato.servico.consultas > 1 ? ` ${n}/${contrato.servico.consultas}` : ''} · {c.formato === 'online' ? 'Online' : 'Presencial'}
                            {' · '}<span className={`pn-sit s-${c.situacao}`}>{rotuloSituacao(c.situacao)}</span>
                          </p>
                          {c.situacao !== 'desmarcada' ? <BotoesSituacao key={c.situacao} id={c.id} situacao={c.situacao} /> : null}
                        </div>
                        <Link href={`/painel/consulta/${c.id}?volta=${encodeURIComponent(aqui)}`} className="pn-link pn-consulta-editar">editar</Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      </main>
    </>
  )
}

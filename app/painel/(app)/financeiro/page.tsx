import Link from 'next/link'
import { Recebimento } from '@/components/painel/Consultorio'
import { Topo } from '@/components/painel/Topo'
import { consultorioDoPainel, storeDoPainel } from '@/lib/contatos/dados-painel'
import { dataBR, hojeSP, nomeMes, somarMesAno } from '@/lib/contatos/datas'
import { reais } from '@/lib/consultorio/dinheiro'
import { resumoFinanceiro } from '@/lib/consultorio/regras'
import { rotuloForma } from '@/lib/consultorio/tipos'

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export default async function Financeiro({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const hoje = hojeSP()
  const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(um(sp.mes)) ? um(sp.mes) : hoje.slice(0, 7)
  const [contatos, doc] = await Promise.all([(await storeDoPainel()).list(), consultorioDoPainel()])
  const nomes = new Map(contatos.map((c) => [c.id, c.nome]))
  const r = resumoFinanceiro(doc, mes, hoje)
  const maior = Math.max(...r.meses.map((m) => m.recebido), 1)
  const nome = (id: string) => nomes.get(id) ?? 'Contato removido'

  return (
    <>
      <Topo />
      <main className="pn-wrap pn-main">
        <div className="pn-hello">
          <div>
            <p className="pn-eyebrow">Financeiro</p>
            <h1 style={{ textTransform: 'capitalize' }}>{nomeMes(mes)}</h1>
            <p>Faturamento pelo que entrou no caixa (data do recebimento).</p>
          </div>
        </div>
        <nav className="pn-semana-nav" aria-label="Meses">
          <Link href={`/painel/financeiro?mes=${somarMesAno(mes, -1)}`} className="pn-btn" aria-label="Mês anterior">‹</Link>
          <Link href="/painel/financeiro" className={`pn-btn${mes === hoje.slice(0, 7) ? ' pn-btn-solid' : ''}`}>Este mês</Link>
          <Link href={`/painel/financeiro?mes=${somarMesAno(mes, 1)}`} className="pn-btn" aria-label="Próximo mês">›</Link>
        </nav>

        <div className="pn-resumo pn-resumo-fin">
          <div><b>{reais(r.recebido)}</b><span>recebido no mês</span></div>
          <div><b>{reais(r.aReceber)}</b><span>a receber no mês{r.qtdAReceber ? ` (${r.qtdAReceber})` : ''}</span></div>
          <div className={r.totalAtrasado ? 'alerta' : undefined}><b>{reais(r.totalAtrasado)}</b><span>em atraso (todos os meses)</span></div>
        </div>

        <section className="pn-box">
          <h2>Últimos 6 meses</h2>
          <div className="pn-barras" role="img" aria-label={r.meses.map((m) => `${nomeMes(m.mes)}: ${reais(m.recebido)}`).join('; ')}>
            {r.meses.map((m) => (
              <Link key={m.mes} href={`/painel/financeiro?mes=${m.mes}`} className={`pn-barra${m.mes === mes ? ' on' : ''}`} title={`${nomeMes(m.mes)}: ${reais(m.recebido)}`}>
                <small>{m.recebido ? reais(m.recebido).replace(',00', '') : ''}</small>
                <span style={{ height: `${Math.max((m.recebido / maior) * 100, m.recebido ? 4 : 1)}%` }} />
                <em>{MES_CURTO[Number(m.mes.slice(5, 7)) - 1]}</em>
              </Link>
            ))}
          </div>
        </section>

        <div className="pn-detalhe">
          <div>
            {r.atrasado.length ? (
              <section className="pn-box">
                <h2>Em atraso</h2>
                <ul className="pn-parcelas">
                  {r.atrasado.map(({ contrato, parcela }) => (
                    <li key={`${contrato.id}-${parcela.id}`} className="atrasada">
                      <div>
                        <Link href={`/painel/contato/${contrato.contatoId}`}><b>{nome(contrato.contatoId)}</b></Link>
                        <span>{reais(parcela.valorCentavos)} · venceu {dataBR(parcela.vencimento)} · {rotuloForma(parcela.forma)}</span>
                      </div>
                      <Recebimento contratoId={contrato.id} parcelaId={parcela.id} hoje={hoje} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="pn-box">
              <h2>A receber em {nomeMes(mes).split(' ')[0]}</h2>
              {r.aReceberLista.length ? (
                <ul className="pn-parcelas">
                  {r.aReceberLista.map(({ contrato, parcela, n, de }) => (
                    <li key={`${contrato.id}-${parcela.id}`} className={parcela.vencimento < hoje ? 'atrasada' : undefined}>
                      <div>
                        <Link href={`/painel/contato/${contrato.contatoId}`}><b>{nome(contrato.contatoId)}</b></Link>
                        <span>{reais(parcela.valorCentavos)} · {de > 1 ? `${n}/${de} · ` : ''}vence {dataBR(parcela.vencimento)} · {rotuloForma(parcela.forma)}</span>
                      </div>
                      <Recebimento contratoId={contrato.id} parcelaId={parcela.id} hoje={hoje} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pn-dica" style={{ marginTop: 0 }}>Nada pendente neste mês.</p>
              )}
            </section>

            <section className="pn-box">
              <h2>Recebimentos</h2>
              {r.recebimentos.length ? (
                <ul className="pn-parcelas">
                  {r.recebimentos.map(({ contrato, parcela, n, de }) => (
                    <li key={`${contrato.id}-${parcela.id}`}>
                      <div>
                        <Link href={`/painel/contato/${contrato.contatoId}`}><b>{nome(contrato.contatoId)}</b></Link>
                        <span>{dataBR(parcela.recebidaEm!)} · {contrato.servico.nome}{de > 1 ? ` ${n}/${de}` : ''} · {rotuloForma(parcela.forma)}</span>
                      </div>
                      <b className="pn-valor">{reais(parcela.valorCentavos)}</b>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pn-dica" style={{ marginTop: 0 }}>Nenhum recebimento registrado neste mês.</p>
              )}
            </section>
          </div>
          <div className="pn-lateral">
            <section className="pn-box">
              <h2>Planos fechados no mês</h2>
              {r.porServico.length ? (
                <>
                  <ul className="pn-por-servico">
                    {r.porServico.map((s) => <li key={s.nome}><span>{s.nome} <small>× {s.qtd}</small></span><b>{reais(s.valor)}</b></li>)}
                  </ul>
                  <p className="pn-total"><span>Total vendido</span><b>{reais(r.vendido)}</b></p>
                </>
              ) : (
                <p className="pn-dica" style={{ marginTop: 0 }}>Nenhum plano fechado neste mês.</p>
              )}
              <p className="pn-dica">“Vendido” conta o valor do plano no mês em que foi fechado; o “recebido” acompanha o pagamento de cada parcela.</p>
            </section>
          </div>
        </div>
      </main>
    </>
  )
}

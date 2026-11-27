import Link from 'next/link'
import { agoraSP, dataBR, dataCurta, relativo, somarDias } from '@/lib/contatos/datas'
import type { Contato } from '@/lib/contatos/types'
import { reais } from '@/lib/consultorio/dinheiro'
import {
  checklist, futura, horaFim, ordinal, ROTULO_SITUACAO_CONTRATO, type Andamento,
} from '@/lib/consultorio/regras'
import { rotuloForma, rotuloSituacao, rotuloTipo, type Consulta, type Contrato, type DocConsultorio } from '@/lib/consultorio/tipos'
import { BotoesSituacao, CancelarPlano, EncerrarPlano, ItemChecklist, Recebimento } from './Consultorio'

function LinhaConsulta({ c, doContrato, total, editar, comBotoes }: { c: Consulta; doContrato: Consulta[]; total?: number; editar: string; comBotoes: boolean }) {
  const n = ordinal(c, doContrato)
  return (
    <li className={`pn-consulta s-${c.situacao}`}>
      <div className="pn-consulta-hora">
        <b>{c.data.slice(8, 10)}/{c.data.slice(5, 7)}</b>
        <span>{c.hora}–{horaFim(c)}</span>
      </div>
      <div className="pn-consulta-info">
        <p>
          {rotuloTipo(c.tipo)}{n && total && total > 1 ? ` ${n}/${total}` : ''} · {c.formato === 'online' ? 'Online' : 'Presencial'} ·{' '}
          <span className={`pn-sit s-${c.situacao}`}>{rotuloSituacao(c.situacao)}</span>
        </p>
        {comBotoes && c.situacao !== 'desmarcada' ? <BotoesSituacao key={c.situacao} id={c.id} situacao={c.situacao} /> : null}
      </div>
      <Link href={editar} className="pn-link pn-consulta-editar">editar</Link>
    </li>
  )
}

const resumoServico = (k: Contrato) =>
  `${k.servico.nome} · ${reais(k.valorCentavos)}${k.parcelas.length > 1 ? ` em ${k.parcelas.length}x` : ''}`

export function BlocoPlano({ c, andamento: a, consultas, anteriores, hoje }: {
  c: Contato
  andamento?: Andamento
  consultas: Consulta[]
  anteriores: Contrato[]
  hoje: string
}) {
  const aqui = `/painel/contato/${c.id}`
  const editar = (x: Consulta) => `/painel/consulta/${x.id}?volta=${encodeURIComponent(aqui)}`
  const agendar = `/painel/consulta/nova?contato=${c.id}&volta=${encodeURIComponent(aqui)}`
  const semContrato = consultas.filter((x) => !x.contratoId || !a || x.contratoId !== a.contrato.id)

  if (!a) {
    return (
      <section className="pn-box">
        <h2>Plano</h2>
        <p style={{ marginBottom: 12 }}>Sem plano em andamento.</p>
        <div className="pn-passo-botoes">
          <Link href={`${aqui}/plano`} className="pn-btn pn-btn-solid">Fechar plano</Link>
          <Link href={agendar} className="pn-btn">Agendar consulta</Link>
        </div>
        {semContrato.length ? (
          <>
            <h3 className="pn-sub">Consultas</h3>
            <ul className="pn-lista-consultas">
              {[...semContrato].reverse().map((x) => <LinhaConsulta key={x.id} c={x} doContrato={[]} editar={editar(x)} comBotoes={futura(x)} />)}
            </ul>
          </>
        ) : null}
        <Anteriores anteriores={anteriores} />
      </section>
    )
  }

  const k = a.contrato
  const pendentes = k.parcelas.filter((p) => !p.recebidaEm && !p.dispensadaEm).length
  const ultimaRealizada = [...a.consultas].reverse().find((x) => x.situacao === 'realizada')
  const faltaAgendar = a.realizadas >= 1 && !a.proximas.length && a.realizadas < a.total
  return (
    <section className="pn-box">
      <div className="pn-plano-head">
        <h2>Plano</h2>
        <span className={`pn-sit-plano p-${a.situacao}`}>{ROTULO_SITUACAO_CONTRATO[a.situacao]}</span>
      </div>
      <p className="pn-plano-nome">{resumoServico(k)}</p>
      <dl className="pn-dados pn-dados-linha">
        <div><dt>Consultas</dt><dd>{a.realizadas} de {a.total} realizadas</dd></div>
        <div>
          <dt>Período</dt>
          <dd>{a.inicio && a.fim ? `${dataBR(a.inicio)} → ${dataBR(a.fim)} (${hoje > a.fim ? 'terminou' : 'termina'} ${relativo(a.fim, hoje)})` : 'Começa a contar na 1ª consulta realizada'}</dd>
        </div>
      </dl>
      {faltaAgendar && ultimaRealizada ? (
        <p className="pn-aviso forte" style={{ marginTop: 10 }}>
          Agendar o próximo retorno: entre {dataBR(somarDias(ultimaRealizada.data, 30))} e {dataBR(somarDias(ultimaRealizada.data, 45))}
        </p>
      ) : null}

      <h3 className="pn-sub">Consultas</h3>
      {a.consultas.length ? (
        <ul className="pn-lista-consultas">
          {a.consultas.map((x) => <LinhaConsulta key={x.id} c={x} doContrato={a.consultas} total={a.total} editar={editar(x)} comBotoes={x.data <= somarDias(hoje, 1) || futura(x)} />)}
        </ul>
      ) : (
        <p className="pn-dica" style={{ marginTop: 0 }}>Nenhuma consulta ainda.</p>
      )}
      <Link href={agendar} className="pn-btn pn-btn-sm" style={{ marginTop: 10 }}>+ Agendar consulta</Link>

      <h3 className="pn-sub">Pagamento</h3>
      <ul className="pn-parcelas">
        {k.parcelas.map((p, i) => (
          <li key={p.id} className={p.dispensadaEm ? 'dispensada' : !p.recebidaEm && p.vencimento < hoje ? 'atrasada' : undefined}>
            <div>
              <b>{reais(p.valorCentavos)}</b>
              <span>
                {k.parcelas.length > 1 ? `${i + 1}ª · ` : ''}
                {p.recebidaEm ? rotuloForma(p.forma) : `vence ${dataBR(p.vencimento)} · ${rotuloForma(p.forma)}`}
                {p.dispensadaEm ? ' · não será recebida' : ''}
              </span>
            </div>
            {p.dispensadaEm ? null : <Recebimento key={p.recebidaEm ?? 'pendente'} contratoId={k.id} parcelaId={p.id} recebidaEm={p.recebidaEm} hoje={hoje} />}
          </li>
        ))}
      </ul>

      <div className="pn-plano-acoes">
        <Link href={`${aqui}/plano?renovar=${k.id}`} className="pn-btn">Renovar</Link>
        <details className="pn-details pn-details-sm">
          <summary>Encerrar acompanhamento</summary>
          <EncerrarPlano contratoId={k.id} />
        </details>
        <details className="pn-details pn-details-sm">
          <summary>Cancelar plano</summary>
          <CancelarPlano contratoId={k.id} pendentes={pendentes} />
        </details>
      </div>
      {semContrato.length ? (
        <details className="pn-details pn-details-sm">
          <summary>Consultas fora do plano ({semContrato.length})</summary>
          <ul className="pn-lista-consultas">
            {semContrato.map((x) => <LinhaConsulta key={x.id} c={x} doContrato={[]} editar={editar(x)} comBotoes={false} />)}
          </ul>
        </details>
      ) : null}
      <Anteriores anteriores={anteriores} />
    </section>
  )
}

function Anteriores({ anteriores }: { anteriores: Contrato[] }) {
  if (!anteriores.length) return null
  return (
    <details className="pn-details pn-details-sm">
      <summary>Planos anteriores ({anteriores.length})</summary>
      <ul className="pn-anteriores">
        {anteriores.map((k) => (
          <li key={k.id}>
            <b>{resumoServico(k)}</b>
            <span>
              Fechado em {dataBR(k.criadoEm.slice(0, 10))} · {k.canceladoEm ? `cancelado em ${dataBR(k.canceladoEm)}` : `encerrado em ${dataBR(k.encerradoEm!)}`}
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}

export function BlocoChecklist({ doc, andamento: a, hoje }: { doc: DocConsultorio; andamento: Andamento; hoje: string }) {
  const fases = checklist(doc, a, hoje, agoraSP())
  if (!fases.length) return null
  const atual = fases.findIndex((f) => !f.concluida)
  return (
    <section className="pn-box">
      <h2>Checklist</h2>
      {a.contrato.inicioManual ? <p className="pn-dica" style={{ marginTop: -6 }}>Acompanhamento que já estava em andamento: etapas iniciais consideradas concluídas.</p> : null}
      {fases.map((f, i) => {
        const feitos = f.itens.filter((x) => x.feito).length
        return (
          <details key={`${f.fase}-${f.consulta?.id ?? ''}`} className={`pn-fase${f.concluida ? ' ok' : ''}${f.atrasada ? ' atrasada' : ''}`} open={!f.concluida && (i === atual || f.relevante)}>
            <summary>
              <span>{f.concluida ? '✓ ' : ''}{f.titulo}</span>
              <small>
                {feitos}/{f.itens.length}
                {f.prazo && !f.concluida ? ` · até ${dataCurta(f.prazo.slice(0, 10))} ${f.prazo.slice(11)}` : ''}
              </small>
            </summary>
            <ul>
              {f.itens.map((it) => <ItemChecklist key={`${it.chave}-${it.feito}`} contratoId={a.contrato.id} chave={it.chave} texto={it.texto} feito={it.feito} auto={it.auto} />)}
            </ul>
          </details>
        )
      })}
    </section>
  )
}

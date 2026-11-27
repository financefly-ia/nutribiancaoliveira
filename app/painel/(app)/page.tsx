import Link from 'next/link'
import { Cartao, CartaoItem } from '@/components/painel/Cartao'
import { BotoesSituacao } from '@/components/painel/Consultorio'
import { Topo } from '@/components/painel/Topo'
import { consultorioDoPainel, modelosDoPainel, storeDoPainel } from '@/lib/contatos/dados-painel'
import { agoraSP, dataBR, dataCurta, diaMes, diasEntre, hojeSP, idadeNoAniversario, relativo } from '@/lib/contatos/datas'
import { preencher } from '@/lib/contatos/mensagens'
import { agendaDoDia, resumo } from '@/lib/contatos/servico'
import type { Contato } from '@/lib/contatos/types'
import { reais } from '@/lib/consultorio/dinheiro'
import { extrasConsulta, extrasParcela } from '@/lib/consultorio/extras'
import { horaFim, itensDoHoje, ROTULO_SITUACAO_CONTRATO } from '@/lib/consultorio/regras'
import { rotuloTipo } from '@/lib/consultorio/tipos'

function saudacao(agora: Date) {
  const h = Number(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23' }).format(agora))
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

const dataExtenso = (agora: Date) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' }).format(agora)

function Secao({ titulo, descricao, qtd, children }: { titulo: string; descricao: string; qtd: number; children: React.ReactNode }) {
  return (
    <section className="pn-secao">
      <div className="pn-secao-head">
        <h2>{titulo} <span>{qtd}</span></h2>
        <p>{descricao}</p>
      </div>
      <div className="pn-cards">{children}</div>
    </section>
  )
}

export default async function Hoje() {
  const agora = new Date()
  const hoje = hojeSP(agora)
  const [todos, modelos, doc] = await Promise.all([(await storeDoPainel()).list(), modelosDoPainel(), consultorioDoPainel()])
  const a = agendaDoDia(todos, hoje)
  const r = resumo(todos, agora)
  const h = itensDoHoje(doc, hoje, agoraSP(agora))
  const porId = new Map(todos.map((c) => [c.id, c]))
  const ct = (id: string): Contato | undefined => porId.get(id)
  const consultasHoje = h.consultas.filter((x) => x.consulta.data === hoje)
  const atrasos = h.entregasAtrasadas.length + h.parcelas.length
  const nada =
    !a.retomar.length && !a.novos.length && !a.aniversariantes.length && !a.proximos.length && !h.consultas.length && !atrasos &&
    !h.pendencias.length && !h.retornos.length && !h.terminando.length && !h.renovacaoAvulsa.length

  return (
    <>
      <Topo />
      <main className="pn-wrap pn-main">
        <div className="pn-hello">
          <div>
            <p className="pn-eyebrow">{dataExtenso(agora)}</p>
            <h1>{saudacao(agora)}, Bianca</h1>
            <p>
              {r.total} {r.total === 1 ? 'contato' : 'contatos'} · {r.porEtapa.paciente} {r.porEtapa.paciente === 1 ? 'paciente' : 'pacientes'} · +{r.siteUltimos7Dias} pelo site nesta semana
            </p>
          </div>
          <div className="pn-acoes">
            <Link href="/painel/novo" className="pn-btn pn-btn-solid">+ Novo contato</Link>
          </div>
        </div>

        <div className="pn-resumo">
          <div><b>{consultasHoje.length}</b><span>{consultasHoje.length === 1 ? 'consulta hoje' : 'consultas hoje'}</span></div>
          <div><b>{h.pendencias.length}</b><span>{h.pendencias.length === 1 ? 'paciente com pendência' : 'pacientes com pendências'}</span></div>
          <div><b>{a.retomar.length + a.novos.length}</b><span>leads para responder</span></div>
        </div>

        {nada ? (
          <div className="pn-vazio">
            <svg viewBox="0 0 100 100" aria-hidden="true"><use href="#folha" /></svg>
            <p>Tudo em dia por aqui. Quando marcar uma data para retomar uma conversa, ela aparece nesta tela.</p>
          </div>
        ) : null}

        {h.consultas.length ? (
          <Secao titulo="Consultas" descricao="Hoje e amanhã. A mensagem de confirmação já vai com data e horário." qtd={h.consultas.length}>
            {h.consultas.map(({ consulta: x, ordem, total }) => {
              const c = ct(x.contatoId)
              return (
                <CartaoItem
                  key={x.id}
                  href={`/painel/contato/${x.contatoId}`}
                  titulo={c?.nome ?? 'Contato removido'}
                  meta={`${x.data === hoje ? 'Hoje' : 'Amanhã'} · ${x.hora}–${horaFim(x)} · ${rotuloTipo(x.tipo)}${ordem && total && total > 1 ? ` ${ordem}/${total}` : ''} · ${x.formato === 'online' ? 'Online' : 'Presencial'}`}
                  whatsapp={c?.whatsapp}
                  mensagem={c ? preencher(modelos.confirmacao, c, extrasConsulta(x)) : undefined}
                  acoes={<BotoesSituacao key={x.situacao} id={x.id} situacao={x.situacao} />}
                />
              )
            })}
          </Secao>
        ) : null}

        {atrasos ? (
          <Secao titulo="Atrasos" descricao="Entregas que passaram das 48h e pagamentos vencidos ou que vencem hoje." qtd={atrasos}>
            {h.entregasAtrasadas.map(({ andamento: x, prazo }) => (
              <CartaoItem
                key={`e-${x.contrato.id}`}
                href={`/painel/contato/${x.contrato.contatoId}`}
                titulo={ct(x.contrato.contatoId)?.nome ?? 'Contato removido'}
                meta={`${x.contrato.servico.nome} · entrega do plano alimentar`}
                aviso={`Prazo era ${dataCurta(prazo.slice(0, 10))} ${prazo.slice(11)}`}
                avisoForte
              />
            ))}
            {h.parcelas.map(({ contrato, parcela, atrasada }) => {
              const c = ct(contrato.contatoId)
              return (
                <CartaoItem
                  key={`p-${contrato.id}-${parcela.id}`}
                  href={`/painel/contato/${contrato.contatoId}`}
                  titulo={c?.nome ?? 'Contato removido'}
                  meta={`${reais(parcela.valorCentavos)} · ${contrato.servico.nome}`}
                  whatsapp={c?.whatsapp}
                  mensagem={c ? preencher(modelos.pagamento, c, extrasParcela(parcela)) : undefined}
                  aviso={atrasada ? `Venceu ${relativo(parcela.vencimento, hoje)} (${dataBR(parcela.vencimento)})` : 'Vence hoje'}
                  avisoForte={atrasada}
                />
              )
            })}
          </Secao>
        ) : null}

        {h.pendencias.length ? (
          <Secao titulo="Pendências do acompanhamento" descricao="Itens do checklist que faltam na fase atual de cada paciente." qtd={h.pendencias.length}>
            {h.pendencias.map(({ andamento: x, fases }) => (
              <CartaoItem key={x.contrato.id} href={`/painel/contato/${x.contrato.contatoId}`} titulo={ct(x.contrato.contatoId)?.nome ?? 'Contato removido'} meta={x.contrato.servico.nome}>
                <ul className="pn-pend">
                  {fases.map((f) => (
                    <li key={f.titulo}>
                      <b>{f.titulo}:</b> {f.faltam.slice(0, 3).join(' · ')}{f.faltam.length > 3 ? ` · +${f.faltam.length - 3}` : ''}
                    </li>
                  ))}
                </ul>
              </CartaoItem>
            ))}
          </Secao>
        ) : null}

        {h.retornos.length ? (
          <Secao titulo="Retornos a agendar" descricao="Pacientes com consultas no plano e nenhuma marcada. Sugestão: 30 dias depois da última." qtd={h.retornos.length}>
            {h.retornos.map(({ andamento: x, sugerida }) => (
              <CartaoItem
                key={x.contrato.id}
                href={`/painel/contato/${x.contrato.contatoId}`}
                titulo={ct(x.contrato.contatoId)?.nome ?? 'Contato removido'}
                meta={`${x.contrato.servico.nome} · ${x.realizadas} de ${x.total} realizadas`}
                aviso={`Sugestão: ${dataCurta(sugerida)}`}
                acoes={
                  <Link href={`/painel/consulta/nova?contato=${x.contrato.contatoId}&data=${sugerida}&volta=/painel`} className="pn-btn">
                    Agendar
                  </Link>
                }
              />
            ))}
          </Secao>
        ) : null}

        {h.terminando.length || h.renovacaoAvulsa.length ? (
          <Secao titulo="Encerramento e renovação" descricao="Planos nos últimos 10 dias ou com prazo encerrado, e avulsas no fim do ciclo de 30 dias." qtd={h.terminando.length + h.renovacaoAvulsa.length}>
            {h.terminando.map((x) => (
              <CartaoItem
                key={x.contrato.id}
                href={`/painel/contato/${x.contrato.contatoId}`}
                titulo={ct(x.contrato.contatoId)?.nome ?? 'Contato removido'}
                meta={`${x.contrato.servico.nome} · ${x.realizadas} de ${x.total} consultas`}
                aviso={x.situacao === 'vencido' ? `${ROTULO_SITUACAO_CONTRATO.vencido}: encerrar ou renovar` : `Termina ${relativo(x.fim!, hoje)} (${dataBR(x.fim!)})`}
                avisoForte={x.situacao === 'vencido'}
              />
            ))}
            {h.renovacaoAvulsa.map(({ andamento: x, dia }) => {
              const c = ct(x.contrato.contatoId)
              return (
                <CartaoItem
                  key={x.contrato.id}
                  href={`/painel/contato/${x.contrato.contatoId}`}
                  titulo={c?.nome ?? 'Contato removido'}
                  meta={`${x.contrato.servico.nome} · dia ${dia} de 30`}
                  whatsapp={c?.whatsapp}
                  mensagem={c ? preencher(modelos.renovacao_avulsa, c) : undefined}
                  aviso="Último check-in e conversa sobre continuidade"
                />
              )
            })}
          </Secao>
        ) : null}

        {a.retomar.length ? (
          <Secao titulo="Para retomar" descricao="Conversas que você marcou para hoje ou que ficaram para trás." qtd={a.retomar.length}>
            {a.retomar.map((c) => (
              <Cartao
                key={c.id}
                c={c}
                objetivo={false}
                mensagem={preencher(modelos[c.etapa], c)}
                aviso={c.retomarEm === hoje ? 'Retomar hoje' : `Atrasado · era ${relativo(c.retomarEm!, hoje)}`}
                avisoForte={c.retomarEm! < hoje}
              />
            ))}
          </Secao>
        ) : null}

        {a.novos.length ? (
          <Secao titulo="Novos na lista de espera" descricao="Ainda sem nenhum contato seu. Os que esperam há mais tempo aparecem primeiro." qtd={a.novos.length}>
            {a.novos.map((c) => {
              const dias = diasEntre(hojeSP(new Date(c.criadoEm)), hoje)
              return (
                <Cartao
                  key={c.id}
                  c={c}
                  mensagem={preencher(modelos[c.etapa], c)}
                  aviso={dias === 0 ? 'Entrou hoje' : `Esperando há ${dias} ${dias === 1 ? 'dia' : 'dias'}`}
                  avisoForte={dias >= 3}
                />
              )
            })}
          </Secao>
        ) : null}

        {a.aniversariantes.length ? (
          <Secao titulo="Aniversários" descricao="Nos próximos 7 dias. Uma mensagem nesse dia faz diferença." qtd={a.aniversariantes.length}>
            {a.aniversariantes.map(({ contato: c, emDias }) => (
              <Cartao
                key={c.id}
                c={c}
                objetivo={false}
                mensagem={preencher(modelos.aniversario, c)}
                aviso={`${emDias === 0 ? 'Hoje!' : emDias === 1 ? 'Amanhã' : `Em ${emDias} dias`} · faz ${idadeNoAniversario(c.nascimento!, hoje)} anos`}
                avisoForte={emDias === 0}
              />
            ))}
          </Secao>
        ) : null}

        {a.proximos.length ? (
          <Secao titulo="Próximos dias" descricao="Retomadas marcadas para esta semana." qtd={a.proximos.length}>
            {a.proximos.map((c) => (
              <Cartao key={c.id} c={c} objetivo={false} mensagem={preencher(modelos[c.etapa], c)} aviso={`${diaMes(c.retomarEm!)} · ${relativo(c.retomarEm!, hoje)}`} />
            ))}
          </Secao>
        ) : null}
      </main>
    </>
  )
}

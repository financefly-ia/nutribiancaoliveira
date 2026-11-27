import Link from 'next/link'
import { Cartao } from '@/components/painel/Cartao'
import { Topo } from '@/components/painel/Topo'
import { modelosDoPainel, storeDoPainel } from '@/lib/contatos/dados-painel'
import { diaMes, diasEntre, hojeSP, idadeNoAniversario, relativo } from '@/lib/contatos/datas'
import { preencher } from '@/lib/contatos/mensagens'
import { agendaDoDia, resumo } from '@/lib/contatos/servico'

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
  const [todos, modelos] = await Promise.all([(await storeDoPainel()).list(), modelosDoPainel()])
  const a = agendaDoDia(todos, hoje)
  const r = resumo(todos, agora)
  const nada = !a.retomar.length && !a.novos.length && !a.aniversariantes.length && !a.proximos.length

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
          <div><b>{a.retomar.length}</b><span>para retomar</span></div>
          <div><b>{a.novos.length}</b><span>novos sem contato</span></div>
          <div><b>{a.aniversariantes.length}</b><span>{a.aniversariantes.length === 1 ? 'aniversário' : 'aniversários'} na semana</span></div>
        </div>

        {nada ? (
          <div className="pn-vazio">
            <svg viewBox="0 0 100 100" aria-hidden="true"><use href="#folha" /></svg>
            <p>Tudo em dia por aqui. Quando marcar uma data para retomar uma conversa, ela aparece nesta tela.</p>
          </div>
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

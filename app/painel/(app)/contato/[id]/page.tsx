import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/painel/Badge'
import { FollowChip } from '@/components/painel/Cartao'
import { EditarDados, Mensagem, NovaNota, ProximoPasso, SeletorEtapa } from '@/components/painel/Formularios'
import { Topo } from '@/components/painel/Topo'
import { modelosDoPainel, storeDoPainel } from '@/lib/contatos/dados-painel'
import { diaMes, diasAteAniversario, hojeSP, idadeAtual, relativo } from '@/lib/contatos/datas'
import { formatarData, formatarDataHora, formatarWhatsapp } from '@/lib/contatos/formatar'
import { rotuloEtapa, rotuloOrigem, type Contato } from '@/lib/contatos/types'

type Item = { em: string; titulo: string; texto?: string; tipo: 'nota' | 'etapa' | 'contato' | 'entrada' }

function historico(c: Contato): Item[] {
  const itens: Item[] = [
    ...c.notas.map((n) => ({ em: n.criadoEm, tipo: 'nota' as const, titulo: 'Anotação', texto: n.texto })),
    ...(c.eventos ?? []).map((e): Item =>
      e.tipo === 'etapa'
        ? { em: e.em, tipo: 'etapa', titulo: `${rotuloEtapa(e.de)} → ${rotuloEtapa(e.para)}` }
        : { em: e.em, tipo: 'contato', titulo: 'Contato feito' },
    ),
    {
      em: c.criadoEm,
      tipo: 'entrada',
      titulo: c.origem === 'site' ? 'Entrou na lista de espera pelo site' : `Cadastro manual (${rotuloOrigem(c.origem)})`,
    },
  ]
  return itens.sort((a, b) => b.em.localeCompare(a.em))
}

export default async function ContatoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const store = await storeDoPainel()
  let c
  try {
    c = await store.get(id)
  } catch {
    c = null
  }
  if (!c) notFound()
  const modelos = await modelosDoPainel()
  const hoje = hojeSP()
  const niver = c.nascimento ? diasAteAniversario(c.nascimento, hoje) : null

  return (
    <>
      <Topo />
      <main className="pn-wrap pn-main">
        <Link href="/painel/contatos" className="pn-voltar">← Contatos</Link>
        <div className="pn-detalhe">
          <div>
            <section className="pn-box pn-head">
              <div className="pn-head-chips">
                <Badge etapa={c.etapa} />
                <FollowChip c={c} />
              </div>
              <h1>{c.nome}</h1>
              {c.retomarEm ? (
                <p className={`pn-aviso${c.retomarEm <= hoje ? ' forte' : ''}`}>
                  Retomar {diaMes(c.retomarEm)} · {relativo(c.retomarEm, hoje)}
                </p>
              ) : null}
              <dl className="pn-dados">
                <div><dt>WhatsApp</dt><dd>{formatarWhatsapp(c.whatsapp)}</dd></div>
                {c.email ? <div><dt>E-mail</dt><dd><a href={`mailto:${c.email}`}>{c.email}</a></dd></div> : null}
                {c.objetivo ? <div><dt>Objetivo</dt><dd>{c.objetivo}</dd></div> : null}
                {c.nascimento ? (
                  <div>
                    <dt>Nascimento</dt>
                    <dd>
                      {formatarData(`${c.nascimento}T12:00:00Z`)} · {idadeAtual(c.nascimento, hoje)} anos
                      {niver === 0 ? ' · 🎂 aniversário hoje!' : niver !== null && niver <= 7 ? ` · 🎂 aniversário em ${niver} ${niver === 1 ? 'dia' : 'dias'}` : ''}
                    </dd>
                  </div>
                ) : null}
                <div><dt>Origem</dt><dd>{rotuloOrigem(c.origem)}</dd></div>
                <div><dt>Entrou em</dt><dd>{formatarDataHora(c.criadoEm)}</dd></div>
                {c.consentimentoEm ? <div><dt>Consentimento LGPD</dt><dd>{formatarDataHora(c.consentimentoEm)}</dd></div> : null}
              </dl>
            </section>

            <section className="pn-box">
              <h2>Mandar mensagem</h2>
              <Mensagem c={c} modelos={modelos} inicial={niver === 0 ? 'aniversario' : c.etapa} />
            </section>

            <section className="pn-box">
              <h2>Próximo passo</h2>
              <ProximoPasso id={c.id} sugestao={c.etapa === 'lista' ? '2' : '7'} />
            </section>

            <section className="pn-box">
              <h2>Histórico</h2>
              <NovaNota id={c.id} />
              <ul className="pn-notas">
                {historico(c).map((it, i) => (
                  <li key={`${it.em}-${i}`} className={`pn-h-${it.tipo}`}>
                    <time dateTime={it.em}>{formatarDataHora(it.em)}</time>
                    <p>
                      <b>{it.titulo}</b>
                      {it.texto ? <><br />{it.texto}</> : null}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="pn-lateral">
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

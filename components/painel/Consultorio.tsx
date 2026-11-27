'use client'
import { useActionState, useMemo, useState, useTransition } from 'react'
import {
  cancelarAction, encerrarAction, fecharPlanoAction, marcarItemAction, recebimentoAction, salvarChecklistsAction, salvarConsultaAction,
  salvarServicosAction, situacaoAction,
} from '@/app/painel/(app)/acoes-consultorio'
import type { EstadoForm } from '@/app/painel/(app)/actions'
import { dataBR, diaDaSemana, somarMeses } from '@/lib/contatos/datas'
import { dividir, lerReais, reais, reaisCampo } from '@/lib/consultorio/dinheiro'
import {
  FASES, FORMAS, SITUACOES, TIPOS, type Fase, type ItemModelo, type Servico, type SituacaoConsulta,
} from '@/lib/consultorio/tipos'

const Erro = ({ e }: { e?: string }) => (e ? <p className="pn-erro" role="alert">{e}</p> : null)
const SEM_CONEXAO = 'Sem conexão. Verifique a internet e tente de novo.'

/** Roda uma action que devolve mensagem de erro (ou null). */
function useAcao() {
  const [erro, setErro] = useState('')
  const [pendente, start] = useTransition()
  const rodar = (fn: () => Promise<string | null>, desfazer?: () => void) => {
    setErro('')
    start(async () => {
      let msg: string | null
      try {
        msg = await fn()
      } catch {
        msg = SEM_CONEXAO
      }
      if (msg) {
        desfazer?.()
        setErro(msg)
      }
    })
  }
  return { erro, pendente, rodar }
}

// ---------- consultas ----------

export type InicialConsulta = {
  id?: string
  contatoId?: string
  data: string
  hora: string
  duracao: string
  formato: string
  tipo: string
  situacao?: SituacaoConsulta
}

export function FormConsulta({ contatos, inicial, volta, nomeFixo }: {
  contatos: { id: string; nome: string }[]
  inicial: InicialConsulta
  volta: string
  /** Edição: o paciente não muda. */
  nomeFixo?: string
}) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(salvarConsultaAction, {})
  const v = { ...inicial, ...(estado.valores ?? {}) } as InicialConsulta & Record<string, string>
  const [data, setData] = useState(v.data)
  const conflito = estado.erros?.conflito
  return (
    <form action={acao} key={estado.versao ?? 0} className="pn-box">
      {inicial.id ? <input type="hidden" name="id" value={inicial.id} /> : null}
      <input type="hidden" name="volta" value={volta} />
      {conflito ? <input type="hidden" name="forcar" value="1" /> : null}
      {nomeFixo ? (
        <>
          <input type="hidden" name="contatoId" value={v.contatoId} />
          <p className="pn-label">Paciente</p>
          <p style={{ marginBottom: 18, fontSize: '1.05rem', color: 'var(--marrom)' }}>{nomeFixo}</p>
        </>
      ) : (
        <div className="pn-field">
          <label htmlFor="contatoId" className="pn-label">Paciente *</label>
          <select id="contatoId" name="contatoId" className="pn-select" defaultValue={v.contatoId ?? ''} required>
            <option value="" disabled>Escolha…</option>
            {contatos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <Erro e={estado.erros?.contatoId} />
        </div>
      )}
      <div className="pn-grid2">
        <div className="pn-field">
          <label htmlFor="data" className="pn-label">Data *</label>
          <input id="data" name="data" type="date" className="pn-input" required value={data} onChange={(e) => setData(e.target.value)} />
          {data && diaDaSemana(data) === 1 ? <p className="pn-dica" style={{ marginTop: 6 }}>Segunda é o seu dia administrativo.</p> : null}
          <Erro e={estado.erros?.data} />
        </div>
        <div className="pn-field">
          <label htmlFor="hora" className="pn-label">Horário *</label>
          <input id="hora" name="hora" type="time" step={300} className="pn-input" required defaultValue={v.hora} />
          <Erro e={estado.erros?.hora} />
        </div>
      </div>
      <div className="pn-grid2">
        <div className="pn-field">
          <label htmlFor="duracao" className="pn-label">Duração</label>
          <select id="duracao" name="duracao" className="pn-select" defaultValue={v.duracao}>
            {[30, 45, 60, 75, 90, 120].map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}` : ''}`}</option>)}
          </select>
        </div>
        <fieldset className="pn-field pn-radios">
          <legend className="pn-label">Formato</legend>
          {(['online', 'presencial'] as const).map((f) => (
            <label key={f}>
              <input type="radio" name="formato" value={f} defaultChecked={v.formato === f} required /> {f === 'online' ? 'Online' : 'Presencial'}
            </label>
          ))}
          <Erro e={estado.erros?.formato} />
        </fieldset>
      </div>
      <div className="pn-grid2">
        <div className="pn-field">
          <label htmlFor="tipo" className="pn-label">Tipo</label>
          <select id="tipo" name="tipo" className="pn-select" defaultValue={v.tipo}>
            {!inicial.id ? <option value="">Automático (pela ordem do plano)</option> : null}
            {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
          </select>
        </div>
        {inicial.id ? (
          <div className="pn-field">
            <label htmlFor="situacao" className="pn-label">Situação</label>
            <select id="situacao" name="situacao" className="pn-select" defaultValue={v.situacao}>
              {SITUACOES.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
            </select>
          </div>
        ) : null}
      </div>
      {conflito ? <p className="pn-aviso forte" role="alert" style={{ marginBottom: 12 }}>{conflito}</p> : null}
      <Erro e={estado.erros?.geral ?? estado.erros?.duracao ?? estado.erros?.tipo ?? estado.erros?.situacao} />
      <button className="pn-btn pn-btn-solid pn-full" disabled={pendente}>
        {pendente ? 'Salvando…' : conflito ? 'Salvar mesmo assim' : inicial.id ? 'Salvar alterações' : 'Agendar consulta'}
      </button>
    </form>
  )
}

const ACOES_SITUACAO: { valor: SituacaoConsulta; rotulo: string }[] = [
  { valor: 'confirmada', rotulo: 'Confirmada' },
  { valor: 'realizada', rotulo: 'Realizada' },
  { valor: 'faltou', rotulo: 'Faltou' },
]

/** Botões rápidos para a situação da consulta (Hoje, agenda e paciente). */
export function BotoesSituacao({ id, situacao }: { id: string; situacao: SituacaoConsulta }) {
  const [atual, setAtual] = useState(situacao)
  const { erro, pendente, rodar } = useAcao()
  return (
    <div className="pn-situacoes">
      {ACOES_SITUACAO.map((s) => (
        <button
          key={s.valor}
          type="button"
          className={atual === s.valor ? 'on' : undefined}
          aria-pressed={atual === s.valor}
          disabled={pendente}
          onClick={() => {
            const anterior = atual
            const nova = atual === s.valor ? 'agendada' : s.valor
            setAtual(nova)
            rodar(() => situacaoAction(id, nova), () => setAtual(anterior))
          }}
        >
          {s.rotulo}
        </button>
      ))}
      <Erro e={erro} />
    </div>
  )
}

// ---------- parcelas ----------

export function Recebimento({ contratoId, parcelaId, recebidaEm, hoje }: { contratoId: string; parcelaId: string; recebidaEm?: string; hoje: string }) {
  const [data, setData] = useState(hoje)
  const { erro, pendente, rodar } = useAcao()
  if (recebidaEm) {
    return (
      <div className="pn-receb">
        <span className="pn-ok-chip">Recebida {dataBR(recebidaEm)}</span>
        <button type="button" className="pn-link" disabled={pendente} onClick={() => rodar(() => recebimentoAction(contratoId, parcelaId, ''))}>
          desfazer
        </button>
        <Erro e={erro} />
      </div>
    )
  }
  return (
    <div className="pn-receb">
      <input type="date" className="pn-input pn-input-sm" value={data} max={hoje} onChange={(e) => setData(e.target.value)} aria-label="Data do recebimento" />
      <button type="button" className="pn-btn pn-btn-sm" disabled={pendente || !data} onClick={() => rodar(() => recebimentoAction(contratoId, parcelaId, data))}>
        {pendente ? '…' : 'Recebi'}
      </button>
      <Erro e={erro} />
    </div>
  )
}

// ---------- checklist ----------

export function ItemChecklist({ contratoId, chave, texto, feito, auto }: { contratoId: string; chave: string; texto: string; feito: boolean; auto: boolean }) {
  const [marcado, setMarcado] = useState(feito)
  const { erro, pendente, rodar } = useAcao()
  return (
    <li className={`pn-check${marcado ? ' feito' : ''}${auto ? ' auto' : ''}`}>
      <label>
        <input
          type="checkbox"
          checked={marcado}
          disabled={auto || pendente}
          onChange={(e) => {
            const v = e.target.checked
            setMarcado(v)
            rodar(() => marcarItemAction(contratoId, chave, v), () => setMarcado(!v))
          }}
        />
        <span>{texto}{auto ? <small> · automático</small> : null}</span>
      </label>
      <Erro e={erro} />
    </li>
  )
}

// ---------- fechar plano ----------

export function FecharPlano({ contatoId, servicos, chave, hoje, renovarDe, valores }: {
  contatoId: string
  servicos: Servico[]
  chave: string
  hoje: string
  renovarDe?: string
  valores?: Record<string, string>
}) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(fecharPlanoAction, {})
  const v = { ...valores, ...(estado.valores ?? {}) }
  const [servicoId, setServicoId] = useState(v.servicoId ?? servicos[0]?.id ?? '')
  const [valor, setValor] = useState(v.valor ?? reaisCampo(servicos.find((s) => s.id === servicoId)?.valorCentavos ?? 0))
  const [parcelas, setParcelas] = useState(v.parcelas ?? '1')
  const [primeiro, setPrimeiro] = useState(v.primeiroVencimento ?? hoje)
  const [forma, setForma] = useState(v.forma ?? 'pix')
  const [emAndamento, setEmAndamento] = useState(v.emAndamento === '1')
  const previa = useMemo(() => {
    const c = lerReais(valor)
    const n = Number(parcelas)
    if (!c || !primeiro) return []
    return dividir(c, n).map((x, i) => ({ valor: x, venc: somarMeses(primeiro, i) }))
  }, [valor, parcelas, primeiro])

  return (
    <form action={acao} className="pn-box">
      <input type="hidden" name="chave" value={chave} />
      <input type="hidden" name="contatoId" value={contatoId} />
      {renovarDe ? <input type="hidden" name="renovarDe" value={renovarDe} /> : null}
      <fieldset className="pn-field">
        <legend className="pn-label">Serviço *</legend>
        <div className="pn-servicos">
          {servicos.map((s) => (
            <label key={s.id} className={servicoId === s.id ? 'on' : undefined}>
              <input
                type="radio"
                name="servicoId"
                value={s.id}
                checked={servicoId === s.id}
                onChange={() => {
                  setServicoId(s.id)
                  setValor(reaisCampo(s.valorCentavos))
                }}
              />
              <b>{s.nome}</b>
              <span>{reais(s.valorCentavos)} · {s.consultas} {s.consultas === 1 ? 'consulta' : 'consultas'} · {'dias' in s.prazo ? `${s.prazo.dias} dias` : `${s.prazo.meses} meses`}</span>
            </label>
          ))}
        </div>
        <Erro e={estado.erros?.servicoId} />
      </fieldset>
      <div className="pn-grid2">
        <div className="pn-field">
          <label htmlFor="valor" className="pn-label">Valor (R$) *</label>
          <input id="valor" name="valor" className="pn-input" inputMode="decimal" required value={valor} onChange={(e) => setValor(e.target.value)} />
          <Erro e={estado.erros?.valor} />
        </div>
        <div className="pn-field">
          <label htmlFor="forma" className="pn-label">Forma de pagamento</label>
          <select id="forma" name="forma" className="pn-select" value={forma} onChange={(e) => setForma(e.target.value)}>
            {FORMAS.map((f) => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
          </select>
        </div>
      </div>
      <div className="pn-grid2">
        <div className="pn-field">
          <label htmlFor="parcelas" className="pn-label">{forma === 'cartao' ? 'Como você recebe' : 'Parcelas'}</label>
          <select id="parcelas" name="parcelas" className="pn-select" value={parcelas} onChange={(e) => setParcelas(e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {forma === 'cartao' ? (n === 1 ? 'Tudo de uma vez' : `Mês a mês (${n}x)`) : n === 1 ? 'À vista' : `${n} parcelas`}
              </option>
            ))}
          </select>
          <Erro e={estado.erros?.parcelas} />
        </div>
        <div className="pn-field">
          <label htmlFor="primeiroVencimento" className="pn-label">{parcelas === '1' ? 'Data do pagamento' : '1º vencimento'}</label>
          <input id="primeiroVencimento" name="primeiroVencimento" type="date" className="pn-input" required value={primeiro} onChange={(e) => setPrimeiro(e.target.value)} />
          <Erro e={estado.erros?.primeiroVencimento} />
        </div>
      </div>
      {forma === 'cartao' ? (
        <p className="pn-dica" style={{ marginTop: -8, marginBottom: 14 }}>
          Se a maquininha antecipa, escolha “tudo de uma vez”. Parcelas de cartão não geram lembrete de cobrança para o paciente.
        </p>
      ) : null}
      {previa.length > 1 ? (
        <ul className="pn-previa">
          {previa.map((p, i) => <li key={i}><span>{i + 1}ª · {dataBR(p.venc)}</span><b>{reais(p.valor)}</b></li>)}
        </ul>
      ) : null}
      <label className="pn-checkbox">
        <input type="checkbox" name="recebiPrimeira" value="1" defaultChecked={v.recebiPrimeira === '1'} />
        {parcelas === '1' ? 'Já recebi o pagamento' : 'Já recebi a 1ª parcela'}
      </label>
      <label className="pn-checkbox">
        <input type="checkbox" name="emAndamento" value="1" checked={emAndamento} onChange={(e) => setEmAndamento(e.target.checked)} />
        Acompanhamento já em andamento (paciente de antes do painel)
      </label>
      {emAndamento ? (
        <div className="pn-field" style={{ marginTop: 10 }}>
          <label htmlFor="inicio" className="pn-label">Começou em (1ª consulta) *</label>
          <input id="inicio" name="inicio" type="date" className="pn-input" max={hoje} required defaultValue={v.inicio} />
          <Erro e={estado.erros?.inicio} />
          <p className="pn-dica">As etapas de entrada, pré-consulta, 1ª consulta e entrega já ficam como concluídas.</p>
        </div>
      ) : null}
      <Erro e={estado.erros?.geral} />
      <button className="pn-btn pn-btn-solid pn-full" style={{ marginTop: 16 }} disabled={pendente}>
        {pendente ? 'Salvando…' : renovarDe ? 'Renovar plano' : 'Fechar plano'}
      </button>
    </form>
  )
}

// ---------- encerrar / cancelar ----------

const OPCOES_RETOMAR = [
  { valor: '30', rotulo: 'Em 1 mês' },
  { valor: '60', rotulo: 'Em 2 meses' },
  { valor: '90', rotulo: 'Em 3 meses' },
  { valor: '180', rotulo: 'Em 6 meses' },
  { valor: 'data', rotulo: 'Escolher data…' },
  { valor: '', rotulo: 'Sem data' },
]

function CampoRetomar() {
  const [q, setQ] = useState('90')
  return (
    <div className="pn-field">
      <label htmlFor="retomar" className="pn-label">Retomar contato</label>
      <div className="pn-passo-linha">
        <select id="retomar" name="retomar" className="pn-select" value={q} onChange={(e) => setQ(e.target.value)}>
          {OPCOES_RETOMAR.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
        </select>
        {q === 'data' ? <input type="date" name="data" className="pn-input" required aria-label="Data para retomar" /> : null}
      </div>
    </div>
  )
}

export function EncerrarPlano({ contratoId }: { contratoId: string }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(encerrarAction.bind(null, contratoId), {})
  return (
    <form action={acao}>
      <p className="pn-dica" style={{ marginTop: 0, marginBottom: 12 }}>
        Sem renovação: o contato vai para “Plano vencido” e aparece no Hoje na data para retomar.
      </p>
      <CampoRetomar />
      <Erro e={estado.erros?.geral ?? estado.erros?.retomarEm} />
      {estado.ok ? <p className="pn-ok" role="status">{estado.msg}</p> : null}
      <button className="pn-btn pn-full" disabled={pendente}>{pendente ? 'Salvando…' : 'Encerrar acompanhamento'}</button>
    </form>
  )
}

export function CancelarPlano({ contratoId, pendentes }: { contratoId: string; pendentes: number }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(cancelarAction.bind(null, contratoId), {})
  return (
    <form action={acao}>
      {pendentes ? (
        <label className="pn-checkbox">
          <input type="checkbox" name="dispensar" value="1" defaultChecked />
          Não vou mais receber as {pendentes} {pendentes === 1 ? 'parcela pendente' : 'parcelas pendentes'}
        </label>
      ) : null}
      <CampoRetomar />
      <Erro e={estado.erros?.geral ?? estado.erros?.retomarEm} />
      {estado.ok ? <p className="pn-ok" role="status">{estado.msg}</p> : null}
      <button className="pn-btn pn-full" disabled={pendente}>{pendente ? 'Salvando…' : 'Cancelar plano'}</button>
    </form>
  )
}

// ---------- ajustes ----------

type LinhaServico = { id?: string; nome: string; valor: string; consultas: string; prazoQtd: string; prazoUnidade: 'dias' | 'meses'; ativo: boolean }

export function EditarServicos({ servicos }: { servicos: Servico[] }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(salvarServicosAction, {})
  const [linhas, setLinhas] = useState<LinhaServico[]>(() =>
    servicos.map((s) => ({
      id: s.id, nome: s.nome, valor: reaisCampo(s.valorCentavos), consultas: String(s.consultas),
      prazoQtd: String('dias' in s.prazo ? s.prazo.dias : s.prazo.meses), prazoUnidade: 'dias' in s.prazo ? 'dias' : 'meses', ativo: s.ativo,
    })),
  )
  const mudar = (i: number, p: Partial<LinhaServico>) => setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)))
  return (
    <form action={acao}>
      <input type="hidden" name="json" value={JSON.stringify(linhas)} />
      {linhas.map((l, i) => (
        <div className="pn-box pn-servico-ed" key={l.id ?? `novo-${i}`}>
          <div className="pn-field">
            <label className="pn-label" htmlFor={`s-nome-${i}`}>Nome</label>
            <input id={`s-nome-${i}`} className="pn-input" value={l.nome} maxLength={60} onChange={(e) => mudar(i, { nome: e.target.value })} />
          </div>
          <div className="pn-grid4">
            <div>
              <label className="pn-label" htmlFor={`s-valor-${i}`}>Valor (R$)</label>
              <input id={`s-valor-${i}`} className="pn-input" inputMode="decimal" value={l.valor} onChange={(e) => mudar(i, { valor: e.target.value })} />
            </div>
            <div>
              <label className="pn-label" htmlFor={`s-cons-${i}`}>Consultas</label>
              <input id={`s-cons-${i}`} className="pn-input" type="number" min={1} max={24} value={l.consultas} onChange={(e) => mudar(i, { consultas: e.target.value })} />
            </div>
            <div>
              <label className="pn-label" htmlFor={`s-prazo-${i}`}>Prazo</label>
              <input id={`s-prazo-${i}`} className="pn-input" type="number" min={1} value={l.prazoQtd} onChange={(e) => mudar(i, { prazoQtd: e.target.value })} />
            </div>
            <div>
              <label className="pn-label" htmlFor={`s-un-${i}`}>Em</label>
              <select id={`s-un-${i}`} className="pn-select" value={l.prazoUnidade} onChange={(e) => mudar(i, { prazoUnidade: e.target.value as 'dias' | 'meses' })}>
                <option value="dias">dias</option>
                <option value="meses">meses</option>
              </select>
            </div>
          </div>
          <label className="pn-checkbox">
            <input type="checkbox" checked={l.ativo} onChange={(e) => mudar(i, { ativo: e.target.checked })} /> Aparece em “Fechar plano”
          </label>
          {!l.id ? <button type="button" className="pn-link" onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))}>remover</button> : null}
        </div>
      ))}
      <button type="button" className="pn-btn" onClick={() => setLinhas((ls) => [...ls, { nome: '', valor: '', consultas: '1', prazoQtd: '30', prazoUnidade: 'dias', ativo: true }])}>
        + Novo plano
      </button>
      <p className="pn-dica">Mudar o valor vale para os próximos fechamentos; planos já fechados mantêm o valor combinado. Para tirar um plano de linha, desmarque “aparece”.</p>
      <Erro e={estado.erros?.geral} />
      {estado.ok ? <p className="pn-ok" role="status">{estado.msg}</p> : null}
      <div className="pn-salvar-fixo">
        <button className="pn-btn pn-btn-solid pn-full" disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar planos'}</button>
      </div>
    </form>
  )
}

export function EditarChecklists({ checklists, servicos }: { checklists: Record<Fase, ItemModelo[]>; servicos: Servico[] }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(salvarChecklistsAction, {})
  const [m, setM] = useState(() => structuredClone(checklists))
  const mudar = (fase: Fase, i: number, p: Partial<ItemModelo>) =>
    setM((x) => ({ ...x, [fase]: x[fase].map((it, j) => (j === i ? { ...it, ...p } : it)) }))
  const mover = (fase: Fase, i: number, d: -1 | 1) =>
    setM((x) => {
      const l = [...x[fase]]
      const j = i + d
      if (j < 0 || j >= l.length) return x
      ;[l[i], l[j]] = [l[j], l[i]]
      return { ...x, [fase]: l }
    })
  return (
    <form action={acao}>
      <input type="hidden" name="json" value={JSON.stringify(m)} />
      {FASES.map(({ fase, titulo }) => (
        <details className="pn-box pn-details" key={fase}>
          <summary>{titulo} <small className="pn-qtd">{m[fase].length}</small></summary>
          <ul className="pn-ck-ed">
            {m[fase].map((it, i) => (
              <li key={`${it.id}-${i}`}>
                <input className="pn-input" value={it.texto} maxLength={160} onChange={(e) => mudar(fase, i, { texto: e.target.value })} aria-label="Texto do item" />
                <div className="pn-ck-ops">
                  {servicos.map((s) => {
                    const todos = !it.servicos
                    const marcado = todos || it.servicos!.includes(s.id)
                    return (
                      <label key={s.id} className={`pn-mini${marcado ? ' on' : ''}`}>
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={(e) => {
                            const atuais = todos ? servicos.map((x) => x.id) : it.servicos!
                            const novos = e.target.checked ? [...atuais, s.id] : atuais.filter((x) => x !== s.id)
                            mudar(fase, i, { servicos: novos.length === servicos.length ? undefined : novos })
                          }}
                        />
                        {s.nome.replace(/^(Plano|Consulta) /, '')}
                      </label>
                    )
                  })}
                  {it.auto ? <span className="pn-mini">automático</span> : null}
                  <button type="button" className="pn-link" onClick={() => mover(fase, i, -1)} aria-label="Subir">↑</button>
                  <button type="button" className="pn-link" onClick={() => mover(fase, i, 1)} aria-label="Descer">↓</button>
                  <button type="button" className="pn-link" onClick={() => setM((x) => ({ ...x, [fase]: x[fase].filter((_, j) => j !== i) }))}>remover</button>
                </div>
              </li>
            ))}
          </ul>
          <button type="button" className="pn-btn pn-btn-sm" onClick={() => setM((x) => ({ ...x, [fase]: [...x[fase], { id: '', texto: '' }] }))}>+ Item</button>
        </details>
      ))}
      <p className="pn-dica">Os serviços marcados em cada item dizem para quais planos ele vale. Itens “automáticos” se marcam sozinhos.</p>
      <Erro e={estado.erros?.geral} />
      {estado.ok ? <p className="pn-ok" role="status">{estado.msg}</p> : null}
      <div className="pn-salvar-fixo">
        <button className="pn-btn pn-btn-solid pn-full" disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar checklists'}</button>
      </div>
    </form>
  )
}

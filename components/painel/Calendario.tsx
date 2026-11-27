'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { agoraSP, dataCurta, diaMes, diaDaSemana, nomeDia, nomeMes, somarDias, somarMeses } from '@/lib/contatos/datas'
import { linkWhatsapp } from '@/lib/contatos/formatar'
import { SITUACOES, type Formato, type SituacaoConsulta } from '@/lib/consultorio/tipos'
import { BotoesSituacao } from './Consultorio'

export type Vista = 'mes' | 'semana' | 'dia'

export type Evento = {
  id: string
  contatoId: string
  nome: string
  whatsapp?: string
  mensagem?: string
  data: string
  hora: string
  fim: string
  duracaoMin: number
  formato: Formato
  /** "Retorno 2/3" */
  tipo: string
  plano?: string
  situacao: SituacaoConsulta
}

const VISTAS: { v: Vista; rotulo: string }[] = [
  { v: 'dia', rotulo: 'Dia' },
  { v: 'semana', rotulo: 'Semana' },
  { v: 'mes', rotulo: 'Mês' },
]
const SEMANA_CURTA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
const HORA_PX = 52
const CHAVE_FILTROS = 'pn-agenda-filtros'

const url = (v: Vista, d: string) => `/painel/agenda?vista=${v}&data=${d}`
const min = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5))
const dias = (a: string, b: string) => {
  const r: string[] = []
  for (let d = a; d <= b; d = somarDias(d, 1)) r.push(d)
  return r
}

type Filtros = { ocultas: SituacaoConsulta[]; formatos: Formato[] }
const PADRAO: Filtros = { ocultas: ['desmarcada'], formatos: ['online', 'presencial'] }
const EVENTO_FILTROS = 'pn-agenda-filtros'

/** Filtros ficam no navegador (conveniência local); sem acesso ao storage, vale o padrão. */
function lerFiltros(): string {
  try {
    return localStorage.getItem(CHAVE_FILTROS) ?? ''
  } catch {
    return ''
  }
}
function assinarFiltros(cb: () => void) {
  window.addEventListener(EVENTO_FILTROS, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(EVENTO_FILTROS, cb)
    window.removeEventListener('storage', cb)
  }
}

/** Colunas lado a lado para consultas que se sobrepõem no mesmo dia. */
function emFaixas(evs: Evento[]): (Evento & { faixa: number; faixas: number })[] {
  const ord = [...evs].sort((a, b) => min(a.hora) - min(b.hora) || b.duracaoMin - a.duracaoMin)
  const saida: (Evento & { faixa: number; faixas: number })[] = []
  let grupo: (Evento & { faixa: number; faixas: number })[] = []
  let fimGrupo = -1
  const fechar = () => {
    const n = Math.max(1, ...grupo.map((g) => g.faixa + 1))
    for (const g of grupo) g.faixas = n
    saida.push(...grupo)
    grupo = []
  }
  for (const e of ord) {
    const ini = min(e.hora)
    if (ini >= fimGrupo && grupo.length) fechar()
    const ocupadas = new Set(grupo.filter((g) => min(g.hora) + g.duracaoMin > ini).map((g) => g.faixa))
    let faixa = 0
    while (ocupadas.has(faixa)) faixa++
    grupo.push({ ...e, faixa, faixas: 1 })
    fimGrupo = Math.max(fimGrupo, ini + e.duracaoMin)
  }
  if (grupo.length) fechar()
  return saida
}

export function Calendario({ vista, data, hoje, inicio, fim, eventos }: {
  vista: Vista
  data: string
  hoje: string
  inicio: string
  fim: string
  eventos: Evento[]
}) {
  const router = useRouter()
  const salvos = useSyncExternalStore(assinarFiltros, lerFiltros, () => '')
  const filtros = useMemo<Filtros>(() => {
    try {
      const f = JSON.parse(salvos || 'null')
      if (f && Array.isArray(f.ocultas) && Array.isArray(f.formatos)) return f
    } catch {}
    return PADRAO
  }, [salvos])
  const [aberto, setAberto] = useState<string | null>(null)
  // A página remonta o calendário a cada navegação (key), então o dia escolhido começa na data da URL.
  const [diaSel, setDiaSel] = useState(data)
  const [agora, setAgora] = useState<string | null>(null)

  useEffect(() => {
    const tick = () => setAgora(agoraSP())
    const t0 = setTimeout(tick, 0)
    const t = setInterval(tick, 60_000)
    return () => {
      clearTimeout(t0)
      clearInterval(t)
    }
  }, [])

  const mudarFiltros = (f: Filtros) => {
    try {
      localStorage.setItem(CHAVE_FILTROS, JSON.stringify(f))
    } catch {}
    window.dispatchEvent(new Event(EVENTO_FILTROS))
  }
  const visiveis = useMemo(
    () => eventos.filter((e) => !filtros.ocultas.includes(e.situacao) && filtros.formatos.includes(e.formato)),
    [eventos, filtros],
  )
  const doDia = (d: string) => visiveis.filter((e) => e.data === d)
  const aqui = url(vista, data)
  const novo = (d: string, hora?: string) => `/painel/consulta/nova?data=${d}${hora ? `&hora=${hora}` : ''}&volta=${encodeURIComponent(aqui)}`
  const evAberto = eventos.find((e) => e.id === aberto)

  const passo = (n: number) =>
    vista === 'mes' ? somarMeses(`${data.slice(0, 7)}-01`, n) : somarDias(data, vista === 'semana' ? 7 * n : n)
  const titulo =
    vista === 'mes'
      ? nomeMes(data.slice(0, 7))
      : vista === 'semana'
        ? `${diaMes(inicio)} – ${diaMes(fim)} ${fim.slice(0, 4)}`
        : `${nomeDia(data)}, ${diaMes(data)}`
  const total = visiveis.length

  return (
    <div className="pn-cal">
      <div className="pn-cal-topo">
        <div className="pn-cal-nav">
          <Link href={url(vista, hoje)} className="pn-btn pn-btn-sm">Hoje</Link>
          <Link href={url(vista, passo(-1))} className="pn-cal-seta" aria-label="Anterior">‹</Link>
          <Link href={url(vista, passo(1))} className="pn-cal-seta" aria-label="Próximo">›</Link>
          <h1>{titulo}</h1>
        </div>
        <div className="pn-cal-acoes">
          <div className="pn-seg" role="group" aria-label="Visualização">
            {VISTAS.map((x) => (
              <Link key={x.v} href={url(x.v, data)} className={vista === x.v ? 'on' : undefined} aria-current={vista === x.v ? 'page' : undefined}>
                {x.rotulo}
              </Link>
            ))}
          </div>
          <Link href={novo(vista === 'mes' ? diaSel : data < hoje ? hoje : data)} className="pn-btn pn-btn-solid pn-btn-sm">+ Consulta</Link>
        </div>
      </div>

      <div className="pn-filtros" role="group" aria-label="Filtros">
        {SITUACOES.map((s) => {
          const on = !filtros.ocultas.includes(s.valor)
          return (
            <button
              key={s.valor}
              type="button"
              className={`pn-filtro s-${s.valor}${on ? ' on' : ''}`}
              aria-pressed={on}
              onClick={() => mudarFiltros({ ...filtros, ocultas: on ? [...filtros.ocultas, s.valor] : filtros.ocultas.filter((x) => x !== s.valor) })}
            >
              <i />{s.rotulo}
            </button>
          )
        })}
        <span className="pn-filtros-sep" />
        {(['online', 'presencial'] as const).map((f) => {
          const on = filtros.formatos.includes(f)
          return (
            <button
              key={f}
              type="button"
              className={`pn-filtro${on ? ' on' : ''}`}
              aria-pressed={on}
              onClick={() => mudarFiltros({ ...filtros, formatos: on ? filtros.formatos.filter((x) => x !== f) : [...filtros.formatos, f] })}
            >
              {f === 'online' ? 'Online' : 'Presencial'}
            </button>
          )
        })}
        <span className="pn-filtros-total">{total} {total === 1 ? 'consulta' : 'consultas'}</span>
      </div>

      {vista === 'mes' ? (
        <>
          <div className="pn-mes">
            {SEMANA_CURTA.map((d) => <div key={d} className="pn-mes-cab">{d}</div>)}
            {dias(inicio, fim).map((d) => {
              const evs = doDia(d)
              const fora = d.slice(0, 7) !== data.slice(0, 7)
              return (
                <div
                  key={d}
                  role="button"
                  tabIndex={0}
                  className={`pn-mes-dia${fora ? ' fora' : ''}${d === hoje ? ' hoje' : ''}${d === diaSel ? ' sel' : ''}${diaDaSemana(d) === 1 ? ' adm' : ''}`}
                  onClick={() => setDiaSel(d)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setDiaSel(d)}
                  aria-label={`${dataCurta(d)}: ${evs.length} ${evs.length === 1 ? 'consulta' : 'consultas'}`}
                >
                  <span className="pn-mes-num">{Number(d.slice(8, 10))}</span>
                  <div className="pn-mes-evs">
                    {evs.slice(0, 3).map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        className={`pn-chip-ev s-${e.situacao}`}
                        onClick={(ev) => {
                          ev.stopPropagation()
                          setAberto(e.id)
                        }}
                      >
                        <b>{e.hora}</b> {e.nome.split(' ')[0]}
                      </button>
                    ))}
                    {evs.length > 3 ? <span className="pn-mes-mais">+{evs.length - 3}</span> : null}
                  </div>
                  <div className="pn-mes-pontos" aria-hidden="true">
                    {evs.slice(0, 4).map((e) => <i key={e.id} className={`s-${e.situacao}`} />)}
                  </div>
                </div>
              )
            })}
          </div>
          <section className="pn-mes-lista">
            <header>
              <h2>{nomeDia(diaSel)}, {diaMes(diaSel)}{diaDaSemana(diaSel) === 1 ? <small> · dia administrativo</small> : null}</h2>
              <Link href={url('dia', diaSel)} className="pn-link">ver o dia</Link>
            </header>
            {doDia(diaSel).length ? (
              <ul>
                {doDia(diaSel).map((e) => (
                  <li key={e.id}>
                    <button type="button" className={`pn-ev-linha s-${e.situacao}`} onClick={() => setAberto(e.id)}>
                      <span className="pn-ev-hora"><b>{e.hora}</b>{e.fim}</span>
                      <span><b>{e.nome}</b><small>{e.tipo} · {e.formato === 'online' ? 'Online' : 'Presencial'}</small></span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="pn-livre">Nenhuma consulta. <Link href={novo(diaSel)} className="pn-link">Agendar</Link></p>
            )}
          </section>
        </>
      ) : (
        <Grade
          dias={vista === 'semana' ? dias(inicio, fim) : [data]}
          eventos={visiveis}
          hoje={hoje}
          agora={agora}
          onAbrir={setAberto}
          onVazio={(d, h) => router.push(novo(d, h))}
          linkDia={(d) => url('dia', d)}
        />
      )}

      {evAberto ? <Detalhe e={evAberto} aqui={aqui} onFechar={() => setAberto(null)} /> : null}
    </div>
  )
}

function Grade({ dias: ds, eventos, hoje, agora, onAbrir, onVazio, linkDia }: {
  dias: string[]
  eventos: Evento[]
  hoje: string
  agora: string | null
  onAbrir: (id: string) => void
  onVazio: (data: string, hora: string) => void
  linkDia: (d: string) => string
}) {
  const doPeriodo = eventos.filter((e) => ds.includes(e.data))
  const hIni = Math.min(7, ...doPeriodo.map((e) => Math.floor(min(e.hora) / 60)))
  const hFim = Math.max(21, ...doPeriodo.map((e) => Math.ceil((min(e.hora) + e.duracaoMin) / 60)))
  const horas = Array.from({ length: hFim - hIni }, (_, i) => hIni + i)
  const altura = horas.length * HORA_PX
  const agoraMin = agora && agora.slice(0, 10) === hoje ? min(agora.slice(11)) : null
  const rolo = useRef<HTMLDivElement>(null)
  const primeiraHora = doPeriodo.length ? Math.min(...doPeriodo.map((e) => Math.floor(min(e.hora) / 60))) : 8

  // Abre já mostrando a primeira consulta (ou 08:00) e, no celular, a coluna de hoje.
  useEffect(() => {
    const el = rolo.current
    if (!el) return
    el.scrollTop = Math.max(0, (Math.min(primeiraHora, 8) - hIni) * HORA_PX - 6)
    const i = ds.indexOf(hoje)
    if (i > 0 && el.scrollWidth > el.clientWidth) {
      const col = (el.scrollWidth - 52) / ds.length
      el.scrollLeft = Math.max(0, col * i - (el.clientWidth - 52 - col) / 2)
    }
    // só na montagem: a página remonta o calendário a cada navegação
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={rolo} className={`pn-grade-rolo${ds.length > 1 ? ' semana' : ''}`}>
      <div className="pn-grade" style={{ gridTemplateColumns: `52px repeat(${ds.length}, minmax(0, 1fr))` }}>
        <div className="pn-grade-canto" />
        {ds.map((d) => (
          <Link key={d} href={linkDia(d)} className={`pn-grade-cab${d === hoje ? ' hoje' : ''}${diaDaSemana(d) === 1 ? ' adm' : ''}`}>
            <span>{nomeDia(d).slice(0, 3)}</span>
            <b>{Number(d.slice(8, 10))}</b>
            {diaDaSemana(d) === 1 ? <small>administrativo</small> : null}
          </Link>
        ))}
        <div className="pn-grade-horas" style={{ height: altura }}>
          {horas.map((h) => <span key={h} style={{ top: (h - hIni) * HORA_PX }}>{String(h).padStart(2, '0')}:00</span>)}
        </div>
        {ds.map((d) => (
          <div
            key={d}
            className={`pn-grade-col${d === hoje ? ' hoje' : ''}${diaDaSemana(d) === 1 ? ' adm' : ''}`}
            style={{ height: altura, backgroundSize: `100% ${HORA_PX}px` }}
            onClick={(ev) => {
              const y = ev.clientY - ev.currentTarget.getBoundingClientRect().top
              const total = hIni * 60 + Math.floor(y / (HORA_PX / 2)) * 30
              onVazio(d, `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`)
            }}
            title="Toque para agendar neste horário"
          >
            {emFaixas(eventos.filter((e) => e.data === d)).map((e) => (
              <button
                key={e.id}
                type="button"
                className={`pn-ev s-${e.situacao}${e.duracaoMin < 45 ? ' curto' : ''}`}
                style={{
                  top: ((min(e.hora) - hIni * 60) / 60) * HORA_PX,
                  height: Math.max((e.duracaoMin / 60) * HORA_PX - 2, 22),
                  left: `calc(${(e.faixa / e.faixas) * 100}% + 2px)`,
                  width: `calc(${100 / e.faixas}% - 4px)`,
                }}
                onClick={(ev) => {
                  ev.stopPropagation()
                  onAbrir(e.id)
                }}
              >
                <b>{e.nome}</b>
                <span>{e.hora}–{e.fim} · {e.formato === 'online' ? 'Online' : 'Presencial'}</span>
              </button>
            ))}
            {d === hoje && agoraMin !== null && agoraMin >= hIni * 60 && agoraMin <= hFim * 60 ? (
              <i className="pn-agora" style={{ top: ((agoraMin - hIni * 60) / 60) * HORA_PX }} aria-hidden="true" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function Detalhe({ e, aqui, onFechar }: { e: Evento; aqui: string; onFechar: () => void }) {
  useEffect(() => {
    const esc = (ev: KeyboardEvent) => ev.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])
  return (
    <div className="pn-sheet-fundo" onClick={onFechar}>
      <div className={`pn-sheet s-${e.situacao}`} role="dialog" aria-modal="true" aria-label={`Consulta de ${e.nome}`} onClick={(ev) => ev.stopPropagation()}>
        <button type="button" className="pn-sheet-fechar" onClick={onFechar} aria-label="Fechar">×</button>
        <p className="pn-eyebrow">{e.tipo}{e.plano ? ` · ${e.plano}` : ''}</p>
        <h2>{e.nome}</h2>
        <p className="pn-sheet-quando">{dataCurta(e.data)} · {e.hora}–{e.fim} · {e.formato === 'online' ? 'Online' : 'Presencial'}</p>
        <BotoesSituacao key={e.situacao} id={e.id} situacao={e.situacao} />
        <div className="pn-passo-botoes">
          {e.whatsapp ? (
            <a href={linkWhatsapp(e.whatsapp, e.mensagem)} target="_blank" rel="noopener noreferrer" className="pn-btn pn-btn-wa">Confirmar no WhatsApp</a>
          ) : null}
          <Link href={`/painel/contato/${e.contatoId}`} className="pn-btn">Abrir paciente</Link>
          <Link href={`/painel/consulta/${e.id}?volta=${encodeURIComponent(aqui)}`} className="pn-btn">Editar / remarcar</Link>
        </div>
      </div>
    </div>
  )
}

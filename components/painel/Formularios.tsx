'use client'
import { useActionState, useState, useTransition } from 'react'
import {
  adicionarNotaAction, atualizarDadosAction, criarContatoAction, mudarEtapaAction, proximoPassoAction, salvarModelosAction, type EstadoForm,
} from '@/app/painel/(app)/actions'
import { formatarWhatsapp, linkWhatsapp, mascararWhatsapp } from '@/lib/contatos/formatar'
import { LIMITE_MODELO, MODELOS, MODELOS_PADRAO, preencher, type ChaveModelo, type Modelos } from '@/lib/contatos/mensagens'
import { ETAPAS, ORIGENS, type Contato, type Etapa } from '@/lib/contatos/types'

const Erro = ({ e }: { e?: string }) => (e ? <p className="pn-erro" role="alert">{e}</p> : null)

export function SeletorEtapa({ id, etapa }: { id: string; etapa: Etapa }) {
  const [atual, setAtual] = useState(etapa)
  const [erro, setErro] = useState('')
  const [pendente, start] = useTransition()
  return (
    <>
      <div className="pn-etapas" role="group" aria-label="Etapa do contato">
        {ETAPAS.map((e) => (
          <button
            key={e.valor}
            type="button"
            className={atual === e.valor ? 'on' : undefined}
            aria-pressed={atual === e.valor}
            disabled={pendente}
            onClick={() => {
              if (e.valor === atual) return
              const anterior = atual
              setAtual(e.valor)
              setErro('')
              start(async () => {
                let msg: string | null
                try {
                  msg = await mudarEtapaAction(id, e.valor)
                } catch {
                  msg = 'Sem conexão. Verifique a internet e tente de novo.'
                }
                if (msg) {
                  setAtual(anterior)
                  setErro(msg)
                }
              })
            }}
          >
            {e.rotulo}
          </button>
        ))}
      </div>
      <Erro e={erro} />
    </>
  )
}

export function NovaNota({ id }: { id: string }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(adicionarNotaAction.bind(null, id), {})
  return (
    <form action={acao} key={estado.versao ?? 0}>
      <label htmlFor="texto" className="pn-label">Nova anotação</label>
      <textarea id="texto" name="texto" className="pn-textarea" maxLength={2000} required defaultValue={estado.ok ? '' : estado.valores?.texto} placeholder="Ex.: conversamos dia 12, retorna em janeiro." />
      <Erro e={estado.erros?.texto ?? estado.erros?.geral} />
      <button className="pn-btn pn-btn-solid pn-full" style={{ marginTop: 10 }} disabled={pendente}>
        {pendente ? 'Salvando…' : 'Adicionar nota'}
      </button>
    </form>
  )
}

const OPCOES_RETOMAR = [
  { valor: '2', rotulo: 'Em 2 dias' },
  { valor: '7', rotulo: 'Em 1 semana' },
  { valor: '14', rotulo: 'Em 2 semanas' },
  { valor: '30', rotulo: 'Em 1 mês' },
  { valor: 'data', rotulo: 'Escolher data…' },
  { valor: '', rotulo: 'Sem data' },
]

/** "Fiz contato hoje" + quando retomar. */
export function ProximoPasso({ id, sugestao = '7' }: { id: string; sugestao?: string }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(proximoPassoAction.bind(null, id), {})
  const [quando, setQuando] = useState(sugestao)
  return (
    <form action={acao} className="pn-passo">
      <label htmlFor="quando" className="pn-label">Retomar a conversa</label>
      <div className="pn-passo-linha">
        <select id="quando" name="quando" className="pn-select" value={quando} onChange={(e) => setQuando(e.target.value)}>
          {OPCOES_RETOMAR.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
        </select>
        {quando === 'data' ? <input type="date" name="data" className="pn-input" required aria-label="Data para retomar" /> : null}
      </div>
      <Erro e={estado.erros?.retomarEm ?? estado.erros?.id ?? estado.erros?.geral} />
      <div className="pn-passo-botoes">
        <button className="pn-btn pn-btn-solid" name="acao" value="contato" disabled={pendente}>Fiz contato hoje</button>
        <button className="pn-btn" name="acao" value="data" disabled={pendente}>Só salvar a data</button>
      </div>
      {estado.ok && estado.msg ? <p className="pn-ok" role="status" key={estado.versao}>{estado.msg}</p> : null}
    </form>
  )
}

/** Mensagem pronta: escolhe o modelo, ajusta o texto e abre o WhatsApp com ele já escrito (ou copia). */
export function Mensagem({ c, modelos, inicial }: { c: Pick<Contato, 'nome' | 'objetivo' | 'whatsapp'>; modelos: Modelos; inicial: ChaveModelo }) {
  const [chave, setChave] = useState<ChaveModelo>(inicial)
  const [texto, setTexto] = useState(() => preencher(modelos[inicial], c))
  const [copiado, setCopiado] = useState(false)
  return (
    <div>
      <label htmlFor="modelo" className="pn-label">Modelo</label>
      <select
        id="modelo"
        className="pn-select"
        value={chave}
        onChange={(e) => {
          const k = e.target.value as ChaveModelo
          setChave(k)
          setTexto(preencher(modelos[k], c))
        }}
      >
        {MODELOS.map((m) => <option key={m.chave} value={m.chave}>{m.rotulo}</option>)}
      </select>
      <label htmlFor="msg" className="pn-label" style={{ marginTop: 14 }}>Mensagem</label>
      <textarea id="msg" className="pn-textarea" rows={5} value={texto} onChange={(e) => setTexto(e.target.value)} />
      <div className="pn-passo-botoes">
        <a href={linkWhatsapp(c.whatsapp, texto.trim())} target="_blank" rel="noopener noreferrer" className="pn-btn pn-btn-wa">Abrir no WhatsApp</a>
        <button
          type="button"
          className="pn-btn"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(texto.trim())
              setCopiado(true)
              setTimeout(() => setCopiado(false), 2000)
            } catch {
              setCopiado(false)
            }
          }}
        >
          {copiado ? 'Copiada ✓' : 'Copiar mensagem'}
        </button>
      </div>
      <p className="pn-dica">O WhatsApp abre com o texto pronto: é só conferir e enviar. Depois, toque em “Fiz contato hoje”.</p>
    </div>
  )
}

function CampoWhatsapp({ inicial, erro }: { inicial?: string; erro?: string }) {
  const [v, setV] = useState(inicial ? formatarWhatsapp(inicial) : '')
  return (
    <div className="pn-field">
      <label htmlFor="whatsapp" className="pn-label">WhatsApp *</label>
      <input id="whatsapp" name="whatsapp" className="pn-input" inputMode="tel" autoComplete="off" required value={v} onChange={(e) => setV(mascararWhatsapp(e.target.value))} placeholder="(00) 00000-0000" />
      <Erro e={erro} />
    </div>
  )
}

function CamposContato({ c, erros, comEtapa }: { c?: Partial<Record<keyof Contato, string>>; erros?: Record<string, string>; comEtapa?: boolean }) {
  return (
    <>
      <div className="pn-field">
        <label htmlFor="nome" className="pn-label">Nome *</label>
        <input id="nome" name="nome" className="pn-input" required maxLength={120} defaultValue={c?.nome} autoComplete="off" />
        <Erro e={erros?.nome} />
      </div>
      <div className="pn-grid2">
        <CampoWhatsapp inicial={c?.whatsapp} erro={erros?.whatsapp} />
        <div className="pn-field">
          <label htmlFor="email" className="pn-label">E-mail</label>
          <input id="email" name="email" type="email" inputMode="email" className="pn-input" maxLength={160} defaultValue={c?.email} autoComplete="off" />
          <Erro e={erros?.email} />
        </div>
      </div>
      <div className="pn-field">
        <label htmlFor="objetivo" className="pn-label">Objetivo</label>
        <textarea id="objetivo" name="objetivo" className="pn-textarea" maxLength={1500} defaultValue={c?.objetivo} />
        <Erro e={erros?.objetivo} />
      </div>
      <div className="pn-grid2">
        <div className="pn-field">
          <label htmlFor="nascimento" className="pn-label">Data de nascimento</label>
          <input id="nascimento" name="nascimento" type="date" className="pn-input" defaultValue={c?.nascimento} min="1900-01-01" />
          <Erro e={erros?.nascimento} />
        </div>
        <div className="pn-field">
          <label htmlFor="origem" className="pn-label">Origem</label>
          <select id="origem" name="origem" className="pn-select" defaultValue={c?.origem || 'instagram'}>
            {ORIGENS.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
          </select>
          <Erro e={erros?.origem} />
        </div>
      </div>
      {comEtapa ? (
        <div className="pn-field">
          <label htmlFor="etapa" className="pn-label">Etapa inicial</label>
          <select id="etapa" name="etapa" className="pn-select" defaultValue={c?.etapa || 'lista'}>
            {ETAPAS.map((e) => <option key={e.valor} value={e.valor}>{e.rotulo}</option>)}
          </select>
          <Erro e={erros?.etapa} />
        </div>
      ) : null}
    </>
  )
}

export function EditarDados({ c }: { c: Contato }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(atualizarDadosAction.bind(null, c.id), {})
  return (
    <form action={acao} key={estado.versao ?? 0}>
      <CamposContato c={{ ...(c as unknown as Record<string, string>), ...estado.valores }} erros={estado.erros} />
      <Erro e={estado.erros?.geral} />
      {estado.ok ? <p className="pn-ok" role="status">Dados salvos.</p> : null}
      <button className="pn-btn pn-btn-solid pn-full" disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar alterações'}</button>
    </form>
  )
}

export function NovoContato() {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(criarContatoAction, {})
  return (
    <form action={acao} className="pn-box" key={estado.versao ?? 0}>
      <CamposContato c={estado.valores} erros={estado.erros} comEtapa />
      <Erro e={estado.erros?.geral} />
      <button className="pn-btn pn-btn-solid pn-full" disabled={pendente}>{pendente ? 'Salvando…' : 'Cadastrar contato'}</button>
    </form>
  )
}

export function EditarModelos({ modelos }: { modelos: Modelos }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(salvarModelosAction, {})
  const valores = { ...modelos, ...(estado.valores as Partial<Modelos> | undefined) }
  return (
    <form action={acao} key={estado.versao ?? 0}>
      {MODELOS.map((m) => (
        <div className="pn-box" key={m.chave}>
          <label htmlFor={`m-${m.chave}`} className="pn-label">{m.rotulo}</label>
          <textarea id={`m-${m.chave}`} name={m.chave} className="pn-textarea" rows={4} maxLength={LIMITE_MODELO} defaultValue={valores[m.chave]} />
          <Erro e={estado.erros?.[m.chave]} />
          {valores[m.chave] !== MODELOS_PADRAO[m.chave] ? <p className="pn-dica">Personalizada. Apague todo o texto e salve para voltar ao modelo original.</p> : null}
        </div>
      ))}
      <Erro e={estado.erros?.geral} />
      {estado.ok ? <p className="pn-ok" role="status">{estado.msg}</p> : null}
      <div className="pn-salvar-fixo">
        <button className="pn-btn pn-btn-solid pn-full" disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar mensagens'}</button>
      </div>
    </form>
  )
}

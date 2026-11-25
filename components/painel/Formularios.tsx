'use client'
import { useActionState, useState, useTransition } from 'react'
import {
  adicionarNotaAction, atualizarDadosAction, criarContatoAction, mudarEtapaAction, type EstadoForm,
} from '@/app/painel/(app)/actions'
import { mascararWhatsapp } from '@/components/site/WaitlistForm'
import { formatarWhatsapp } from '@/lib/contatos/formatar'
import { ETAPAS, ORIGENS, type Contato, type Etapa } from '@/lib/contatos/types'

const Erro = ({ e }: { e?: string }) => (e ? <p className="pn-erro" role="alert">{e}</p> : null)

export function SeletorEtapa({ id, etapa }: { id: string; etapa: Etapa }) {
  const [atual, setAtual] = useState(etapa)
  const [pendente, start] = useTransition()
  return (
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
            start(async () => {
              try {
                await mudarEtapaAction(id, e.valor)
              } catch {
                setAtual(anterior)
              }
            })
          }}
        >
          {e.rotulo}
        </button>
      ))}
    </div>
  )
}

export function NovaNota({ id }: { id: string }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(adicionarNotaAction.bind(null, id), {})
  return (
    <form action={acao} key={estado.versao ?? 0}>
      <label htmlFor="texto" className="pn-label">Nova anotação</label>
      <textarea id="texto" name="texto" className="pn-textarea" maxLength={2000} required defaultValue={estado.ok ? '' : estado.valores?.texto} placeholder="Ex.: falei com ela dia 12, retorna em janeiro." />
      <Erro e={estado.erros?.texto ?? estado.erros?.geral} />
      <button className="pn-btn pn-btn-solid pn-full" style={{ marginTop: 10 }} disabled={pendente}>
        {pendente ? 'Salvando…' : 'Adicionar nota'}
      </button>
    </form>
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
          <label htmlFor="origem" className="pn-label">Origem</label>
          <select id="origem" name="origem" className="pn-select" defaultValue={c?.origem || 'instagram'}>
            {ORIGENS.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
          </select>
          <Erro e={erros?.origem} />
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
      </div>
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

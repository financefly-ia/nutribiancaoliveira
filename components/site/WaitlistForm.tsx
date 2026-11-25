'use client'
import { useState, type FormEvent } from 'react'
import { mascararWhatsapp } from '@/lib/contatos/formatar'
import { Folha } from './SvgDefs'

type Erros = Partial<Record<'nome' | 'email' | 'whatsapp' | 'objetivo' | 'consentimento' | 'geral', string>>

export function WaitlistForm() {
  const [whats, setWhats] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erros, setErros] = useState<Erros>({})
  const [alerta, setAlerta] = useState('')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (enviando) return
    const fd = new FormData(e.currentTarget)
    const corpo = {
      nome: String(fd.get('nome') ?? ''),
      email: String(fd.get('email') ?? ''),
      whatsapp: String(fd.get('whatsapp') ?? ''),
      objetivo: String(fd.get('objetivo') ?? ''),
      consentimento: fd.get('consentimento') === 'on',
      site: String(fd.get('site') ?? ''),
    }
    setEnviando(true)
    setErros({})
    setAlerta('')
    try {
      const res = await fetch('/api/lista-espera', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(corpo),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok) {
        setEnviado(true)
      } else if (res.status === 400 && body.erros) {
        setErros(body.erros)
        if (body.erros.geral) setAlerta(body.erros.geral)
      } else {
        setAlerta(body.erro ?? 'Não foi possível enviar agora. Tente novamente em instantes.')
      }
    } catch {
      setAlerta('Sem conexão. Verifique sua internet e tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  const erro = (k: keyof Erros) =>
    erros[k] ? (
      <span className="erro" id={`erro-${k}`} role="alert">
        {erros[k]}
      </span>
    ) : null
  const aria = (k: keyof Erros) => (erros[k] ? { 'aria-invalid': true, 'aria-describedby': `erro-${k}` } : {})

  return (
    <form className={`reveal${enviado ? ' sent' : ''}`} onSubmit={onSubmit} noValidate>
      <div className="fields">
        <div className="hp" aria-hidden="true">
          <label htmlFor="site">Não preencha este campo</label>
          <input id="site" name="site" tabIndex={-1} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="nome">Nome completo</label>
          <input id="nome" name="nome" required autoComplete="name" placeholder="Como posso te chamar?" maxLength={120} {...aria('nome')} />
          {erro('nome')}
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" required autoComplete="email" inputMode="email" placeholder="seu@email.com" maxLength={160} {...aria('email')} />
            {erro('email')}
          </div>
          <div className="field">
            <label htmlFor="whats">WhatsApp</label>
            <input
              id="whats"
              name="whatsapp"
              required
              autoComplete="tel-national"
              inputMode="tel"
              placeholder="(00) 00000-0000"
              value={whats}
              onChange={(e) => setWhats(mascararWhatsapp(e.target.value))}
              {...aria('whatsapp')}
            />
            {erro('whatsapp')}
          </div>
        </div>
        <div className="field">
          <label htmlFor="obj">Qual é o principal objetivo que você deseja alcançar?</label>
          <textarea id="obj" name="objetivo" rows={4} required maxLength={1500} placeholder="Conte um pouco sobre o que você busca com o acompanhamento nutricional…" {...aria('objetivo')} />
          {erro('objetivo')}
        </div>
        <label className="consent">
          <input type="checkbox" name="consentimento" required {...aria('consentimento')} />
          <span>
            Autorizo o uso dos meus dados para contato sobre os atendimentos, conforme a <a href="/privacidade" target="_blank">Política de Privacidade</a>.
            {erro('consentimento')}
          </span>
        </label>
        {alerta ? (
          <p className="alerta" role="alert">
            {alerta}
          </p>
        ) : null}
        <button className="btn btn-solid" type="submit" disabled={enviando}>
          {enviando ? 'Enviando…' : (
            <>
              Entrar na lista de espera <span className="arrow">→</span>
            </>
          )}
        </button>
        <p className="privacy">Seus dados são usados apenas para contato sobre os atendimentos.</p>
      </div>
      <div className="ok" role="status">
        <Folha style={{ color: '#A85A47' }} />
        <h3>Você está na lista!</h3>
        <p>Obrigada pela confiança. Assim que as vagas abrirem, você será uma das primeiras a saber.</p>
      </div>
    </form>
  )
}

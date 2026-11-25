'use client'
import { useActionState } from 'react'
import { entrar, type EstadoLogin } from './actions'

export function LoginForm({ configurado }: { configurado: boolean }) {
  const [estado, acao, pendente] = useActionState<EstadoLogin, FormData>(entrar, {})
  return (
    <form action={acao} className="pn-login-form">
      <label htmlFor="senha" className="pn-label">Senha</label>
      <input id="senha" name="senha" type="password" autoComplete="current-password" required autoFocus className="pn-input" disabled={!configurado} />
      {estado.erro || !configurado ? <p className="pn-erro" role="alert">{estado.erro ?? 'Painel não configurado.'}</p> : null}
      <button className="pn-btn pn-btn-solid pn-full" disabled={pendente || !configurado}>
        {pendente ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}

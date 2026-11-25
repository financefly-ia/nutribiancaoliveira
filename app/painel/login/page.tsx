import { redirect } from 'next/navigation'
import { Monograma } from '@/components/site/SvgDefs'
import { painelConfigurado, sessaoValida } from '@/lib/auth/guard'
import { LoginForm } from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function Login() {
  if (await sessaoValida()) redirect('/painel')
  return (
    <main className="pn-login">
      <div className="pn-login-card">
        <Monograma className="pn-login-mono" />
        <p className="pn-eyebrow">Bianca Oliveira · Nutrição</p>
        <h1>Painel</h1>
        <LoginForm configurado={painelConfigurado()} />
      </div>
    </main>
  )
}

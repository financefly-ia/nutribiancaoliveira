import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_SESSAO, verificarToken } from './session'

export const painelConfigurado = () => Boolean(process.env.ADMIN_PASSWORD && process.env.SESSION_SECRET)

export async function sessaoValida(): Promise<boolean> {
  const secret = process.env.SESSION_SECRET
  if (!secret) return false
  const token = (await cookies()).get(COOKIE_SESSAO)?.value
  return verificarToken(token, secret)
}

/** Use no topo de páginas, Server Actions e route handlers do painel. */
export async function exigirSessao(): Promise<void> {
  if (!(await sessaoValida())) redirect('/painel/login')
}

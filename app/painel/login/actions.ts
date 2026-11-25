'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_SESSAO, criarToken, senhaConfere, VALIDADE_MS } from '@/lib/auth/session'

export type EstadoLogin = { erro?: string }

export async function entrar(_prev: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const senha = process.env.ADMIN_PASSWORD
  const secret = process.env.SESSION_SECRET
  if (!senha || !secret) return { erro: 'Painel não configurado.' }
  const digitada = String(formData.get('senha') ?? '')
  if (!senhaConfere(digitada, senha)) {
    await new Promise((r) => setTimeout(r, 600))
    return { erro: 'Senha incorreta.' }
  }
  ;(await cookies()).set(COOKIE_SESSAO, criarToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/painel',
    maxAge: VALIDADE_MS / 1000,
  })
  redirect('/painel')
}

export async function sair(): Promise<void> {
  ;(await cookies()).delete({ name: COOKIE_SESSAO, path: '/painel' })
  redirect('/painel/login')
}

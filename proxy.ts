import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_SESSAO, verificarToken } from '@/lib/auth/session'

/**
 * Barreira de autenticação do painel. Roda em TODA requisição a /painel/*
 * (inclusive navegações RSC, que podem pular layouts), antes de qualquer página.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === '/painel/login' || pathname.startsWith('/painel/login/')) return NextResponse.next()

  const token = request.cookies.get(COOKIE_SESSAO)?.value
  if (verificarToken(token, process.env.SESSION_SECRET ?? '')) return NextResponse.next()

  if (pathname.startsWith('/painel/exportar')) return new NextResponse('Não autorizado', { status: 401 })
  return NextResponse.redirect(new URL('/painel/login', request.url))
}

export const config = { matcher: ['/painel/:path*'] }

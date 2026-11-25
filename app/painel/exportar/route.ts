import { sessaoValida } from '@/lib/auth/guard'
import { contatosParaCsv } from '@/lib/contatos/csv'
import { getStore } from '@/lib/contatos/get-store'
import { listarContatos } from '@/lib/contatos/servico'
import { ehEtapa } from '@/lib/contatos/types'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!(await sessaoValida())) return new Response('Não autorizado', { status: 401 })
  const sp = new URL(request.url).searchParams
  const etapa = sp.get('etapa')
  const contatos = await listarContatos(getStore(), { etapa: ehEtapa(etapa) ? etapa : undefined, busca: sp.get('q') ?? undefined })
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  return new Response(contatosParaCsv(contatos), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="contatos-bianca-${hoje}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}

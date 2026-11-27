import { sessaoValida } from '@/lib/auth/guard'
import { contatosParaCsv } from '@/lib/contatos/csv'
import { getStore } from '@/lib/contatos/get-store'
import { listarContatos } from '@/lib/contatos/servico'
import { ehEtapa } from '@/lib/contatos/types'
import { andamento, ehAberto, ROTULO_SITUACAO_CONTRATO } from '@/lib/consultorio/regras'
import { consultorioStore } from '@/lib/consultorio/store'
import { getDocs } from '@/lib/dados/get-docs'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!(await sessaoValida())) return new Response('Não autorizado', { status: 401 })
  const sp = new URL(request.url).searchParams
  const etapa = sp.get('etapa')
  const contatos = await listarContatos(getStore(), { etapa: ehEtapa(etapa) ? etapa : undefined, busca: sp.get('q') ?? undefined })
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const doc = await consultorioStore(getDocs()).ler()
  const planos = new Map<string, { plano: string; situacao: string }>()
  for (const k of Object.values(doc.contratos).filter(ehAberto)) {
    planos.set(k.contatoId, { plano: k.servico.nome, situacao: ROTULO_SITUACAO_CONTRATO[andamento(doc, k, hoje).situacao] })
  }
  return new Response(contatosParaCsv(contatos, planos), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="contatos-bianca-${hoje}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}

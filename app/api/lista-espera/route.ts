import { getStore } from '@/lib/contatos/get-store'
import { registrarInscricao } from '@/lib/contatos/servico'

export const dynamic = 'force-dynamic'

const LIMITE_BYTES = 10 * 1024
const json = (body: unknown, status = 200) => Response.json(body, { status })

export async function POST(request: Request) {
  const texto = await request.text()
  if (new TextEncoder().encode(texto).length > LIMITE_BYTES) return json({ ok: false, erros: { geral: 'Dados grandes demais.' } }, 413)

  let corpo: unknown
  try {
    corpo = JSON.parse(texto)
  } catch {
    return json({ ok: false, erros: { geral: 'Dados inválidos.' } }, 400)
  }
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) return json({ ok: false, erros: { geral: 'Dados inválidos.' } }, 400)

  // Honeypot: campo invisível que só robôs preenchem.
  const site = (corpo as Record<string, unknown>).site
  if (typeof site === 'string' && site.trim() !== '') return json({ ok: true })

  try {
    const r = await registrarInscricao(corpo, getStore())
    if (!r.ok) return json({ ok: false, erros: r.erros }, 400)
    return json({ ok: true })
  } catch (e) {
    console.error('[lista-espera] falha ao gravar inscrição', e)
    return json({ ok: false, erro: 'Não foi possível enviar agora. Tente novamente em instantes.' }, 500)
  }
}

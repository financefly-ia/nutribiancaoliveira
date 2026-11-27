// TEMPORÁRIO: diagnóstico de gravação condicional do Vercel Blob. Só toca em dados/diag-*.json.
import { BlobPreconditionFailedError, del, put } from '@vercel/blob'
import { atualizarDocumento, Conflito } from '@/lib/dados/documentos'
import { blobDocs } from '@/lib/dados/documentos-blob'

export const dynamic = 'force-dynamic'

const err = (e: unknown) => ({
  nome: (e as Error)?.name,
  ctor: (e as object)?.constructor?.name,
  precond: e instanceof BlobPreconditionFailedError,
  conflito: e instanceof Conflito,
  msg: String((e as Error)?.message).slice(0, 160),
})

async function tenta(nome: string, fn: () => Promise<unknown>) {
  const t = Date.now()
  try {
    return { nome, ok: true, ms: Date.now() - t, r: await fn() }
  } catch (e) {
    return { nome, ok: false, ms: Date.now() - t, erro: err(e) }
  }
}

export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get('k') !== 'bo-diag-7f3a') return new Response('not found', { status: 404 })
  const nome = `diag-${Date.now()}`
  const docs = blobDocs()
  const out: unknown[] = []
  // instanceof com o erro real do SDK
  const p = await put(`dados/${nome}-x.json`, '1', { access: 'private', addRandomSuffix: false, allowOverwrite: true })
  await put(`dados/${nome}-x.json`, '2', { access: 'private', addRandomSuffix: false, allowOverwrite: true })
  out.push(await tenta('precond-instanceof', () => put(`dados/${nome}-x.json`, '3', { access: 'private', addRandomSuffix: false, ifMatch: p.etag })))
  // fluxo exato do app
  const inicial = () => ({ itens: [] as number[] })
  out.push(await tenta('cria', () => atualizarDocumento(docs, nome, inicial, (d) => { d.itens.push(1) })))
  out.push(await tenta('atualiza-1', () => atualizarDocumento(docs, nome, inicial, (d) => { d.itens.push(2) })))
  out.push(await tenta('atualiza-2', () => atualizarDocumento(docs, nome, inicial, (d) => { d.itens.push(3) })))
  out.push(await tenta('concorrentes-5', () => Promise.all([4, 5, 6, 7, 8].map((n) => atualizarDocumento(docs, nome, inicial, (d) => { d.itens.push(n) })))))
  out.push(await tenta('lido', async () => (await docs.ler<{ itens: number[] }>(nome))?.dados.itens))
  await del([`dados/${nome}.json`, `dados/${nome}-x.json`]).catch(() => {})
  return Response.json(out)
}

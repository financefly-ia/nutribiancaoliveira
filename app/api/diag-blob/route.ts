// TEMPORÁRIO: diagnóstico de gravação condicional do Vercel Blob. Só toca em dados/diag-*.json.
import { BlobPreconditionFailedError, del, head, put } from '@vercel/blob'
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
  // Reproduz a 2ª gravação no documento criado pelo deploy anterior (só contagens, nenhum dado pessoal).
  out.push(await tenta('contatos-ler', async () => {
    const h = await head('dados/contatos.json').catch((e) => ({ erro: err(e) }))
    const l = await docs.ler<{ contatos: Record<string, unknown> }>('contatos')
    return { head: h && 'size' in h ? { size: h.size, etag: h.etag } : h, lido: l ? { n: Object.keys(l.dados.contatos ?? {}).length, etag: l.etag, chaves: Object.keys(l.dados) } : null }
  }))
  out.push(await tenta('contatos-gravar-com-correcao', () =>
    atualizarDocumento(docs, 'contatos', () => ({ contatos: {} }), (d: Record<string, unknown>) => { d.diag = Date.now() })))
  out.push(await tenta('contatos-gravar-de-novo', () =>
    atualizarDocumento(docs, 'contatos', () => ({ contatos: {} }), (d: Record<string, unknown>) => { d.diag = Date.now() + 1 })))
  // Limpeza: o documento de contatos ficou desatualizado (criado no deploy que foi revertido); a migração refaz.
  out.push(await tenta('limpeza', () => del(['dados/contatos.json', 'dados/diag-teste.json']).then(() => 'apagados')))
  out.push(await tenta('confere', async () => (await docs.ler('contatos')) === null))
  return Response.json(out)
}

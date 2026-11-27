// TEMPORÁRIO: diagnóstico de gravação condicional do Vercel Blob. Só toca em dados/diag-teste.json.
import { get, head, put } from '@vercel/blob'

export const dynamic = 'force-dynamic'

const P = 'dados/diag-teste.json'
const opts = { access: 'private' as const, addRandomSuffix: false, contentType: 'application/json' }

async function tenta(nome: string, fn: () => Promise<unknown>) {
  try {
    const r = await fn()
    return { nome, ok: true, r }
  } catch (e) {
    return { nome, ok: false, erro: `${(e as Error).name}: ${(e as Error).message}`.slice(0, 200) }
  }
}

export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get('k') !== 'bo-diag-7f3a') return new Response('not found', { status: 404 })
  const out: unknown[] = []
  const p1 = await put(P, JSON.stringify({ n: 1 }), { ...opts, allowOverwrite: true })
  const h1 = await head(P)
  const g1 = await get(P, { access: 'private', useCache: false })
  out.push({ etags: { put: p1.etag, head: h1.etag, get: g1?.blob.etag } })
  out.push(await tenta('ifMatch=get', () => put(P, JSON.stringify({ n: 2 }), { ...opts, ifMatch: g1!.blob.etag }).then((r) => r.etag)))
  const h2 = await head(P)
  out.push(await tenta('ifMatch=head', () => put(P, JSON.stringify({ n: 3 }), { ...opts, ifMatch: h2.etag }).then((r) => r.etag)))
  const p4 = await put(P, JSON.stringify({ n: 4 }), { ...opts, allowOverwrite: true })
  out.push(await tenta('ifMatch=put', () => put(P, JSON.stringify({ n: 5 }), { ...opts, ifMatch: p4.etag }).then((r) => r.etag)))
  const g2 = await get(P, { access: 'private', useCache: false })
  const semAspas = (g2?.blob.etag ?? '').replace(/^W\//, '').replace(/"/g, '')
  out.push(await tenta('ifMatch=get-sem-aspas', () => put(P, JSON.stringify({ n: 6 }), { ...opts, ifMatch: semAspas }).then((r) => r.etag)))
  out.push(await tenta('ifMatch=velho', () => put(P, JSON.stringify({ n: 7 }), { ...opts, ifMatch: p1.etag })))
  out.push(await tenta('criar-existente', () => put(P, JSON.stringify({ n: 8 }), { ...opts, allowOverwrite: false })))
  out.push(await tenta('get-inexistente', () => get('dados/nao-existe-diag.json', { access: 'private', useCache: false }).then((r) => r === null ? 'null' : r.statusCode)))
  return Response.json(out)
}

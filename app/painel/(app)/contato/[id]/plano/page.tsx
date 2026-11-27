import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FecharPlano } from '@/components/painel/Consultorio'
import { Topo } from '@/components/painel/Topo'
import { consultorioDoPainel, storeDoPainel } from '@/lib/contatos/dados-painel'
import { hojeSP } from '@/lib/contatos/datas'
import { novoId } from '@/lib/contatos/normalizar'
import { contratoAberto } from '@/lib/consultorio/regras'

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export default async function FecharPlanoPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const sp = await searchParams
  const store = await storeDoPainel()
  let c
  try {
    c = await store.get(id)
  } catch {
    c = null
  }
  if (!c) notFound()
  const doc = await consultorioDoPainel()
  const aberto = contratoAberto(doc, c.id)
  const renovar = um(sp.renovar)
  const renovando = !!aberto && aberto.id === renovar
  const servicos = doc.config.servicos.filter((s) => s.ativo)

  return (
    <>
      <Topo />
      <main className="pn-wrap pn-main" style={{ maxWidth: 640 }}>
        <Link href={`/painel/contato/${c.id}`} className="pn-voltar">← {c.nome}</Link>
        <p className="pn-eyebrow">{renovando ? 'Renovação' : 'Contratação'}</p>
        <h1 style={{ fontSize: '2rem', margin: '4px 0 16px' }}>{renovando ? 'Renovar plano' : 'Fechar plano'} · {c.nome.split(' ')[0]}</h1>
        {aberto && !renovando ? (
          <div className="pn-box">
            <p>{c.nome} já tem um plano em andamento ({aberto.servico.nome}). Para começar outro, use “Renovar” ou encerre o atual na página do contato.</p>
          </div>
        ) : (
          <>
            {renovando ? (
              <p className="pn-dica" style={{ marginBottom: 14 }}>
                O plano atual ({aberto!.servico.nome}) será encerrado hoje e o novo começa a contar na próxima consulta realizada.
              </p>
            ) : null}
            <FecharPlano contatoId={c.id} servicos={servicos} chave={novoId()} hoje={hojeSP()} renovarDe={renovando ? aberto!.id : undefined} />
          </>
        )}
      </main>
    </>
  )
}

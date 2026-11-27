import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FormConsulta } from '@/components/painel/Consultorio'
import { Topo } from '@/components/painel/Topo'
import { consultorioDoPainel, storeDoPainel } from '@/lib/contatos/dados-painel'
import { hojeSP } from '@/lib/contatos/datas'
import { ehDataValida } from '@/lib/contatos/validacao'
import { consultasDoContato } from '@/lib/consultorio/regras'

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
const voltaSegura = (v: string, padrao: string) => (/^\/painel(\/[\w/?=&.-]*)?$/.test(v) ? v : padrao)

export default async function ConsultaPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const sp = await searchParams
  const [contatos, doc] = await Promise.all([(await storeDoPainel()).list(), consultorioDoPainel()])
  const nova = id === 'nova'
  const consulta = nova ? undefined : doc.consultas[id]
  if (!nova && !consulta) notFound()

  const contatoId = consulta?.contatoId ?? um(sp.contato)
  const volta = voltaSegura(um(sp.volta), contatoId ? `/painel/contato/${contatoId}` : '/painel/agenda')
  const data = consulta?.data ?? (ehDataValida(um(sp.data)) ? um(sp.data) : hojeSP())
  const anterior = contatoId ? consultasDoContato(doc, contatoId).at(-1) : undefined
  const lista = contatos
    .filter((c) => c.etapa !== 'sem_interesse' || c.id === contatoId)
    .map((c) => ({ id: c.id, nome: c.nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const nome = consulta ? contatos.find((c) => c.id === consulta.contatoId)?.nome ?? 'Contato removido' : undefined

  return (
    <>
      <Topo />
      <main className="pn-wrap pn-main" style={{ maxWidth: 640 }}>
        <Link href={volta} className="pn-voltar">← Voltar</Link>
        <h1 style={{ fontSize: '2rem', margin: '4px 0 16px' }}>{nova ? 'Nova consulta' : 'Editar consulta'}</h1>
        <FormConsulta
          contatos={lista}
          volta={volta}
          nomeFixo={nome}
          inicial={{
            id: consulta?.id,
            contatoId,
            data,
            hora: consulta?.hora ?? (/^([01]\d|2[0-3]):[0-5]\d$/.test(um(sp.hora)) ? um(sp.hora) : '09:00'),
            duracao: String(consulta?.duracaoMin ?? anterior?.duracaoMin ?? 60),
            formato: consulta?.formato ?? anterior?.formato ?? 'online',
            tipo: consulta?.tipo ?? '',
            situacao: consulta?.situacao,
          }}
        />
        {nova ? (
          <p className="pn-dica">
            Agendar para quem está na lista de espera ou em conversa move o contato para “Consulta agendada”. Se a pessoa já tem plano, a consulta entra na contagem dele.
          </p>
        ) : (
          <p className="pn-dica">Para remarcar, é só mudar a data ou o horário. “Desmarcada” mantém o registro e libera o horário.</p>
        )}
      </main>
    </>
  )
}

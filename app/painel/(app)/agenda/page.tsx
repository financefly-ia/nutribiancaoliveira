import { Calendario, type Evento, type Vista } from '@/components/painel/Calendario'
import { Topo } from '@/components/painel/Topo'
import { consultorioDoPainel, modelosDoPainel, storeDoPainel } from '@/lib/contatos/dados-painel'
import { hojeSP, segundaDaSemana, somarDias, somarMeses } from '@/lib/contatos/datas'
import { preencher } from '@/lib/contatos/mensagens'
import { ehDataValida } from '@/lib/contatos/validacao'
import { extrasConsulta } from '@/lib/consultorio/extras'
import { consultasDoContrato, horaFim, ordinal } from '@/lib/consultorio/regras'
import { rotuloTipo } from '@/lib/consultorio/tipos'

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
const VISTAS: Vista[] = ['mes', 'semana', 'dia']

/** Dias visíveis: mês = semanas completas (seg–dom) que cobrem o mês; semana = seg–dom; dia = o dia. */
function intervalo(vista: Vista, data: string): { inicio: string; fim: string } {
  if (vista === 'dia') return { inicio: data, fim: data }
  if (vista === 'semana') {
    const seg = segundaDaSemana(data)
    return { inicio: seg, fim: somarDias(seg, 6) }
  }
  const primeiro = `${data.slice(0, 7)}-01`
  const ultimo = somarDias(somarMeses(primeiro, 1), -1)
  return { inicio: segundaDaSemana(primeiro), fim: somarDias(segundaDaSemana(ultimo), 6) }
}

export default async function Agenda({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const hoje = hojeSP()
  const vista: Vista = VISTAS.includes(um(sp.vista) as Vista) ? (um(sp.vista) as Vista) : 'semana'
  // ?semana= continua valendo para links antigos
  const ref = [um(sp.data), um(sp.semana)].find(ehDataValida) ?? hoje
  const { inicio, fim } = intervalo(vista, ref)

  const [contatos, doc, modelos] = await Promise.all([(await storeDoPainel()).list(), consultorioDoPainel(), modelosDoPainel()])
  const porId = new Map(contatos.map((c) => [c.id, c]))
  const eventos: Evento[] = Object.values(doc.consultas)
    .filter((c) => c.data >= inicio && c.data <= fim)
    .sort((a, b) => `${a.data} ${a.hora}`.localeCompare(`${b.data} ${b.hora}`))
    .map((c) => {
      const contato = porId.get(c.contatoId)
      const contrato = c.contratoId ? doc.contratos[c.contratoId] : undefined
      const n = contrato ? ordinal(c, consultasDoContrato(doc, contrato.id)) : null
      return {
        id: c.id,
        contatoId: c.contatoId,
        nome: contato?.nome ?? 'Contato removido',
        whatsapp: contato?.whatsapp,
        mensagem: contato ? preencher(modelos.confirmacao, contato, extrasConsulta(c)) : undefined,
        data: c.data,
        hora: c.hora,
        fim: horaFim(c),
        duracaoMin: c.duracaoMin,
        formato: c.formato,
        tipo: `${rotuloTipo(c.tipo)}${n && contrato && contrato.servico.consultas > 1 ? ` ${n}/${contrato.servico.consultas}` : ''}`,
        plano: contrato?.servico.nome,
        situacao: c.situacao,
      }
    })

  return (
    <>
      <Topo />
      <main className="pn-wrap pn-main pn-agenda">
        <Calendario key={`${vista}-${ref}`} vista={vista} data={ref} hoje={hoje} inicio={inicio} fim={fim} eventos={eventos} />
      </main>
    </>
  )
}

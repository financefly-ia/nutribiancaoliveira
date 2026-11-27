import { dataBR, dataCurta } from '@/lib/contatos/datas'
import type { Extras } from '@/lib/contatos/mensagens'
import { reais } from './dinheiro'
import type { Consulta, Parcela } from './tipos'

export const extrasConsulta = (c?: Consulta): Extras =>
  c ? { data: dataCurta(c.data), hora: c.hora, formato: c.formato === 'online' ? 'online' : 'presencial' } : {}

export const extrasParcela = (p?: Parcela): Extras => (p ? { valor: reais(p.valorCentavos), vencimento: dataBR(p.vencimento) } : {})

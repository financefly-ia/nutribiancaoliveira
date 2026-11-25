import { formatarData, formatarWhatsapp } from './formatar'
import { rotuloEtapa, rotuloOrigem, type Contato } from './types'

const CABECALHO = ['Nome', 'E-mail', 'WhatsApp', 'Objetivo', 'Etapa', 'Origem', 'Entrou em', 'Última nota']

function celula(v: string | undefined): string {
  let s = v ?? ''
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}` // impede o Excel de interpretar como fórmula
  return `"${s.replace(/"/g, '""')}"`
}

/** CSV para Excel (pt-BR): BOM UTF-8, separador ';', CRLF, todos os campos entre aspas. */
export function contatosParaCsv(contatos: Contato[]): string {
  const linhas = [CABECALHO.join(';')]
  for (const c of contatos) {
    linhas.push(
      [c.nome, c.email, formatarWhatsapp(c.whatsapp), c.objetivo, rotuloEtapa(c.etapa), rotuloOrigem(c.origem), formatarData(c.criadoEm), c.notas[0]?.texto]
        .map(celula)
        .join(';'),
    )
  }
  return '﻿' + linhas.join('\r\n') + '\r\n'
}

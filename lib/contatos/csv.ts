import { formatarData, formatarWhatsapp } from './formatar'
import { rotuloEtapa, rotuloOrigem, type Contato } from './types'

const CABECALHO = ['Nome', 'E-mail', 'WhatsApp', 'Objetivo', 'Etapa', 'Origem', 'Entrou em', 'Última nota', 'Nascimento', 'Retomar em', 'Plano atual', 'Situação do plano']

function celula(v: string | undefined): string {
  let s = v ?? ''
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}` // impede o Excel de interpretar como fórmula
  return `"${s.replace(/"/g, '""')}"`
}

/** YYYY-MM-DD → DD/MM/AAAA (sem passar por fuso horário). */
const dataCivil = (d?: string) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '')

/** CSV para Excel (pt-BR): BOM UTF-8, separador ';', CRLF, todos os campos entre aspas. */
/** `planos`: id do contato → plano em andamento (nome e situação), quando houver. */
export function contatosParaCsv(contatos: Contato[], planos: Map<string, { plano: string; situacao: string }> = new Map()): string {
  const linhas = [CABECALHO.join(';')]
  for (const c of contatos) {
    linhas.push(
      [
        c.nome, c.email, formatarWhatsapp(c.whatsapp), c.objetivo, rotuloEtapa(c.etapa), rotuloOrigem(c.origem), formatarData(c.criadoEm), c.notas[0]?.texto,
        dataCivil(c.nascimento), dataCivil(c.retomarEm), planos.get(c.id)?.plano, planos.get(c.id)?.situacao,
      ]
        .map(celula)
        .join(';'),
    )
  }
  return '﻿' + linhas.join('\r\n') + '\r\n'
}

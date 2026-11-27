import { expect, test } from 'vitest'
import { contatosParaCsv } from '@/lib/contatos/csv'
import type { Contato } from '@/lib/contatos/types'

const contato = (p: Partial<Contato>): Contato => ({
  id: 'x', nome: 'X', whatsapp: '11988887777', origem: 'site', etapa: 'lista', notas: [], criadoEm: '2026-12-01T12:00:00Z', atualizadoEm: '2026-12-01T12:00:00Z', ...p,
})

test('csv escapa e abre no Excel', () => {
  const csv = contatosParaCsv([contato({
    nome: 'João "Jo"', email: 'jo@x.com', objetivo: 'Perder 5kg; ganhar energia\nsem sofrer 💪', etapa: 'conversa', origem: 'indicacao',
    criadoEm: '2026-12-03T12:00:00Z', notas: [{ texto: 'Liguei', criadoEm: '2026-12-04T00:00:00Z' }],
  })])
  expect(csv.startsWith('﻿Nome;E-mail;WhatsApp;Objetivo;Etapa;Origem;Entrou em;Última nota\r\n')).toBe(true)
  expect(csv).toContain('"João ""Jo"""')
  expect(csv).toContain('"Perder 5kg; ganhar energia\nsem sofrer 💪"')
  expect(csv).toContain('"Em conversa";"Indicação";"03/12/2026";"Liguei"')
  expect(csv).toContain('"(11) 98888-7777"')
})

test('campos ausentes viram vazio e linhas terminam com CRLF', () => {
  const csv = contatosParaCsv([contato({}), contato({ nome: 'Y' })])
  const linhas = csv.split('\r\n')
  expect(linhas).toHaveLength(4) // cabeçalho + 2 + vazio final
  expect(linhas[1]).toBe('"X";"";"(11) 98888-7777";"";"Lista de espera";"Site";"01/12/2026";""')
})

test('fórmulas não são executadas pelo Excel', () => {
  const csv = contatosParaCsv([contato({ nome: '=HYPERLINK("x")', objetivo: '+5kg' })])
  expect(csv).toContain(`"'=HYPERLINK(""x"")"`)
  expect(csv).toContain(`"'+5kg"`)
})

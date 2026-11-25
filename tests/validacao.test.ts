import { expect, test } from 'vitest'
import { validarContatoManual, validarInscricao } from '@/lib/contatos/validacao'

test('inscrição válida', () => {
  const r = validarInscricao({ nome: ' Ana Souza ', email: 'ANA@x.com', whatsapp: '(11) 98888-7777', objetivo: 'Emagrecer com saúde', consentimento: true })
  expect(r).toEqual({ ok: true, dados: { nome: 'Ana Souza', email: 'ana@x.com', whatsapp: '11988887777', objetivo: 'Emagrecer com saúde', consentimento: true } })
})

test('inscrição sem consentimento e com whatsapp curto', () => {
  const r = validarInscricao({ nome: 'Ana', email: 'a@b.co', whatsapp: '9888', objetivo: 'abc', consentimento: false })
  expect(r.ok).toBe(false)
  if (!r.ok) {
    expect(Object.keys(r.erros).sort()).toEqual(['consentimento', 'whatsapp'])
    expect(r.erros.whatsapp).toBe('Informe um WhatsApp com DDD.')
    expect(r.erros.consentimento).toBe('É preciso autorizar o uso dos dados para entrar na lista.')
  }
})

test('mensagens de nome, e-mail e objetivo', () => {
  const r = validarInscricao({ nome: 'A', email: 'nao-e-email', whatsapp: '11988887777', objetivo: '', consentimento: true })
  expect(r).toEqual({ ok: false, erros: {
    nome: 'Informe seu nome completo.', email: 'Informe um e-mail válido.', objetivo: 'Conte qual é o seu principal objetivo.',
  } })
})

test('limites de tamanho', () => {
  const r = validarInscricao({ nome: 'x'.repeat(121), email: 'a@b.co', whatsapp: '11988887777', objetivo: 'y'.repeat(1501), consentimento: true })
  expect(r.ok).toBe(false)
  if (!r.ok) expect(Object.keys(r.erros).sort()).toEqual(['nome', 'objetivo'])
})

test('input não-objeto ou tipos errados são rejeitados sem lançar', () => {
  expect(validarInscricao(null).ok).toBe(false)
  expect(validarInscricao('x').ok).toBe(false)
  expect(validarInscricao({ nome: 5, email: [], whatsapp: {}, objetivo: null, consentimento: 'true' }).ok).toBe(false)
})

test('contato manual: email opcional, origem/etapa default', () => {
  const r = validarContatoManual({ nome: 'Bia', whatsapp: '11988887777' })
  expect(r).toEqual({ ok: true, dados: { nome: 'Bia', whatsapp: '11988887777', origem: 'outro', etapa: 'lista' } })
})

test('contato manual com campos opcionais vazios os omite', () => {
  const r = validarContatoManual({ nome: 'Bia', whatsapp: '11988887777', email: '  ', objetivo: '', origem: 'instagram', etapa: 'conversa' })
  expect(r).toEqual({ ok: true, dados: { nome: 'Bia', whatsapp: '11988887777', origem: 'instagram', etapa: 'conversa' } })
})

test('contato manual rejeita etapa/origem inválidas e e-mail malformado', () => {
  const r = validarContatoManual({ nome: 'Bia', whatsapp: '11988887777', etapa: 'xpto', origem: 'tiktok', email: 'x@' })
  expect(r.ok).toBe(false)
  if (!r.ok) expect(Object.keys(r.erros).sort()).toEqual(['email', 'etapa', 'origem'])
})

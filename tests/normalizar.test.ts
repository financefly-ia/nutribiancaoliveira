import { expect, test } from 'vitest'
import { idPorEmail, normalizarEmail, normalizarWhatsapp, novoId } from '@/lib/contatos/normalizar'

test('normaliza whatsapp em vários formatos', () => {
  for (const v of ['+55 (11) 98888-7777', '11988887777', '5511988887777', ' 11 98888 7777 '])
    expect(normalizarWhatsapp(v)).toBe('11988887777')
  expect(normalizarWhatsapp('(21) 3333-4444')).toBe('2133334444')
  expect(normalizarWhatsapp('552133334444')).toBe('2133334444')
})

test('normaliza e-mail', () => {
  expect(normalizarEmail('  Ana@Gmail.COM ')).toBe('ana@gmail.com')
})

test('email com maiúsculas e espaços gera o mesmo id', () => {
  expect(idPorEmail(' Ana@Gmail.com ')).toBe(idPorEmail('ana@gmail.com'))
  expect(idPorEmail('ana@gmail.com')).toMatch(/^[a-f0-9]{32}$/)
})

test('novoId é único e seguro para caminho', () => {
  const a = novoId(), b = novoId()
  expect(a).not.toBe(b)
  expect(a).toMatch(/^m[a-f0-9]{32}$/)
})

import { expect, test } from 'vitest'
import { mascararWhatsapp } from '@/lib/contatos/formatar'

test('máscara progressiva', () => {
  expect(mascararWhatsapp('11')).toBe('11')
  expect(mascararWhatsapp('119888')).toBe('(11) 9888')
  expect(mascararWhatsapp('11988887777')).toBe('(11) 98888-7777')
})

test('número colado/autopreenchido com +55 não é corrompido', () => {
  expect(mascararWhatsapp('+55 (11) 98888-7777')).toBe('(11) 98888-7777')
  expect(mascararWhatsapp('5511988887777')).toBe('(11) 98888-7777')
  expect(mascararWhatsapp('+55 41 98715-5105')).toBe('(41) 98715-5105')
  expect(mascararWhatsapp('552133334444')).toBe('(21) 3333-4444')
})

test('fixo com 10 dígitos formata com 4+4', () => {
  expect(mascararWhatsapp('2133334444')).toBe('(21) 3333-4444')
})

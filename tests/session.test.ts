import { expect, test } from 'vitest'
import { criarToken, senhaConfere, verificarToken } from '@/lib/auth/session'

test('token válido até 30 dias', () => {
  const t = criarToken('s', new Date('2026-01-01T00:00:00Z'))
  expect(verificarToken(t, 's', new Date('2026-01-30T00:00:00Z'))).toBe(true)
  expect(verificarToken(t, 's', new Date('2026-02-01T00:00:00Z'))).toBe(false)
})

test('secret diferente, adulterado, vazio → false', () => {
  const t = criarToken('s')
  expect(verificarToken(t, 'outro')).toBe(false)
  const [exp, sig] = t.split('.')
  expect(verificarToken(`${Number(exp) + 1000}.${sig}`, 's')).toBe(false)
  expect(verificarToken(undefined, 's')).toBe(false)
  expect(verificarToken('lixo', 's')).toBe(false)
  expect(verificarToken('1.2.3', 's')).toBe(false)
  expect(verificarToken(t, '')).toBe(false)
})

test('senhaConfere compara com segurança', () => {
  expect(senhaConfere('abc123', 'abc123')).toBe(true)
  expect(senhaConfere('abc124', 'abc123')).toBe(false)
  expect(senhaConfere('', 'abc123')).toBe(false)
  expect(senhaConfere('abc', '')).toBe(false)
})

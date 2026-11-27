import { expect, test } from 'vitest'
import { linkWhatsapp } from '@/lib/contatos/formatar'
import { lerModelos, MODELOS_PADRAO, preencher, salvarModelos } from '@/lib/contatos/mensagens'
import { memoriaDocs } from '@/lib/dados/documentos'

test('preencher usa o primeiro nome, nome completo e objetivo', () => {
  expect(preencher('Oi, {nome}! ({nome_completo}) {objetivo}', { nome: '  Ana Maria Souza ', objetivo: 'Emagrecer' })).toBe(
    'Oi, Ana! (Ana Maria Souza) Emagrecer',
  )
  expect(preencher('{objetivo}.', { nome: 'Ana' })).toBe('.')
})

test('link do WhatsApp leva o texto codificado', () => {
  expect(linkWhatsapp('41987155105')).toBe('https://wa.me/5541987155105')
  expect(linkWhatsapp('41987155105', 'Oi, Ana! 😊 & tal')).toBe(
    'https://wa.me/5541987155105?text=Oi%2C%20Ana!%20%F0%9F%98%8A%20%26%20tal',
  )
})

test('modelos: padrão, personalizar, voltar ao padrão com texto vazio, limite', async () => {
  const d = memoriaDocs()
  expect(await lerModelos(d)).toEqual(MODELOS_PADRAO)
  await salvarModelos(d, { lista: 'Olá {nome}', conversa: '' })
  expect((await lerModelos(d)).lista).toBe('Olá {nome}')
  expect((await lerModelos(d)).conversa).toBe(MODELOS_PADRAO.conversa)
  await salvarModelos(d, { lista: '' })
  expect((await lerModelos(d)).lista).toBe(MODELOS_PADRAO.lista)
  expect(await salvarModelos(d, { lista: 'x'.repeat(1001) })).toEqual({ ok: false, erros: { lista: 'Use até 1000 caracteres.' } })
})

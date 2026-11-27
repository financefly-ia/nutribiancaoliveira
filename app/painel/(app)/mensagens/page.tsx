import { redirect } from 'next/navigation'

/** A antiga aba "Mensagens" agora fica em Ajustes. */
export default function MensagensPage() {
  redirect('/painel/ajustes?secao=mensagens')
}

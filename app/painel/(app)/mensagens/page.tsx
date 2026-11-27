import { EditarModelos } from '@/components/painel/Formularios'
import { Topo } from '@/components/painel/Topo'
import { modelosDoPainel } from '@/lib/contatos/dados-painel'

export default async function MensagensPage() {
  const modelos = await modelosDoPainel()
  return (
    <>
      <Topo />
      <main className="pn-wrap pn-main" style={{ maxWidth: 720 }}>
        <p className="pn-eyebrow">Mensagens prontas</p>
        <h1 style={{ fontSize: '2rem', margin: '4px 0 8px' }}>Seus modelos</h1>
        <p style={{ marginBottom: 18 }}>
          Cada etapa tem uma mensagem sugerida, que aparece já escrita quando você toca em WhatsApp. Use <b>{'{nome}'}</b> para o primeiro
          nome da pessoa, <b>{'{nome_completo}'}</b> e <b>{'{objetivo}'}</b>.
        </p>
        <EditarModelos modelos={modelos} />
      </main>
    </>
  )
}

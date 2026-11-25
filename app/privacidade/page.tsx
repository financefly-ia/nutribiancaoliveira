import Link from 'next/link'
import type { Metadata } from 'next'
import { Footer } from '@/components/site/Footer'
import { Nav } from '@/components/site/Nav'
import { SvgDefs } from '@/components/site/SvgDefs'
import { CONTATO_BIANCA } from '@/lib/config'

export const metadata: Metadata = {
  title: 'Política de Privacidade · Bianca Oliveira Nutrição',
  description: 'Como seus dados são usados na lista de espera de Bianca Oliveira · Nutrição.',
}

export default function Privacidade() {
  return (
    <>
      <SvgDefs />
      <Nav />
      <main className="legal">
        <div className="wrap">
          <div className="eyebrow">Transparência</div>
          <h1>Política de <em>Privacidade</em></h1>
          <p>Esta página explica, de forma simples, como são tratados os dados que você informa ao entrar na lista de espera de Bianca Oliveira · Nutrição, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p>

          <h2>Quais dados coletamos</h2>
          <ul>
            <li>Nome completo;</li>
            <li>E-mail;</li>
            <li>WhatsApp;</li>
            <li>O principal objetivo que você deseja alcançar com o acompanhamento nutricional (texto que você escreve).</li>
          </ul>

          <h2>Para que usamos</h2>
          <p>Exclusivamente para entrar em contato com você sobre a abertura de vagas e sobre os atendimentos nutricionais. Seus dados não são vendidos, compartilhados com terceiros para fins comerciais nem usados para outras finalidades.</p>

          <h2>Base legal</h2>
          <p>O tratamento é feito com base no seu consentimento, dado ao marcar a caixa de autorização no formulário. Como o objetivo informado pode conter informações sobre sua saúde, esse consentimento é específico para a finalidade descrita acima.</p>

          <h2>Onde ficam e quem acessa</h2>
          <p>Os dados ficam armazenados de forma privada em infraestrutura de nuvem (Vercel) e só podem ser acessados pela Bianca, por meio de área protegida por senha.</p>

          <h2>Por quanto tempo</h2>
          <p>Mantemos seus dados enquanto houver interesse no contato sobre os atendimentos, ou até você pedir a remoção. Se não houver contato por 2 anos, os dados são descartados.</p>

          <h2>Seus direitos</h2>
          <p>Você pode, a qualquer momento, pedir para acessar, corrigir ou remover seus dados, ou retirar seu consentimento. Basta entrar em contato:</p>
          <ul>
            <li>WhatsApp: <a href={CONTATO_BIANCA.whatsappLink} target="_blank" rel="noopener noreferrer">{CONTATO_BIANCA.whatsapp}</a></li>
            <li>Instagram: <a href={CONTATO_BIANCA.instagramLink} target="_blank" rel="noopener noreferrer">{CONTATO_BIANCA.instagram}</a></li>
          </ul>

          <p style={{ marginTop: 40 }}><Link href="/">← Voltar ao início</Link></p>
        </div>
      </main>
      <Footer />
    </>
  )
}

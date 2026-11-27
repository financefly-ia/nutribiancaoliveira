import Image from 'next/image'

export function Footer() {
  return (
    <footer>
      <Image src="/images/logo-horizontal.png" alt="Bianca Oliveira · Nutrição" width={727} height={346} sizes="230px" className="logo-rodape" />
      <p className="tag">Cuidado nutricional para a sua melhor versão.</p>
      <p className="meta">
        Bianca Oliveira · Nutrição · © 2027 · <a href="/privacidade">Política de Privacidade</a>
      </p>
    </footer>
  )
}

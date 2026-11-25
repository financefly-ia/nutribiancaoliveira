import { Monograma } from './SvgDefs'

export function Footer() {
  return (
    <footer>
      <Monograma />
      <p className="tag">Cuidado nutricional para a sua melhor versão.</p>
      <p className="meta">
        Bianca Oliveira · Nutrição · © 2027 · <a href="/privacidade">Política de Privacidade</a>
      </p>
    </footer>
  )
}

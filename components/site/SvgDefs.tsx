const serif = { fontFamily: 'var(--font-playfair), Georgia, serif' }

/** Símbolos reutilizáveis (folha, monograma BO, gradiente cobre) — idênticos ao mockup. */
export function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <linearGradient id="cobre" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4A2E27" />
          <stop offset=".55" stopColor="#A85A47" />
          <stop offset="1" stopColor="#D7875B" />
        </linearGradient>
        <symbol id="folha" viewBox="0 0 100 100">
          <path d="M12 92 C 34 70, 58 44, 88 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M88 8 C 62 12, 36 30, 30 72 C 56 64, 78 44, 88 8 Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M40 60 C 50 52, 58 42, 66 34 M48 50 L 44 40 M58 40 L 54 28 M50 54 L 62 52 M60 42 L 72 40" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </symbol>
        <symbol id="bo" viewBox="0 0 120 130">
          <text x="2" y="88" style={serif} fontSize="96" fill="url(#cobre)">B</text>
          <text x="36" y="120" style={serif} fontSize="96" fill="url(#cobre)">O</text>
          <use href="#folha" x="60" y="62" width="40" height="40" style={{ color: '#A85A47' }} />
        </symbol>
      </defs>
    </svg>
  )
}

export function Monograma(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 130" role="img" aria-label="Monograma BO" {...props}>
      <use href="#bo" />
    </svg>
  )
}

export function Folha(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" {...props}>
      <use href="#folha" />
    </svg>
  )
}

import Image from 'next/image'
import { Folha, Monograma } from './SvgDefs'

export function Hero() {
  return (
    <header className="wrap hero">
      <div className="hero-text reveal">
        <div className="eyebrow">Nutricionista · Atendimentos em breve</div>
        <h1>
          Bianca Oliveira<em>Nutrição com estratégia, individualidade e propósito.</em>
        </h1>
        <p className="lead">Acredito que resultados consistentes começam quando entendemos que cada pessoa precisa de um caminho próprio.</p>
        <p>
          Meu trabalho é transformar conhecimento nutricional em estratégias que façam sentido para sua rotina, seus objetivos e sua saúde.
          Uma alimentação que funciona na sua vida. E resultados que você consegue construir ao longo do tempo.
        </p>
        <div className="hero-ctas">
          <a href="#metodo" className="btn btn-solid">
            Conheça minha forma de trabalhar <span className="arrow">→</span>
          </a>
          <a href="#lista" className="btn btn-ghost">Lista de espera</a>
        </div>
      </div>
      <div className="hero-visual reveal">
        <div className="painel-linha" />
        <div className="painel">
          <svg viewBox="0 0 400 600" preserveAspectRatio="none" fill="none" stroke="#F8F6F1" strokeWidth="1" aria-hidden="true">
            <path d="M-20 520 C 80 420, 140 460, 220 340 S 360 180, 440 120" />
            <path d="M-20 300 C 60 260, 120 330, 200 250 S 330 90, 420 60" />
            <path d="M60 640 C 120 520, 260 540, 300 420 S 380 300, 430 330" />
          </svg>
        </div>
        <svg className="folha-hero" aria-hidden="true"><use href="#folha" /></svg>
        <Image
          src="/images/bianca-recorte.webp"
          alt="Bianca Oliveira, nutricionista"
          width={823}
          height={1448}
          priority
          sizes="(max-width: 900px) 80vw, 45vw"
        />
        <svg className="seal" viewBox="0 0 140 140" aria-hidden="true">
          <defs>
            <path id="circ" d="M70 70 m-54 0 a54 54 0 1 1 108 0 a54 54 0 1 1 -108 0" />
          </defs>
          <circle cx="70" cy="70" r="68" fill="#F8F6F1" />
          <text style={{ fontFamily: 'var(--font-montserrat), sans-serif' }} fontSize="8" letterSpacing="2.4" fill="#A85A47">
            <textPath href="#circ">CUIDADO NUTRICIONAL · SUA MELHOR VERSÃO ·</textPath>
          </text>
        </svg>
        <div className="seal-center">
          <Monograma aria-hidden="true" />
        </div>
      </div>
      <a href="#sobre" className="descer">
        <span className="descer-circ" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
        </span>
        Conheça a Bianca
      </a>
    </header>
  )
}

const PALAVRAS = ['Ciência', 'Individualidade', 'Estratégia', 'Autonomia', 'Resultados construídos']

/** Faixa de valores: estática, no padrão de apoio da identidade (terracota com traços de folha). */
export function Marquee() {
  return (
    <div className="valores">
      <svg className="valores-padrao" viewBox="0 0 1200 120" preserveAspectRatio="xMidYMid slice" fill="none" stroke="#F6D2BB" strokeWidth="1" aria-hidden="true">
        <path d="M-40 100 C 120 40, 260 120, 420 60 S 700 -10, 880 50 S 1120 110, 1260 30" />
        <path d="M-40 30 C 160 80, 320 0, 520 40 S 860 120, 1040 70 S 1200 20, 1260 60" />
      </svg>
      <ul className="wrap">
        {PALAVRAS.map((p) => (
          <li key={p}>
            <svg className="valores-sep" aria-hidden="true"><use href="#folha" /></svg>
            {p}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Sobre() {
  return (
    <section id="sobre">
      <div className="wrap">
        <div className="sobre">
          <div className="sobre-img reveal">
            <div className="frame">
              <Image src="/images/bianca-sobre.jpg" alt="Retrato de Bianca Oliveira sorrindo" width={1024} height={1536} sizes="(max-width: 900px) 92vw, 40vw" />
            </div>
            <figure className="tag">
              <blockquote>
                <p>“Porque não basta saber o que precisa ser feito.</p>
                <p className="tag-2">É preciso encontrar a melhor maneira de fazer acontecer.”</p>
              </blockquote>
            </figure>
          </div>
          <div className="reveal">
            <div className="eyebrow">Quem sou eu</div>
            <h2>
              Prazer, sou a <em>Bianca!</em>
            </h2>
            <p>Escolhi a Nutrição porque sempre enxerguei na alimentação uma ferramenta poderosa de transformação.</p>
            <p>A possibilidade de contribuir para a saúde, a qualidade de vida e a forma como uma pessoa se relaciona com o próprio corpo foi o que me fez escolher esse caminho.</p>
            <p>Ao longo da minha trajetória, fui compreendendo que bons resultados não dependem apenas de saber o que comer, mas de entender como colocar esse conhecimento em prática.</p>
            <p>Acredito em uma nutrição que une ciência e individualidade. Que considera exames, hábitos, preferências, rotina e objetivos para construir estratégias realmente aplicáveis à vida de cada pessoa.</p>
          </div>
        </div>

        <div className="pilares">
          <div className="pilar reveal">
            <div className="ico">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v6L5 19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2l-5-10V3" /><path d="M7.5 14h9" /></svg>
            </div>
            <h3>Ciência</h3>
            <p>Decisões baseadas em evidências, exames e avaliação completa.</p>
          </div>
          <div className="pilar reveal">
            <div className="ico">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
            </div>
            <h3>Individualidade</h3>
            <p>Seus hábitos, preferências e rotina no centro de cada escolha.</p>
          </div>
          <div className="pilar reveal">
            <div className="ico">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17c3-1 5-4 7-8s5-6 11-6c0 6-2 9-6 11s-7 4-8 7" /><path d="M8 14l3 3" /></svg>
            </div>
            <h3>Estratégia</h3>
            <p>Um caminho possível, com etapas claras e propósito definido.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

const ETAPAS_METODO = [
  ['01', 'Avaliação completa', 'Exames, hábitos, preferências, rotina e histórico — tudo começa por entender você.'],
  ['02', 'Definição de objetivos', 'Clareza sobre onde você quer chegar e o que precisa ser trabalhado.'],
  ['03', 'Estratégia individualizada', 'Um plano construído para a sua vida real, não para uma rotina idealizada.'],
  ['04', 'Acompanhamento e ajustes', 'Evolução ao longo do tempo, com ajustes e autonomia para manter seus resultados.'],
]

export function Metodo() {
  return (
    <section className="metodo" id="metodo">
      <svg className="bg-leaf" aria-hidden="true"><use href="#folha" style={{ color: '#F8F6F1' }} /></svg>
      <div className="wrap">
        <div className="metodo-head">
          <div className="reveal">
            <div className="eyebrow">Como quero cuidar de você</div>
            <h2>
              Resultados não acontecem por acaso. <em>Eles são construídos.</em>
            </h2>
          </div>
          <div className="reveal">
            <p>
              Acredito em um acompanhamento nutricional que vai além da entrega de um plano alimentar. Cada etapa tem um propósito: entender suas
              necessidades, identificar o que precisa ser trabalhado e construir mudanças que contribuam para os resultados que você busca.
            </p>
          </div>
        </div>
        <div className="steps">
          {ETAPAS_METODO.map(([n, t, d]) => (
            <div className="step reveal" key={n}>
              <span className="n">{n}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
        <div className="metodo-quote reveal">
          <svg className="metodo-quote-folha" aria-hidden="true"><use href="#folha" /></svg>
          <p>
            Não se trata apenas de seguir um plano. <em>Trata-se de aprender a fazer escolhas que te aproximem dos seus objetivos.</em>
          </p>
        </div>
      </div>
    </section>
  )
}

export function Convite() {
  return (
    <section className="convite">
      <svg className="pattern" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" fill="none" stroke="#F6D2BB" strokeWidth="1" aria-hidden="true">
        <path d="M-50 480 C 150 380, 260 520, 420 380 S 700 120, 900 180 S 1150 380, 1260 260" />
        <path d="M-50 220 C 120 160, 240 260, 380 200 S 640 40, 820 80" />
        <path d="M700 660 C 760 520, 900 560, 980 440 S 1120 300, 1260 340" />
        <path d="M980 440 C 1010 400, 1060 390, 1090 410 C 1060 440, 1020 450, 980 440 Z" />
        <path d="M420 380 C 440 330, 490 310, 520 320 C 500 360, 460 380, 420 380 Z" />
      </svg>
      <div className="wrap inner reveal">
        <div className="eyebrow">Vamos construir seus resultados?</div>
        <h2>
          Seus objetivos merecem <em>um plano.</em>
        </h2>
        <p>Se você busca uma nutrição que combine conhecimento científico, estratégia e respeito à sua individualidade, talvez esse seja o acompanhamento que você procura.</p>
        <p>
          Estou preparando uma nova etapa da minha trajetória e, em breve, iniciarei meus atendimentos. Entre na lista de espera para receber
          informações sobre a abertura das vagas e dar o primeiro passo em direção aos seus objetivos.
        </p>
        <a href="#lista" className="btn">
          Quero entrar na lista de espera <span className="arrow">→</span>
        </a>
      </div>
    </section>
  )
}

export function ListaEspera({ children }: { children: React.ReactNode }) {
  return (
    <section id="lista">
      <div className="wrap form-sec">
        <div className="side reveal">
          <div className="eyebrow">Lista de espera</div>
          <h2>
            Vamos dar o <em>primeiro passo?</em>
          </h2>
          <p>Deixe seus dados para receber informações sobre a abertura dos meus atendimentos.</p>
          <p>Quero conhecer seus objetivos e, em breve, compartilhar com você como poderemos trabalhar juntos para alcançá-los.</p>
          <div className="assin">
            <span>Com carinho, Bianca</span>
          </div>
        </div>
        {children}
      </div>
    </section>
  )
}

export { Folha }

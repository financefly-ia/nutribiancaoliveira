import { Footer } from '@/components/site/Footer'
import { Nav } from '@/components/site/Nav'
import { Reveal } from '@/components/site/Reveal'
import { Convite, Hero, ListaEspera, Marquee, Metodo, Sobre } from '@/components/site/Secoes'
import { SvgDefs } from '@/components/site/SvgDefs'
import { WaitlistForm } from '@/components/site/WaitlistForm'

export default function Home() {
  return (
    <>
      <SvgDefs />
      <Nav />
      <Hero />
      <Marquee />
      <Sobre />
      <Metodo />
      <Convite />
      <ListaEspera>
        <WaitlistForm />
      </ListaEspera>
      <Footer />
      <Reveal />
    </>
  )
}

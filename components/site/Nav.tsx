'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <nav id="nav" className={scrolled ? 'scrolled' : undefined}>
      <div className="wrap">
        <Link href="/" className="brand" aria-label="Bianca Oliveira Nutrição — início">
          <svg aria-hidden="true"><use href="#bo" /></svg>
          <span>Bianca Oliveira<small>Nutrição</small></span>
        </Link>
        <div className="links">
          <Link href="/#sobre">Sobre</Link>
          <Link href="/#metodo">Como trabalho</Link>
          <Link href="/#lista" className="btn btn-solid">Lista de espera</Link>
        </div>
      </div>
    </nav>
  )
}

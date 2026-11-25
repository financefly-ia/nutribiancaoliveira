'use client'
import { useEffect } from 'react'

/** Replica o script do mockup: revela .reveal ao entrar na tela, com atraso escalonado. */
export function Reveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal'))
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'))
      return
    }
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in')
          io.unobserve(e.target)
        }
      }),
      { threshold: 0.15 },
    )
    els.forEach((el, i) => {
      el.style.transitionDelay = (i % 4) * 90 + 'ms'
      io.observe(el)
    })
    return () => io.disconnect()
  }, [])
  return null
}

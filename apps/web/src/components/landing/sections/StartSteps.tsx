import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import styles from '../landing.module.css'

const STEPS = [
  { title: 'Regístrate', desc: 'Crea tu cuenta con tu número de celular. Rápido y seguro.' },
  { title: 'Carga saldo', desc: 'Recarga vía Nequi desde tu billetera y quedas listo para la mesa.' },
  { title: 'Juega', desc: 'Únete a una mesa activa o crea una nueva con tus amigos.' },
]

export function StartSteps() {
  return (
    <section id="empezar" aria-labelledby="empezar-title" className="bg-[#0a0a0a] px-5 py-24 sm:px-8 md:py-32 lg:px-14">
      <div className="mx-auto max-w-[90rem]">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
          <div>
            <h2
              id="empezar-title"
              className="font-display text-4xl font-bold leading-tight tracking-[-0.02em] text-text-premium md:text-5xl"
            >
              En tres pasos, <span className="italic text-brand-gold-light">a la mesa</span>
            </h2>
            <p className="mt-5 max-w-[36ch] text-lg leading-relaxed text-[#d9d3bf]">
              Sin descargas obligatorias: entras desde el navegador del celular y, si quieres, la instalas como app.
            </p>
            <Link
              href="/register/player"
              className="group mt-9 inline-flex min-h-[3.25rem] items-center gap-2.5 rounded-lg bg-brand-gold px-7 text-lg font-bold text-[#0a0a0a] transition-colors duration-200 hover:bg-brand-gold-light active:bg-brand-gold-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
            >
              Crear cuenta
              <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>

          <div>
            <ol className="m-0 grid list-none gap-0 p-0 md:grid-cols-3">
              {STEPS.map((item, index) => (
                <li
                  key={item.title}
                  className="border-t border-[#8b6b2e]/45 py-7 md:border-l md:border-t-0 md:px-7 md:py-2 md:first:border-l-0 md:first:pl-0"
                >
                  <span className="block font-display text-6xl font-bold italic leading-none text-[#c5a059]" aria-hidden="true">
                    {index + 1}
                  </span>
                  <h3 className="mt-5 text-2xl font-bold text-text-premium">{item.title}</h3>
                  <p className="mt-2 max-w-[30ch] text-base leading-relaxed text-[#bdb7a6]">{item.desc}</p>
                </li>
              ))}
            </ol>

            <div className={`${styles.brassRule} mt-10`} aria-hidden="true" />
            <p className="mt-6 text-base leading-relaxed text-[#bdb7a6]">
              Antes de jugar, revisa nuestras{' '}
              <Link href="/rules" className="text-brand-gold-light underline decoration-brand-gold/50 underline-offset-4 hover:decoration-brand-gold">
                reglas oficiales
              </Link>
              . Si detectas un problema, consulta también la{' '}
              <Link href="/security-policy" className="text-brand-gold-light underline decoration-brand-gold/50 underline-offset-4 hover:decoration-brand-gold">
                política de divulgación responsable
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

'use client'

import { useCallback, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { RULEBOOK_GROUPS, parseGlossary } from './rulesGuide'
import styles from '@/components/landing/landing.module.css'

/** Abre (y lleva a la vista) el capítulo indicado en el hash de la URL. */
function openFromHash(root: HTMLElement | null) {
  const id = decodeURIComponent(window.location.hash.slice(1))
  if (!root || !id) return
  const target = document.getElementById(id)
  if (!(target instanceof HTMLDetailsElement) || !root.contains(target)) return
  target.open = true
  target.scrollIntoView({ block: 'start' })
}

export function RulebookAccordion() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onHash = () => openFromHash(rootRef.current)
    onHash()
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const setAll = useCallback((open: boolean) => {
    rootRef.current?.querySelectorAll('details').forEach((details) => {
      details.open = open
    })
  }, [])

  const buttonClass =
    'inline-flex min-h-11 items-center rounded-lg border border-[#c5a059]/60 px-4 text-base font-semibold text-brand-gold-light transition-colors hover:bg-[#c5a059]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light'

  return (
    <div ref={rootRef}>
      <nav aria-label="Índice del reglamento" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {RULEBOOK_GROUPS.map((group) => (
          <div key={group.id}>
            <a
              href={`#${group.id}`}
              className="inline-flex min-h-11 items-center font-display text-xl font-bold text-text-premium hover:text-brand-gold-light"
            >
              {group.title}
            </a>
            <ul className="m-0 mt-1 list-none space-y-0.5 p-0">
              {group.sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="inline-flex min-h-11 items-center text-base text-[#d9d3bf] transition-colors hover:text-brand-gold-light"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-10 flex flex-wrap gap-3">
        <button type="button" onClick={() => setAll(true)} className={buttonClass}>
          Abrir todos
        </button>
        <button type="button" onClick={() => setAll(false)} className={buttonClass}>
          Cerrar todos
        </button>
      </div>

      <div className={`${styles.brassRule} mt-10`} aria-hidden="true" />

      {RULEBOOK_GROUPS.map((group) => (
        <section key={group.id} id={group.id} aria-labelledby={`${group.id}-title`} className="mt-12 scroll-mt-24">
          <h3 id={`${group.id}-title`} className="font-display text-3xl font-bold text-text-premium">
            {group.title}
          </h3>
          <div className="mt-4 divide-y divide-[#8b6b2e]/40 border-y border-[#8b6b2e]/40">
            {group.sections.map((section) => {
              const glossary = section.id === 'glosario' ? parseGlossary(section.paragraphs[0]) : null
              return (
                <details key={section.id} id={section.id} className={`${styles.faqItem} group scroll-mt-24`}>
                  <summary className="grid min-h-16 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light">
                    <h4 className="col-start-1 text-xl font-bold text-text-premium group-open:text-brand-gold-light">
                      {section.title}
                    </h4>
                    <span className="col-start-1 mt-0.5 block text-base text-[#bdb7a6]">{section.summary}</span>
                    <ChevronDown
                      className="col-start-2 row-span-2 row-start-1 h-6 w-6 shrink-0 text-[#c5a059] transition-transform duration-300 group-open:rotate-180 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </summary>

                  <div className="max-w-[68ch] space-y-4 pb-6 text-lg leading-relaxed text-[#d9d3bf]">
                    {glossary ? (
                      <dl className="m-0 space-y-3">
                        {glossary.map(({ term, definition }) => (
                          <div key={term}>
                            <dt className="font-bold text-text-premium">{term}:</dt>
                            <dd className="m-0">{definition}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
                    )}
                    {section.bullets && (
                      <ul className="space-y-2 pl-6 marker:text-brand-gold">
                        {section.bullets.map((bullet) => (
                          <li key={bullet} className="list-disc pl-1">
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </details>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

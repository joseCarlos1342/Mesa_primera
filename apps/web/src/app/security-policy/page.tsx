import type { Metadata } from 'next'
import { Award, Check, ExternalLink, Mail, ShieldAlert, ShieldCheck, X } from 'lucide-react'
import { PageNav } from '@/components/landing/PageNav'
import { LandingFooter } from '@/components/landing/sections/ClosingFooter'
import { LOCAL_LOCATION } from '@/components/landing/landingLocation'
import styles from '@/components/landing/landing.module.css'

export const metadata: Metadata = {
  title: 'Política de Divulgación Responsable — Primera Riverada los 4 Ases',
  description:
    'Cómo reportar vulnerabilidades de forma responsable en Primera Riverada los 4 Ases, qué pruebas están permitidas y qué respuesta puedes esperar.',
  alternates: { canonical: '/security-policy' },
  robots: { index: true, follow: true },
}

const SECURITY_EMAIL = 'seguridad@primerariveradalos4ases.com'
const LAST_UPDATED = '15 de septiembre de 2026'

const IN_SCOPE = [
  'Sitio web principal y PWA',
  'Servicio de juego en tiempo real',
  'Autenticación y gestión de cuentas',
  'Billetera digital y transacciones',
]

const OUT_OF_SCOPE = [
  'Ataques de denegación de servicio (DoS/DDoS)',
  'Ingeniería social contra empleados',
  'Vulnerabilidades en infraestructura de terceros que no operamos',
  'Reportes generados con escáneres automáticos sin verificación manual',
]

const REPORT_CONTENTS = [
  'Descripción clara del fallo y su impacto potencial',
  'Pasos detallados para reproducirlo (Proof of Concept)',
  'URL o endpoint afectado, sin incluir secretos ni tokens',
  'Capturas de pantalla o vídeo si aplica',
  'Tu nombre o alias (para agradecimientos, si lo deseas)',
]

const RESPONSE_TARGETS = [
  { time: '48 horas', action: 'Confirmación de recepción de tu reporte' },
  { time: '7 días', action: 'Evaluación inicial: confirmación o descarte de la vulnerabilidad' },
  { time: '30 días', action: 'Objetivo de mitigación inicial o actualización comunicada' },
  { time: 'Acordado', action: 'Divulgación pública coordinada contigo' },
]

const RESEARCH_RULES = [
  'No acceder, modificar ni borrar datos de usuarios reales',
  'No probar contra cuentas reales ni realizar operaciones con dinero real',
  'No interrumpir el servicio ni degradar la experiencia de otros usuarios',
  'No explotar la vulnerabilidad más allá de lo necesario para demostrarla',
  'No realizar ingeniería social contra nuestro equipo',
  'Reportar el hallazgo a nosotros antes que a terceros',
]

const eyebrow = 'text-sm font-bold uppercase tracking-[0.1em] text-[#c5a059]'
const sectionTitle = 'font-display text-4xl font-bold leading-tight tracking-[-0.02em] text-text-premium md:text-5xl'
const lead = 'mt-4 max-w-[52ch] text-lg leading-relaxed text-[#d9d3bf]'
const callout = 'rounded-lg border border-brand-gold/60 bg-[#0a2c20] px-5 py-4 text-lg font-bold leading-relaxed text-text-premium'
const textLink =
  'inline-flex min-h-11 items-center gap-1.5 text-base font-semibold text-brand-gold-light underline decoration-brand-gold/50 underline-offset-4 hover:decoration-brand-gold'

function Hero() {
  return (
    <header className={`${styles.felt} ${styles.rim} px-5 pb-16 pt-14 sm:px-8 md:pb-24 md:pt-20 lg:px-14`}>
      <div className="mx-auto grid max-w-[90rem] items-center gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div>
          <p className={eyebrow}>Divulgación responsable · Última actualización: {LAST_UPDATED}</p>
          <h1 className="mt-4 font-display font-bold leading-[0.95] tracking-[-0.02em] text-text-premium [font-size:clamp(2.4rem,6vw,4.75rem)]">
            Política de Divulgación <span className="italic text-brand-gold-light">Responsable</span>
          </h1>
          <div className="mt-6 max-w-[48ch] space-y-4 text-lg leading-relaxed text-[#d9d3bf] md:text-xl">
            <p>
              La seguridad de nuestros usuarios es nuestra máxima prioridad.{' '}
              <strong className="text-text-premium">Primera Riverada los 4 Ases</strong> valora el trabajo de los
              investigadores de seguridad y profesionales que nos ayudan a identificar vulnerabilidades de forma
              responsable.
            </p>
            <p>
              Si descubres un fallo de seguridad en nuestra plataforma, te pedimos que nos lo comuniques de forma privada
              antes de divulgarlo públicamente. Esta política define cómo hacerlo y qué puedes esperar de nosotros.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <a
              href={`mailto:${SECURITY_EMAIL}`}
              className="group inline-flex min-h-[3.25rem] items-center gap-2.5 rounded-lg bg-brand-gold px-6 text-lg font-bold text-[#0a0a0a] shadow-[0_8px_22px_-8px_rgba(0,0,0,0.7)] transition-colors hover:bg-brand-gold-light active:bg-brand-gold-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a2c20]"
            >
              <Mail className="h-5 w-5" aria-hidden="true" />
              Reportar una vulnerabilidad
            </a>
            <a href="/.well-known/security.txt" target="_blank" rel="noopener noreferrer" className={textLink}>
              Ver security.txt <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>

        <ShieldCheck
          className="mx-auto hidden h-56 w-56 text-[#c5a059] lg:block"
          strokeWidth={0.75}
          aria-hidden="true"
        />
      </div>
    </header>
  )
}

function Scope() {
  return (
    <section id="alcance" aria-labelledby="alcance-title" className="bg-[#0a0a0a] px-5 py-20 sm:px-8 md:py-28 lg:px-14">
      <div className="mx-auto max-w-[90rem]">
        <p className={eyebrow}>Antes de probar</p>
        <h2 id="alcance-title" className={`mt-3 ${sectionTitle}`}>
          1. <span className="italic text-brand-gold-light">Alcance</span>
        </h2>
        <p className={lead}>Esta política cubre, de forma general, los servicios que operamos:</p>

        <div className="mt-12 grid gap-0 md:grid-cols-2">
          <div className="border-t border-[#8b6b2e]/45 py-8 md:border-t-0 md:py-0 md:pr-10">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-text-premium">
              <ShieldCheck className="h-7 w-7 text-brand-gold" strokeWidth={1.5} aria-hidden="true" />
              Dentro del alcance
            </h3>
            <ul className="m-0 mt-5 list-none space-y-3 p-0">
              {IN_SCOPE.map((item) => (
                <li key={item} className="flex items-start gap-3 text-lg text-[#d9d3bf]">
                  <Check className="mt-1 h-5 w-5 shrink-0 text-brand-gold" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-[#8b6b2e]/45 py-8 md:border-l md:border-t-0 md:py-0 md:pl-10">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-text-premium">
              <ShieldAlert className="h-7 w-7 text-[#e74c3c]" strokeWidth={1.5} aria-hidden="true" />
              Fuera de alcance
            </h3>
            <ul className="m-0 mt-5 list-none space-y-3 p-0">
              {OUT_OF_SCOPE.map((item) => (
                <li key={item} className="flex items-start gap-3 text-lg text-[#d9d3bf]">
                  <X className="mt-1 h-5 w-5 shrink-0 text-[#e74c3c]" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className={`mt-10 ${callout}`}>
          No pruebes contra cuentas reales ni operaciones con dinero real. Usa únicamente cuentas, datos y escenarios
          propios, sin acceder a información de terceros.
        </p>
      </div>
    </section>
  )
}

function HowToReport() {
  return (
    <section
      id="report"
      aria-labelledby="report-title"
      className={`${styles.felt} ${styles.rim} scroll-mt-20 px-5 py-20 sm:px-8 md:py-28 lg:px-14`}
    >
      <div className="mx-auto grid max-w-[90rem] gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <div>
          <p className={eyebrow}>Escríbenos</p>
          <h2 id="report-title" className={`mt-3 ${sectionTitle}`}>
            2. Cómo Reportar una <span className="italic text-brand-gold-light">Vulnerabilidad</span>
          </h2>
          <p className={lead}>Envía un correo a</p>
          <a
            href={`mailto:${SECURITY_EMAIL}`}
            aria-label={`Escribir a ${SECURITY_EMAIL}`}
            className="mt-2 inline-flex min-h-11 items-center gap-3 font-display text-xl font-bold text-brand-gold-light underline decoration-brand-gold/50 underline-offset-[6px] [overflow-wrap:anywhere] hover:decoration-brand-gold sm:text-2xl xl:text-3xl"
          >
            <Mail className="h-7 w-7 shrink-0" aria-hidden="true" />
            <span>
              seguridad@
              <wbr />
              primerariveradalos4ases.com
            </span>
          </a>
          <p className={`mt-8 ${callout}`}>
            Por favor, no divulgues la vulnerabilidad públicamente hasta que la hayamos corregido o acordemos una fecha
            de divulgación coordinada.
          </p>
        </div>

        <div>
          <h3 className="text-2xl font-bold text-text-premium">Incluye en tu correo</h3>
          <ol className="m-0 mt-6 list-none p-0">
            {REPORT_CONTENTS.map((item, index) => (
              <li key={item} className="flex items-baseline gap-5 border-t border-[#8b6b2e]/45 py-5 first:border-t-0 first:pt-0">
                <span className="w-8 shrink-0 font-display text-4xl font-bold italic leading-none text-[#c5a059]" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="text-lg leading-relaxed text-text-premium">{item}</span>
              </li>
            ))}
          </ol>
          <p className="mt-8 border-t border-[#8b6b2e]/45 pt-6 text-base leading-relaxed text-[#d9d3bf]">
            Actualmente recibimos reportes por correo y mediante esta política pública. El campo de cifrado
            (<code className="font-mono text-brand-gold-light">Encryption</code>) de{' '}
            <code className="font-mono text-brand-gold-light">security.txt</code> aún no está habilitado porque no hemos
            publicado una clave PGP pública. Esta mejora puede incorporarse más adelante si necesitamos recibir reportes
            cifrados de vulnerabilidades especialmente sensibles.
          </p>
        </div>
      </div>
    </section>
  )
}

function ResponseTargets() {
  return (
    <section id="respuesta" aria-labelledby="respuesta-title" className="bg-[#0a0a0a] px-5 py-20 sm:px-8 md:py-28 lg:px-14">
      <div className="mx-auto max-w-[90rem]">
        <p className={eyebrow}>Qué esperar de nosotros</p>
        <h2 id="respuesta-title" className={`mt-3 ${sectionTitle}`}>
          3. Objetivos de <span className="italic text-brand-gold-light">respuesta</span>
        </h2>
        <p className={lead}>Estos son nuestros objetivos de respuesta; pueden variar según la severidad y complejidad del caso:</p>

        <ol className="m-0 mt-12 grid list-none gap-0 p-0 md:grid-cols-4">
          {RESPONSE_TARGETS.map((target, index) => (
            <li
              key={target.time}
              className="relative border-l-2 border-[#8b6b2e]/45 pb-10 pl-8 last:pb-0 md:border-l-0 md:border-t-2 md:pb-0 md:pl-0 md:pr-6 md:pt-8"
            >
              <span
                aria-hidden="true"
                className="absolute -left-[1.15rem] top-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-brand-gold bg-[#0a0a0a] font-mono text-base font-bold text-brand-gold-light md:-top-[1.15rem] md:left-0"
              >
                {index + 1}
              </span>
              <h3 className="font-display text-3xl font-bold italic text-brand-gold-light">{target.time}</h3>
              <p className="mt-2 max-w-[28ch] text-lg leading-relaxed text-[#d9d3bf]">{target.action}</p>
            </li>
          ))}
        </ol>

        <div className={`mt-14 ${callout} font-normal`}>
          <p>
            <strong className="text-brand-gold-light">Protección para investigadores de buena fe.</strong> Cuando una
            investigación cumpla esta política y se realice de buena fe, no iniciaremos acciones legales por el acto de
            reportar la vulnerabilidad. Esta protección no cubre fraude, acceso a datos ajenos, extorsión, interrupción
            del servicio ni incumplimientos legales.
          </p>
        </div>
      </div>
    </section>
  )
}

function ResearchRules() {
  return (
    <section id="reglas" aria-labelledby="reglas-title" className={`${styles.felt} ${styles.rim} px-5 py-20 sm:px-8 md:py-28 lg:px-14`}>
      <div className="mx-auto max-w-[90rem]">
        <p className={eyebrow}>Mientras investigas</p>
        <h2 id="reglas-title" className={`mt-3 ${sectionTitle}`}>
          4. Reglas de <span className="italic text-brand-gold-light">Investigación</span>
        </h2>
        <p className={lead}>Para ser elegible a nuestro reconocimiento, los investigadores deben:</p>
        <ul className="m-0 mt-10 grid list-none gap-x-10 p-0 md:grid-cols-2">
          {RESEARCH_RULES.map((rule) => (
            <li key={rule} className="flex items-start gap-4 border-t border-[#8b6b2e]/45 py-5 text-lg leading-relaxed text-text-premium">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-gold text-[#0a0a0a]">
                <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
              </span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Acknowledgements() {
  return (
    <section
      id="acknowledgements"
      aria-labelledby="acknowledgements-title"
      className="scroll-mt-20 bg-[#0a0a0a] px-5 py-20 sm:px-8 md:py-28 lg:px-14"
    >
      <div className="mx-auto grid max-w-[90rem] gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-20">
        <div>
          <p className={eyebrow}>Gracias</p>
          <h2 id="acknowledgements-title" className={`mt-3 ${sectionTitle}`}>
            5. <span className="italic text-brand-gold-light">Agradecimientos</span>
          </h2>
          <p className={lead}>
            Agradecemos a todos los investigadores que han contribuido a mejorar la seguridad de nuestra plataforma de
            forma responsable. Si reportas una vulnerabilidad válida y deseas ser reconocido, tu nombre o alias aparecerá
            aquí con tu permiso.
          </p>
        </div>
        <div className={`${styles.felt} ${styles.rim} flex flex-col items-center rounded-xl px-6 py-14 text-center`}>
          <Award className="h-14 w-14 text-brand-gold" strokeWidth={1.25} aria-hidden="true" />
          <p className="mt-5 max-w-[32ch] font-display text-2xl italic text-text-premium">
            Sé el primero en contribuir responsablemente a la seguridad de Primera Riverada los 4 Ases.
          </p>
        </div>
      </div>

      <div className={`${styles.brassRule} mx-auto mt-20 max-w-[90rem]`} aria-hidden="true" />
      <p className="mx-auto mt-6 flex max-w-[90rem] flex-wrap items-center gap-x-4 gap-y-1 text-base text-[#bdb7a6]">
        Esta política sigue el estándar RFC 9116 (security.txt)
        <a href="/.well-known/security.txt" target="_blank" rel="noopener noreferrer" className={`${textLink} font-mono`}>
          /.well-known/security.txt <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </p>
    </section>
  )
}

export default function SecurityPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] font-sans text-text-premium selection:bg-brand-gold/30">
      <PageNav />
      <main>
        <Hero />
        <Scope />
        <HowToReport />
        <ResponseTargets />
        <ResearchRules />
        <Acknowledgements />
      </main>
      <LandingFooter address={LOCAL_LOCATION.address} />
    </div>
  )
}

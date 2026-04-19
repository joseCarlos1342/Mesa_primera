import type { Metadata } from 'next'
import { Shield, AlertTriangle, Clock, CheckCircle, Mail, ExternalLink, Award } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Seguridad — Primera Riverada los 4 Ases',
  description:
    'Política de divulgación responsable de vulnerabilidades de Primera Riverada los 4 Ases. Cómo reportar fallos de seguridad y nuestro proceso de respuesta.',
  alternates: { canonical: '/security-policy' },
  robots: { index: true, follow: true },
}

function SectionIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-gold/10 border border-brand-gold/20 mr-3 shrink-0">
      <Icon className="w-4 h-4 text-brand-gold" />
    </span>
  )
}

export default function SecurityPolicyPage() {
  return (
    <article className="space-y-10">
      {/* Header */}
      <header className="text-center space-y-4 pb-8 border-b border-white/10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[11px] font-black tracking-widest uppercase">
          <Shield className="w-3.5 h-3.5" /> Divulgación Responsable
        </div>
        <h1 className="text-3xl md:text-5xl font-display font-black italic bg-gradient-to-br from-brand-gold-light via-brand-gold to-brand-gold-dark bg-clip-text text-transparent leading-tight">
          Política de Seguridad
        </h1>
        <p className="text-text-secondary text-sm">
          Última actualización: 19 de abril de 2026
        </p>
        <p className="text-xs text-text-secondary/60 font-mono">
          <a
            href="/.well-known/security.txt"
            className="hover:text-brand-gold transition-colors inline-flex items-center gap-1"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver security.txt <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </header>

      {/* Intro */}
      <section className="text-text-secondary leading-relaxed space-y-4">
        <p>
          La seguridad de nuestros usuarios es nuestra máxima prioridad.{' '}
          <strong className="text-text-premium">Primera Riverada los 4 Ases</strong> valora el trabajo de los
          investigadores de seguridad y profesionales que nos ayudan a identificar vulnerabilidades de forma responsable.
        </p>
        <p>
          Si descubres un fallo de seguridad en nuestra plataforma, te pedimos que nos lo comuniques de forma privada
          antes de divulgarlo públicamente. Esta política define cómo hacerlo y qué puedes esperar de nosotros.
        </p>
      </section>

      {/* Section 1 — Scope */}
      <section className="space-y-4">
        <h2 className="flex items-center text-xl md:text-2xl font-display font-bold text-text-premium">
          <SectionIcon icon={Shield} />
          1. Alcance
        </h2>
        <div className="ml-11 space-y-4 text-text-secondary leading-relaxed">
          <p>Esta política cubre los siguientes sistemas gestionados por nosotros:</p>
          <ul className="space-y-2 list-none">
            {[
              'primerariveradalos4ases.com (sitio web principal y PWA)',
              'API del servidor de juego en tiempo real',
              'Sistema de autenticación y gestión de cuentas',
              'Sistema de billetera digital y transacciones',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-brand-gold mt-1.5 text-xs">&#9830;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-4 mt-4">
            <p className="text-red-300 font-bold text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              Fuera de alcance: ataques de denegación de servicio (DoS/DDoS), ingeniería social contra empleados,
              vulnerabilidades en infraestructura de terceros (Vercel, Supabase, Cloudflare) que no podemos controlar,
              y reportes generados con escáneres automáticos sin verificación manual.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2 — How to report */}
      <section id="report" className="space-y-4 scroll-mt-8">
        <h2 className="flex items-center text-xl md:text-2xl font-display font-bold text-text-premium">
          <SectionIcon icon={Mail} />
          2. Cómo Reportar una Vulnerabilidad
        </h2>
        <div className="ml-11 space-y-4 text-text-secondary leading-relaxed">
          <p>
            Envía un correo a{' '}
            <a
              href="mailto:seguridad@primerariveradalos4ases.com"
              className="text-brand-gold hover:text-brand-gold-light transition-colors font-bold"
            >
              seguridad@primerariveradalos4ases.com
            </a>{' '}
            incluyendo:
          </p>
          <ul className="space-y-2 list-none">
            {[
              'Descripción clara del fallo y su impacto potencial',
              'Pasos detallados para reproducirlo (Proof of Concept)',
              'URL o endpoint afectado',
              'Capturas de pantalla o vídeo si aplica',
              'Tu nombre o alias (para agradecimientos, si lo deseas)',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-brand-gold mt-1.5 text-xs">&#9830;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="bg-brand-gold/5 border border-brand-gold/20 rounded-xl p-4">
            <p className="text-brand-gold text-sm font-bold">
              Por favor, no divulgues la vulnerabilidad públicamente hasta que la hayamos corregido y hayamos acordado
              contigo una fecha de divulgación coordinada.
            </p>
          </div>
          <div className="bg-black/30 border border-white/10 rounded-xl p-4">
            <p className="text-text-secondary text-sm leading-relaxed">
              Actualmente recibimos reportes por correo y mediante esta política pública. El campo de cifrado
              (`Encryption`) de `security.txt` aún no está habilitado porque no hemos publicado una clave PGP pública.
              Esta mejora puede incorporarse más adelante si necesitamos recibir reportes cifrados de vulnerabilidades
              especialmente sensibles.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3 — Our commitments */}
      <section className="space-y-4">
        <h2 className="flex items-center text-xl md:text-2xl font-display font-bold text-text-premium">
          <SectionIcon icon={Clock} />
          3. Nuestros Compromisos
        </h2>
        <div className="ml-11 space-y-4 text-text-secondary leading-relaxed">
          <p>Cuando recibamos tu reporte nos comprometemos a:</p>
          <div className="grid gap-3">
            {[
              { tiempo: '48 horas', accion: 'Confirmación de recepción de tu reporte' },
              { tiempo: '7 días', accion: 'Evaluación inicial: confirmación o descarte de la vulnerabilidad' },
              { tiempo: '30 días', accion: 'Corrección del fallo o plan de mitigación comunicado' },
              { tiempo: 'Acordado', accion: 'Divulgación pública coordinada contigo' },
            ].map((item) => (
              <div
                key={item.tiempo}
                className="flex items-center gap-4 bg-black/30 border border-brand-gold/10 rounded-xl p-4"
              >
                <span className="shrink-0 w-20 text-brand-gold font-black text-sm text-center">
                  {item.tiempo}
                </span>
                <div className="h-8 w-px bg-brand-gold/20 shrink-0" />
                <span className="text-text-secondary text-sm">{item.accion}</span>
              </div>
            ))}
          </div>
          <p className="text-sm">
            No tomaremos acciones legales contra investigadores que actúen de buena fe siguiendo esta política.
          </p>
        </div>
      </section>

      {/* Section 4 — Rules */}
      <section className="space-y-4">
        <h2 className="flex items-center text-xl md:text-2xl font-display font-bold text-text-premium">
          <SectionIcon icon={CheckCircle} />
          4. Reglas de Investigación
        </h2>
        <div className="ml-11 space-y-4 text-text-secondary leading-relaxed">
          <p>Para ser elegible a nuestro reconocimiento, los investigadores deben:</p>
          <ul className="space-y-2 list-none">
            {[
              'No acceder, modificar ni borrar datos de usuarios reales',
              'No interrumpir el servicio ni degradar la experiencia de otros usuarios',
              'No explotar la vulnerabilidad más allá de lo necesario para demostrarla',
              'No realizar ingeniería social contra nuestro equipo',
              'Reportar el hallazgo a nosotros antes que a terceros',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Section 5 — Acknowledgements */}
      <section id="acknowledgements" className="space-y-4 scroll-mt-8">
        <h2 className="flex items-center text-xl md:text-2xl font-display font-bold text-text-premium">
          <SectionIcon icon={Award} />
          5. Agradecimientos
        </h2>
        <div className="ml-11 space-y-4 text-text-secondary leading-relaxed">
          <p>
            Agradecemos a todos los investigadores que han contribuido a mejorar la seguridad de nuestra plataforma
            de forma responsable. Si reportas una vulnerabilidad válida y deseas ser reconocido, tu nombre o alias
            aparecerá aquí con tu permiso.
          </p>
          <div className="bg-black/30 border border-brand-gold/10 rounded-xl p-6 text-center">
            <p className="text-text-secondary/50 text-sm italic">
              Sé el primero en contribuir a la seguridad de Primera Riverada los 4 Ases.
            </p>
          </div>
        </div>
      </section>

      {/* security.txt reference */}
      <footer className="pt-4 border-t border-white/10 text-center space-y-2">
        <p className="text-xs text-text-secondary/40 font-mono">
          Esta política sigue el estándar RFC 9116 (security.txt)
        </p>
        <a
          href="/.well-known/security.txt"
          className="inline-flex items-center gap-1 text-xs text-brand-gold/60 hover:text-brand-gold transition-colors font-mono"
          target="_blank"
          rel="noopener noreferrer"
        >
          /.well-known/security.txt <ExternalLink className="w-3 h-3" />
        </a>
      </footer>
    </article>
  )
}

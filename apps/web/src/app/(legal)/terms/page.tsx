import type { Metadata } from 'next'
import landing from '@/components/landing/landing.module.css'
import { Scale, Users, CreditCard, ShieldAlert, AlertTriangle, Ban, Gavel, HelpCircle, X } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Términos y Condiciones',
  description: 'Términos y condiciones de uso de Primera Riverada los 4 Ases. Reglas de juego limpio, uso de la billetera y políticas de la plataforma.',
  alternates: { canonical: 'https://primerariveradalos4ases.com/terms' },
  robots: { index: true, follow: true },
}

function SectionIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#8b6b2e] bg-[#0a2c20]">
      <Icon className="h-5 w-5 text-brand-gold-light" aria-hidden="true" />
    </span>
  )
}

export default function TermsPage() {
  return (
    <article>
      <header className={`${landing.felt} ${landing.rim} px-5 pb-14 pt-12 sm:px-8 md:pb-20 md:pt-16 lg:px-14`}>
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display font-bold leading-[0.98] tracking-[-0.02em] text-text-premium [font-size:clamp(2.4rem,6vw,4.25rem)]">
            Términos <span className="italic text-brand-gold-light">y Condiciones</span>
          </h1>
          <p className="mt-4 text-lg text-[#d9d3bf]">Última actualización: 12 de abril de 2026</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-12 px-5 py-12 sm:px-8 md:py-16">

      {/* Intro */}
      <section className="space-y-4 text-lg leading-relaxed text-[#d9d3bf] md:text-xl">
        <p>
          Bienvenido a <strong className="text-text-premium">Primera Riverada los 4 Ases</strong>. Al acceder, registrarte o
          utilizar nuestra plataforma en <strong className="font-semibold text-text-premium">primerariveradalos4ases.com</strong>,
          aceptas cumplir con los siguientes términos y condiciones. Si no estás de acuerdo con alguna de estas
          disposiciones, te pedimos que no utilices nuestros servicios.
        </p>
      </section>

      {/* Section 1 */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-3 border-b border-[#8b6b2e]/45 pb-3 font-display text-[1.625rem] font-bold leading-tight text-text-premium md:text-[2rem]">
          <SectionIcon icon={Users} />
          1. Elegibilidad y Registro
        </h2>
        <div className="space-y-3 text-lg leading-relaxed text-[#d9d3bf] md:pl-12">
          <ul className="list-none space-y-2.5">
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Debes ser <strong className="text-text-premium">mayor de 18 años</strong> para registrarte y utilizar la plataforma.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Cada jugador debe registrar un <strong className="text-text-premium">número de celular colombiano (+57) válido</strong> que será verificado mediante código SMS.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Solo se permite <strong className="text-text-premium">una cuenta por persona</strong>. Las cuentas múltiples serán suspendidas.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Los datos de registro (nombre, apodo, teléfono) deben ser <strong className="text-text-premium">verídicos y actualizados</strong>.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>El inicio de sesión con <strong className="text-text-premium">Google</strong> es una opción de acceso rápido, pero no reemplaza la obligatoriedad de verificar un número de celular.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 2 */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-3 border-b border-[#8b6b2e]/45 pb-3 font-display text-[1.625rem] font-bold leading-tight text-text-premium md:text-[2rem]">
          <SectionIcon icon={Gavel} />
          2. Reglas de Juego Limpio
        </h2>
        <div className="space-y-3 text-lg leading-relaxed text-[#d9d3bf] md:pl-12">
          <p>
            La plataforma opera bajo principios estrictos de <strong className="text-text-premium">fair play</strong> para garantizar una
            experiencia equitativa para todos los jugadores:
          </p>
          <ul className="list-none space-y-2.5">
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Queda <strong className="text-text-premium">prohibida toda forma de colusión</strong> entre jugadores en una misma mesa.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>El uso de <strong className="text-text-premium">software de terceros, bots o automatización</strong> para obtener ventaja está estrictamente prohibido.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Todas las partidas son <strong className="text-text-premium">grabadas (replays)</strong> y pueden ser revisadas por el equipo de administración para auditoría.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Los administradores <strong className="text-text-premium">no pueden ver el estado activo</strong> de las partidas en curso (ceguera administrativa), garantizando imparcialidad.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Si un jugador se desconecta, tiene un <strong className="text-text-premium">período de gracia de 60 segundos</strong> para reconectarse antes de que su lugar en la mesa sea liberado.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 3 */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-3 border-b border-[#8b6b2e]/45 pb-3 font-display text-[1.625rem] font-bold leading-tight text-text-premium md:text-[2rem]">
          <SectionIcon icon={CreditCard} />
          3. Billetera Digital y Transacciones
        </h2>
        <div className="space-y-3 text-lg leading-relaxed text-[#d9d3bf] md:pl-12">
          <ul className="list-none space-y-2.5">
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Cada jugador cuenta con una <strong className="text-text-premium">billetera digital</strong> dentro de la plataforma para gestionar sus fichas.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Los <strong className="text-text-premium">depósitos</strong> requieren la subida de un comprobante de pago y están sujetos a aprobación manual por parte del equipo de administración.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Los <strong className="text-text-premium">retiros</strong> se procesan de forma asíncrona y están sujetos a verificación y aprobación.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Todas las transacciones quedan registradas en un <strong className="text-text-premium">libro mayor (ledger) inmutable</strong>: los registros solo se insertan y nunca se modifican ni eliminan.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>El saldo de tu billetera se calcula como la <strong className="text-text-premium">suma de créditos menos la suma de débitos</strong> registrados en el ledger.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>La plataforma <strong className="text-text-premium">no es una entidad financiera</strong>. Las fichas representan créditos de juego dentro de la plataforma.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 4 */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-3 border-b border-[#8b6b2e]/45 pb-3 font-display text-[1.625rem] font-bold leading-tight text-text-premium md:text-[2rem]">
          <SectionIcon icon={ShieldAlert} />
          4. Seguridad de la Cuenta
        </h2>
        <div className="space-y-3 text-lg leading-relaxed text-[#d9d3bf] md:pl-12">
          <ul className="list-none space-y-2.5">
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Eres responsable de mantener la <strong className="text-text-premium">confidencialidad de tu PIN</strong> y de los dispositivos desde los cuales accedes.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>El acceso desde un <strong className="text-text-premium">dispositivo nuevo</strong> requiere verificación adicional mediante código SMS al número registrado.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Debes <strong className="text-text-premium">notificarnos inmediatamente</strong> si sospechas de un acceso no autorizado a tu cuenta.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>No somos responsables por pérdidas derivadas del uso no autorizado de tu cuenta si no nos has notificado oportunamente.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 5 */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-3 border-b border-[#8b6b2e]/45 pb-3 font-display text-[1.625rem] font-bold leading-tight text-text-premium md:text-[2rem]">
          <SectionIcon icon={Ban} />
          5. Conductas Prohibidas
        </h2>
        <div className="space-y-3 text-lg leading-relaxed text-[#d9d3bf] md:pl-12">
          <p>El uso de la plataforma queda sujeto a las siguientes restricciones. Queda prohibido:</p>
          <ul className="list-none space-y-2.5">
            <li className="flex items-start gap-3">
              <X aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-[#f08a7e]" />
              <span>Crear múltiples cuentas para manipular partidas o transacciones.</span>
            </li>
            <li className="flex items-start gap-3">
              <X aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-[#f08a7e]" />
              <span>Compartir tu cuenta o permitir que terceros accedan a ella.</span>
            </li>
            <li className="flex items-start gap-3">
              <X aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-[#f08a7e]" />
              <span>Realizar depósitos con comprobantes falsos o fraudulentos.</span>
            </li>
            <li className="flex items-start gap-3">
              <X aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-[#f08a7e]" />
              <span>Intentar explotar vulnerabilidades técnicas de la plataforma.</span>
            </li>
            <li className="flex items-start gap-3">
              <X aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-[#f08a7e]" />
              <span>Utilizar lenguaje ofensivo, discriminatorio o amenazante hacia otros jugadores o el equipo.</span>
            </li>
            <li className="flex items-start gap-3">
              <X aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-[#f08a7e]" />
              <span>Lavado de activos o cualquier actividad que contravenga la legislación colombiana.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 6 */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-3 border-b border-[#8b6b2e]/45 pb-3 font-display text-[1.625rem] font-bold leading-tight text-text-premium md:text-[2rem]">
          <SectionIcon icon={AlertTriangle} />
          6. Suspensión y Cancelación
        </h2>
        <div className="space-y-3 text-lg leading-relaxed text-[#d9d3bf] md:pl-12">
          <p>Nos reservamos el derecho de <strong className="text-text-premium">suspender o cancelar</strong> cuentas en los siguientes casos:</p>
          <ul className="list-none space-y-2.5">
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Violación de cualquiera de estos términos y condiciones.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Detección de patrones de colusión o fraude mediante nuestros sistemas de auditoría.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Solicitud directa del titular de la cuenta.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Inactividad prolongada de la cuenta (más de 12 meses sin actividad).</span>
            </li>
          </ul>
          <p>
            En caso de suspensión por conducta prohibida, los <strong className="text-text-premium">fondos retenidos</strong> estarán
            sujetos a revisión y podrán ser retenidos hasta la resolución de la investigación correspondiente.
          </p>
        </div>
      </section>

      {/* Section 7 */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-3 border-b border-[#8b6b2e]/45 pb-3 font-display text-[1.625rem] font-bold leading-tight text-text-premium md:text-[2rem]">
          <SectionIcon icon={Scale} />
          7. Limitación de Responsabilidad
        </h2>
        <div className="space-y-3 text-lg leading-relaxed text-[#d9d3bf] md:pl-12">
          <ul className="list-none space-y-2.5">
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>La plataforma se proporciona <strong className="text-text-premium">&ldquo;tal como está&rdquo;</strong>. No garantizamos disponibilidad ininterrumpida.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>No somos responsables por <strong className="text-text-premium">pérdidas derivadas de desconexiones</strong> de internet o fallos en dispositivos del usuario.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Los resultados de las partidas se determinan por las <strong className="text-text-premium">reglas del juego de Primera</strong> y son definitivos e inapelables una vez finalizadas.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 8 */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-3 border-b border-[#8b6b2e]/45 pb-3 font-display text-[1.625rem] font-bold leading-tight text-text-premium md:text-[2rem]">
          <SectionIcon icon={HelpCircle} />
          8. Legislación Aplicable y Contacto
        </h2>
        <div className="space-y-3 text-lg leading-relaxed text-[#d9d3bf] md:pl-12">
          <p>
            Estos términos se rigen por las leyes de la <strong className="text-text-premium">República de Colombia</strong>. Cualquier
            controversia será resuelta ante los tribunales competentes de Colombia.
          </p>
          <p>Para consultas relacionadas con estos términos:</p>
          <div className="mt-4 rounded-lg border border-[#8b6b2e]/60 bg-[#120806] p-5">
            <p className="text-text-premium font-semibold">Primera Riverada los 4 Ases</p>
            <p className="text-base">
              Correo electrónico:{' '}
              <a href="mailto:soporte@primerariveradalos4ases.com" className="break-all font-semibold text-brand-gold-light underline decoration-brand-gold/50 underline-offset-4 hover:decoration-brand-gold">
                soporte@primerariveradalos4ases.com
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Acceptance */}
      <div className="space-y-3 border-t border-[#8b6b2e]/45 pt-8">
        <div className="rounded-lg border border-brand-gold/60 bg-[#0a2c20] px-5 py-4">
          <p className="text-lg font-semibold leading-relaxed text-text-premium">
            Al registrarte y utilizar Primera Riverada los 4 Ases, confirmas que has leído, comprendido y aceptado estos
            Términos y Condiciones en su totalidad.
          </p>
        </div>
        <p className="text-base text-[#bdb7a6]">
          Estos términos pueden ser actualizados periódicamente. Te notificaremos sobre cambios significativos a través
          de la plataforma.
        </p>
      </div>
      </div>
    </article>
  )
}

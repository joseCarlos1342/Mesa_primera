import type { Metadata } from 'next'
import { Scale, Users, CreditCard, ShieldAlert, AlertTriangle, Ban, Gavel, HelpCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Términos y Condiciones',
  description: 'Términos y condiciones de uso de Primera Riverada los 4 Ases. Reglas de juego limpio, uso de la billetera y políticas de la plataforma.',
}

function SectionIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-gold/10 border border-brand-gold/20 mr-3 shrink-0">
      <Icon className="w-4 h-4 text-brand-gold" />
    </span>
  )
}

export default function TermsPage() {
  return (
    <article className="space-y-10">
      {/* Header */}
      <header className="text-center space-y-4 pb-8 border-b border-white/10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[11px] font-black tracking-widest uppercase">
          <Scale className="w-3.5 h-3.5" /> Documento Legal
        </div>
        <h1 className="text-3xl md:text-5xl font-display font-black italic bg-gradient-to-br from-brand-gold-light via-brand-gold to-brand-gold-dark bg-clip-text text-transparent leading-tight">
          Términos y Condiciones
        </h1>
        <p className="text-text-secondary text-sm">
          Última actualización: 12 de abril de 2026
        </p>
      </header>

      {/* Intro */}
      <section className="text-text-secondary leading-relaxed space-y-4">
        <p>
          Bienvenido a <strong className="text-text-premium">Primera Riverada los 4 Ases</strong>. Al acceder, registrarte o
          utilizar nuestra plataforma en <strong className="text-brand-gold">primerariveradalos4ases.com</strong>,
          aceptas cumplir con los siguientes términos y condiciones. Si no estás de acuerdo con alguna de estas
          disposiciones, te pedimos que no utilices nuestros servicios.
        </p>
      </section>

      {/* Section 1 */}
      <section className="space-y-4">
        <h2 className="flex items-center text-xl md:text-2xl font-display font-bold text-text-premium">
          <SectionIcon icon={Users} />
          1. Elegibilidad y Registro
        </h2>
        <div className="ml-11 space-y-3 text-text-secondary leading-relaxed">
          <ul className="space-y-2 list-none">
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9830;</span>
              <span>Debes ser <strong className="text-text-premium">mayor de 18 años</strong> para registrarte y utilizar la plataforma.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9830;</span>
              <span>Cada jugador debe registrar un <strong className="text-text-premium">número de celular colombiano (+57) válido</strong> que será verificado mediante código SMS.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9830;</span>
              <span>Solo se permite <strong className="text-text-premium">una cuenta por persona</strong>. Las cuentas múltiples serán suspendidas.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9830;</span>
              <span>Los datos de registro (nombre, apodo, teléfono) deben ser <strong className="text-text-premium">verídicos y actualizados</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9830;</span>
              <span>El inicio de sesión con <strong className="text-text-premium">Google</strong> es una opción de acceso rápido, pero no reemplaza la obligatoriedad de verificar un número de celular.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 2 */}
      <section className="space-y-4">
        <h2 className="flex items-center text-xl md:text-2xl font-display font-bold text-text-premium">
          <SectionIcon icon={Gavel} />
          2. Reglas de Juego Limpio
        </h2>
        <div className="ml-11 space-y-3 text-text-secondary leading-relaxed">
          <p>
            La plataforma opera bajo principios estrictos de <strong className="text-text-premium">fair play</strong> para garantizar una
            experiencia equitativa para todos los jugadores:
          </p>
          <ul className="space-y-2 list-none">
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9827;</span>
              <span>Queda <strong className="text-text-premium">prohibida toda forma de colusión</strong> entre jugadores en una misma mesa.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9827;</span>
              <span>El uso de <strong className="text-text-premium">software de terceros, bots o automatización</strong> para obtener ventaja está estrictamente prohibido.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9827;</span>
              <span>Todas las partidas son <strong className="text-text-premium">grabadas (replays)</strong> y pueden ser revisadas por el equipo de administración para auditoría.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9827;</span>
              <span>Los administradores <strong className="text-text-premium">no pueden ver el estado activo</strong> de las partidas en curso (ceguera administrativa), garantizando imparcialidad.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9827;</span>
              <span>Si un jugador se desconecta, tiene un <strong className="text-text-premium">período de gracia de 60 segundos</strong> para reconectarse antes de que su lugar en la mesa sea liberado.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 3 */}
      <section className="space-y-4">
        <h2 className="flex items-center text-xl md:text-2xl font-display font-bold text-text-premium">
          <SectionIcon icon={CreditCard} />
          3. Billetera Digital y Transacciones
        </h2>
        <div className="ml-11 space-y-3 text-text-secondary leading-relaxed">
          <ul className="space-y-2 list-none">
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9824;</span>
              <span>Cada jugador cuenta con una <strong className="text-text-premium">billetera digital</strong> dentro de la plataforma para gestionar sus fichas.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9824;</span>
              <span>Los <strong className="text-text-premium">depósitos</strong> requieren la subida de un comprobante de pago y están sujetos a aprobación manual por parte del equipo de administración.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9824;</span>
              <span>Los <strong className="text-text-premium">retiros</strong> se procesan de forma asíncrona y están sujetos a verificación y aprobación.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9824;</span>
              <span>Todas las transacciones quedan registradas en un <strong className="text-text-premium">libro mayor (ledger) inmutable</strong>: los registros solo se insertan y nunca se modifican ni eliminan.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9824;</span>
              <span>El saldo de tu billetera se calcula como la <strong className="text-text-premium">suma de créditos menos la suma de débitos</strong> registrados en el ledger.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9824;</span>
              <span>La plataforma <strong className="text-text-premium">no es una entidad financiera</strong>. Las fichas representan créditos de juego dentro de la plataforma.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 4 */}
      <section className="space-y-4">
        <h2 className="flex items-center text-xl md:text-2xl font-display font-bold text-text-premium">
          <SectionIcon icon={ShieldAlert} />
          4. Seguridad de la Cuenta
        </h2>
        <div className="ml-11 space-y-3 text-text-secondary leading-relaxed">
          <ul className="space-y-2 list-none">
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9830;</span>
              <span>Eres responsable de mantener la <strong className="text-text-premium">confidencialidad de tu PIN</strong> y de los dispositivos desde los cuales accedes.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9830;</span>
              <span>El acceso desde un <strong className="text-text-premium">dispositivo nuevo</strong> requiere verificación adicional mediante código SMS al número registrado.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9830;</span>
              <span>Debes <strong className="text-text-premium">notificarnos inmediatamente</strong> si sospechas de un acceso no autorizado a tu cuenta.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9830;</span>
              <span>No somos responsables por pérdidas derivadas del uso no autorizado de tu cuenta si no nos has notificado oportunamente.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 5 */}
      <section className="space-y-4">
        <h2 className="flex items-center text-xl md:text-2xl font-display font-bold text-text-premium">
          <SectionIcon icon={Ban} />
          5. Conductas Prohibidas
        </h2>
        <div className="ml-11 space-y-3 text-text-secondary leading-relaxed">
          <p>El uso de la plataforma queda sujeto a las siguientes restricciones. Queda prohibido:</p>
          <ul className="space-y-2 list-none">
            <li className="flex items-start gap-2">
              <span className="text-brand-red mt-1.5 text-xs">&#10006;</span>
              <span>Crear múltiples cuentas para manipular partidas o transacciones.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-red mt-1.5 text-xs">&#10006;</span>
              <span>Compartir tu cuenta o permitir que terceros accedan a ella.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-red mt-1.5 text-xs">&#10006;</span>
              <span>Realizar depósitos con comprobantes falsos o fraudulentos.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-red mt-1.5 text-xs">&#10006;</span>
              <span>Intentar explotar vulnerabilidades técnicas de la plataforma.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-red mt-1.5 text-xs">&#10006;</span>
              <span>Utilizar lenguaje ofensivo, discriminatorio o amenazante hacia otros jugadores o el equipo.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-red mt-1.5 text-xs">&#10006;</span>
              <span>Lavado de activos o cualquier actividad que contravenga la legislación colombiana.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 6 */}
      <section className="space-y-4">
        <h2 className="flex items-center text-xl md:text-2xl font-display font-bold text-text-premium">
          <SectionIcon icon={AlertTriangle} />
          6. Suspensión y Cancelación
        </h2>
        <div className="ml-11 space-y-3 text-text-secondary leading-relaxed">
          <p>Nos reservamos el derecho de <strong className="text-text-premium">suspender o cancelar</strong> cuentas en los siguientes casos:</p>
          <ul className="space-y-2 list-none">
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9824;</span>
              <span>Violación de cualquiera de estos términos y condiciones.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9824;</span>
              <span>Detección de patrones de colusión o fraude mediante nuestros sistemas de auditoría.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9824;</span>
              <span>Solicitud directa del titular de la cuenta.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9824;</span>
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
        <h2 className="flex items-center text-xl md:text-2xl font-display font-bold text-text-premium">
          <SectionIcon icon={Scale} />
          7. Limitación de Responsabilidad
        </h2>
        <div className="ml-11 space-y-3 text-text-secondary leading-relaxed">
          <ul className="space-y-2 list-none">
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9827;</span>
              <span>La plataforma se proporciona <strong className="text-text-premium">&ldquo;tal como está&rdquo;</strong>. No garantizamos disponibilidad ininterrumpida.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9827;</span>
              <span>No somos responsables por <strong className="text-text-premium">pérdidas derivadas de desconexiones</strong> de internet o fallos en dispositivos del usuario.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9827;</span>
              <span>Los resultados de las partidas se determinan por las <strong className="text-text-premium">reglas del juego de Primera</strong> y son definitivos e inapelables una vez finalizadas.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 8 */}
      <section className="space-y-4">
        <h2 className="flex items-center text-xl md:text-2xl font-display font-bold text-text-premium">
          <SectionIcon icon={HelpCircle} />
          8. Legislación Aplicable y Contacto
        </h2>
        <div className="ml-11 space-y-3 text-text-secondary leading-relaxed">
          <p>
            Estos términos se rigen por las leyes de la <strong className="text-text-premium">República de Colombia</strong>. Cualquier
            controversia será resuelta ante los tribunales competentes de Colombia.
          </p>
          <p>Para consultas relacionadas con estos términos:</p>
          <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-text-premium font-semibold">Primera Riverada los 4 Ases</p>
            <p className="text-sm">
              Correo electrónico:{' '}
              <a href="mailto:soporte@primerariveradalos4ases.com" className="text-brand-gold hover:underline">
                soporte@primerariveradalos4ases.com
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Acceptance */}
      <div className="border-t border-white/10 pt-6 space-y-3">
        <div className="p-5 bg-brand-gold/5 border border-brand-gold/20 rounded-xl text-center">
          <p className="text-text-premium font-semibold text-sm">
            Al registrarte y utilizar Primera Riverada los 4 Ases, confirmas que has leído, comprendido y aceptado estos
            Términos y Condiciones en su totalidad.
          </p>
        </div>
        <p className="text-center text-text-secondary/50 text-xs">
          Estos términos pueden ser actualizados periódicamente. Te notificaremos sobre cambios significativos a través
          de la plataforma.
        </p>
      </div>
    </article>
  )
}

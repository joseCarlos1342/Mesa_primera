import type { Metadata } from 'next'
import landing from '@/components/landing/landing.module.css'
import { Eye, Lock, Smartphone, Database, UserCheck, Trash2, Mail } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description: 'Política de privacidad de Primera Riverada los 4 Ases. Conoce cómo recopilamos, usamos y protegemos tu información.',
  alternates: { canonical: 'https://primerariveradalos4ases.com/privacy' },
  robots: { index: true, follow: true },
}

function SectionIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#8b6b2e] bg-[#0a2c20]">
      <Icon className="h-5 w-5 text-brand-gold-light" aria-hidden="true" />
    </span>
  )
}

export default function PrivacyPage() {
  return (
    <article>
      <header className={`${landing.felt} ${landing.rim} px-5 pb-14 pt-12 sm:px-8 md:pb-20 md:pt-16 lg:px-14`}>
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display font-bold leading-[0.98] tracking-[-0.02em] text-text-premium [font-size:clamp(2.4rem,6vw,4.25rem)]">
            Política <span className="italic text-brand-gold-light">de Privacidad</span>
          </h1>
          <p className="mt-4 text-lg text-[#d9d3bf]">Última actualización: 12 de abril de 2026</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-12 px-5 py-12 sm:px-8 md:py-16">

      {/* Intro */}
      <section className="space-y-4 text-lg leading-relaxed text-[#d9d3bf] md:text-xl">
        <p>
          <strong className="text-text-premium">Primera Riverada los 4 Ases</strong> (&ldquo;nosotros&rdquo;, &ldquo;la plataforma&rdquo;) opera
          el sitio web <strong className="font-semibold text-text-premium">primerariveradalos4ases.com</strong> y la aplicación web
          progresiva (PWA) asociada. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y
          protegemos tu información personal cuando utilizas nuestros servicios.
        </p>
        <p>
          Al registrarte o usar nuestra plataforma, aceptas las prácticas descritas en esta política. Si no estás de
          acuerdo, por favor no utilices nuestros servicios.
        </p>
      </section>

      {/* Section 1 */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-3 border-b border-[#8b6b2e]/45 pb-3 font-display text-[1.625rem] font-bold leading-tight text-text-premium md:text-[2rem]">
          <SectionIcon icon={Eye} />
          1. Información que Recopilamos
        </h2>
        <div className="space-y-4 text-lg leading-relaxed text-[#d9d3bf] md:pl-12">
          <h3 className="text-lg font-semibold text-text-premium">Datos proporcionados por ti</h3>
          <ul className="list-none space-y-2.5">
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span><strong className="text-text-premium">Nombre completo y apodo (nickname)</strong> — para identificarte dentro de las mesas de juego.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span><strong className="text-text-premium">Número de celular (+57)</strong> — utilizado como identificador principal y para verificación mediante código SMS (OTP).</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span><strong className="text-text-premium">Correo electrónico (Google)</strong> — cuando inicias sesión con Google, recibimos tu correo electrónico y nombre asociado a tu cuenta de Google.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span><strong className="text-text-premium">Avatar seleccionado</strong> — la imagen de perfil que escoges dentro de nuestras opciones predefinidas.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span><strong className="text-text-premium">PIN de acceso</strong> — almacenado de forma segura (hasheado) para proteger tu cuenta.</span>
            </li>
          </ul>
          <h3 className="mt-6 text-lg font-semibold text-text-premium">Datos recopilados automáticamente</h3>
          <ul className="list-none space-y-2.5">
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span><strong className="text-text-premium">Información del dispositivo</strong> — identificador de dispositivo de confianza para la política de sesión segura.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span><strong className="text-text-premium">Registros de actividad</strong> — acciones dentro de las mesas de juego con fines de auditoría, fair play y sistema de replays.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span><strong className="text-text-premium">Transacciones financieras</strong> — depósitos, retiros y movimientos de fichas registrados en nuestro libro mayor (ledger) inmutable.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 2 */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-3 border-b border-[#8b6b2e]/45 pb-3 font-display text-[1.625rem] font-bold leading-tight text-text-premium md:text-[2rem]">
          <SectionIcon icon={Database} />
          2. Cómo Usamos tu Información
        </h2>
        <div className="space-y-3 text-lg leading-relaxed text-[#d9d3bf] md:pl-12">
          <p>Utilizamos tu información personal para los siguientes fines:</p>
          <ul className="list-none space-y-2.5">
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span><strong className="text-text-premium">Autenticación y seguridad</strong> — verificar tu identidad mediante OTP por SMS, PIN, Google OAuth y política de dispositivos de confianza.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span><strong className="text-text-premium">Operación de mesas de juego</strong> — gestionar partidas en tiempo real, asignación de turnos, distribución de cartas y cálculo de resultados.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span><strong className="text-text-premium">Gestión financiera</strong> — procesar depósitos, retiros y mantener un registro auditable e inmutable de todas las transacciones.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span><strong className="text-text-premium">Prevención de fraude y colusión</strong> — analizar patrones de juego para detectar y prevenir comportamientos fraudulentos o colusivos entre jugadores.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span><strong className="text-text-premium">Replays y auditoría</strong> — almacenar grabaciones de partidas para revisión, resolución de disputas y mejora del servicio.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span><strong className="text-text-premium">Comunicación</strong> — enviarte códigos de verificación, notificaciones de la plataforma y alertas de seguridad por SMS.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 3 */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-3 border-b border-[#8b6b2e]/45 pb-3 font-display text-[1.625rem] font-bold leading-tight text-text-premium md:text-[2rem]">
          <SectionIcon icon={Lock} />
          3. Cómo Protegemos tu Información
        </h2>
        <div className="space-y-3 text-lg leading-relaxed text-[#d9d3bf] md:pl-12">
          <ul className="list-none space-y-2.5">
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Todas las comunicaciones están cifradas mediante <strong className="text-text-premium">TLS/HTTPS</strong>.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Los PINs se almacenan mediante <strong className="text-text-premium">funciones hash seguras</strong> y nunca en texto plano.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Aplicamos políticas de <strong className="text-text-premium">Row Level Security (RLS)</strong> a nivel de base de datos para garantizar que cada jugador solo accede a sus propios datos.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>La <strong className="text-text-premium">&ldquo;ceguera administrativa&rdquo;</strong> impide que los administradores vean el estado activo de las partidas en curso.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>El <strong className="text-text-premium">libro mayor (ledger) es inmutable</strong>: los registros financieros solo se insertan, nunca se modifican ni eliminan.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 4 */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-3 border-b border-[#8b6b2e]/45 pb-3 font-display text-[1.625rem] font-bold leading-tight text-text-premium md:text-[2rem]">
          <SectionIcon icon={Smartphone} />
          4. Servicios de Terceros
        </h2>
        <div className="space-y-3 text-lg leading-relaxed text-[#d9d3bf] md:pl-12">
          <p>Para operar la plataforma utilizamos los siguientes servicios de terceros:</p>
          <ul className="list-none space-y-2.5">
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span><strong className="text-text-premium">Supabase</strong> — autenticación, base de datos y almacenamiento seguro.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span><strong className="text-text-premium">Google OAuth</strong> — inicio de sesión con cuenta de Google (solo recibimos nombre y correo electrónico).</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span><strong className="text-text-premium">Twilio Verify</strong> — envío de códigos de verificación SMS al número de celular colombiano registrado.</span>
            </li>
          </ul>
          <p>
            No vendemos, alquilamos ni compartimos tu información personal con terceros con fines comerciales o publicitarios.
          </p>
        </div>
      </section>

      {/* Section 5 */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-3 border-b border-[#8b6b2e]/45 pb-3 font-display text-[1.625rem] font-bold leading-tight text-text-premium md:text-[2rem]">
          <SectionIcon icon={UserCheck} />
          5. Tus Derechos
        </h2>
        <div className="space-y-3 text-lg leading-relaxed text-[#d9d3bf] md:pl-12">
          <p>
            De conformidad con la <strong className="text-text-premium">Ley 1581 de 2012</strong> (Ley de Protección de Datos Personales de Colombia) y
            sus decretos reglamentarios, tienes derecho a:
          </p>
          <ul className="list-none space-y-2.5">
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span><strong className="text-text-premium">Conocer</strong> — acceder a los datos personales que hemos recopilado sobre ti.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span><strong className="text-text-premium">Actualizar y rectificar</strong> — solicitar la corrección de datos inexactos o incompletos.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span><strong className="text-text-premium">Revocar autorización</strong> — retirar tu consentimiento para el tratamiento de tus datos.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span><strong className="text-text-premium">Solicitar eliminación</strong> — pedir la supresión de tus datos personales cuando no exista obligación legal de retenerlos.</span>
            </li>
          </ul>
          <p className="mt-2 text-base text-[#bdb7a6]">
            <strong>Nota:</strong> Los registros del libro mayor financiero (ledger) no pueden eliminarse por su naturaleza inmutable y obligaciones de auditoría.
          </p>
        </div>
      </section>

      {/* Section 6 */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-3 border-b border-[#8b6b2e]/45 pb-3 font-display text-[1.625rem] font-bold leading-tight text-text-premium md:text-[2rem]">
          <SectionIcon icon={Trash2} />
          6. Retención y Eliminación de Datos
        </h2>
        <div className="space-y-3 text-lg leading-relaxed text-[#d9d3bf] md:pl-12">
          <p>
            Conservamos tu información personal mientras tu cuenta esté activa o sea necesaria para prestarte los servicios.
            Si solicitas la eliminación de tu cuenta:
          </p>
          <ul className="list-none space-y-2.5">
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Tu perfil, apodo y datos de autenticación serán eliminados.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Tus registros de replays serán anonimizados.</span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5a059]" />
              <span>Los registros financieros del ledger se conservarán de forma anónima por obligaciones de auditoría.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 7 */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-3 border-b border-[#8b6b2e]/45 pb-3 font-display text-[1.625rem] font-bold leading-tight text-text-premium md:text-[2rem]">
          <SectionIcon icon={Mail} />
          7. Contacto
        </h2>
        <div className="space-y-3 text-lg leading-relaxed text-[#d9d3bf] md:pl-12">
          <p>
            Si tienes preguntas, solicitudes o reclamos relacionados con esta política de privacidad o el tratamiento
            de tus datos personales, puedes contactarnos a través de:
          </p>
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

      {/* Divider */}
      <div className="border-t border-[#8b6b2e]/45 pt-6 text-base text-[#bdb7a6]">
        Esta política de privacidad puede ser actualizada periódicamente. Te notificaremos sobre cambios significativos
        a través de la plataforma.
      </div>
      </div>
    </article>
  )
}

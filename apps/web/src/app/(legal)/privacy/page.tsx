import type { Metadata } from 'next'
import { Shield, Eye, Lock, Smartphone, Database, UserCheck, Trash2, Mail } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description: 'Política de privacidad de Primera Riverada los 4 Ases. Conoce cómo recopilamos, usamos y protegemos tu información.',
}

function SectionIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-gold/10 border border-brand-gold/20 mr-3 shrink-0">
      <Icon className="w-4 h-4 text-brand-gold" />
    </span>
  )
}

export default function PrivacyPage() {
  return (
    <article className="space-y-10">
      {/* Header */}
      <header className="text-center space-y-4 pb-8 border-b border-white/10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[11px] font-black tracking-widest uppercase">
          <Shield className="w-3.5 h-3.5" /> Documento Legal
        </div>
        <h1 className="text-3xl md:text-5xl font-display font-black italic bg-gradient-to-br from-brand-gold-light via-brand-gold to-brand-gold-dark bg-clip-text text-transparent leading-tight">
          Política de Privacidad
        </h1>
        <p className="text-text-secondary text-sm">
          Última actualización: 12 de abril de 2026
        </p>
      </header>

      {/* Intro */}
      <section className="text-text-secondary leading-relaxed space-y-4">
        <p>
          <strong className="text-text-premium">Primera Riverada los 4 Ases</strong> (&ldquo;nosotros&rdquo;, &ldquo;la plataforma&rdquo;) opera
          el sitio web <strong className="text-brand-gold">primerariveradalos4ases.com</strong> y la aplicación web
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
        <h2 className="flex items-center text-xl md:text-2xl font-display font-bold text-text-premium">
          <SectionIcon icon={Eye} />
          1. Información que Recopilamos
        </h2>
        <div className="ml-11 space-y-4 text-text-secondary leading-relaxed">
          <h3 className="text-brand-gold font-bold text-sm uppercase tracking-wider">Datos proporcionados por ti</h3>
          <ul className="space-y-2 list-none">
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9830;</span>
              <span><strong className="text-text-premium">Nombre completo y apodo (nickname)</strong> — para identificarte dentro de las mesas de juego.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9830;</span>
              <span><strong className="text-text-premium">Número de celular (+57)</strong> — utilizado como identificador principal y para verificación mediante código SMS (OTP).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9830;</span>
              <span><strong className="text-text-premium">Correo electrónico (Google)</strong> — cuando inicias sesión con Google, recibimos tu correo electrónico y nombre asociado a tu cuenta de Google.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9830;</span>
              <span><strong className="text-text-premium">Avatar seleccionado</strong> — la imagen de perfil que escoges dentro de nuestras opciones predefinidas.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9830;</span>
              <span><strong className="text-text-premium">PIN de acceso</strong> — almacenado de forma segura (hasheado) para proteger tu cuenta.</span>
            </li>
          </ul>
          <h3 className="text-brand-gold font-bold text-sm uppercase tracking-wider mt-6">Datos recopilados automáticamente</h3>
          <ul className="space-y-2 list-none">
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9830;</span>
              <span><strong className="text-text-premium">Información del dispositivo</strong> — identificador de dispositivo de confianza para la política de sesión segura.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9830;</span>
              <span><strong className="text-text-premium">Registros de actividad</strong> — acciones dentro de las mesas de juego con fines de auditoría, fair play y sistema de replays.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9830;</span>
              <span><strong className="text-text-premium">Transacciones financieras</strong> — depósitos, retiros y movimientos de fichas registrados en nuestro libro mayor (ledger) inmutable.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 2 */}
      <section className="space-y-4">
        <h2 className="flex items-center text-xl md:text-2xl font-display font-bold text-text-premium">
          <SectionIcon icon={Database} />
          2. Cómo Usamos tu Información
        </h2>
        <div className="ml-11 space-y-3 text-text-secondary leading-relaxed">
          <p>Utilizamos tu información personal para los siguientes fines:</p>
          <ul className="space-y-2 list-none">
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9827;</span>
              <span><strong className="text-text-premium">Autenticación y seguridad</strong> — verificar tu identidad mediante OTP por SMS, PIN, Google OAuth y política de dispositivos de confianza.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9827;</span>
              <span><strong className="text-text-premium">Operación de mesas de juego</strong> — gestionar partidas en tiempo real, asignación de turnos, distribución de cartas y cálculo de resultados.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9827;</span>
              <span><strong className="text-text-premium">Gestión financiera</strong> — procesar depósitos, retiros y mantener un registro auditable e inmutable de todas las transacciones.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9827;</span>
              <span><strong className="text-text-premium">Prevención de fraude y colusión</strong> — analizar patrones de juego para detectar y prevenir comportamientos fraudulentos o colusivos entre jugadores.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9827;</span>
              <span><strong className="text-text-premium">Replays y auditoría</strong> — almacenar grabaciones de partidas para revisión, resolución de disputas y mejora del servicio.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9827;</span>
              <span><strong className="text-text-premium">Comunicación</strong> — enviarte códigos de verificación, notificaciones de la plataforma y alertas de seguridad por SMS.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 3 */}
      <section className="space-y-4">
        <h2 className="flex items-center text-xl md:text-2xl font-display font-bold text-text-premium">
          <SectionIcon icon={Lock} />
          3. Cómo Protegemos tu Información
        </h2>
        <div className="ml-11 space-y-3 text-text-secondary leading-relaxed">
          <ul className="space-y-2 list-none">
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9824;</span>
              <span>Todas las comunicaciones están cifradas mediante <strong className="text-text-premium">TLS/HTTPS</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9824;</span>
              <span>Los PINs se almacenan mediante <strong className="text-text-premium">funciones hash seguras</strong> y nunca en texto plano.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9824;</span>
              <span>Aplicamos políticas de <strong className="text-text-premium">Row Level Security (RLS)</strong> a nivel de base de datos para garantizar que cada jugador solo accede a sus propios datos.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9824;</span>
              <span>La <strong className="text-text-premium">&ldquo;ceguera administrativa&rdquo;</strong> impide que los administradores vean el estado activo de las partidas en curso.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9824;</span>
              <span>El <strong className="text-text-premium">libro mayor (ledger) es inmutable</strong>: los registros financieros solo se insertan, nunca se modifican ni eliminan.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 4 */}
      <section className="space-y-4">
        <h2 className="flex items-center text-xl md:text-2xl font-display font-bold text-text-premium">
          <SectionIcon icon={Smartphone} />
          4. Servicios de Terceros
        </h2>
        <div className="ml-11 space-y-3 text-text-secondary leading-relaxed">
          <p>Para operar la plataforma utilizamos los siguientes servicios de terceros:</p>
          <ul className="space-y-2 list-none">
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9830;</span>
              <span><strong className="text-text-premium">Supabase</strong> — autenticación, base de datos y almacenamiento seguro.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9830;</span>
              <span><strong className="text-text-premium">Google OAuth</strong> — inicio de sesión con cuenta de Google (solo recibimos nombre y correo electrónico).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9830;</span>
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
        <h2 className="flex items-center text-xl md:text-2xl font-display font-bold text-text-premium">
          <SectionIcon icon={UserCheck} />
          5. Tus Derechos
        </h2>
        <div className="ml-11 space-y-3 text-text-secondary leading-relaxed">
          <p>
            De conformidad con la <strong className="text-text-premium">Ley 1581 de 2012</strong> (Ley de Protección de Datos Personales de Colombia) y
            sus decretos reglamentarios, tienes derecho a:
          </p>
          <ul className="space-y-2 list-none">
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9827;</span>
              <span><strong className="text-text-premium">Conocer</strong> — acceder a los datos personales que hemos recopilado sobre ti.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9827;</span>
              <span><strong className="text-text-premium">Actualizar y rectificar</strong> — solicitar la corrección de datos inexactos o incompletos.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9827;</span>
              <span><strong className="text-text-premium">Revocar autorización</strong> — retirar tu consentimiento para el tratamiento de tus datos.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9827;</span>
              <span><strong className="text-text-premium">Solicitar eliminación</strong> — pedir la supresión de tus datos personales cuando no exista obligación legal de retenerlos.</span>
            </li>
          </ul>
          <p className="text-xs text-text-secondary/60 mt-2">
            <strong>Nota:</strong> Los registros del libro mayor financiero (ledger) no pueden eliminarse por su naturaleza inmutable y obligaciones de auditoría.
          </p>
        </div>
      </section>

      {/* Section 6 */}
      <section className="space-y-4">
        <h2 className="flex items-center text-xl md:text-2xl font-display font-bold text-text-premium">
          <SectionIcon icon={Trash2} />
          6. Retención y Eliminación de Datos
        </h2>
        <div className="ml-11 space-y-3 text-text-secondary leading-relaxed">
          <p>
            Conservamos tu información personal mientras tu cuenta esté activa o sea necesaria para prestarte los servicios.
            Si solicitas la eliminación de tu cuenta:
          </p>
          <ul className="space-y-2 list-none">
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9824;</span>
              <span>Tu perfil, apodo y datos de autenticación serán eliminados.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9824;</span>
              <span>Tus registros de replays serán anonimizados.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-gold mt-1.5 text-xs">&#9824;</span>
              <span>Los registros financieros del ledger se conservarán de forma anónima por obligaciones de auditoría.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Section 7 */}
      <section className="space-y-4">
        <h2 className="flex items-center text-xl md:text-2xl font-display font-bold text-text-premium">
          <SectionIcon icon={Mail} />
          7. Contacto
        </h2>
        <div className="ml-11 space-y-3 text-text-secondary leading-relaxed">
          <p>
            Si tienes preguntas, solicitudes o reclamos relacionados con esta política de privacidad o el tratamiento
            de tus datos personales, puedes contactarnos a través de:
          </p>
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

      {/* Divider */}
      <div className="border-t border-white/10 pt-6 text-center text-text-secondary/50 text-xs">
        Esta política de privacidad puede ser actualizada periódicamente. Te notificaremos sobre cambios significativos
        a través de la plataforma.
      </div>
    </article>
  )
}

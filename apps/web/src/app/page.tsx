import type { Metadata } from 'next'
import Link from 'next/link'
import { Facebook, Instagram, Mail, Smartphone, Car, Wine, Coffee, Spade, Dices } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Primera Riverada los 4 Ases | Club de Cartas y Domino en Colombia',
  description:
    'Mesa Primera — club presencial y online de juego de cartas Primera, domino, bebidas y parqueo. Juega en tiempo real con amigos. También conocido como los 3 Ases o Riverada.',
  alternates: { canonical: '/' },
  keywords: [
    'mesa primera',
    'primera riverada los 4 ases',
    'primera riverada',
    'riverada los 4 ases',
    'los 3 ases',
    'los tres ases',
    'juego de primera',
    'juego de cartas primera',
    'club de cartas colombia',
    'domino colombia',
    'jugar primera online',
    'cartas multijugador',
  ],
  openGraph: {
    title: 'Primera Riverada los 4 Ases | Club de Cartas y Domino',
    description:
      'Club presencial y online de juego de cartas Primera, domino, bebidas y parqueo. Juega en tiempo real con amigos.',
    url: 'https://primerariveradalos4ases.com',
    type: 'website',
    locale: 'es_CO',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Primera Riverada los 4 Ases' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Primera Riverada los 4 Ases | Club de Cartas',
    description: 'Juega Primera online o visítanos en persona. Club de cartas, domino y más.',
    images: ['/og-image.png'],
  },
}

/* ── Placeholder data (replace with real info) ──────────────────── */
const SOCIAL = {
  facebook: 'https://facebook.com/primerariveradalos4ases',
  instagram: 'https://instagram.com/primerariveradalos4ases',
  email: 'soporte@primerariveradalos4ases.com',
}

const SERVICES = [
  { icon: Spade, label: 'Juego de Primera', desc: 'Mesas activas de cartas Primera en tiempo real.' },
  { icon: Dices, label: 'Dominó', desc: 'Partidas de dominó presenciales y con amigos.' },
  { icon: Coffee, label: 'Bebidas sin alcohol', desc: 'Café, jugos y refrescos para tu partida.' },
  { icon: Wine, label: 'Bebidas con alcohol', desc: 'Cervezas, licores y cocteles disponibles.' },
  { icon: Car, label: 'Parqueo', desc: 'Estacionamiento seguro y cómodo para visitantes.' },
]

const TUTORIALS = [
  { title: 'Cómo registrarte', desc: 'Crea tu cuenta en menos de 2 minutos.' },
  { title: 'Cómo jugar tu primera partida', desc: 'Únete a una mesa y empieza a jugar.' },
  { title: 'Cómo usar tu billetera', desc: 'Deposita, retira y controla tus fondos.' },
  { title: 'Cómo instalar la app', desc: 'Agrega Mesa Primera a tu celular como app.' },
]

/* ── Page Component ─────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-text-premium font-sans selection:bg-brand-gold/30 overflow-x-hidden">
      {/* ── Casino Background ─────────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-bg-poker)_0%,_#0a2a1f_100%)]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="relative z-10">
        {/* ═══ Hero ═══ */}
        <header className="flex flex-col items-center text-center px-6 pt-20 pb-16 md:pt-28 md:pb-24 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight leading-tight">
            <span className="bg-gradient-to-r from-brand-gold-light via-brand-gold to-brand-gold-dark bg-clip-text text-transparent">
              Primera Riverada
            </span>
            <br />
            <span className="text-text-premium">los 4 Ases</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-text-secondary max-w-2xl leading-relaxed">
            Club de cartas, dominó y entretenimiento. Juega <strong className="text-text-premium">Primera</strong> online
            con amigos en tiempo real o visítanos en nuestro establecimiento.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/register/player"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-gold-light via-brand-gold to-brand-gold-dark text-slate-950 font-bold text-lg shadow-[0_4px_20px_rgba(226,176,68,0.4)] hover:shadow-[0_6px_30px_rgba(226,176,68,0.6)] hover:scale-105 transition-all duration-300 active:scale-95"
            >
              Crear cuenta gratis
            </Link>
            <Link
              href="/login/player"
              className="px-8 py-4 rounded-2xl border-2 border-brand-gold/40 text-brand-gold font-bold text-lg hover:bg-brand-gold/10 hover:border-brand-gold/60 transition-all duration-300 active:scale-95"
            >
              Iniciar sesión
            </Link>
          </div>

          {/* PWA Hint */}
          <p className="mt-6 flex items-center gap-2 text-sm text-text-secondary">
            <Smartphone className="w-4 h-4" />
            Disponible como app en tu celular — instálala desde el navegador.
          </p>
        </header>

        {/* ═══ About / Quiénes están detrás ═══ */}
        <section className="px-6 py-16 max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-8">
            Quiénes <span className="text-brand-gold">somos</span>
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-sm">
            <p className="text-text-secondary text-lg leading-relaxed">
              Somos un club de entretenimiento con tradición en el juego de cartas
              <strong className="text-text-premium"> Primera</strong> y dominó.
              Con años de experiencia reuniendo jugadores, ahora también ofrecemos
              partidas online en tiempo real para que disfrutes desde cualquier lugar.
            </p>
            <p className="mt-4 text-text-secondary text-lg leading-relaxed">
              Nuestro compromiso es el <strong className="text-text-premium">fair play</strong>,
              la seguridad de tus fondos y una comunidad de jugadores respetuosa.
            </p>
          </div>
        </section>

        {/* ═══ Negocio físico / Servicios ═══ */}
        <section className="px-6 py-16 bg-black/20">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-4">
              Nuestro <span className="text-brand-gold">establecimiento</span>
            </h2>
            <p className="text-center text-text-secondary mb-12 max-w-2xl mx-auto">
              Visítanos en persona y disfruta de un espacio cómodo para jugar, comer y compartir.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {SERVICES.map((s) => (
                <div
                  key={s.label}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-brand-gold/30 hover:bg-brand-gold/5 transition-all duration-300"
                >
                  <s.icon className="w-8 h-8 text-brand-gold mb-4" />
                  <h3 className="text-lg font-bold mb-2">{s.label}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ Cómo jugar ═══ */}
        <section className="px-6 py-16 max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-4">
            Cómo <span className="text-brand-gold">jugar</span>
          </h2>
          <p className="text-center text-text-secondary mb-12 max-w-2xl mx-auto">
            En tres pasos estás dentro de una mesa de Primera.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Regístrate', desc: 'Crea tu cuenta con tu número de celular. Rápido y seguro.' },
              { step: '2', title: 'Deposita fondos', desc: 'Agrega saldo a tu billetera digital para apostar en las mesas.' },
              { step: '3', title: 'Juega', desc: 'Únete a una mesa activa o crea una nueva con tus amigos.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-brand-gold/20 to-brand-gold/5 border border-brand-gold/30 flex items-center justify-center">
                  <span className="text-2xl font-display font-black text-brand-gold">{item.step}</span>
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ Tutoriales / Cómo usar la plataforma ═══ */}
        <section className="px-6 py-16 bg-black/20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-4">
              Cómo usar la <span className="text-brand-gold">plataforma</span>
            </h2>
            <p className="text-center text-text-secondary mb-12 max-w-2xl mx-auto">
              Videos tutoriales para que aprendas a usar todas las funciones. Próximamente.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {TUTORIALS.map((t) => (
                <div
                  key={t.title}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col"
                >
                  {/* Video placeholder */}
                  <div className="w-full aspect-video rounded-xl bg-slate-800/80 border border-white/5 flex items-center justify-center mb-4">
                    <span className="text-text-secondary text-sm">Video próximamente</span>
                  </div>
                  <h3 className="text-lg font-bold mb-1">{t.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ CTA Final ═══ */}
        <section className="px-6 py-20 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
            ¿Listo para <span className="text-brand-gold">jugar</span>?
          </h2>
          <p className="text-text-secondary text-lg mb-10">
            Únete a la comunidad de jugadores de Primera más grande de Colombia.
          </p>
          <Link
            href="/register/player"
            className="inline-block px-10 py-4 rounded-2xl bg-gradient-to-r from-brand-gold-light via-brand-gold to-brand-gold-dark text-slate-950 font-bold text-lg shadow-[0_4px_20px_rgba(226,176,68,0.4)] hover:shadow-[0_6px_30px_rgba(226,176,68,0.6)] hover:scale-105 transition-all duration-300 active:scale-95"
          >
            Crear cuenta gratis
          </Link>
        </section>

        {/* ═══ Footer ═══ */}
        <footer className="border-t border-white/10 bg-black/30 px-6 py-12">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Brand */}
            <div className="text-center md:text-left">
              <p className="font-display font-bold text-lg text-brand-gold">
                Primera Riverada los 4 Ases
              </p>
              <p className="text-text-secondary text-sm mt-1">
                Club de cartas, dominó y entretenimiento.
              </p>
            </div>

            {/* Legal Links */}
            <nav className="flex gap-6" aria-label="Enlaces legales">
              <Link
                href="/privacy"
                className="text-sm text-text-secondary hover:text-brand-gold transition-colors"
              >
                Política de privacidad
              </Link>
              <Link
                href="/terms"
                className="text-sm text-text-secondary hover:text-brand-gold transition-colors"
              >
                Términos y condiciones
              </Link>
            </nav>

            {/* Social Icons */}
            <div className="flex gap-4" role="list" aria-label="Redes sociales">
              <a
                href={SOCIAL.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook de Primera Riverada los 4 Ases"
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-text-secondary hover:text-brand-gold hover:border-brand-gold/30 hover:bg-brand-gold/5 transition-all"
                role="listitem"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href={SOCIAL.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram de Primera Riverada los 4 Ases"
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-text-secondary hover:text-brand-gold hover:border-brand-gold/30 hover:bg-brand-gold/5 transition-all"
                role="listitem"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href={`mailto:${SOCIAL.email}`}
                aria-label="Correo electrónico de contacto"
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-text-secondary hover:text-brand-gold hover:border-brand-gold/30 hover:bg-brand-gold/5 transition-all"
                role="listitem"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          <p className="text-center text-text-secondary text-xs mt-8">
            © {new Date().getFullYear()} Primera Riverada los 4 Ases. Todos los derechos reservados.
          </p>
        </footer>
      </div>
    </div>
  )
}

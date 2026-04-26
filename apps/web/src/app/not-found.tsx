import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-950 text-text-premium px-6 py-20 flex items-center">
      <section className="max-w-2xl mx-auto w-full text-center">
        <p className="text-brand-gold font-semibold tracking-widest uppercase text-xs">Error 404</p>
        <h1 className="mt-4 text-4xl md:text-5xl font-display font-black">Página no encontrada</h1>
        <p className="mt-5 text-text-secondary text-lg leading-relaxed">
          La ruta que buscabas no está disponible. Puedes volver al inicio o entrar
          directamente al flujo de juego.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="px-6 py-3 rounded-xl bg-brand-gold text-slate-950 font-bold hover:brightness-105 transition"
          >
            Ir al inicio
          </Link>
          <Link
            href="/login/player"
            className="px-6 py-3 rounded-xl border border-brand-gold/40 text-brand-gold font-bold hover:bg-brand-gold/10 transition"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register/player"
            className="px-6 py-3 rounded-xl border border-white/20 text-text-secondary font-bold hover:text-text-premium hover:border-brand-gold/30 transition"
          >
            Crear cuenta
          </Link>
        </div>
      </section>
    </main>
  )
}

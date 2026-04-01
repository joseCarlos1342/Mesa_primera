import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Primera Riverada los 4 Ases | Juega Online en Colombia",
  description:
    "Primera Riverada los 4 Ases es un club privado para jugar Primera online con amigos. Registro rapido, partidas en tiempo real y reglas oficiales.",
  alternates: {
    canonical: "/primera-riverada-los-4-ases",
  },
};

export default function BrandSeoLandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-white">
      <h1 className="text-4xl font-black tracking-tight md:text-5xl">
        Primera Riverada los 4 Ases
      </h1>

      <p className="mt-6 text-base text-slate-300 md:text-lg">
        Bienvenido a Primera Riverada los 4 Ases, una plataforma para jugar Primera
        online con amigos, reglas claras y partidas en tiempo real.
      </p>

      <p className="mt-4 text-sm text-slate-400">
        Algunas personas tambien la buscan como "primera riverda los 4 ases".
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="text-2xl font-bold">Por que jugar aqui</h2>
        <ul className="list-disc space-y-2 pl-5 text-slate-300">
          <li>Mesas activas y partidas multijugador online.</li>
          <li>Reglamento claro y enfoque de fair play.</li>
          <li>Acceso rapido desde movil y escritorio.</li>
        </ul>
      </section>

      <section className="mt-10 rounded-2xl border border-emerald-700/40 bg-emerald-900/20 p-6">
        <h2 className="text-xl font-bold">Empieza ahora</h2>
        <p className="mt-3 text-slate-300">
          Crea tu cuenta y entra a las mesas en pocos pasos.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/register/player"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Registrarme
          </Link>
          <Link
            href="/login/player"
            className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-400"
          >
            Iniciar sesion
          </Link>
          <Link
            href="/rules"
            className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-400"
          >
            Ver reglas
          </Link>
        </div>
      </section>
    </main>
  );
}
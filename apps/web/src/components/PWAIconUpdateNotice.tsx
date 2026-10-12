"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { ICON_VERSION } from "@/lib/pwa/icon-version";

/** Versión de icono que el usuario confirmó tener en esta PWA instalada. */
export const ICON_VERSION_KEY = "pwa-icon-version";
/** Timestamp hasta el que el aviso queda pospuesto. */
export const ICON_NOTICE_SNOOZE_KEY = "pwa-icon-notice-snooze-until";
export const ICON_NOTICE_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export type InstalledPlatform = "ios" | "android";

/** Plataforma de la PWA abierta como app instalada, o `null` si se usa en el navegador. */
export function getInstalledPlatform(): InstalledPlatform | null {
  const nav = navigator as Navigator & { standalone?: boolean };
  // iPadOS se presenta como "Macintosh"; se distingue por la pantalla táctil.
  const isIOS =
    /iPad|iPhone|iPod/.test(nav.userAgent) ||
    (/Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1);
  if (isIOS) return nav.standalone === true ? "ios" : null;

  if (/Android/i.test(nav.userAgent)) {
    const standalone =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches;
    return standalone ? "android" : null;
  }
  return null;
}

const STEPS: Record<InstalledPlatform, { intro: string; steps: ReactNode[] }> = {
  ios: {
    intro: "En iPhone el icono solo cambia si vuelves a agregar la app.",
    steps: [
      <>Mantén presionado el icono de <strong>4 Ases</strong> y toca <strong>Eliminar app</strong>.</>,
      <>Abre <strong>primerariveradalos4ases.com</strong> en Safari.</>,
      <>Toca <strong>Compartir</strong> y luego <strong>Agregar a pantalla de inicio</strong>.</>,
    ],
  },
  android: {
    intro: "En Android tienes que aceptar el cambio de icono en Chrome.",
    steps: [
      <>Cierra la app por completo: quítala de las <strong>apps recientes</strong>.</>,
      <>
        Abre <strong>primerariveradalos4ases.com</strong> en Chrome, toca <strong>⋮</strong> y luego{" "}
        <strong>Revisar actualización de la app</strong>. Si aparece un aviso de icono nuevo, acéptalo.
      </>,
      <>
        Si no cambia: mantén presionado el icono, toca <strong>Desinstalar</strong> y vuelve a instalarla desde
        Chrome con <strong>Agregar a pantalla principal</strong>.
      </>,
    ],
  },
};

/**
 * Ningún navegador expone qué icono tiene instalado el dispositivo:
 *  - iOS nunca actualiza el icono de una app añadida a la pantalla de inicio.
 *  - Android/Chrome (>=144) guarda el icono nuevo hasta que el usuario lo acepta.
 * Por eso se avisa a toda instalación cuya versión confirmada no sea la actual,
 * incluidas las que nunca registraron versión (instaladas antes de existir este aviso).
 */
export function PWAIconUpdateNotice() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;
  const [platform, setPlatform] = useState<InstalledPlatform | null>(null);

  useEffect(() => {
    if (isAdmin) return;
    const detected = getInstalledPlatform();
    if (!detected) return;
    if (localStorage.getItem(ICON_VERSION_KEY) === ICON_VERSION) return;

    const snoozedUntil = Number(localStorage.getItem(ICON_NOTICE_SNOOZE_KEY) ?? 0);
    if (Date.now() < snoozedUntil) return;

    setPlatform(detected);
  }, [isAdmin]);

  if (!platform || isAdmin) return null;

  const { intro, steps } = STEPS[platform];

  const acknowledge = () => {
    localStorage.setItem(ICON_VERSION_KEY, ICON_VERSION);
    localStorage.removeItem(ICON_NOTICE_SNOOZE_KEY);
    setPlatform(null);
  };

  const remindLater = () => {
    localStorage.setItem(ICON_NOTICE_SNOOZE_KEY, String(Date.now() + ICON_NOTICE_SNOOZE_MS));
    setPlatform(null);
  };

  // Valores de DESIGN-player.md con tokens globales: este aviso también se monta en la
  // landing, que no carga player.css.
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center overflow-y-auto bg-black/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-icon-update-title"
        aria-describedby="pwa-icon-update-desc"
        className="mt-auto w-full max-w-md rounded-[24px] border border-[#c5a059]/40 bg-[#1a1a2e] p-6 font-sans text-text-premium shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center gap-4">
          <Image
            src={`/icons/icon-192.png?v=${ICON_VERSION}`}
            alt="Nuevo icono de 4 Ases"
            width={64}
            height={64}
            unoptimized
            className="h-16 w-16 shrink-0 rounded-xl"
          />
          <h2 id="pwa-icon-update-title" className="text-xl font-bold leading-[1.3]">
            Tenemos un icono nuevo
          </h2>
        </div>

        <p id="pwa-icon-update-desc" className="mt-4 text-lg leading-[1.6]">
          {intro} Tu cuenta y tu saldo no se pierden. Si tu icono ya se ve así, toca{" "}
          <strong>Entendido</strong>.
        </p>

        <ol className="mt-4 space-y-3 text-lg leading-[1.6]">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gold font-mono text-base font-bold text-[#0a0a0a]"
              >
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={acknowledge}
            className="min-h-12 w-full rounded-lg bg-brand-gold px-6 py-3 text-sm font-bold uppercase tracking-[0.1em] text-[#0a0a0a] transition-colors hover:bg-brand-gold-light active:bg-brand-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold-light"
          >
            Entendido
          </button>
          <button
            type="button"
            onClick={remindLater}
            className="min-h-12 w-full rounded-lg border border-brand-gold px-6 py-3 text-sm font-bold uppercase tracking-[0.1em] text-brand-gold transition-colors hover:bg-text-premium/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold-light"
          >
            Recordar luego
          </button>
        </div>
      </div>
    </div>
  );
}

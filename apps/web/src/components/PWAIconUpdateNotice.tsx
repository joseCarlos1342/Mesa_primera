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

/** Una sola instrucción visible; los pasos detallados quedan plegados para quien los necesite. */
const COPY: Record<InstalledPlatform, { message: ReactNode; helpLabel: string; steps: ReactNode[] }> = {
  ios: {
    message: (
      <>
        Para verlo, borra la app y vuelve a agregarla desde Safari. Tu cuenta y tu saldo no se pierden.
      </>
    ),
    helpLabel: "Ver cómo",
    steps: [
      <>Mantén presionado el icono de <strong>4 Ases</strong> y toca <strong>Eliminar app</strong>.</>,
      <>Abre <strong>primerariveradalos4ases.com</strong> en Safari.</>,
      <>Toca <strong>Compartir</strong> y luego <strong>Agregar a pantalla de inicio</strong>.</>,
    ],
  },
  android: {
    message: (
      <>
        Chrome te preguntará si quieres usar el icono nuevo. Toca <strong>Aceptar</strong>.
      </>
    ),
    helpLabel: "¿No te aparece?",
    steps: [
      <>
        Abre <strong>primerariveradalos4ases.com</strong> en Chrome, toca <strong>⋮</strong> y luego{" "}
        <strong>Revisar actualización de la app</strong>.
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

  const { message, helpLabel, steps } = COPY[platform];

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
          {message}
        </p>

        <details className="group mt-3 text-base leading-[1.6] text-[#d9d3bf]">
          <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-brand-gold-light underline decoration-brand-gold/50 underline-offset-4 marker:content-none [&::-webkit-details-marker]:hidden">
            {helpLabel}
          </summary>
          <ol className="mt-2 list-decimal space-y-2 pl-6 marker:font-bold marker:text-brand-gold">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </details>

        <div className="mt-5 flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={acknowledge}
            className="min-h-12 w-full rounded-lg bg-brand-gold px-6 py-3 text-base font-bold text-[#0a0a0a] transition-colors hover:bg-brand-gold-light active:bg-brand-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold-light"
          >
            Entendido
          </button>
          <button
            type="button"
            onClick={remindLater}
            className="min-h-11 px-4 text-base text-[#bdb7a6] underline decoration-[#bdb7a6]/40 underline-offset-4 transition-colors hover:text-text-premium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold-light"
          >
            Recordar luego
          </button>
        </div>
      </div>
    </div>
  );
}

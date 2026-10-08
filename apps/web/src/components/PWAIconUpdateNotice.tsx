"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { ICON_VERSION } from "@/lib/pwa/icon-version";

/** Versión de icono con la que se instaló (o se reconoció) esta PWA en el dispositivo. */
export const ICON_VERSION_KEY = "pwa-icon-version";
/** Timestamp hasta el que el aviso queda pospuesto. */
export const ICON_NOTICE_SNOOZE_KEY = "pwa-icon-notice-snooze-until";
export const ICON_NOTICE_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function isIOSStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  // iPadOS se presenta como "Macintosh"; se distingue por la pantalla táctil.
  const isIOS =
    /iPad|iPhone|iPod/.test(nav.userAgent) ||
    (/Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1);
  return isIOS && nav.standalone === true;
}

/**
 * iOS nunca actualiza el icono de una app añadida a la pantalla de inicio: solo
 * reinstalando. Android/Chrome sí lo hace (con su propio diálogo) al cambiar la URL
 * del icono en el manifest, así que este aviso solo aparece en iOS en modo app.
 *
 * Al instalar, el almacenamiento de la app empieza vacío: la primera apertura solo
 * registra la versión actual. Si después cambia `ICON_VERSION`, se muestra el aviso.
 */
export function PWAIconUpdateNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isIOSStandalone()) return;

    const installed = localStorage.getItem(ICON_VERSION_KEY);
    if (!installed) {
      localStorage.setItem(ICON_VERSION_KEY, ICON_VERSION);
      return;
    }
    if (installed === ICON_VERSION) return;

    const snoozedUntil = Number(localStorage.getItem(ICON_NOTICE_SNOOZE_KEY) ?? 0);
    if (Date.now() < snoozedUntil) return;

    setOpen(true);
  }, []);

  if (!open) return null;

  const acknowledge = () => {
    localStorage.setItem(ICON_VERSION_KEY, ICON_VERSION);
    localStorage.removeItem(ICON_NOTICE_SNOOZE_KEY);
    setOpen(false);
  };

  const remindLater = () => {
    localStorage.setItem(ICON_NOTICE_SNOOZE_KEY, String(Date.now() + ICON_NOTICE_SNOOZE_MS));
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-overlay-black/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-icon-update-title"
        aria-describedby="pwa-icon-update-desc"
        className="w-full max-w-md rounded-card border border-border-gold/40 bg-surface p-6 text-text-primary shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
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
          <h2 id="pwa-icon-update-title" className="font-headline-sm text-headline-sm">
            Tenemos un icono nuevo
          </h2>
        </div>

        <p id="pwa-icon-update-desc" className="mt-4 text-body-lg">
          En iPhone el icono solo cambia si vuelves a agregar la app. Tu cuenta y tu saldo no se
          pierden; solo tendrás que iniciar sesión otra vez.
        </p>

        <ol className="mt-4 space-y-3 text-body-lg">
          {[
            <>Mantén presionado el icono de <strong>4 Ases</strong> y toca <strong>Eliminar app</strong>.</>,
            <>Abre <strong>primerariveradalos4ases.com</strong> en Safari.</>,
            <>Toca <strong>Compartir</strong> y luego <strong>Agregar a pantalla de inicio</strong>.</>,
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-body-md font-bold text-text-on-primary"
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
            className="min-h-12 w-full rounded-button bg-primary px-6 py-3 text-label-lg font-bold uppercase tracking-[0.1em] text-text-on-primary transition-colors hover:bg-primary-light active:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"
          >
            Entendido
          </button>
          <button
            type="button"
            onClick={remindLater}
            className="min-h-12 w-full rounded-button border border-primary px-6 py-3 text-label-lg font-bold uppercase tracking-[0.1em] text-primary transition-colors hover:bg-text-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light"
          >
            Recordar luego
          </button>
        </div>
      </div>
    </div>
  );
}

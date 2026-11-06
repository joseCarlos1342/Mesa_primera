"use client";

import { useState, useEffect } from "react";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((navigator as any).standalone) return;

    // Check if dismissed recently (24h cooldown)
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 86400000) return;

    // Detect iOS
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isiOS);

    if (isiOS) {
      // iOS doesn't fire beforeinstallprompt — show manual guide
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  if (!showBanner) return null;

  return (
    <>
      <div
        role="region"
        aria-label="Instalar la app"
        className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md lg:bottom-8"
      >
        <div className="relative rounded-lg border border-[#8b6b2e]/80 bg-[#120806] p-4 shadow-[0_16px_36px_-12px_rgba(0,0,0,0.9)]">
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute right-1.5 top-1.5 inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#bdb7a6] transition-colors hover:text-text-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-3 pr-10">
            <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#8b6b2e]/70 bg-[#0a2c20] text-brand-gold-light">
              <Download className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-text-premium">Instalar 4 Ases</p>
              <p className="text-base text-[#bdb7a6]">Juega a pantalla completa, sin la barra del navegador.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleInstall}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-[#8b6b2e]/80 text-lg font-semibold text-text-premium transition-colors hover:border-brand-gold hover:text-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
          >
            {isIOS ? "Ver instrucciones" : "Instalar app"}
          </button>
        </div>
      </div>

      {showIOSGuide && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-4" onClick={handleDismiss}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            className="mb-4 w-full max-w-sm rounded-xl border border-[#8b6b2e]/70 bg-[#120806] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="ios-install-title" className="mb-4 text-center font-display text-[1.5rem] font-bold text-text-premium">
              Instalar en iPhone o iPad
            </h3>
            <ol className="space-y-3 text-lg text-[#d9d3bf]">
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#c5a059] font-mono text-base text-brand-gold-light">1</span>
                <span>
                  Toca el botón <strong className="font-semibold text-text-premium">Compartir</strong>{" "}
                  <Share className="inline h-5 w-5 align-text-bottom text-brand-gold-light" aria-hidden="true" /> en Safari
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#c5a059] font-mono text-base text-brand-gold-light">2</span>
                <span>
                  Desliza y toca <strong className="font-semibold text-text-premium">Añadir a pantalla de inicio</strong>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#c5a059] font-mono text-base text-brand-gold-light">3</span>
                <span>
                  Toca <strong className="font-semibold text-text-premium">Agregar</strong>
                </span>
              </li>
            </ol>
            <button
              type="button"
              onClick={handleDismiss}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-brand-gold text-lg font-bold text-[#0a0a0a] transition-colors hover:bg-brand-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';

/**
 * Overlay que se muestra solo en dispositivos móviles cuando el usuario
 * está en orientación vertical. Las repeticiones requieren modo horizontal
 * para aprovechar el espacio de la mesa de juego.
 */
export function LandscapeLockOverlay() {
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    function check() {
      // Consideramos "móvil" cualquier viewport <= 1024px de ancho corto.
      const shortSide = Math.min(window.innerWidth, window.innerHeight);
      const isMobile = shortSide <= 900;
      const isPortrait = window.innerHeight > window.innerWidth;
      setShowOverlay(isMobile && isPortrait);
    }
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  if (!showOverlay) return null;

  return (
    <div
      data-testid="replay-landscape-lock"
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center gap-6 bg-black/95 backdrop-blur-md p-8 text-center"
    >
      <div className="animate-pulse">
        <RotateCcw className="w-20 h-20 text-(--accent-gold)" strokeWidth={1.5} />
      </div>
      <h2 className="text-2xl font-black uppercase tracking-widest text-(--accent-gold)">
        Gira tu teléfono
      </h2>
      <p className="text-sm font-bold text-slate-300 max-w-xs leading-relaxed">
        Para disfrutar la repetición, por favor coloca tu dispositivo en modo horizontal.
      </p>
    </div>
  );
}

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
      role="dialog"
      aria-modal="true"
      aria-labelledby="replay-landscape-title"
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center gap-5 bg-[#0a0a0a] p-8 text-center"
    >
      <span aria-hidden="true" className="flex h-20 w-20 items-center justify-center rounded-full border border-[#8b6b2e] bg-[#0a2c20] text-brand-gold-light">
        <RotateCcw className="h-10 w-10" strokeWidth={1.75} />
      </span>
      <h2 id="replay-landscape-title" className="font-display text-[2rem] font-bold leading-tight text-text-premium">
        Gira tu teléfono
      </h2>
      <p className="max-w-xs text-lg leading-relaxed text-[#d9d3bf]">
        La repetición usa la mesa completa. Pon el teléfono en horizontal para verla.
      </p>
    </div>
  );
}

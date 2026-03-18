import React from 'react';

export const AVATARS = [
  {
    id: 'as-oros',
    name: 'As de Oros',
    description: 'La fortuna sonríe a los audaces.',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
        <defs>
          <linearGradient id="gold-shine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FBDA61" />
            <stop offset="50%" stopColor="#FF5ACD" />
            <stop offset="100%" stopColor="#FBDA61" />
          </linearGradient>
          <filter id="glass" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="1" dy="1" />
            <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" />
            <feColorMatrix type="matrix" values="0 0 0 0 1   0 0 0 0 1   0 0 0 0 1  0 0 0 0.4 0" />
          </filter>
        </defs>
        <rect x="12" y="12" width="76" height="76" rx="16" fill="white" />
        <rect x="16" y="16" width="68" height="68" rx="12" fill="#fafafa" stroke="#e2b044" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="24" fill="url(#gold-shine)" filter="url(#glass)" />
        <text x="50" y="65" fontSize="38" fontWeight="900" fill="white" textAnchor="middle" style={{ fontFamily: 'serif', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>A</text>
        <path d="M24 24 L32 24 L28 32 Z" fill="#e2b044" />
        <path d="M76 76 L68 76 L72 68 Z" fill="#e2b044" />
      </svg>
    )
  },
  {
    id: 'rey-espadas',
    name: 'Rey de Espadas',
    description: 'Dominio absoluto y justicia gélida.',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
        <defs>
          <linearGradient id="blade-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
        </defs>
        <rect x="10" y="10" width="80" height="80" rx="16" fill="#0f172a" stroke="#334155" strokeWidth="2" />
        <path d="M50 15 L55 30 L50 85 L45 30 Z" fill="url(#blade-grad)" />
        <rect x="35" y="35" width="30" height="6" rx="2" fill="#e2b044" filter="drop-shadow(0 0 8px #e2b044)" />
        <circle cx="50" cy="20" r="6" fill="#e2b044" filter="drop-shadow(0 0 10px #e2b044)" />
        <path d="M50 15 L53 25 L50 22 L47 25 Z" fill="white" opacity="0.8" />
      </svg>
    )
  },
  {
    id: 'copas-luxury',
    name: 'Copa Real',
    description: 'Brinda por la victoria eterna.',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
        <defs>
          <linearGradient id="wine-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#4c0519" />
          </linearGradient>
        </defs>
        <rect x="10" y="10" width="80" height="80" rx="16" fill="#1e1b4b" stroke="#312e81" strokeWidth="2" />
        <path d="M30 25 Q50 15 70 25 L65 65 Q50 75 35 65 Z" fill="url(#wine-grad)" filter="drop-shadow(0 0 15px #e11d48)" />
        <path d="M42 65 L58 65 L55 85 L45 85 Z" fill="#e2b044" />
        <rect x="40" y="80" width="20" height="5" rx="2" fill="#e2b044" />
        <ellipse cx="50" cy="30" rx="15" ry="5" fill="white" opacity="0.2" />
      </svg>
    )
  },
  {
    id: 'ficha-maestra',
    name: 'Ficha Elite',
    description: 'El peso del oro en cada apuesta.',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
        <circle cx="50" cy="50" r="42" fill="#0f172a" stroke="#10b981" strokeWidth="6" strokeDasharray="10 3" />
        <circle cx="50" cy="50" r="32" fill="#10b981" />
        <circle cx="50" cy="50" r="28" fill="none" stroke="white" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
        <text x="50" y="63" fontSize="34" fontWeight="900" fill="white" textAnchor="middle" style={{ fontFamily: 'monospace', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>$</text>
        <circle cx="50" cy="50" r="38" fill="none" stroke="white" strokeWidth="0.5" opacity="0.2" />
      </svg>
    )
  },
  {
    id: 'reina-diamantes',
    name: 'Reina de Diamantes',
    description: 'Elegancia letal bajo presión.',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
        <defs>
          <linearGradient id="diam-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#fff" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <rect x="14" y="14" width="72" height="72" rx="16" fill="white" />
        <path d="M50 28 L72 50 L50 72 L28 50 Z" fill="url(#diam-grad)" stroke="#0ea5e9" strokeWidth="1" />
        <path d="M50 28 L50 72 M28 50 L72 50" stroke="white" strokeWidth="0.5" opacity="0.5" />
        <text x="21" y="30" fontSize="14" fontWeight="900" fill="#0ea5e9" textAnchor="middle">Q</text>
        <text x="79" y="79" fontSize="14" fontWeight="900" fill="#0ea5e9" textAnchor="middle" transform="rotate(180 79 79)">Q</text>
        <circle cx="50" cy="50" r="4" fill="white" filter="blur(2px)" />
      </svg>
    )
  },
  {
    id: 'dados-dorados',
    name: 'Dados Dorados',
    description: 'El azar favorece a los que arriesgan.',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
        <rect x="25" y="25" width="45" height="45" rx="8" fill="#e2b044" transform="rotate(-15 50 50)" filter="drop-shadow(4px 4px 6px rgba(0,0,0,0.4))" />
        <rect x="40" y="30" width="45" height="45" rx="8" fill="#f59e0b" transform="rotate(10 50 50)" filter="drop-shadow(2px 2px 4px rgba(0,0,0,0.3))" />
        <circle cx="50" cy="40" r="3" fill="white" />
        <circle cx="75" cy="40" r="3" fill="white" />
        <circle cx="62" cy="52" r="3" fill="white" />
        <circle cx="50" cy="65" r="3" fill="white" />
        <circle cx="75" cy="65" r="3" fill="white" />
      </svg>
    )
  },
  {
    id: 'mascara-elite',
    name: 'Máscara Élite',
    description: 'Incógnito, impredecible, infalible.',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
        <rect x="10" y="10" width="80" height="80" rx="16" fill="#1e1b4b" stroke="#e2b044" strokeWidth="2" />
        <path d="M25 40 Q50 30 75 40 L70 60 Q50 75 30 60 Z" fill="white" />
        <ellipse cx="40" cy="48" rx="6" ry="4" fill="#1e1b4b" />
        <ellipse cx="60" cy="48" rx="6" ry="4" fill="#1e1b4b" />
        <path d="M30 40 L70 40" stroke="#e2b044" strokeWidth="4" opacity="0.3" />
        <circle cx="50" cy="30" r="3" fill="#e2b044" filter="drop-shadow(0 0 5px #e2b044)" />
      </svg>
    )
  },
  {
    id: 'poker-real',
    name: 'Poker Real',
    description: 'La mano perfecta para el trono.',
    svg: (
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
        <rect x="15" y="15" width="40" height="60" rx="6" fill="white" stroke="#ddd" strokeWidth="1" transform="rotate(-20 35 45)" />
        <rect x="25" y="15" width="40" height="60" rx="6" fill="white" stroke="#ddd" strokeWidth="1" transform="rotate(-10 35 45)" />
        <rect x="35" y="15" width="40" height="60" rx="6" fill="white" stroke="#ddd" strokeWidth="1" />
        <path d="M50 40 L60 55 L40 55 Z" fill="#ef4444" />
        <path d="M50 63 L60 48 L40 48 Z" fill="#ef4444" />
        <text x="42" y="32" fontSize="12" fontWeight="900" fill="#ef4444">A</text>
        <circle cx="55" cy="70" r="1.5" fill="#ef4444" />
      </svg>
    )
  }
];

export function getAvatarSvg(id: string | null | undefined) {
  if (!id) return null;
  return AVATARS.find(a => a.id === id)?.svg || null;
}

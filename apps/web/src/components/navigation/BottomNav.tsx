'use client'

import { Home, Wallet, BarChart2, Users, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Inicio', icon: Home, href: '/' },
  { label: 'Billetera', icon: Wallet, href: '/wallet' },
  { label: 'Estadísticas', icon: BarChart2, href: '/stats' },
  { label: 'Amigos', icon: Users, href: '/friends' },
  { label: 'Reglas', icon: BookOpen, href: '/rules' },
]

export function BottomNav() {
  const pathname = usePathname()

  // Hide BottomNav in game table
  if (pathname.includes('/play/')) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[80] bg-black/80 backdrop-blur-2xl border-t border-brand-gold/20 pb-safe shadow-[0_-10px_50px_rgba(0,0,0,0.8)]">
      <div className="flex justify-around items-center h-20 md:h-24 max-w-lg mx-auto px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href} className="flex-1 group">
              <div className="flex flex-col items-center justify-center gap-1">
                <div className={cn(
                  "relative p-2.5 rounded-2xl transition-all duration-500",
                  isActive ? "text-brand-gold drop-shadow-[0_0_10px_rgba(202,171,114,0.5)]" : "text-text-secondary group-hover:text-text-premium translate-y-0"
                )}>
                  <item.icon className={cn(
                    "w-7 h-7 md:w-8 md:h-8 transition-transform duration-500",
                    isActive ? "scale-110" : "scale-100"
                  )} />
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-brand-gold/10 rounded-2xl border border-brand-gold/30"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </div>
                <span className={cn(
                  "text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-500",
                  isActive ? "text-brand-gold" : "text-text-secondary group-hover:text-text-premium"
                )}>
                  {item.label}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

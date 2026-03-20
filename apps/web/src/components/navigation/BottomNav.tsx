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
    <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-slate-950/90 backdrop-blur-2xl border-t border-brand-gold/20 pb-safe shadow-[0_-15px_60px_rgba(0,0,0,0.9)]">
      <div className="flex justify-between items-center h-20 md:h-24 max-w-2xl mx-auto px-4 sm:px-8">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href} className="flex-1 min-w-0 group">
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className={cn(
                  "relative p-2.5 rounded-2xl transition-all duration-500",
                  isActive ? "text-brand-gold drop-shadow-[0_4px_12px_rgba(226,176,68,0.3)] bg-brand-gold/5" : "text-slate-500 group-hover:text-text-premium"
                )}>
                  <item.icon className={cn(
                    "w-6 h-6 md:w-8 md:h-8 transition-transform duration-500",
                    isActive ? "scale-110" : "scale-100"
                  )} />
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute inset-0 bg-brand-gold/10 rounded-2xl border border-brand-gold/40"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </div>
                <span className={cn(
                  "text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] transition-all duration-500 truncate px-1",
                  isActive ? "text-brand-gold scale-105" : "text-slate-600 group-hover:text-text-premium"
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

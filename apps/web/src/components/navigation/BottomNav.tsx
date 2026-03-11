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
    <nav className="fixed bottom-0 left-0 right-0 z-[80] bg-slate-900/95 backdrop-blur-xl border-t border-white/10 pb-safe">
      <div className="flex justify-around items-center h-20 md:h-24 max-w-lg mx-auto px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href} className="flex-1 group">
              <div className="flex flex-col items-center justify-center gap-1">
                <div className={cn(
                  "relative p-2 rounded-2xl transition-all duration-300",
                  isActive ? "bg-indigo-600/20 text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
                )}>
                  <item.icon className={cn(
                    "w-7 h-7 md:w-8 md:h-8",
                    isActive && "animate-pulse"
                  )} />
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-indigo-500/10 rounded-2xl border border-indigo-500/20"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </div>
                <span className={cn(
                  "text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors",
                  isActive ? "text-indigo-400" : "text-slate-600"
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

"use client"

import { signOut } from "../../app/(auth)/auth-actions"
import { LogOut } from "lucide-react"
import { usePathname } from "next/navigation"

interface SignOutButtonProps {
  variant?: 'premium' | 'danger' | 'ghost'
  className?: string
}

export function SignOutButton({ variant = 'premium', className = '' }: SignOutButtonProps) {
  const pathname = usePathname()
  const baseStyles = "flex items-center gap-2 px-4 py-3 rounded-xl md:rounded-2xl font-black transition-all duration-300 active:scale-95 group"
  
  const variants = {
    premium: "bg-black/40 border-2 border-brand-gold/20 text-brand-gold hover:border-brand-gold/50 hover:bg-black/60 shadow-[0_10px_30px_rgba(0,0,0,0.5)]",
    danger: "bg-black/40 border-2 border-brand-red/30 text-brand-red hover:bg-brand-red/10 hover:border-brand-red/60 shadow-[0_10px_30px_rgba(0,0,0,0.3)]",
    ghost: "text-text-secondary hover:text-text-premium"
  }

  const handleSignOut = async () => {
    // Si estamos en una ruta de admin o el pathname contiene admin, redirigir al login de admin
    const isAdmin = pathname?.includes('/admin')
    signOut(isAdmin ? '/login/admin' : '/login/player')
  }

  return (
    <button
      onClick={handleSignOut}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      title="Cerrar Sesión"
      aria-label="Cerrar Sesión"
    >
      <LogOut className="w-5 h-5 md:w-6 md:h-6 shrink-0 transition-transform group-hover:-translate-x-1" />
      <span className="text-xs md:text-sm tracking-widest uppercase hidden sm:inline font-black">Salir</span>
    </button>
  )
}

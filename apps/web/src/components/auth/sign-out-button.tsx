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
  const baseStyles = "flex items-center gap-3 px-6 py-4 rounded-2xl font-black transition-all duration-300 active:scale-95 group"
  
  const variants = {
    premium: "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white backdrop-blur-md shadow-lg",
    danger: "bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300",
    ghost: "text-slate-500 hover:text-slate-300"
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
    >
      <LogOut className="w-6 h-6 transition-transform group-hover:-translate-x-1" />
      <span className="text-sm md:text-xl tracking-widest uppercase hidden sm:inline">Salir</span>
    </button>
  )
}

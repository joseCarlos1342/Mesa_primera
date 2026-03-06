"use client"

import { signOut } from "../../app/(auth)/auth-actions"
import { LogOut } from "lucide-react"

interface SignOutButtonProps {
  variant?: 'premium' | 'danger' | 'ghost'
  className?: string
}

export function SignOutButton({ variant = 'premium', className = '' }: SignOutButtonProps) {
  const baseStyles = "flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all duration-300 active:scale-95 group"
  
  const variants = {
    premium: "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white backdrop-blur-md shadow-lg",
    danger: "bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300",
    ghost: "text-slate-500 hover:text-slate-300"
  }

  return (
    <button
      onClick={() => signOut()}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      title="Cerrar Sesión"
    >
      <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
      <span className="text-sm tracking-widest uppercase">Salir</span>
    </button>
  )
}

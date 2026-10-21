'use client'

import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { AlertCircle, Check, CheckCircle2, Loader2, type LucideIcon } from 'lucide-react'
import { DocumentBackground } from './DocumentBackground'

/* Auth del admin: tokens de DESIGN-admin.md (gris azulado, indigo funcional, Source Sans 3).
   Ningún dorado, paño ni carta del mundo player. */

interface AdminAuthShellProps {
  readonly icon: LucideIcon
  readonly title: string
  readonly description?: ReactNode
  readonly children: ReactNode
}

export function AdminAuthShell({ icon: Icon, title, description, children }: AdminAuthShellProps) {
  return (
    <div className="admin-layout flex min-h-dvh flex-col bg-gray-900 font-sans text-white selection:bg-indigo-500/40">
      <DocumentBackground color="#111827" />
      <header className="flex h-14 items-center border-b border-white/10 bg-gray-900/80 px-4 backdrop-blur-sm sm:px-6">
        <p className="text-lg font-bold tracking-tight text-white">
          Mesa Primera <span className="font-semibold text-slate-400">· Admin</span>
        </p>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center sm:px-6 sm:py-16">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-gray-950/40 p-6 shadow-2xl sm:p-8">
          <div className="mb-8 flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/20">
              <Icon className="h-6 w-6 text-indigo-300" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="text-[1.75rem] font-extrabold leading-tight tracking-[-0.02em] text-white">{title}</h1>
              {description && <div className="mt-2 text-sm leading-6 text-slate-300">{description}</div>}
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}

/* ── Campo ─────────────────────────────────────────────────────────────── */

export function adminInputClass(error?: string | null, valid?: boolean): string {
  const tone = error
    ? 'border-red-400/70 focus:border-red-400 focus:ring-red-400/30'
    : valid
      ? 'border-emerald-400/60 focus:border-emerald-400 focus:ring-emerald-400/30'
      : 'border-white/10 hover:border-white/20 focus:border-indigo-500 focus:ring-indigo-500/30'
  return `h-12 w-full min-w-0 rounded-xl border bg-gray-800 px-4 text-sm text-white caret-indigo-400 placeholder:text-slate-500 outline-none transition-colors focus:bg-gray-700 focus:ring-2 sm:text-base ${tone}`
}

interface AdminFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label: string
  readonly error?: string | null
  readonly valid?: boolean
}

export function AdminField({ label, error, valid = false, id, className = '', ...inputProps }: AdminFieldProps) {
  const autoId = useId()
  const inputId = id ?? `admin-field-${autoId}`
  const errorId = `${inputId}-error`
  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`${adminInputClass(error, valid)} ${valid ? 'pr-11' : ''} ${className}`}
          {...inputProps}
        />
        {valid && !error && (
          <Check
            data-testid="field-valid"
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400"
            aria-hidden="true"
          />
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm font-semibold text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}

/* ── Botón ─────────────────────────────────────────────────────────────── */

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: 'primary' | 'secondary'
  readonly pending?: boolean
}

export function AdminButton({
  variant = 'primary',
  pending = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}: AdminButtonProps) {
  const look =
    variant === 'primary'
      ? 'bg-indigo-500 text-white hover:bg-indigo-400 active:bg-indigo-700'
      : 'border border-white/10 bg-transparent text-slate-300 hover:bg-gray-700 hover:text-white'
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-50 ${look} ${className}`}
      {...props}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
      {children}
    </button>
  )
}

/* ── Alertas ───────────────────────────────────────────────────────────── */

export function AdminAlert({ tone = 'error', children }: { readonly tone?: 'error' | 'success'; readonly children: ReactNode }) {
  const isError = tone === 'error'
  const Icon = isError ? AlertCircle : CheckCircle2
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        isError ? 'border-red-400/30 bg-red-400/10 text-red-200' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
      }`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${isError ? 'text-red-400' : 'text-emerald-400'}`} aria-hidden="true" />
      <div className="min-w-0 [overflow-wrap:anywhere]">{children}</div>
    </div>
  )
}

/** Enlace de texto indigo del auth admin. */
export const adminTextLink =
  'rounded-sm font-semibold text-indigo-300 underline decoration-indigo-400/40 underline-offset-4 transition-colors hover:text-indigo-200 hover:decoration-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400'

"use client"

import { useActionState, useEffect, useState } from 'react'
import { completeGoogleRegistration, getGoogleUserData } from '../../../auth-actions'
import { AvatarSelector } from '@/components/auth/avatar-selector'
import { UserPlus, Mail } from 'lucide-react'
import { fullNameSchema, nicknameSchema, phoneSchema } from '@/lib/validations'

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-red-400 text-xs font-bold ml-2 mt-1">{msg}</p>
}

function inputBorder(error?: string, valid?: boolean) {
  if (error) return 'border-red-500/60 focus:border-red-500/80 focus:ring-red-500/10'
  if (valid) return 'border-green-500/40 focus:border-green-500/60 focus:ring-green-500/10'
  return 'border-white/10 focus:border-brand-gold/50 focus:ring-brand-gold/10'
}

export default function CompleteGoogleRegistrationPage() {
  const [state, formAction, isPending] = useActionState(completeGoogleRegistration, null)
  const [selectedAvatar, setSelectedAvatar] = useState('as-oros')
  const [googleData, setGoogleData] = useState<{ fullName: string; email: string; avatarUrl: string } | null>(null)
  const [fullNameValue, setFullNameValue] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [nicknameLen, setNicknameLen] = useState(0)

  const serverErrors = (state as any)?.fieldErrors ?? {}

  useEffect(() => {
    getGoogleUserData().then(data => {
      if (data) {
        setGoogleData(data)
        if (data.fullName) setFullNameValue(data.fullName)
      }
    })
  }, [])

  function touch(field: string) {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  function setError(field: string, msg: string | null) {
    setErrors(prev => {
      if (msg === null) {
        const next = { ...prev }
        delete next[field]
        return next
      }
      return { ...prev, [field]: msg }
    })
  }

  function validateField(field: string, value: string) {
    touch(field)
    let result
    if (field === 'fullName') result = fullNameSchema.safeParse(value.trim())
    else if (field === 'nickname') result = nicknameSchema.safeParse(value.trim())
    else if (field === 'phone') result = phoneSchema.safeParse(value.trim())
    else return
    setError(field, result.success ? null : result.error.issues?.[0]?.message ?? 'Campo inválido')
  }

  function displayError(field: string) {
    return serverErrors[field] ?? errors[field]
  }

  function isValid(field: string) {
    return touched[field] && !displayError(field)
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-text-premium font-sans selection:bg-brand-gold/30 overflow-hidden">
      {/* Premium Casino Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-bg-poker)_0%,_#0a2a1f_100%)]" />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3%3Cfilter id='noiseFilter'%3%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3%3C/filter%3%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3%3C/svg%3")` }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />
      </div>

      <div className="w-full max-w-xl z-10 animate-in fade-in zoom-in-95 duration-1000">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-7xl font-display font-black tracking-tighter bg-gradient-to-br from-brand-gold-light via-brand-gold to-brand-gold-dark bg-clip-text text-transparent italic drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
            PRIMERA RIVERADA
          </h1>
        </div>

        {/* Card */}
        <div className="relative backdrop-blur-2xl bg-black/40 border-2 border-brand-gold/20 p-8 md:p-10 rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.7)]">
          <div className="space-y-3 mb-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[12px] font-black tracking-widest uppercase mb-2">
              <UserPlus className="w-4 h-4" /> COMPLETA TU PERFIL
            </div>
            <h2 className="text-3xl font-bold text-text-premium">Casi listo</h2>
            <p className="text-text-secondary text-base">Completa tu perfil de Google para empezar a jugar</p>
          </div>

          {/* Google email info */}
          {googleData?.email && (
            <div className="mb-8 p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 text-sm text-text-secondary">
              <Mail className="w-4 h-4 text-brand-gold flex-shrink-0" />
              <span>Conectado como <strong className="text-text-premium">{googleData.email}</strong></span>
            </div>
          )}

          {(state as any)?.error && (
            <div className="mb-8 p-5 bg-brand-red/10 border-2 border-brand-red/30 rounded-2xl text-brand-red text-sm font-bold text-center animate-shake">
              {(state as any).error}
            </div>
          )}

          <form action={formAction} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nombre Real */}
              <div className="space-y-2 group">
                <label className="text-xs font-black text-brand-gold/60 uppercase tracking-widest ml-2 group-focus-within:text-brand-gold transition-colors">
                  Nombre Real
                </label>
                <div className="relative">
                  <input
                    name="fullName"
                    type="text"
                    required
                    maxLength={80}
                    placeholder="Jose Carlos"
                    value={fullNameValue}
                    onChange={e => {
                      setFullNameValue(e.target.value)
                      if (touched.fullName) validateField('fullName', e.target.value)
                    }}
                    onBlur={e => validateField('fullName', e.target.value)}
                    className={`w-full h-14 px-5 bg-black/50 border-2 rounded-2xl text-text-premium text-lg placeholder-white/10 focus:outline-none focus:ring-4 transition-all shadow-inner ${inputBorder(displayError('fullName'), isValid('fullName'))}`}
                  />
                  {isValid('fullName') && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400 font-black">✓</span>
                  )}
                </div>
                <FieldError msg={displayError('fullName')} />
              </div>

              {/* Apodo */}
              <div className="space-y-2 group">
                <label className="text-xs font-black text-brand-gold/60 uppercase tracking-widest ml-2 group-focus-within:text-brand-gold transition-colors flex justify-between">
                  <span>Apodo / Nickname</span>
                  <span className={`font-mono ${nicknameLen > 18 ? 'text-yellow-400' : 'text-white/20'}`}>
                    {nicknameLen}/20
                  </span>
                </label>
                <div className="relative">
                  <input
                    name="nickname"
                    type="text"
                    required
                    maxLength={20}
                    placeholder="AsDelDestino"
                    onChange={e => {
                      setNicknameLen(e.target.value.length)
                      if (touched.nickname) validateField('nickname', e.target.value)
                    }}
                    onBlur={e => validateField('nickname', e.target.value)}
                    className={`w-full h-14 px-5 bg-black/50 border-2 rounded-2xl text-text-premium text-lg placeholder-white/10 focus:outline-none focus:ring-4 transition-all shadow-inner ${inputBorder(displayError('nickname'), isValid('nickname'))}`}
                  />
                  {isValid('nickname') && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400 font-black">✓</span>
                  )}
                </div>
                <FieldError msg={displayError('nickname')} />
                {!displayError('nickname') && (
                  <p className="text-white/20 text-[10px] ml-2">Letras, números y _ (sin espacios)</p>
                )}
              </div>
            </div>

            {/* Teléfono */}
            <div className="space-y-2 group">
              <label className="text-xs font-black text-brand-gold/60 uppercase tracking-widest ml-2 group-focus-within:text-brand-gold transition-colors">
                Número de Celular
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-5 text-brand-gold font-mono font-black text-lg md:text-2xl tracking-tighter pointer-events-none">
                  +57
                </span>
                <input
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  required
                  placeholder="3001234567"
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '')
                    e.target.value = digits
                    if (touched.phone) validateField('phone', digits)
                  }}
                  onBlur={e => validateField('phone', e.target.value)}
                  className={`w-full h-14 pl-16 pr-8 bg-black/50 border-2 rounded-2xl text-lg md:text-2xl text-text-premium placeholder-white/10 focus:outline-none focus:ring-4 transition-all font-mono tracking-tighter md:tracking-normal shadow-inner ${inputBorder(displayError('phone'), isValid('phone'))}`}
                />
                {isValid('phone') && (
                  <span className="absolute right-5 text-green-400 text-xl font-black pointer-events-none">✓</span>
                )}
              </div>
              <FieldError msg={displayError('phone')} />
              {!displayError('phone') && (
                <p className="text-white/20 text-[10px] ml-2">10 dígitos, debe empezar por 3. Recibirás un código de verificación.</p>
              )}
            </div>

            <AvatarSelector onSelect={setSelectedAvatar} selectedId={selectedAvatar} />
            <input type="hidden" name="avatarId" value={selectedAvatar} />

            <button
              type="submit"
              disabled={isPending}
              className="group relative w-full h-20 bg-gradient-to-b from-brand-gold-light via-brand-gold to-brand-gold-dark text-black font-black uppercase tracking-widest text-base rounded-2xl transition-all duration-200 border-b-4 border-brand-gold-dark active:border-b-0 active:translate-y-1 shadow-[0_10px_20px_rgba(0,0,0,0.4)] disabled:opacity-50 overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                {isPending ? 'GUARDANDO...' : 'VERIFICAR TELÉFONO'}
              </span>
              <div className="absolute inset-0 bg-white/20 translate-x-[-105%] skew-x-[-20deg] group-hover:translate-x-[155%] transition-transform duration-1000 ease-in-out" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

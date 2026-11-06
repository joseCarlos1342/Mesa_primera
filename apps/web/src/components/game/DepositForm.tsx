'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { createDepositRequest } from '@/app/actions/wallet'
import { Check, Copy, ImageUp } from 'lucide-react'
import { depositAmountSchema, observationsSchema, validateImageFile } from '@/lib/validations'
import { AuthAlert, AuthButton, AuthField } from '@/components/auth/AuthForm'
import { TextareaField } from '@/components/player/PlayerUI'

interface DepositFormProps {
  initialAmount?: string
  onSuccess?: () => void
}

const NEQUI_NUMBER = '3125822841'
const BLOCKED_KEYS = ['.', ',', 'e', 'E', '+', '-']

/** Formulario de carga: datos de Nequi, monto, comprobante y notas. Se usa en la billetera y en la mesa. */
export function DepositForm({ initialAmount = '', onSuccess }: DepositFormProps) {
  const [amount, setAmount] = useState(initialAmount)
  const [observations, setObservations] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const amountNum = Number(amount)
  const amountFormatted =
    !isNaN(amountNum) && amountNum > 0
      ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amountNum)
      : null

  function setFieldError(field: string, msg: string | null) {
    setFieldErrors((prev) => {
      if (msg === null) {
        const next = { ...prev }
        delete next[field]
        return next
      }
      return { ...prev, [field]: msg }
    })
  }

  function validateAmount(val: string) {
    const n = Number(val)
    if (!val || isNaN(n)) {
      setFieldError('amount', 'Ingresa un monto válido')
      return false
    }
    const r = depositAmountSchema.safeParse(Math.round(n))
    if (!r.success) {
      setFieldError('amount', r.error.issues?.[0]?.message ?? 'Monto inválido')
      return false
    }
    setFieldError('amount', null)
    return true
  }

  function validateObs(val: string) {
    const r = observationsSchema.safeParse(val)
    if (!r.success) {
      setFieldError('observations', r.error.issues?.[0]?.message ?? 'Texto inválido')
      return false
    }
    setFieldError('observations', null)
    return true
  }

  useEffect(() => {
    if (initialAmount) setAmount(initialAmount)
  }, [initialAmount])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    if (selectedFile) {
      const fileError = validateImageFile(selectedFile)
      setFieldError('file', fileError)
      if (fileError) {
        setFile(null)
        setPreviewUrl(null)
        e.target.value = ''
        return
      }
      setFile(selectedFile)
      setPreviewUrl(URL.createObjectURL(selectedFile))
    } else {
      setFile(null)
      setPreviewUrl(null)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(NEQUI_NUMBER)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const amountOk = validateAmount(amount)
    if (!file) {
      setFieldError('file', 'El comprobante de pago es obligatorio')
      return
    }
    if (!amountOk || Object.keys(fieldErrors).length > 0) return

    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      const filePath = `${user.id}/${Date.now()}_${file.name}`
      const { data, error: storageError } = await supabase.storage.from('deposits').upload(filePath, file)

      if (storageError) throw storageError

      const result = await createDepositRequest(Number(amount), data.path, observations)
      if (result?.error) throw new Error(result.error)

      setSent(true)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No pudimos enviar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-center py-6 text-center">
        <span aria-hidden="true" className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#2ecc71]/50 bg-[#0a2c20] text-[#5fd38d]">
          <Check className="h-8 w-8" />
        </span>
        <p className="font-display text-[1.625rem] font-bold text-text-premium">Solicitud enviada</p>
        <p className="mt-2 max-w-[34ch] text-lg leading-relaxed text-[#d9d3bf]">
          Revisaremos el comprobante y el saldo se acreditará pronto. Te avisaremos en Notificaciones.
        </p>
        <div className="mt-7 w-full max-w-xs">
          <AuthButton onClick={() => onSuccess?.()}>Listo</AuthButton>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-9">
      <div className="rounded-xl border border-[#8b6b2e]/60 bg-[#120806] p-5 sm:p-6">
        <p className="text-base font-semibold text-[#d9d3bf]">
          <span className="mr-2 font-mono text-brand-gold-light">1</span>Envía el dinero a esta cuenta Nequi personal
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <p className="select-all font-mono text-[2rem] font-medium leading-none tabular-nums tracking-[0.02em] text-text-premium">
            {NEQUI_NUMBER}
          </p>
          <button
            type="button"
            onClick={copyToClipboard}
            aria-label={copied ? 'Número copiado' : 'Copiar número'}
            className={`inline-flex min-h-12 items-center gap-2 rounded-lg border px-4 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light ${
              copied
                ? 'border-[#2ecc71]/60 text-[#7fe0a6]'
                : 'border-[#8b6b2e]/80 text-text-premium hover:border-brand-gold hover:text-brand-gold-light'
            }`}
          >
            {copied ? <Check className="h-5 w-5" aria-hidden="true" /> : <Copy className="h-5 w-5" aria-hidden="true" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>

      <form onSubmit={handleUpload} className="space-y-7" noValidate>
        <p className="text-base font-semibold text-[#d9d3bf]">
          <span className="mr-2 font-mono text-brand-gold-light">2</span>Cuéntanos cuánto enviaste y sube el comprobante
        </p>

        {formError && <AuthAlert>{formError}</AuthAlert>}

        <AuthField
          label="Monto que enviaste"
          type="number"
          inputMode="numeric"
          prefix="$"
          mono
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            if (e.target.value) validateAmount(e.target.value)
          }}
          onKeyDown={(e) => {
            if (BLOCKED_KEYS.includes(e.key)) e.preventDefault()
          }}
          onBlur={(e) => validateAmount(e.target.value)}
          placeholder="0"
          required
          min={10000}
          max={50000000}
          step={1000}
          error={fieldErrors.amount}
          hint={amountFormatted ? `Vas a cargar ${amountFormatted}.` : 'Sin puntos ni comas. Mínimo $10.000, máximo $50.000.000.'}
        />

        <div className="space-y-2">
          <p className="text-base font-semibold text-text-premium" id="deposit-proof-label">
            Comprobante de pago
          </p>
          <label
            className={`relative flex min-h-44 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed bg-[#120806] text-center transition-colors focus-within:ring-2 focus-within:ring-brand-gold-light hover:border-brand-gold ${
              fieldErrors.file ? 'border-[#e74c3c]' : 'border-[#8b6b2e]/80'
            }`}
          >
            {previewUrl ? (
              <>
                <img src={previewUrl} className="max-h-72 w-full object-contain p-3" alt="Vista previa del comprobante" />
                <span className="mb-3 inline-flex min-h-11 items-center rounded-lg border border-[#8b6b2e]/80 bg-[#0a0a0a]/80 px-4 text-base font-semibold text-text-premium">
                  Cambiar imagen
                </span>
              </>
            ) : (
              <span className="flex flex-col items-center gap-3 px-6 py-8">
                <ImageUp className="h-9 w-9 text-[#c5a059]" aria-hidden="true" />
                <span className="text-lg font-semibold text-text-premium">Toca para subir la captura</span>
                <span className="text-base text-[#bdb7a6]">JPG, PNG, WebP o GIF, hasta 5 MB</span>
              </span>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              aria-labelledby="deposit-proof-label"
              aria-invalid={fieldErrors.file ? true : undefined}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          {fieldErrors.file && (
            <p role="alert" className="text-base font-semibold text-[#f08a7e]">
              {fieldErrors.file}
            </p>
          )}
        </div>

        <TextareaField
          label="Notas (opcional)"
          labelAside={
            <span className={`font-mono text-sm tabular-nums ${observations.length > 450 ? 'text-brand-gold-light' : 'text-[#bdb7a6]'}`}>
              {observations.length}/500
            </span>
          }
          value={observations}
          maxLength={500}
          onChange={(e) => {
            setObservations(e.target.value)
            validateObs(e.target.value)
          }}
          placeholder="Escribe aquí cualquier observación..."
          error={fieldErrors.observations}
        />

        <AuthButton type="submit" pending={loading}>
          {loading ? 'Enviando…' : 'Confirmar depósito'}
        </AuthButton>
        <p className="text-center text-base text-[#bdb7a6]">El saldo se acredita cuando revisamos el pago.</p>
      </form>
    </div>
  )
}

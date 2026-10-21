'use client'

import { useId, useRef, useState, type ClipboardEvent, type FocusEvent, type KeyboardEvent } from 'react'
import { fieldToneClass, toneOf } from './AuthForm'

interface CodeInputProps {
  /** Nombre del campo oculto que recibe la server action (`token`, `pin`, `pinConfirm`). */
  readonly name: string
  readonly label: string
  readonly length?: number
  /** Oculta los dígitos (clave). */
  readonly masked?: boolean
  /** Valor controlado; si se omite, el componente guarda su propio estado. */
  readonly value?: string
  readonly onChange?: (value: string) => void
  /** Se dispara cuando el foco sale de todas las casillas. */
  readonly onBlur?: () => void
  readonly error?: string | null
  readonly valid?: boolean
  readonly hint?: string
  /** Autocompletar del SMS (`one-time-code`) en la primera casilla. */
  readonly oneTimeCode?: boolean
  readonly autoFocus?: boolean
  readonly disabled?: boolean
}

const onlyDigits = (raw: string) => raw.replace(/\D/g, '')

/** Seis casillas grandes para código SMS o clave, con pegado, autocompletar y teclado. */
export function CodeInput({
  name,
  label,
  length = 6,
  masked = false,
  value,
  onChange,
  onBlur,
  error,
  valid = false,
  hint,
  oneTimeCode = false,
  autoFocus = false,
  disabled = false,
}: CodeInputProps) {
  const id = useId()
  const labelId = `${id}-label`
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const [internal, setInternal] = useState('')
  const code = (value ?? internal).slice(0, length)
  const boxes = useRef<Array<HTMLInputElement | null>>([])
  // Valor más reciente para el control de foco (el estado aún no se ha re-renderizado).
  const latest = useRef(code)
  latest.current = code
  const tone = toneOf(error, valid)

  function commit(next: string) {
    const clean = onlyDigits(next).slice(0, length)
    latest.current = clean
    if (value === undefined) setInternal(clean)
    onChange?.(clean)
  }

  function focusBox(index: number) {
    const target = boxes.current[Math.min(Math.max(index, 0), length - 1)]
    target?.focus()
    target?.select()
  }

  /** Escribe `digits` desde la casilla `index` (tecla, pegado o autocompletar del SMS). */
  function fillFrom(index: number, digits: string) {
    if (!digits) return
    const start = Math.min(index, code.length)
    const written = digits.slice(0, length - start)
    commit(code.slice(0, start) + written + code.slice(start + written.length))
    focusBox(start + written.length)
  }

  function handleChange(index: number, raw: string) {
    const digits = onlyDigits(raw)
    if (!digits) return
    // Al escribir sobre una casilla llena el navegador concatena ("15"): nos quedamos con lo nuevo.
    const fresh = digits.length === 2 && code[index] && digits.startsWith(code[index]) ? digits.slice(1) : digits
    fillFrom(index, fresh)
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      if (code[index]) {
        commit(code.slice(0, index) + code.slice(index + 1))
      } else if (index > 0) {
        commit(code.slice(0, index - 1) + code.slice(index))
        focusBox(index - 1)
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusBox(index - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusBox(index + 1)
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    fillFrom(index, onlyDigits(event.clipboardData.getData('text')))
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur?.()
  }

  return (
    <div className="space-y-2">
      <p id={labelId} className="text-base font-semibold text-text-premium">
        {label}
      </p>
      <div
        role="group"
        aria-labelledby={labelId}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        onBlur={handleBlur}
        className="grid grid-cols-6 gap-2 sm:gap-3"
        style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
      >
        {Array.from({ length }, (_, index) => {
          const digit = code[index] ?? ''
          return (
            <input
              key={index}
              ref={(node) => {
                boxes.current[index] = node
              }}
              type={masked ? 'password' : 'text'}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={index === 0 && oneTimeCode ? 'one-time-code' : 'off'}
              aria-label={`Dígito ${index + 1} de ${length}`}
              aria-invalid={error ? true : undefined}
              autoFocus={autoFocus && index === 0}
              disabled={disabled}
              value={digit}
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={(event) => handlePaste(index, event)}
              onFocus={(event) => {
                // Sin huecos: el foco salta a la primera casilla vacía.
                if (index > latest.current.length) focusBox(latest.current.length)
                else event.target.select()
              }}
              className={`h-16 w-full min-w-0 rounded-lg border bg-[#120806] text-center font-mono text-2xl tabular-nums text-text-premium caret-brand-gold outline-none transition-colors duration-200 focus:ring-2 disabled:opacity-60 sm:h-[4.5rem] sm:text-3xl ${
                digit && tone === 'default'
                  ? 'border-[#c5a059] focus:border-brand-gold focus:ring-brand-gold/35'
                  : fieldToneClass(tone)
              }`}
            />
          )
        })}
      </div>
      <input type="hidden" name={name} value={code} />
      {error ? (
        <p id={errorId} role="alert" className="text-base font-semibold text-[#f08a7e]">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-base text-[#bdb7a6]">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

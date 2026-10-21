import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { CodeInput } from '../CodeInput'

function boxes() {
  return screen.getAllByLabelText(/dígito \d de 6/i) as HTMLInputElement[]
}

function hidden(container: HTMLElement, name = 'token') {
  return container.querySelector(`input[type="hidden"][name="${name}"]`) as HTMLInputElement
}

describe('CodeInput', () => {
  it('renderiza 6 casillas agrupadas con label, autocompletar SMS y campo oculto', () => {
    const { container } = render(<CodeInput name="token" label="Código del SMS" oneTimeCode />)

    expect(screen.getByRole('group', { name: 'Código del SMS' })).toBeInTheDocument()
    const all = boxes()
    expect(all).toHaveLength(6)
    expect(all[0]).toHaveAttribute('autocomplete', 'one-time-code')
    expect(all[1]).toHaveAttribute('autocomplete', 'off')
    expect(all[0]).toHaveAttribute('inputmode', 'numeric')
    expect(all[0]).toHaveAttribute('type', 'text')
    expect(hidden(container)).toHaveValue('')
  })

  it('escribe dígito a dígito, ignora letras y mueve el foco', () => {
    const { container } = render(<CodeInput name="token" label="Código" />)
    const all = boxes()

    fireEvent.change(all[0], { target: { value: 'a' } })
    expect(hidden(container)).toHaveValue('')

    fireEvent.change(all[0], { target: { value: '1' } })
    expect(all[1]).toHaveFocus()
    fireEvent.change(all[1], { target: { value: '2' } })
    expect(hidden(container)).toHaveValue('12')
    expect(all[0]).toHaveValue('1')
  })

  it('reemplaza el dígito cuando el navegador concatena sobre una casilla llena', () => {
    const { container } = render(<CodeInput name="token" label="Código" />)
    const all = boxes()

    fireEvent.change(all[0], { target: { value: '1' } })
    fireEvent.change(all[0], { target: { value: '15' } })

    expect(hidden(container)).toHaveValue('5')
  })

  it('reparte el pegado y el autocompletar del SMS en todas las casillas', () => {
    const { container } = render(<CodeInput name="token" label="Código" />)
    const all = boxes()

    fireEvent.paste(all[0], { clipboardData: { getData: () => '12-34 56 78' } })
    expect(hidden(container)).toHaveValue('123456')
    expect(all.map((box) => box.value).join('')).toBe('123456')
    expect(all[5]).toHaveFocus()

    fireEvent.paste(all[2], { clipboardData: { getData: () => 'sin dígitos' } })
    expect(hidden(container)).toHaveValue('123456')
  })

  it('acepta el código completo escrito en la primera casilla (autocompletar iOS)', () => {
    const { container } = render(<CodeInput name="token" label="Código" />)

    fireEvent.change(boxes()[0], { target: { value: '987654' } })

    expect(hidden(container)).toHaveValue('987654')
  })

  it('borra con retroceso, retrocede el foco y navega con flechas', () => {
    const { container } = render(<CodeInput name="token" label="Código" />)
    const all = boxes()
    fireEvent.paste(all[0], { clipboardData: { getData: () => '123' } })

    // Casilla llena: borra su dígito sin moverse.
    fireEvent.keyDown(all[2], { key: 'Backspace' })
    expect(hidden(container)).toHaveValue('12')

    // Casilla vacía: borra la anterior y retrocede.
    fireEvent.keyDown(all[2], { key: 'Backspace' })
    expect(hidden(container)).toHaveValue('1')
    expect(all[1]).toHaveFocus()

    // En la primera casilla vacía no hay nada que borrar.
    fireEvent.keyDown(all[0], { key: 'Backspace' })
    fireEvent.keyDown(all[0], { key: 'Backspace' })
    expect(hidden(container)).toHaveValue('')

    fireEvent.paste(all[0], { clipboardData: { getData: () => '123456' } })
    fireEvent.keyDown(all[3], { key: 'ArrowLeft' })
    expect(all[2]).toHaveFocus()
    fireEvent.keyDown(all[2], { key: 'ArrowRight' })
    expect(all[3]).toHaveFocus()
    fireEvent.keyDown(all[3], { key: 'Enter' })
    expect(all[3]).toHaveFocus()
  })

  it('no deja huecos: al enfocar una casilla posterior salta a la primera vacía', () => {
    render(<CodeInput name="token" label="Código" />)
    const all = boxes()

    fireEvent.focus(all[4])
    expect(all[0]).toHaveFocus()
  })

  it('modo clave oculta los dígitos y funciona controlado', () => {
    const onChange = jest.fn()
    function Controlled() {
      const [value, setValue] = useState('12')
      return (
        <CodeInput
          name="pin"
          label="Clave"
          masked
          value={value}
          onChange={(next) => {
            onChange(next)
            setValue(next)
          }}
        />
      )
    }
    const { container } = render(<Controlled />)
    const all = boxes()

    expect(all[0]).toHaveAttribute('type', 'password')
    expect(all[0]).toHaveAttribute('autocomplete', 'off')
    expect(hidden(container, 'pin')).toHaveValue('12')

    fireEvent.change(all[2], { target: { value: '3' } })
    expect(onChange).toHaveBeenLastCalledWith('123')
    expect(hidden(container, 'pin')).toHaveValue('123')
  })

  it('dispara onBlur solo cuando el foco sale del grupo', () => {
    const onBlur = jest.fn()
    render(<CodeInput name="token" label="Código" onBlur={onBlur} />)
    const all = boxes()

    fireEvent.blur(all[0], { relatedTarget: all[1] })
    expect(onBlur).not.toHaveBeenCalled()

    fireEvent.blur(all[0], { relatedTarget: null })
    expect(onBlur).toHaveBeenCalledTimes(1)
  })

  it('anuncia el error, marca las casillas inválidas y muestra la ayuda sin error', () => {
    const { rerender } = render(<CodeInput name="token" label="Código" hint="Revisa tu SMS" />)
    expect(screen.getByText('Revisa tu SMS')).toBeInTheDocument()
    expect(screen.getByRole('group')).toHaveAttribute('aria-describedby', expect.stringContaining('hint'))

    rerender(<CodeInput name="token" label="Código" hint="Revisa tu SMS" error="Código inválido" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Código inválido')
    expect(screen.queryByText('Revisa tu SMS')).not.toBeInTheDocument()
    expect(boxes()[0]).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('group')).toHaveAttribute('aria-describedby', expect.stringContaining('error'))

    rerender(<CodeInput name="token" label="Código" valid value="123456" disabled />)
    expect(boxes()[0].className).toContain('border-[#2ecc71]/70')
    expect(boxes()[0]).toBeDisabled()
    expect(screen.getByRole('group')).not.toHaveAttribute('aria-describedby')
  })

  it('resalta las casillas llenas en estado normal', () => {
    render(<CodeInput name="token" label="Código" value="1" />)
    expect(boxes()[0].className).toContain('border-[#c5a059]')
    expect(boxes()[1].className).toContain('border-[#8b6b2e]/70')
  })
})

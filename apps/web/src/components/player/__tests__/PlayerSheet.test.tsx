import { fireEvent, render, screen } from '@testing-library/react'

import { PlayerSheet } from '../PlayerSheet'

describe('PlayerSheet', () => {
  it('no renderiza nada cuando open es false', () => {
    render(
      <PlayerSheet open={false} onClose={jest.fn()} title="Hoja">
        <p>Contenido</p>
      </PlayerSheet>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('monta un diálogo accesible con título y descripción via portal', () => {
    render(
      <PlayerSheet open onClose={jest.fn()} title="Detalle" description="Explicación">
        <button type="button">Acción</button>
      </PlayerSheet>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog.parentElement?.parentElement).toBe(document.body)
    expect(screen.getByRole('heading', { name: 'Detalle' })).toBeInTheDocument()
    expect(screen.getByText('Explicación')).toBeInTheDocument()
    // Sin aria-describedby cuando no hay descripción se prueba aparte.
    expect(dialog).toHaveAttribute('aria-describedby')
  })

  it('omite aria-describedby cuando no hay descripción', () => {
    render(
      <PlayerSheet open onClose={jest.fn()} title="Sin descripción">
        <p>Cuerpo</p>
      </PlayerSheet>,
    )
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-describedby')
  })

  it('cierra con Escape', () => {
    const onClose = jest.fn()
    render(
      <PlayerSheet open onClose={onClose} title="Hoja">
        <button type="button">Acción</button>
      </PlayerSheet>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('cierra al tocar el fondo y con el botón de cerrar', () => {
    const onClose = jest.fn()
    render(
      <PlayerSheet open onClose={onClose} title="Hoja" closeLabel="Cerrar hoja">
        <button type="button">Acción</button>
      </PlayerSheet>,
    )
    fireEvent.click(screen.getByTestId('sheet-backdrop'))
    fireEvent.click(screen.getByRole('button', { name: /cerrar hoja/i }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('enfoca el elemento con data-autofocus al abrir tras montar', () => {
    const { rerender } = render(
      <PlayerSheet open={false} onClose={jest.fn()} title="Hoja">
        <input data-autofocus placeholder="primero" />
        <button type="button">Acción</button>
      </PlayerSheet>,
    )
    rerender(
      <PlayerSheet open onClose={jest.fn()} title="Hoja">
        <input data-autofocus placeholder="primero" />
        <button type="button">Acción</button>
      </PlayerSheet>,
    )
    expect(screen.getByPlaceholderText('primero')).toHaveFocus()
  })

  it('enfoca el panel cuando no hay elemento con data-autofocus', () => {
    const { rerender } = render(
      <PlayerSheet open={false} onClose={jest.fn()} title="Hoja">
        <p>Cuerpo</p>
      </PlayerSheet>,
    )
    rerender(
      <PlayerSheet open onClose={jest.fn()} title="Hoja">
        <p>Cuerpo</p>
      </PlayerSheet>,
    )
    expect(screen.getByRole('dialog')).toHaveFocus()
  })

  it('atrapa el foco con Tab y Shift+Tab entre el primer y último elemento', () => {
    render(
      <PlayerSheet open onClose={jest.fn()} title="Hoja" closeLabel="Cerrar">
        <button type="button">Primero</button>
        <button type="button">Ultimo</button>
      </PlayerSheet>,
    )
    const items = screen.getAllByRole('button')
    const first = items[0]
    const last = items[items.length - 1]

    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(first).toHaveFocus()

    first.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()
  })

  it('Shift+Tab desde el panel mueve el foco al último elemento', () => {
    render(
      <PlayerSheet open onClose={jest.fn()} title="Hoja" closeLabel="Cerrar">
        <button type="button">Unico</button>
      </PlayerSheet>,
    )
    const dialog = screen.getByRole('dialog')
    dialog.focus()
    const items = screen.getAllByRole('button')
    const last = items[items.length - 1]
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()
  })

  it('previene Tab cuando no hay elementos enfocables', () => {
    render(
      <PlayerSheet open onClose={jest.fn()} title="Hoja">
        <span>Solo texto</span>
      </PlayerSheet>,
    )
    const dialog = screen.getByRole('dialog')
    // Quitamos todos los nodos enfocables (incluido el botón de cerrar) para
    // ejercitar la rama defensiva que previene Tab sin elementos.
    dialog.querySelectorAll('a[href], button, input, select, textarea, [tabindex]').forEach((node) => node.remove())
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    const prevented = !document.dispatchEvent(event)
    expect(prevented).toBe(true)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renderiza footer y headerStart cuando se entregan', () => {
    render(
      <PlayerSheet
        open
        onClose={jest.fn()}
        title="Hoja"
        footer={<button type="button">Confirmar</button>}
        headerStart={<button type="button">Volver</button>}
      >
        <p>Cuerpo</p>
      </PlayerSheet>,
    )
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument()
  })

  it('soporta la variante full (panel lateral)', () => {
    render(
      <PlayerSheet open onClose={jest.fn()} title="Chat" variant="full">
        <p>Mensajes</p>
      </PlayerSheet>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // En variante full no se muestra el asa de arrastre.
    expect(screen.getByRole('heading', { name: 'Chat' })).toBeInTheDocument()
  })

  it('restaura el foco al disparador al cerrar', () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()

    const { rerender } = render(
      <PlayerSheet open onClose={jest.fn()} title="Hoja">
        <button type="button">Acción</button>
      </PlayerSheet>,
    )

    rerender(
      <PlayerSheet open={false} onClose={jest.fn()} title="Hoja">
        <button type="button">Acción</button>
      </PlayerSheet>,
    )

    expect(trigger).toHaveFocus()
    document.body.removeChild(trigger)
  })
})

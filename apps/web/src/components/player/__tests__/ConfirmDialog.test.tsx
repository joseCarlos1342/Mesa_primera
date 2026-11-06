import { fireEvent, render, screen } from '@testing-library/react'
import { ConfirmDialog } from '../ConfirmDialog'

describe('ConfirmDialog', () => {
  it('no renderiza nada cuando está cerrado', () => {
    const { container } = render(
      <ConfirmDialog open={false} title="¿Seguro?" confirmLabel="Sí" onConfirm={jest.fn()} onCancel={jest.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText('¿Seguro?')).not.toBeInTheDocument()
  })

  it('muestra título, descripción y confirma/cancela con tono primary por defecto', () => {
    const onConfirm = jest.fn()
    const onCancel = jest.fn()
    render(
      <ConfirmDialog
        open
        title="¿Guardar cambios?"
        description="Se aplicarán de inmediato."
        confirmLabel="Guardar"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('¿Guardar cambios?')).toBeInTheDocument()
    expect(screen.getAllByText('Se aplicarán de inmediato.').length).toBeGreaterThan(0)

    // Botón de confirmar (tono primary) tiene autofocus por defecto.
    const confirm = screen.getByRole('button', { name: 'Guardar' })
    expect(confirm).toHaveAttribute('data-autofocus', 'true')
    fireEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalledTimes(1)

    // Botón cancelar del pie (además del botón "Cerrar" de la hoja).
    const cancelButtons = screen.getAllByRole('button', { name: 'Cancelar' })
    const footerCancel = cancelButtons.find((b) => b.getAttribute('aria-label') !== 'Cancelar') ?? cancelButtons[cancelButtons.length - 1]
    fireEvent.click(footerCancel)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('en tono danger el autofocus va al botón cancelar', () => {
    render(
      <ConfirmDialog
        open
        tone="danger"
        title="¿Borrar?"
        description="No se puede deshacer."
        confirmLabel="Sí, borrar"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    )

    const cancelButtons = screen.getAllByRole('button', { name: 'Cancelar' })
    const footerCancel = cancelButtons.find((b) => b.getAttribute('aria-label') === null)!
    expect(footerCancel).toHaveAttribute('data-autofocus', 'true')
    expect(screen.getByRole('button', { name: 'Sí, borrar' })).not.toHaveAttribute('data-autofocus')
  })

  it('oculta el botón cancelar cuando cancelLabel es null (aviso de un solo botón)', () => {
    render(
      <ConfirmDialog
        open
        cancelLabel={null}
        title="Listo"
        description="Todo quedó guardado."
        confirmLabel="Entendido"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
    // El único botón (confirmar) conserva el autofocus incluso en tono danger sin cancelar.
    expect(screen.getByRole('button', { name: 'Entendido' })).toHaveAttribute('data-autofocus', 'true')
  })

  it('en tono danger sin cancelar, el autofocus va al botón de confirmar', () => {
    render(
      <ConfirmDialog
        open
        tone="danger"
        cancelLabel={null}
        title="Error"
        description="Algo salió mal."
        confirmLabel="Cerrar"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    )
    const closeButtons = screen.getAllByRole('button', { name: 'Cerrar' })
    const confirm = closeButtons.find((b) => b.getAttribute('aria-label') === null)!
    expect(confirm).toHaveAttribute('data-autofocus', 'true')
  })

  it('cuando busy deshabilita los botones y muestra busyLabel', () => {
    render(
      <ConfirmDialog
        open
        busy
        busyLabel="Guardando…"
        title="¿Guardar?"
        confirmLabel="Guardar"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    )

    const confirm = screen.getByRole('button', { name: 'Guardando…' })
    expect(confirm).toBeDisabled()
    expect(confirm).toHaveAttribute('aria-busy', 'true')
    const footerCancel = screen.getAllByRole('button', { name: 'Cancelar' }).find((b) => b.getAttribute('aria-label') === null)!
    expect(footerCancel).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
  })

  it('cuando busy pero sin busyLabel mantiene el texto de confirmar', () => {
    render(
      <ConfirmDialog
        open
        busy
        title="¿Guardar?"
        confirmLabel="Guardar"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    )
    const confirm = screen.getByRole('button', { name: 'Guardar' })
    expect(confirm).toBeDisabled()
  })

  it('no cierra al tocar el fondo mientras está busy', () => {
    const onCancel = jest.fn()
    render(
      <ConfirmDialog
        open
        busy
        busyLabel="Procesando…"
        title="Trabajando"
        description="Espera un momento."
        confirmLabel="Aceptar"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    )

    fireEvent.click(screen.getByTestId('sheet-backdrop'))
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('cierra al tocar el fondo cuando no está busy', () => {
    const onCancel = jest.fn()
    render(
      <ConfirmDialog
        open
        title="Confirmar"
        description="¿Seguimos?"
        confirmLabel="Sí"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    )

    fireEvent.click(screen.getByTestId('sheet-backdrop'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('renderiza children personalizados en vez de la descripción', () => {
    render(
      <ConfirmDialog
        open
        title="Con contenido"
        confirmLabel="Ok"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      >
        <p>Contenido personalizado</p>
      </ConfirmDialog>,
    )

    expect(screen.getByText('Contenido personalizado')).toBeInTheDocument()
  })
})

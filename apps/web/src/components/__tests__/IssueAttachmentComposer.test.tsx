import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IssueAttachmentComposer } from '../IssueAttachmentComposer'
import { IssueAttachmentList } from '../IssueAttachmentList'
import { getIssueTicketAttachmentUrl, listIssueTicketAttachments, uploadIssueTicketImage } from '@/app/actions/admin-issues'

jest.mock('@/app/actions/admin-issues', () => ({
  uploadIssueTicketImage: jest.fn(),
  listIssueTicketAttachments: jest.fn(),
  getIssueTicketAttachmentUrl: jest.fn(),
}))

describe('IssueAttachmentComposer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.URL.createObjectURL = jest.fn(() => 'blob:image-preview')
    global.URL.revokeObjectURL = jest.fn()
    ;(listIssueTicketAttachments as jest.Mock).mockResolvedValue({ data: [] })
  })

  it('solo prepara la imagen al seleccionarla sin subirla', () => {
    render(<IssueAttachmentComposer ticketId="ticket-1" onUploaded={jest.fn()} />)
    fireEvent.change(screen.getByLabelText('Seleccionar imagen'), { target: { files: [new File(['img'], 'prueba.png', { type: 'image/png' })] } })
    expect(screen.getByText('prueba.png')).toBeInTheDocument()
    expect(screen.getByLabelText('Describe qué muestra esta imagen')).toBeInTheDocument()
    expect(uploadIssueTicketImage).not.toHaveBeenCalled()
  })

  it('sube únicamente al confirmar una descripción', async () => {
    const onUploaded = jest.fn()
    ;(uploadIssueTicketImage as jest.Mock).mockResolvedValue({ data: { id: 'attachment-1', file_name: 'prueba.png' } })
    render(<IssueAttachmentComposer ticketId="ticket-1" onUploaded={onUploaded} />)
    fireEvent.change(screen.getByLabelText('Seleccionar imagen'), { target: { files: [new File(['img'], 'prueba.png', { type: 'image/png' })] } })
    fireEvent.change(screen.getByLabelText('Describe qué muestra esta imagen'), { target: { value: 'Comprobante de pago' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar imagen' }))
    await waitFor(() => expect(uploadIssueTicketImage).toHaveBeenCalled())
    expect(onUploaded).toHaveBeenCalledTimes(1)
  })

  it('muestra el error del servidor y permite cancelar sin subir', async () => {
    ;(uploadIssueTicketImage as jest.Mock).mockResolvedValue({ error: 'La imagen supera el límite' })
    render(<IssueAttachmentComposer ticketId="ticket-1" onUploaded={jest.fn()} tone="admin" />)

    fireEvent.change(screen.getByLabelText('Seleccionar imagen'), { target: { files: [new File(['img'], 'prueba.png', { type: 'image/png' })] } })
    fireEvent.change(screen.getByLabelText('Describe qué muestra esta imagen'), { target: { value: 'Comprobante' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar imagen' }))

    expect(await screen.findByText('La imagen supera el límite')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByLabelText('Seleccionar imagen')).toBeInTheDocument()
    expect(screen.queryByText('La imagen supera el límite')).not.toBeInTheDocument()
  })

  it('muestra adjuntos disponibles y conserva un fallback seguro sin URL firmada', async () => {
    ;(listIssueTicketAttachments as jest.Mock).mockResolvedValue({ data: [
      { id: 'attachment-1', ticket_id: 'ticket-1', file_name: 'comprobante.png', description: 'Comprobante', mime_type: 'image/png', size_bytes: 10, uploaded_by: 'user-1', created_at: '2026-07-16T10:00:00.000Z' },
    ] })
    ;(getIssueTicketAttachmentUrl as jest.Mock).mockResolvedValue({ error: 'No fue posible abrir la imagen' })

    render(<IssueAttachmentList ticketId="ticket-1" />)

    expect(await screen.findByText('comprobante.png')).toBeInTheDocument()
    expect(screen.getByText('Comprobante')).toBeInTheDocument()
    expect(screen.getByLabelText('Abrir imagen comprobante.png ampliada')).not.toHaveAttribute('href')
  })
})

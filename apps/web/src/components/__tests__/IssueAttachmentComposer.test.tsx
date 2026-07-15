import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IssueAttachmentComposer } from '../IssueAttachmentComposer'
import { uploadIssueTicketImage } from '@/app/actions/admin-issues'

jest.mock('@/app/actions/admin-issues', () => ({ uploadIssueTicketImage: jest.fn() }))

describe('IssueAttachmentComposer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.URL.createObjectURL = jest.fn(() => 'blob:image-preview')
    global.URL.revokeObjectURL = jest.fn()
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
})

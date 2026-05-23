import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { DepositForm } from '../DepositForm'
import { createClient } from '@/utils/supabase/client'
import { createDepositRequest } from '@/app/actions/wallet'

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
}))

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/app/actions/wallet', () => ({
  createDepositRequest: jest.fn(),
}))

const authGetUserMock = jest.fn()
const uploadMock = jest.fn()
const fromStorageMock = jest.fn()
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockCreateDepositRequest = createDepositRequest as jest.MockedFunction<typeof createDepositRequest>

describe('DepositForm', () => {
  const file = new File(['proof'], 'proof.png', { type: 'image/png' })

  beforeEach(() => {
    jest.clearAllMocks()
    URL.createObjectURL = jest.fn(() => 'blob:preview')
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: jest.fn() },
    })
    authGetUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    uploadMock.mockResolvedValue({ data: { path: 'user-1/proof.png' }, error: null })
    fromStorageMock.mockReturnValue({ upload: uploadMock })
    mockCreateClient.mockReturnValue({
      auth: { getUser: authGetUserMock },
      storage: { from: fromStorageMock },
    } as never)
    mockCreateDepositRequest.mockResolvedValue({ success: true } as never)
    window.alert = jest.fn()
  })

  it('renderiza monto inicial y permite copiar el número', () => {
    render(<DepositForm initialAmount="10000" />)

    expect(screen.getByDisplayValue('10000')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /copiar número/i }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('3125822841')
  })

  it('valida monto y archivo requerido antes de enviar', async () => {
    render(<DepositForm />)

    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '1000' } })
    fireEvent.blur(screen.getByPlaceholderText('0'))
    fireEvent.submit(screen.getByRole('button', { name: /confirmar depósito/i }).closest('form') as HTMLFormElement)

    expect(screen.getByText(/monto mínimo/i)).toBeInTheDocument()
    expect(screen.getByText(/comprobante de pago es obligatorio/i)).toBeInTheDocument()
  })

  it('sube archivo y crea solicitud exitosa', async () => {
    const onSuccess = jest.fn()
    render(<DepositForm initialAmount="10000" onSuccess={onSuccess} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [file] } })
    fireEvent.change(screen.getByPlaceholderText(/escribe aquí cualquier observación/i), { target: { value: 'Pago por Nequi' } })
    fireEvent.submit(screen.getByRole('button', { name: /confirmar depósito/i }).closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(uploadMock).toHaveBeenCalled()
      expect(mockCreateDepositRequest).toHaveBeenCalledWith(10000, 'user-1/proof.png', 'Pago por Nequi')
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })
  })

  it('muestra error del backend cuando createDepositRequest falla', async () => {
    mockCreateDepositRequest.mockResolvedValue({ error: 'Saldo en revisión' } as never)
    render(<DepositForm initialAmount="10000" />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [file] } })
    fireEvent.submit(screen.getByRole('button', { name: /confirmar depósito/i }).closest('form') as HTMLFormElement)

    expect(await screen.findByText(/saldo en revisión/i)).toBeInTheDocument()
  })
})

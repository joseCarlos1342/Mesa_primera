import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DepositPage from '../page'

const mockPush = jest.fn()
const mockGet = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockGet }),
}))

jest.mock('@/components/game/DepositForm', () => ({
  DepositForm: ({ initialAmount, onSuccess }: { initialAmount: string; onSuccess: () => void }) => (
    <div data-testid="deposit-form">
      <p>Initial Amount: {initialAmount || 'none'}</p>
      <button onClick={onSuccess}>Simulate Success</button>
    </div>
  ),
}))

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial: _initial, animate: _animate, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
      <div {...props}>{children}</div>
    ),
  },
}))

describe('DepositPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renderiza DepositContent con amount desde query string', async () => {
    mockGet.mockReturnValue('50000')

    render(<DepositPage />)

    await waitFor(() => {
      expect(screen.getByTestId('deposit-form')).toBeInTheDocument()
      expect(screen.getByText('Initial Amount: 50000')).toBeInTheDocument()
    })
  })

  it('renderiza DepositContent con amount vacio cuando no hay query param', async () => {
    mockGet.mockReturnValue(null)

    render(<DepositPage />)

    await waitFor(() => {
      expect(screen.getByTestId('deposit-form')).toBeInTheDocument()
      expect(screen.getByText('Initial Amount: none')).toBeInTheDocument()
    })
  })

  it('muestra alert y redirige a wallet cuando onSuccess es llamado', async () => {
    mockGet.mockReturnValue(null)

    render(<DepositPage />)

    await waitFor(() => {
      expect(screen.getByTestId('deposit-form')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Simulate Success'))

    expect(window.alert).toHaveBeenCalledWith('Solicitud enviada correctamente. Se acreditará pronto.')
    expect(mockPush).toHaveBeenCalledWith('/wallet')
  })
})

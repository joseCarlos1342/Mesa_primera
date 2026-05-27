import { render, screen } from '@testing-library/react'
import UserLedgerDetailPage from '../page'
import { getUserLedger, getUserProfile } from '@/app/actions/admin-ledger'

jest.mock('@/app/actions/admin-ledger', () => ({
  getUserLedger: jest.fn(),
  getUserProfile: jest.fn(),
}))

jest.mock('@/components/admin/UserLedgerTable', () => ({
  UserLedgerTable: ({ entries }: { entries: unknown[] }) => <div data-testid="user-ledger-table">Entradas: {entries.length}</div>,
}))

const mockGetUserLedger = getUserLedger as jest.MockedFunction<typeof getUserLedger>
const mockGetUserProfile = getUserProfile as jest.MockedFunction<typeof getUserProfile>

const hasText = (expected: string) => (_content: string, element: Element | null) =>
  element?.textContent?.replace(/\s/g, '') === expected.replace(/\s/g, '')

describe('UserLedgerDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUserLedger.mockResolvedValue([
      {
        id: 'credit-1',
        user_id: 'user-1',
        amount_cents: 150000,
        direction: 'credit',
        balance_after_cents: 150000,
        type: 'deposit',
        status: 'completed',
        reference_id: null,
        description: 'Deposito',
        metadata: {},
        created_at: '2026-05-25T10:00:00.000Z',
      },
      {
        id: 'debit-1',
        user_id: 'user-1',
        amount_cents: 50000,
        direction: 'debit',
        balance_after_cents: 100000,
        type: 'bet',
        status: 'completed',
        reference_id: 'game-1',
        description: 'Apuesta',
        metadata: {},
        created_at: '2026-05-25T10:05:00.000Z',
      },
    ])
    mockGetUserProfile.mockResolvedValue({
      id: 'user-1',
      full_name: 'Ana Mesa',
      username: 'ana',
      balance: 100000,
    })
  })

  it('carga detalle de ledger por usuario y calcula totales visibles', async () => {
    render(await UserLedgerDetailPage({ params: Promise.resolve({ userId: 'user-1' }) }))

    expect(mockGetUserLedger).toHaveBeenCalledWith('user-1', 200)
    expect(mockGetUserProfile).toHaveBeenCalledWith('user-1')
    expect(screen.getByRole('heading', { name: 'Ana Mesa' })).toBeInTheDocument()
    expect(screen.getByText('ID: user-1')).toBeInTheDocument()
    expect(screen.getByText(hasText('$1.000'))).toBeInTheDocument()
    expect(screen.getByText(hasText('+$1.500'))).toBeInTheDocument()
    expect(screen.getByText(hasText('-$500'))).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByTestId('user-ledger-table')).toHaveTextContent('Entradas: 2')
  })

  it('usa fallback cuando el perfil no existe', async () => {
    mockGetUserProfile.mockResolvedValueOnce(null)
    mockGetUserLedger.mockResolvedValueOnce([])

    render(await UserLedgerDetailPage({ params: Promise.resolve({ userId: 'missing-user' }) }))

    expect(screen.getByRole('heading', { name: 'Desconocido' })).toBeInTheDocument()
    expect(screen.getByText('ID: missing-user')).toBeInTheDocument()
    expect(screen.getByText(hasText('$0'))).toBeInTheDocument()
    expect(screen.getByText(hasText('+$0'))).toBeInTheDocument()
    expect(screen.getByText(hasText('-$0'))).toBeInTheDocument()
    expect(screen.getByTestId('user-ledger-table')).toHaveTextContent('Entradas: 0')
  })
})

import { render, screen } from '@testing-library/react'
import AdminUsersPage, { dynamic, revalidate } from '../page'
import { getUsersList } from '@/app/actions/admin-users'

jest.mock('@/app/actions/admin-users', () => ({
  getUsersList: jest.fn(),
}))

jest.mock('@/components/admin/UserSearch', () => ({
  UserSearch: () => <input aria-label="Buscar usuarios" />,
}))

jest.mock('@/components/admin/UserBalanceControl', () => ({
  UserBalanceControl: ({ userName, layout }: { userName: string; layout?: string }) => <button>Ajustar {userName} {layout ?? 'desktop'}</button>,
}))

jest.mock('@/components/admin/UserBanControl', () => ({
  UserBanControl: ({ userName, isBanned, layout }: { userName: string; isBanned: boolean; layout?: string }) => (
    <button>{isBanned ? 'Revisar' : 'Banear'} {userName} {layout ?? 'desktop'}</button>
  ),
}))

jest.mock('@/components/admin/ResponsiveDataView', () => ({
  ResponsiveDataView: ({ columns, data, emptyMessage, renderCard, rowClassName }: {
    columns: Array<{ header: string; render: (row: Record<string, unknown>) => React.ReactNode }>
    data: Array<Record<string, unknown>>
    emptyMessage: string
    renderCard: (row: Record<string, unknown>) => React.ReactNode
    rowClassName: (row: Record<string, unknown>) => string
  }) => (
    <div data-testid="responsive-data-view">
      {data.length === 0 ? <p>{emptyMessage}</p> : data.map((row) => (
        <article key={String(row.id)} data-row-class={rowClassName(row)}>
          {columns.map((column) => <section key={column.header}>{column.render(row)}</section>)}
          <div data-testid={`card-${String(row.id)}`}>{renderCard(row)}</div>
        </article>
      ))}
    </div>
  ),
}))

const mockGetUsersList = getUsersList as jest.MockedFunction<typeof getUsersList>

const users = [
  {
    id: 'user-11111111',
    display_name: 'Ana Mesa',
    username: 'ana',
    phone: '300123',
    role: 'player',
    balance_cents: 150000,
    is_banned: false,
    ban_reason: null,
    last_login: '2026-05-25T10:00:00.000Z',
    devices: [{ fingerprint: 'shared-device' }],
    stats: { games_played: 7 },
  },
  {
    id: 'user-22222222',
    display_name: 'Beto Bloqueado',
    username: 'beto',
    phone: '301456',
    role: 'player',
    balance_cents: 0,
    is_banned: true,
    ban_reason: 'Fraude',
    last_login: null,
    devices: [{ fingerprint: 'shared-device' }],
    stats: null,
  },
  {
    id: 'admin-33333333',
    display_name: 'Admin Uno',
    username: 'admin',
    phone: null,
    role: 'admin',
    balance_cents: 999000,
    is_banned: false,
    ban_reason: null,
    last_login: null,
    devices: [],
    stats: { games_played: 0 },
  },
]

describe('AdminUsersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetUsersList.mockResolvedValue(users)
  })

  it('fuerza render dinamico sin cache', () => {
    expect(dynamic).toBe('force-dynamic')
    expect(revalidate).toBe(0)
  })

  it('renderiza directorio, fraude por dispositivo compartido y controles de moderacion', async () => {
    render(await AdminUsersPage({ searchParams: Promise.resolve({}) }))

    expect(screen.getByRole('heading', { name: /directorio de usuarios/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Buscar usuarios')).toBeInTheDocument()
    expect(screen.getByText('Multi-cuenta sospechosa')).toBeInTheDocument()
    expect(screen.getByText('Multi-cuenta')).toBeInTheDocument()
    expect(screen.getAllByText('BANEADO')).toHaveLength(2)
    expect(screen.getAllByText('ADMIN')).toHaveLength(2)
    expect(screen.getByRole('button', { name: /Ajustar Ana Mesa desktop/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Banear Ana Mesa mobile-split/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ajustar Admin Uno/ })).not.toBeInTheDocument()
  })

  it('filtra por busqueda textual y muestra empty state', async () => {
    render(await AdminUsersPage({ searchParams: Promise.resolve({ q: 'no-existe' }) }))

    expect(screen.getByText('No hay usuarios registrados.')).toBeInTheDocument()
  })

  it('filtra posibles fraudes por huella compartida', async () => {
    render(await AdminUsersPage({ searchParams: Promise.resolve({ q: 'fraud' }) }))

    expect(screen.getAllByText('Ana Mesa')).toHaveLength(2)
    expect(screen.getAllByText('Beto Bloqueado')).toHaveLength(2)
    expect(screen.queryByText('Admin Uno')).not.toBeInTheDocument()
  })
})

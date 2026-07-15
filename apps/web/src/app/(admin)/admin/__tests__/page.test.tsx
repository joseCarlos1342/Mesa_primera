import { render, screen, within } from '@testing-library/react'
import AdminPage, { dynamic, revalidate } from '../page'
import { getAdminDashboardStats, type AdminDashboardStats } from '@/app/actions/admin-dashboard'

jest.mock('@/app/actions/admin-dashboard', () => ({
  getAdminDashboardStats: jest.fn(),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}))

jest.mock('@/components/admin/DashboardWarnings', () => ({
  DashboardWarnings: ({ warnings }: { warnings: string[] }) => (
    <aside aria-label="Advertencias dashboard">{warnings.join(' | ')}</aside>
  ),
}))

jest.mock('@/components/admin/DashboardAutoRefresh', () => ({
  DashboardAutoRefresh: ({ fetchedAt }: { fetchedAt: string }) => <span>Actualizado {fetchedAt}</span>,
}))

jest.mock('@/components/admin/AdminStatusCard', () => ({
  AdminStatusCard: ({ label, tone, title, detail, tooltip }: {
    label: string
    tone: string
    title: string
    detail: string
    tooltip: React.ReactNode
  }) => (
    <section aria-label={`Estado ${label}`} data-tone={tone}>
      <strong>{title}</strong>
      <p>{detail}</p>
      <div>{tooltip}</div>
    </section>
  ),
}))

const mockGetAdminDashboardStats = getAdminDashboardStats as jest.MockedFunction<typeof getAdminDashboardStats>

const baseStats: AdminDashboardStats = {
  activeUsers: 12,
  totalLedgerBalance: 1_500_000,
  totalUsersBalance: 1_500_000,
  totalRake: 245_000,
  fraudAccountsCount: 2,
  pendingDeposits: 3,
  pendingWithdrawals: 1,
  activeGames: 4,
  ledgerIntegrityStatus: 'OPERATIVO',
  ledgerIntegrityDiff: 0,
  volume24h: 0,
  pendingSupport: 5,
  pendingAlerts: 6,
  vaultStatus: 'OPERATIVO',
  vaultCoverage: 98,
  vaultBalance: 2_000_000,
  vaultTotalDeposits: 2_500_000,
  vaultTotalWithdrawals: 500_000,
  warnings: ['Game server fallback activo'],
  fetchedAt: '2026-05-25T12:00:00.000Z',
}

describe('AdminPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAdminDashboardStats.mockResolvedValue(baseStats)
  })

  it('fuerza render dinamico sin cache', () => {
    expect(dynamic).toBe('force-dynamic')
    expect(revalidate).toBe(0)
  })

  it('renderiza resumen operativo, estados financieros y accesos principales', async () => {
    render(await AdminPage())

    expect(mockGetAdminDashboardStats).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { name: /panel de control/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Advertencias dashboard')).toHaveTextContent('Game server fallback activo')

    const vault = screen.getByLabelText('Estado Bóveda')
    expect(vault).toHaveAttribute('data-tone', 'success')
    expect(within(vault).getByText('OPERATIVO')).toBeInTheDocument()
    expect(within(vault).getByText('Cobertura 98%')).toBeInTheDocument()
    expect(within(vault).getByText((text) => text.includes('25.000'))).toBeInTheDocument()

    const ledger = screen.getByLabelText('Estado Libro Mayor')
    expect(ledger).toHaveAttribute('data-tone', 'success')
    expect(within(ledger).getByText('Sin diferencias')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: /Fichas en Plataforma/i })).toHaveAttribute('href', '/admin/users')
    expect(screen.getByRole('link', { name: /Ganancias \(Rake\)/i })).toHaveAttribute('href', '/admin/ganancias')
    expect(screen.getByRole('link', { name: /Mesas en Curso/i })).toHaveAttribute('href', '/admin/tables')
    expect(screen.getByRole('link', { name: /Alertas de Fraude/i })).toHaveAttribute('href', '/admin/users?q=fraud')
    expect(screen.getAllByText('Actualizado 2026-05-25T12:00:00.000Z')).toHaveLength(4)

    expect(screen.getByRole('link', { name: /Depósitos/i })).toHaveAttribute('href', '/admin/deposits')
    expect(screen.getByRole('link', { name: /Retiros/i })).toHaveAttribute('href', '/admin/withdrawals')
    expect(screen.getByRole('link', { name: /Soporte/i })).toHaveAttribute('href', '/admin/support')
    expect(screen.getByRole('link', { name: /Alertas Mesa/i })).toHaveAttribute('href', '/admin/alerts')
    expect(screen.getByRole('link', { name: /Log del Servidor/i })).toHaveAttribute('href', '/admin/server-log')
    expect(screen.getByRole('link', { name: /Recovery Incidentes/i })).toHaveAttribute('href', '/admin/recovery')
    expect(screen.getByRole('link', { name: /Disputas/i })).toHaveAttribute('href', '/admin/disputes')
  })

  it('mapea estados de alerta/desconocido y omite advertencias/refresh si no vienen en datos', async () => {
    mockGetAdminDashboardStats.mockResolvedValue({
      ...baseStats,
      totalLedgerBalance: 1_500_050,
      ledgerIntegrityStatus: 'ALERTA',
      ledgerIntegrityDiff: 50,
      vaultStatus: 'DESCONOCIDO',
      vaultCoverage: 0,
      warnings: [],
      fetchedAt: '',
    })

    render(await AdminPage())

    const vault = screen.getByLabelText('Estado Bóveda')
    expect(vault).toHaveAttribute('data-tone', 'neutral')
    expect(within(vault).getByText('DESCONOCIDO')).toBeInTheDocument()
    expect(within(vault).getByText('Sin lectura disponible')).toBeInTheDocument()

    const ledger = screen.getByLabelText('Estado Libro Mayor')
    expect(ledger).toHaveAttribute('data-tone', 'warning')
    expect(ledger).toHaveTextContent(/Diff\s+\$\s*1/)
    expect(screen.queryByLabelText('Advertencias dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText(/Actualizado/)).not.toBeInTheDocument()
  })

  it('muestra error visible si falla la carga del dashboard', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockGetAdminDashboardStats.mockRejectedValue(new Error('stats offline'))

    render(await AdminPage())

    expect(screen.getByRole('heading', { name: /error al cargar el dashboard/i })).toBeInTheDocument()
    expect(screen.getByText('stats offline')).toBeInTheDocument()
    expect(consoleError).toHaveBeenCalledWith('[AdminPage] Error cargando estadísticas:', expect.any(Error))
  })
})

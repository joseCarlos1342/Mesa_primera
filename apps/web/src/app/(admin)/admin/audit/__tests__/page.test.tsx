import { render, screen } from '@testing-library/react'
import AdminAuditPage, { dynamic, revalidate } from '../page'
import { getAuditLog } from '@/app/actions/admin-audit'

jest.mock('@/app/actions/admin-audit', () => ({
  getAuditLog: jest.fn(),
}))

type AuditEntry = {
  id: string
  created_at: string
  admin_id: string | null
  admin?: { display_name: string } | null
  actor_kind?: string | null
  actor_label?: string | null
  action: string
  target_type?: string | null
  target_id?: string | null
  details?: Record<string, unknown> | null
}

jest.mock('@/components/admin/ResponsiveDataView', () => ({
  ResponsiveDataView: ({ columns, data, emptyMessage, renderCard }: {
    columns: Array<{ key: string; header: string; render?: (entry: AuditEntry) => React.ReactNode }>
    data: AuditEntry[]
    emptyMessage: string
    renderCard: (entry: AuditEntry) => React.ReactNode
  }) => (
    <div data-testid="audit-data-view">
      {data.length === 0 ? <p>{emptyMessage}</p> : null}
      {data.map((entry) => (
        <article key={entry.id}>
          {columns.map((column) => (
            <section key={column.key} aria-label={column.header}>{column.render?.(entry)}</section>
          ))}
          <div data-testid={`audit-card-${entry.id}`}>{renderCard(entry)}</div>
        </article>
      ))}
    </div>
  ),
}))

const mockGetAuditLog = getAuditLog as jest.MockedFunction<typeof getAuditLog>

describe('AdminAuditPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('fuerza render dinamico sin cache', () => {
    expect(dynamic).toBe('force-dynamic')
    expect(revalidate).toBe(0)
  })

  it('lista auditoria con acciones conocidas, sistema, objetivo y detalles truncados', async () => {
    mockGetAuditLog.mockResolvedValue([
      {
        id: 'audit-1',
        created_at: '2026-05-25T10:15:30.000Z',
        admin_id: 'admin-1234567890',
        admin: { display_name: 'Operador Mesa' },
        actor_kind: 'admin',
        actor_label: null,
        action: 'deposit_approved',
        target_type: 'deposit',
        target_id: 'dep-1234567890',
        details: { amount: 5000, method: 'bank', nested: { ok: true }, ref: 'abc', extra: 'hidden' },
        context: null,
        before_state: null,
        after_state: null,
        ip_address: null,
      },
      {
        id: 'audit-2',
        created_at: '2026-05-25T11:00:00.000Z',
        admin_id: null,
        actor_kind: 'system',
        actor_label: 'job:daily',
        action: 'custom_event',
        target_type: null,
        target_id: null,
        details: {},
        context: null,
        before_state: null,
        after_state: null,
        ip_address: null,
      },
    ])

    render(await AdminAuditPage())

    expect(mockGetAuditLog).toHaveBeenCalledWith(200)
    expect(screen.getByRole('heading', { name: /registro de auditoría/i })).toBeInTheDocument()
    expect(screen.getByText('2 Registros')).toBeInTheDocument()
    expect(screen.getAllByText('Depósito Aprobado')).toHaveLength(2)
    expect(screen.getAllByText('Operador Mesa')).toHaveLength(2)
    expect(screen.getAllByText('Sistema')).toHaveLength(1)
    expect(screen.getAllByText('job:daily')).toHaveLength(1)
    expect(screen.getAllByText('CUSTOM EVENT')).toHaveLength(2)
    expect(screen.getAllByText('+1 más...')).toHaveLength(2)
    expect(screen.getByText('Sin detalles')).toBeInTheDocument()
  })

  it('muestra empty state sin registros de auditoria', async () => {
    mockGetAuditLog.mockResolvedValue([])

    render(await AdminAuditPage())

    expect(screen.getByText('0 Registros')).toBeInTheDocument()
    expect(screen.getByText('No hay registros de auditoría.')).toBeInTheDocument()
  })

  it('muestra error de carga de auditoria', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockGetAuditLog.mockRejectedValue(new Error('audit offline'))

    render(await AdminAuditPage())

    expect(screen.getByRole('heading', { name: /error al cargar auditoría/i })).toBeInTheDocument()
    expect(screen.getByText('audit offline')).toBeInTheDocument()
    expect(consoleError).toHaveBeenCalledWith('[AdminAuditPage] Error cargando audit log:', expect.any(Error))
    consoleError.mockRestore()
  })
})

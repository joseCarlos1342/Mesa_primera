import { exportAuditLog } from '../admin-audit-export'
import { getAuditLog } from '../admin-audit'

jest.mock('../admin-audit', () => ({
  getAuditLog: jest.fn(),
}))

const auditEntries = [
  {
    id: 'audit-1',
    created_at: '2026-01-01T12:00:00.000Z',
    action: 'user_balance_adjusted',
    context: 'wallet',
    actor_kind: 'admin',
    actor_label: 'Admin "Principal"',
    admin_id: 'admin-1',
    admin: { display_name: 'Jose Admin' },
    target_type: 'profile',
    target_id: 'user-1',
    details: { reason: 'ajuste, manual' },
    before_state: { balance: 1000 },
    after_state: { balance: 1500 },
    ip_address: '127.0.0.1',
  },
  {
    id: 'audit-2',
    created_at: '2026-01-02T12:00:00.000Z',
    action: 'admin_login',
    context: null,
    actor_kind: 'system',
    actor_label: null,
    admin_id: null,
    admin: null,
    target_type: null,
    target_id: null,
    details: null,
    before_state: null,
    after_state: null,
    ip_address: null,
  },
]

describe('exportAuditLog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getAuditLog as jest.Mock).mockResolvedValue(auditEntries)
  })

  it('exporta JSON legible y fuerza un límite amplio por defecto', async () => {
    const result = await exportAuditLog({ adminId: 'admin-1' }, 'json')

    expect(getAuditLog).toHaveBeenCalledWith({ adminId: 'admin-1', limit: 5000 })
    expect(JSON.parse(result)).toEqual(auditEntries)
    expect(result).toContain('\n  {')
  })

  it('respeta el límite explícito al exportar JSON', async () => {
    await exportAuditLog({ limit: 25 }, 'json')

    expect(getAuditLog).toHaveBeenCalledWith({ limit: 25 })
  })

  it('exporta CSV con cabecera, valores nulos vacíos y comillas escapadas', async () => {
    const csv = await exportAuditLog({ context: 'wallet' })

    const lines = csv.split('\n')
    expect(lines[0]).toBe('id,created_at,action,context,actor_kind,actor_label,admin_id,admin_name,target_type,target_id,details,before_state,after_state,ip_address')
    expect(lines[1]).toContain('"audit-1","2026-01-01T12:00:00.000Z","user_balance_adjusted","wallet"')
    expect(lines[1]).toContain('"Admin ""Principal"""')
    expect(lines[1]).toContain('"{\""reason\"":\""ajuste, manual\""}"')
    expect(lines[2]).toBe('"audit-2","2026-01-02T12:00:00.000Z","admin_login","","system","","","","","","{}","{}","{}",""')
  })
})

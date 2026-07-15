import { render, screen } from '@testing-library/react'
import IssueTicketPage from '../page'

jest.mock('@/app/actions/admin-issues', () => ({
  getAdminIssueMessages: jest.fn(),
  getAdminIssueTicket: jest.fn(),
}))

jest.mock('@/components/admin/IssueAdminActions', () => ({
  IssueAdminActions: () => null,
}))

jest.mock('@/components/IssueAttachmentList', () => ({
  IssueAttachmentList: () => null,
}))

const { getAdminIssueTicket, getAdminIssueMessages } = jest.requireMock(
  '@/app/actions/admin-issues'
) as {
  getAdminIssueTicket: jest.Mock
  getAdminIssueMessages: jest.Mock
}

describe('IssueTicketPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getAdminIssueMessages.mockResolvedValue({ data: [] })
  })

  it('no muestra el enlace "Volver a consultas"', async () => {
    getAdminIssueTicket.mockResolvedValue({
      data: {
        id: 'issue-1',
        user_id: 'user-1',
        category: 'table_error',
        status: 'closed',
        description: 'desc',
        transaction_reference: 'tx-1',
        table_reference: 'tbl-1',
        occurred_at: '2026-07-12T17:24:00.000Z',
        created_at: '2026-07-12T17:24:00.000Z',
        updated_at: '2026-07-12T17:24:00.000Z',
      },
    })

    render(
      await IssueTicketPage({ params: Promise.resolve({ issueId: 'issue-1' }) })
    )

    expect(
      screen.queryByRole('link', { name: /volver a consultas/i })
    ).not.toBeInTheDocument()
  })

  it('muestra error si la consulta no existe', async () => {
    getAdminIssueTicket.mockResolvedValue({ error: 'no autorizado' })

    render(
      await IssueTicketPage({ params: Promise.resolve({ issueId: 'x' }) })
    )

    expect(screen.getByText('no autorizado')).toBeInTheDocument()
  })
})

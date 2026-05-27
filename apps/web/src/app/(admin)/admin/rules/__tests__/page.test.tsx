import { render, screen } from '@testing-library/react'
import AdminRulesPage from '../page'
import { getRulebook } from '@/app/actions/admin-settings'

jest.mock('@/app/actions/admin-settings', () => ({
  getRulebook: jest.fn(),
}))

jest.mock('@/components/admin/RulesEditor', () => ({
  RulesEditor: ({ initialContent }: { initialContent: string }) => <textarea aria-label="Editor de reglas" value={initialContent} readOnly />,
}))

const mockGetRulebook = getRulebook as jest.MockedFunction<typeof getRulebook>

describe('AdminRulesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetRulebook.mockResolvedValue('# Reglamento vigente')
  })

  it('carga el reglamento y lo entrega al editor', async () => {
    render(await AdminRulesPage())

    expect(mockGetRulebook).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { name: /reglamento del local/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Editor de reglas')).toHaveValue('# Reglamento vigente')
  })

  it('explica formato markdown e historial de auditoria', async () => {
    render(await AdminRulesPage())

    expect(screen.getByText('Formato Soportado')).toBeInTheDocument()
    expect(screen.getByText(/Puedes utilizar formato/)).toBeInTheDocument()
    expect(screen.getByText('#')).toBeInTheDocument()
    expect(screen.getByText('Historial de Cambios')).toBeInTheDocument()
    expect(screen.getByText(/registro de auditoría/)).toBeInTheDocument()
  })
})

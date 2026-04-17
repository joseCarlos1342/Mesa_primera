import { fireEvent, render, screen, within } from '@testing-library/react'
import { Info } from 'lucide-react'
import { AdminStatusCard } from '@/components/admin/AdminStatusCard'

describe('AdminStatusCard', () => {
  it('toggles the detail panel when the card is pressed', () => {
    render(
      <AdminStatusCard
        label="Bóveda"
        tone="success"
        title="OPERATIVO"
        detail="Cobertura 122.5%"
        icon={<Info className="h-4 w-4" />}
        tooltip={<p>Detalle extendido de la bóveda</p>}
      />
    )

    const trigger = screen.getByRole('button', { name: /ver detalle de bóveda/i })

    expect(screen.queryByTestId('admin-status-card-mobile-panel')).not.toBeInTheDocument()

    fireEvent.click(trigger)

    const panel = screen.getByTestId('admin-status-card-mobile-panel')

    expect(within(panel).getByText(/detalle extendido de la bóveda/i)).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(trigger)

    expect(screen.queryByTestId('admin-status-card-mobile-panel')).not.toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('renders the mobile detail panel inside the card flow instead of using absolute positioning', () => {
    render(
      <AdminStatusCard
        label="Libro Mayor"
        tone="danger"
        title="CRÍTICO"
        detail="Diff -$10.000"
        icon={<Info className="h-4 w-4" />}
        tooltip={<p>Detalle extendido del libro mayor</p>}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /ver detalle de libro mayor/i }))

    const mobilePanel = screen.getByTestId('admin-status-card-mobile-panel')

    expect(mobilePanel.className).toContain('sm:hidden')
    expect(mobilePanel.className).not.toContain('absolute')
  })
})
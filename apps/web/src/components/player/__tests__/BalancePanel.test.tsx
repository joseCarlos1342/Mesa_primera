import { render, screen } from '@testing-library/react'

import { BalancePanel } from '../BalancePanel'

describe('BalancePanel', () => {
  it('muestra la etiqueta por defecto "Tu saldo" y el monto', () => {
    render(<BalancePanel cents={125000} />)
    expect(screen.getByText('Tu saldo')).toBeInTheDocument()
    expect(screen.getByText('1.250')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Tu saldo' })).toBeInTheDocument()
  })

  it('trata null como cero', () => {
    render(<BalancePanel cents={null} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('permite etiqueta personalizada, nota y acciones', () => {
    render(
      <BalancePanel cents={5000} label="Saldo mesa" note="Nota">
        <button type="button">Jugar ahora</button>
      </BalancePanel>,
    )
    expect(screen.getByRole('region', { name: 'Saldo mesa' })).toBeInTheDocument()
    expect(screen.getByText('Nota')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Jugar ahora' })).toBeInTheDocument()
  })
})

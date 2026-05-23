import { render, screen } from '@testing-library/react'

import { PlayerBadge } from '../PlayerBadge'

jest.mock('framer-motion', () => ({
  m: {
    div: ({ children, initial: _initial, animate: _animate, transition: _transition, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => <div {...props}>{children}</div>,
  },
}))

jest.mock('@/utils/avatars', () => ({
  getAvatarSvg: jest.fn((id: string) => (id === 'as-oros' ? <div data-testid="avatar-svg">svg</div> : null)),
}))

jest.mock('../ManoIcon', () => ({
  ManoIcon: ({ size }: { size: string }) => <div data-testid="mano-icon">{size}</div>,
}))

describe('PlayerBadge', () => {
  const player = {
    nickname: 'Chepe',
    chips: 500000,
    avatarUrl: 'as-oros',
    connected: true,
  }

  it('renderiza nickname, chips y avatar SVG cuando existe', () => {
    render(<PlayerBadge player={player} isActive={false} isMe={true} />)

    expect(screen.getByText('Chepe')).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes('5.000'))).toBeInTheDocument()
    expect(screen.getByTestId('avatar-svg')).toBeInTheDocument()
  })

  it('muestra badge Mano y resto para el jugador local', () => {
    render(<PlayerBadge player={player} isActive={true} isMe={true} isDealer={true} isAllIn={true} />)

    expect(screen.getByTestId('mano-icon')).toBeInTheDocument()
    expect(screen.getByText(/resto/i)).toBeInTheDocument()
  })

  it('muestra waiting y turno futuro para oponente', () => {
    render(<PlayerBadge player={player} isActive={false} isMe={false} turnOrder={3} isWaiting={true} />)

    expect(screen.getByText(/espera/i)).toBeInTheDocument()
  })

  it('muestra indicador de desconexión y fallback vacío sin avatar', () => {
    render(<PlayerBadge player={{ nickname: 'VACÍO', chips: null, avatarUrl: null, connected: false }} isActive={false} isMe={false} />)

    expect(screen.getByText('VACÍO')).toBeInTheDocument()
    expect(document.querySelector('.bg-red-600')).toBeInTheDocument()
  })
})

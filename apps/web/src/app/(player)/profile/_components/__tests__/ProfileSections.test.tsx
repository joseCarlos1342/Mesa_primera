import { fireEvent, render, screen } from '@testing-library/react'
import { LockToggle, ProfileHelp, ProfileIdentity, ProfileStats } from '../ProfileSections'

jest.mock('@/utils/avatars', () => ({
  getAvatarSvg: jest.fn((avatarId?: string | null) => avatarId === 'avatar-ok' ? <svg data-testid="sections-avatar-svg" /> : null),
}))

describe('ProfileIdentity', () => {
  it('muestra alias, teléfono y permite elegir avatar', () => {
    const onPickAvatar = jest.fn()
    render(<ProfileIdentity username="chepe" phone="+573000000000" avatarUrl="avatar-ok" busy={false} onPickAvatar={onPickAvatar} />)

    expect(screen.getByRole('heading', { name: 'chepe' })).toBeInTheDocument()
    expect(screen.getByText('+573000000000')).toBeInTheDocument()
    expect(screen.getByTestId('sections-avatar-svg')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar avatar' }))
    expect(onPickAvatar).toHaveBeenCalledTimes(1)
  })

  it('usa "Jugador" como nombre por defecto, oculta teléfono vacío y deshabilita en ocupado', () => {
    render(<ProfileIdentity username="" phone="" avatarUrl="" busy onPickAvatar={jest.fn()} />)

    expect(screen.getByRole('heading', { name: 'Jugador' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cambiar avatar' })).toBeDisabled()
  })
})

describe('ProfileStats', () => {
  it('renderiza los contadores del jugador', () => {
    render(<ProfileStats stats={{ games_played: 9, games_won: 4, primeras_count: 3 } as never} />)

    expect(screen.getByText('Mesas')).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Estadísticas' })).toHaveAttribute('href', '/stats')
  })

  it('muestra ceros cuando no hay estadísticas', () => {
    render(<ProfileStats stats={null} />)

    expect(screen.getByText('Mesas')).toBeInTheDocument()
    expect(screen.getAllByText('0')).toHaveLength(3)
  })
})

describe('LockToggle', () => {
  it('refleja el estado activado y notifica el cambio', () => {
    const onToggle = jest.fn()
    render(<LockToggle enabled onToggle={onToggle} />)

    const toggle = screen.getByRole('switch', { name: 'Activar bloqueo biométrico' })
    expect(toggle).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(toggle)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('refleja el estado desactivado', () => {
    render(<LockToggle enabled={false} onToggle={jest.fn()} />)

    expect(screen.getByRole('switch', { name: 'Activar bloqueo biométrico' })).toHaveAttribute('aria-checked', 'false')
  })
})

describe('ProfileHelp', () => {
  it('despacha el evento de soporte y enlaza reglas y términos', () => {
    const listener = jest.fn()
    window.addEventListener('open-support-chat', listener)

    render(<ProfileHelp />)

    fireEvent.click(screen.getByRole('button', { name: 'Hablar con soporte' }))
    expect(listener).toHaveBeenCalledTimes(1)

    expect(screen.getByRole('link', { name: 'Reglas del juego' })).toHaveAttribute('href', '/rules')
    expect(screen.getByRole('link', { name: 'Términos y privacidad' })).toHaveAttribute('href', '/terms')

    window.removeEventListener('open-support-chat', listener)
  })
})

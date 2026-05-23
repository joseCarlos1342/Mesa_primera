import { render, screen } from '@testing-library/react'

import { PlayerAppLockWrapper } from '../PlayerAppLockWrapper'

jest.mock('@/components/providers/AppLockProvider', () => ({
  AppLockProvider: ({ userId, children }: { userId: string; children: React.ReactNode }) => (
    <div data-testid="app-lock-provider" data-user-id={userId}>{children}</div>
  ),
}))

describe('PlayerAppLockWrapper', () => {
  it('envuelve children dentro de AppLockProvider con el userId correcto', () => {
    render(
      <PlayerAppLockWrapper userId="user-1">
        <span>child</span>
      </PlayerAppLockWrapper>
    )

    expect(screen.getByTestId('app-lock-provider')).toHaveAttribute('data-user-id', 'user-1')
    expect(screen.getByText('child')).toBeInTheDocument()
  })
})

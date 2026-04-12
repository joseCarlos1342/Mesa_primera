/**
 * RED phase — Tests for unrestricted zoom in the game route.
 * These must FAIL before implementing fixes.
 *
 * Covers:
 * - useGamePermissions must not call requestFullscreen() automatically
 * - PermissionsGate must always render children immediately (non-blocking)
 * - Game page shell must not trap zoom with h-screen + overflow-hidden
 */
import { render, screen } from '@testing-library/react'
import fs from 'fs'
import path from 'path'

// ────────────────────────────────────────────────
// 1. useGamePermissions — no auto-fullscreen
// ────────────────────────────────────────────────
describe('useGamePermissions hook', () => {
  it('requestAll must not call document.documentElement.requestFullscreen()', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useGamePermissions.ts'),
      'utf-8'
    )
    // The hook must NOT contain requestFullscreen calls — fullscreen should be manual only
    expect(source).not.toMatch(/requestFullscreen/)
  })

  it('requestAll must not call screen.orientation.lock()', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../hooks/useGamePermissions.ts'),
      'utf-8'
    )
    // Orientation lock should not be forced as a prerequisite
    expect(source).not.toMatch(/\.lock\s*\(\s*['"]landscape['"]\s*\)/)
  })
})

// ────────────────────────────────────────────────
// 2. PermissionsGate — always renders children
// ────────────────────────────────────────────────
describe('PermissionsGate', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    jest.resetModules()
  })

  it('always renders children immediately without blocking overlay', async () => {
    // Mock the hook to return "pending" state (worst case)
    jest.mock('@/hooks/useGamePermissions', () => ({
      useGamePermissions: () => ({
        orientation: 'pending',
        notifications: 'pending',
        microphone: 'pending',
        isMobile: true,
        allGranted: false,
        requestAll: jest.fn(),
      })
    }))

    // Dynamic import so the mock is applied first
    const { PermissionsGate } = await import('@/components/game/PermissionsGate')
    
    render(
      <PermissionsGate>
        <div data-testid="game-content">Game loaded</div>
      </PermissionsGate>
    )

    // Children must ALWAYS be visible — no blocking overlay
    expect(screen.getByTestId('game-content')).toBeVisible()
  })
})

// ────────────────────────────────────────────────
// 3. Game page shell — no global zoom-trapping layout
// ────────────────────────────────────────────────
describe('Game page layout shell', () => {
  it('outer div must use min-h-screen for LOBBY and h-screen for gameplay', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/play/[id]/page.tsx'),
      'utf-8'
    )
    // The main shell must conditionally switch between min-h-screen (LOBBY)
    // and h-screen (gameplay) — never a static h-screen + overflow-hidden
    const staticShellPattern = /className="[^"]*\bh-screen\b[^"]*\boverflow-hidden\b[^"]*"/
    expect(source).not.toMatch(staticShellPattern)
    // Must include the conditional pattern
    expect(source).toMatch(/min-h-screen.*h-screen overflow-hidden/)
  })

  it('loading state must not use h-screen + overflow-hidden together', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/play/[id]/page.tsx'),
      'utf-8'
    )
    // Loading and error states should use min-h-screen, not h-screen + overflow-hidden
    // Only check static className="..." strings (not template literals with conditionals)
    const staticClassLines = source.split('\n').filter(line => 
      line.includes('className="') && line.includes('h-screen') && line.includes('overflow-hidden')
    )
    expect(staticClassLines).toHaveLength(0)
  })
})

import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock de next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
  })),
}))

// Mock de Supabase Client
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock de window.navigator.vibrate
Object.defineProperty(window.navigator, 'vibrate', {
  writable: true,
  value: vi.fn(),
})

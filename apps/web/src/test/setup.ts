import '@testing-library/jest-dom'

// Mock de next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
}))

// Mock de Supabase Client
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

// Mock de window.navigator.vibrate
Object.defineProperty(window.navigator, 'vibrate', {
  writable: true,
  value: jest.fn(),
})

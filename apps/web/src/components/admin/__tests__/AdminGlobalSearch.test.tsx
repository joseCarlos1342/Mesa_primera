import { render, screen } from '@testing-library/react'
import { AdminGlobalSearch } from '../AdminGlobalSearch'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

import { useRouter } from 'next/navigation'
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

describe('AdminGlobalSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({ push: jest.fn() } as never)
  })

  it('renderiza input con placeholder y botón Buscar con altura h-10', () => {
    render(<AdminGlobalSearch />)
    const input = screen.getByPlaceholderText(/buscar id, seed, usuario/i)
    expect(input).toBeInTheDocument()
    // El input y el botón deben tener la misma altura para alinear con el resto del header
    const submit = screen.getByRole('button', { name: /buscar/i })
    const inputClasses = input.className
    const submitClasses = submit.className
    expect(inputClasses).toMatch(/h-10/)
    expect(submitClasses).toMatch(/h-10/)
  })

  it('oculta el botón de submit en mobile (el teclado nativo del telefono ya provee buscar)', () => {
    render(<AdminGlobalSearch />)
    const submit = screen.getByRole('button', { name: /buscar/i })
    // El botón debe estar oculto en mobile y mostrarse en >=sm
    expect(submit.className).toMatch(/hidden/)
    expect(submit.className).toMatch(/sm:inline-flex/)
  })

  it('usa type=search en el input para invocar el teclado nativo con lupa', () => {
    render(<AdminGlobalSearch />)
    const input = screen.getByPlaceholderText(/buscar id, seed, usuario/i) as HTMLInputElement
    expect(input.type).toBe('search')
  })

  it('usa type=search en el input para invocar el teclado nativo con lupa', () => {
    render(<AdminGlobalSearch />)
    const input = screen.getByPlaceholderText(/buscar id, seed, usuario/i) as HTMLInputElement
    expect(input.type).toBe('search')
  })

  it('el input tiene ancho minimo en mobile que crece en >=sm', () => {
    render(<AdminGlobalSearch />)
    const input = screen.getByPlaceholderText(/buscar id, seed, usuario/i) as HTMLInputElement
    const className = input.className
    // Debe tener un ancho base para mobile y uno mayor para >=sm
    expect(className).toMatch(/w-2[0-9]/) // w-24, w-28, etc.
    expect(className).toMatch(/sm:w-/)
  })
})

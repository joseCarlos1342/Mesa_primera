import { isValidElement, type ReactNode } from 'react'

let mockImageResponseImpl: jest.Mock

function mockImageResponse(...args: unknown[]) {
  return mockImageResponseImpl(...args)
}

jest.mock('next/og', () => ({
  ImageResponse: mockImageResponse,
}))

import { GET, revalidate, runtime } from '../route'

function collectText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(collectText).join(' ')
  if (isValidElement<{ children?: ReactNode }>(node)) return collectText(node.props.children)
  return ''
}

describe('GET /og-image', () => {
  beforeEach(() => {
    mockImageResponseImpl = jest.fn((element: ReactNode, options: Record<string, unknown>) => ({
      element,
      options,
    }))
  })

  it('declara runtime edge y revalidacion diaria para la imagen social', () => {
    expect(runtime).toBe('edge')
    expect(revalidate).toBe(86400)
  })

  it('genera la imagen OG publica con dimensiones y cache inmutable', async () => {
    const response = await GET()

    expect(mockImageResponseImpl).toHaveBeenCalledTimes(1)
    expect(response).toEqual({
      element: expect.any(Object),
      options: {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      },
    })
  })

  it('mantiene el contenido SEO visible de la tarjeta social', async () => {
    await GET()

    const [element] = mockImageResponseImpl.mock.calls[0]
    const text = collectText(element)

    expect(text).toContain('Neiva, Huila')
    expect(text).toContain('Cra. 7 #06-87')
    expect(text).toContain('Primera Riverada')
    expect(text).toContain('los 4 Ases')
    expect(text).toContain('Club de cartas Primera, dominó y entretenimiento')
    expect(text).toContain('Juega online')
    expect(text).toContain('primerariveradalos4ases.com')
    expect(text).toContain('4A')
  })
})

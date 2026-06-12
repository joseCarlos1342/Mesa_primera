import { render, screen } from '@testing-library/react'
import LandingPage, { metadata } from '../page'

jest.mock('@/components/landing/LandingContent', () => ({
  LandingContent: () => <main>Landing de Primera Riverada</main>,
}))

describe('LandingPage', () => {
  it('renderiza el contenido principal de landing', () => {
    render(<LandingPage />)

    expect(screen.getByRole('main')).toHaveTextContent('Landing de Primera Riverada')
  })

  it('declara metadata SEO canonica para la landing publica', () => {
    expect(metadata.title).toBe('Primera Riverada los 4 Ases | Club en Neiva')
    expect(metadata.description).toContain('Neiva, Huila')
    expect(metadata.alternates).toEqual({ canonical: 'https://primerariveradalos4ases.com/' })
    expect(metadata.openGraph).toEqual(expect.objectContaining({
      type: 'website',
      locale: 'es_CO',
      siteName: 'Primera Riverada los 4 Ases',
      url: 'https://primerariveradalos4ases.com/',
    }))
    expect(metadata.twitter).toEqual(expect.objectContaining({ card: 'summary_large_image', site: '@primerariverada' }))
  })
})

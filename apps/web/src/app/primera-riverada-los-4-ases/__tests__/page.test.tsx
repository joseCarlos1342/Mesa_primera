import { permanentRedirect } from 'next/navigation'
import BrandSeoLandingPage, { metadata } from '../page'

jest.mock('next/navigation', () => ({
  permanentRedirect: jest.fn(),
}))

describe('BrandSeoLandingPage', () => {
  it('no indexa la ruta historica de marca', () => {
    expect(metadata).toEqual({ robots: { index: false } })
  })

  it('redirige permanentemente a la landing canonica', () => {
    BrandSeoLandingPage()

    expect(permanentRedirect).toHaveBeenCalledWith('/')
  })
})

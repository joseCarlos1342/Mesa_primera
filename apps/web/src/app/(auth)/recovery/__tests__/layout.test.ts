import { metadata } from '../layout'

describe('metadata de recuperación de clave', () => {
  it('permite que los buscadores indexen la ruta pública', () => {
    expect(metadata.robots).toMatchObject({
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    })
  })

  it('define título, descripción y canonical propios', () => {
    expect(metadata).toMatchObject({
      title: 'Recuperar clave — Primera Riverada los 4 Ases',
      description: expect.stringMatching(/recupera/i),
      alternates: {
        canonical: 'https://primerariveradalos4ases.com/recovery',
      },
    })
  })
})

import sitemap from '../sitemap'

describe('sitemap metadata', () => {
  it('publica la landing canonica con maxima prioridad', () => {
    const entries = sitemap()

    expect(entries[0]).toEqual({
      url: 'https://primerariveradalos4ases.com',
      lastModified: '2025-04-01',
      changeFrequency: 'weekly',
      priority: 1,
    })
  })

  it('incluye solo rutas publicas legales y de reglas', () => {
    const entries = sitemap()

    expect(entries.map((entry) => entry.url)).toEqual([
      'https://primerariveradalos4ases.com',
      'https://primerariveradalos4ases.com/rules',
      'https://primerariveradalos4ases.com/privacy',
      'https://primerariveradalos4ases.com/terms',
      'https://primerariveradalos4ases.com/security-policy',
    ])
    expect(entries).not.toEqual(expect.arrayContaining([expect.objectContaining({ url: expect.stringContaining('/admin') })]))
    expect(entries).not.toEqual(expect.arrayContaining([expect.objectContaining({ url: expect.stringContaining('/api') })]))
  })
})

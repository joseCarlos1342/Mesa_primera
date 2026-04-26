import fs from 'fs'
import path from 'path'

describe('Landing GEO phase 2/3', () => {
  it('injects FAQPage JSON-LD in root layout metadata scripts', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/layout.tsx'),
      'utf-8',
    )

    expect(source).toContain('"@type": "FAQPage"')
    expect(source).toContain('application/ld+json')
  })

  it('adds a visible FAQ section and contextual trust links on landing', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/landing/LandingContent.tsx'),
      'utf-8',
    )

    expect(source).toContain('id="faq"')
    // JSX splits the heading: `Preguntas{' '} ... frecuentes`
    expect(source).toContain('Preguntas')
    expect(source).toContain('frecuentes')
    expect(source).toContain('href="/rules"')
    expect(source).toContain('href="/security-policy"')
  })

  it('provides a custom not-found page with recovery links', () => {
    const notFoundPath = path.resolve(__dirname, '../app/not-found.tsx')
    expect(fs.existsSync(notFoundPath)).toBe(true)

    const source = fs.readFileSync(notFoundPath, 'utf-8')
    expect(source).toContain('Página no encontrada')
    expect(source).toContain('href="/"')
    expect(source).toContain('href="/login/player"')
    expect(source).toContain('href="/register/player"')
  })
})

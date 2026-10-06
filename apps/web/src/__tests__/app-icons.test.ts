import fs from 'fs'
import path from 'path'

const PUBLIC = path.resolve(__dirname, '../../public')

interface ManifestIcon {
  src: string
  sizes: string
  type: string
  purpose?: string
}

function readManifest(): { theme_color: string; background_color: string; icons: ManifestIcon[] } {
  return JSON.parse(fs.readFileSync(path.join(PUBLIC, 'manifest.json'), 'utf-8'))
}

/** Ruta pública sin query de cache-busting (`?v=2`). */
function publicFile(src: string): string {
  return path.join(PUBLIC, src.split('?')[0])
}

/** Ancho, alto y tipo de color leídos de la cabecera IHDR del PNG. */
function pngInfo(file: string) {
  const buf = fs.readFileSync(file)
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), colorType: buf.readUInt8(25) }
}

describe('Iconos de la app ("los 4 Ases")', () => {
  it('usa los colores de la marca player en el manifest', () => {
    const manifest = readManifest()
    expect(manifest.theme_color).toBe('#0a2a1f')
    expect(manifest.background_color).toBe('#0a0a0a')
  })

  it('cada icono del manifest existe y mide lo que declara', () => {
    for (const icon of readManifest().icons) {
      const file = publicFile(icon.src)
      expect(fs.existsSync(file)).toBe(true)
      const [w, h] = icon.sizes.split('x').map(Number)
      expect(pngInfo(file)).toMatchObject({ width: w, height: h })
    }
  })

  it('incluye un icono maskable de 512px', () => {
    const maskable = readManifest().icons.find((icon) => icon.purpose === 'maskable')
    expect(maskable).toBeDefined()
    expect(maskable?.sizes).toBe('512x512')
  })

  it('el apple-touch-icon es opaco (iOS pinta de negro la transparencia)', () => {
    // Tipo de color 2 = RGB sin alfa.
    expect(pngInfo(path.join(PUBLIC, 'icons/apple-touch-icon-180.png')).colorType).toBe(2)
  })

  it('favicon.ico contiene 16, 32 y 48 px', () => {
    const ico = fs.readFileSync(path.join(PUBLIC, 'favicon.ico'))
    expect(ico.readUInt16LE(0)).toBe(0)
    expect(ico.readUInt16LE(2)).toBe(1)
    const count = ico.readUInt16LE(4)
    const sizes = Array.from({ length: count }, (_, i) => ico.readUInt8(6 + i * 16))
    expect(sizes.sort((a, b) => a - b)).toEqual([16, 32, 48])
  })

  it('favicon.svg y el logo del navbar embeben la ilustración real', () => {
    for (const rel of ['favicon.svg', 'brand/logo-transparent.svg']) {
      expect(fs.readFileSync(path.join(PUBLIC, rel), 'utf-8')).toContain('data:image/png;base64,')
    }
  })

  it('el layout apunta a archivos de icono existentes', () => {
    const layout = fs.readFileSync(path.resolve(__dirname, '../app/layout.tsx'), 'utf-8')
    const urls = [...layout.matchAll(/["'](\/(?:icons\/[^"']+|favicon\.[a-z]+[^"']*))["']/g)].map((m) => m[1])
    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) expect(fs.existsSync(publicFile(url))).toBe(true)
    expect(layout).toContain('themeColor: "#0a2a1f"')
  })
})

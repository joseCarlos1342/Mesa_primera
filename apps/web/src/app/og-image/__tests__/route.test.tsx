import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { GET, revalidate, runtime } from '../route'

describe('GET /og-image', () => {
  it('declara runtime edge y cache anual para la imagen social', () => {
    expect(runtime).toBe('edge')
    expect(revalidate).toBe(31536000)
  })

  it('mantiene un PNG social estático válido', () => {
    const image = readFileSync(resolve(__dirname, '../../../../public/og-image.png'))

    expect(image.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    expect(image.readUInt32BE(16)).toBe(1200)
    expect(image.readUInt32BE(20)).toBe(630)
  })

  it('sirve la imagen estática existente para no superar el límite Edge', async () => {
    const staticImage = { status: 200 }
    const fetchMock = jest.fn().mockResolvedValue(staticImage as unknown as Response)
    Object.defineProperty(global, 'fetch', { configurable: true, value: fetchMock })
    const request = { url: 'https://primerariveradalos4ases.com/og-image' } as Request

    try {
      await expect(GET(request)).resolves.toBe(staticImage)
      expect(fetchMock).toHaveBeenCalledWith(new URL('https://primerariveradalos4ases.com/og-image.png'))
    } finally {
      Reflect.deleteProperty(global, 'fetch')
    }
  })
})

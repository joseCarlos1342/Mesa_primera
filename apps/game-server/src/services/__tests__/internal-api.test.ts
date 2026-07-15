import { isInternalRequest } from '../internal-api'

describe('isInternalRequest', () => {
  it('rechaza solicitudes cuando no existe secreto configurado', () => {
    expect(isInternalRequest('anything', undefined)).toBe(false)
  })

  it('solo acepta el secreto interno exacto', () => {
    expect(isInternalRequest('wrong', 'replay-secret')).toBe(false)
    expect(isInternalRequest('replay-secret', 'replay-secret')).toBe(true)
  })
})

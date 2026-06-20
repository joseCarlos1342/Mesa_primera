import {
  clearSessionValidated,
  consumeAuthBypass,
  isSessionValidated,
  markSessionValidated,
  setAuthBypass,
} from '../app-lock-session'

const SESSION_VALIDATED_KEY = 'mesa_primera_session_validated'
const AUTH_BYPASS_KEY = 'mesa_primera_auth_bypass'

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`
}

describe('app-lock-session', () => {
  beforeEach(() => {
    sessionStorage.clear()
    clearCookie(AUTH_BYPASS_KEY)
    jest.restoreAllMocks()
  })

  afterEach(() => {
    clearCookie(AUTH_BYPASS_KEY)
    jest.restoreAllMocks()
  })

  it('marca, consulta y limpia la sesion biometrica validada', () => {
    expect(isSessionValidated()).toBe(false)

    markSessionValidated()

    expect(sessionStorage.getItem(SESSION_VALIDATED_KEY)).toBe('true')
    expect(isSessionValidated()).toBe(true)

    clearSessionValidated()

    expect(sessionStorage.getItem(SESSION_VALIDATED_KEY)).toBeNull()
    expect(isSessionValidated()).toBe(false)
  })

  it('consume el bypass de auth de sessionStorage una sola vez', () => {
    setAuthBypass()

    expect(sessionStorage.getItem(AUTH_BYPASS_KEY)).toBe('true')
    expect(consumeAuthBypass()).toBe(true)
    expect(sessionStorage.getItem(AUTH_BYPASS_KEY)).toBeNull()
    expect(consumeAuthBypass()).toBe(false)
  })

  it('consume el bypass de auth desde cookie cuando no existe en sessionStorage', () => {
    document.cookie = `${AUTH_BYPASS_KEY}=true; path=/; SameSite=Lax`

    expect(consumeAuthBypass()).toBe(true)
    expect(document.cookie).not.toContain(`${AUTH_BYPASS_KEY}=true`)
    expect(consumeAuthBypass()).toBe(false)
  })

  it('prioriza sessionStorage y deja intacta la cookie para el siguiente consumo', () => {
    sessionStorage.setItem(AUTH_BYPASS_KEY, 'true')
    document.cookie = `${AUTH_BYPASS_KEY}=true; path=/; SameSite=Lax`

    expect(consumeAuthBypass()).toBe(true)
    expect(document.cookie).toContain(`${AUTH_BYPASS_KEY}=true`)

    expect(consumeAuthBypass()).toBe(true)
    expect(document.cookie).not.toContain(`${AUTH_BYPASS_KEY}=true`)
  })

  it('degrada de forma segura cuando sessionStorage rechaza operaciones', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('storage blocked', 'SecurityError')
    })
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('storage blocked', 'SecurityError')
    })
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('storage blocked', 'SecurityError')
    })

    expect(() => markSessionValidated()).not.toThrow()
    expect(isSessionValidated()).toBe(false)
    expect(() => clearSessionValidated()).not.toThrow()
    expect(() => setAuthBypass()).not.toThrow()
    expect(consumeAuthBypass()).toBe(false)
  })

  it('mantiene el bypass por cookie aunque sessionStorage no este disponible', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('storage blocked', 'SecurityError')
    })
    document.cookie = `${AUTH_BYPASS_KEY}=true; path=/; SameSite=Lax`

    expect(consumeAuthBypass()).toBe(true)
    expect(document.cookie).not.toContain(`${AUTH_BYPASS_KEY}=true`)
  })
})

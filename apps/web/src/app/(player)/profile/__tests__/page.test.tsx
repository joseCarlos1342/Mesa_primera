import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ProfilePage from '../page'
import { getMyStats } from '@/app/actions/stats'
import { useAppLock } from '@/components/providers/AppLockProvider'
import { clearSessionValidated } from '@/lib/app-lock-session'
import { logoutOneSignalUser } from '@/components/OneSignalPushOptIn'

const updateMyProfile = jest.fn()
const push = jest.fn()
const refresh = jest.fn()
const router = { push, refresh }
const getUser = jest.fn()
const updateUser = jest.fn()
const verifyOtp = jest.fn()
const signOut = jest.fn()
const maybeSingle = jest.fn()
const updateEq = jest.fn()
const upload = jest.fn()
const getPublicUrl = jest.fn()

jest.mock('@/app/actions/profile', () => ({
  updateMyProfile: (...args: unknown[]) => updateMyProfile(...args),
}))

const supabase = {
  auth: { getUser, updateUser, verifyOtp, signOut },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({ maybeSingle }),
    }),
    update: jest.fn().mockReturnValue({ eq: updateEq }),
  })),
  storage: {
    from: jest.fn(() => ({ upload, getPublicUrl })),
  },
}

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => supabase),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => router,
}))

jest.mock('@/utils/avatars', () => ({
  getAvatarSvg: jest.fn((avatarId?: string | null) => avatarId === 'avatar-ok' ? <svg data-testid="profile-avatar-svg" /> : null),
}))

jest.mock('@/app/actions/stats', () => ({
  getMyStats: jest.fn(),
}))

jest.mock('@/components/providers/AppLockProvider', () => ({
  useAppLock: jest.fn(),
}))

jest.mock('@/lib/app-lock-session', () => ({
  clearSessionValidated: jest.fn(),
}))

jest.mock('@/components/OneSignalPushOptIn', () => ({
  logoutOneSignalUser: jest.fn(),
}))

jest.mock('@/components/ui/Toast', () => ({
  Toast: ({ message, type, onClose }: { message: string, type: string, onClose: () => void }) => (
    <button type="button" data-type={type} onClick={onClose}>{message}</button>
  ),
}))

const profile = {
  username: 'chepe',
  full_name: 'Jose Test',
  phone: '+573000000000',
  avatar_url: '',
}

const stats = {
  games_played: 12,
  games_won: 7,
  primeras_count: 2,
}

async function renderLoadedProfile(overrides: Partial<typeof profile> = {}) {
  getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'jugador@mesa.test' } } })
  maybeSingle.mockResolvedValue({ data: { ...profile, ...overrides }, error: null })
  ;(getMyStats as jest.Mock).mockResolvedValue(stats)

  render(<ProfilePage />)

  // El encabezado de identidad muestra el alias del jugador.
  expect(await screen.findByRole('heading', { name: 'chepe' })).toBeInTheDocument()
}

/** Escribe un código completo en las 6 casillas del CodeInput. */
function typeOtp(code: string) {
  const first = screen.getByLabelText('Dígito 1 de 6')
  fireEvent.change(first, { target: { value: code } })
}

describe('ProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
    getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'jugador@mesa.test' } } })
    maybeSingle.mockResolvedValue({ data: profile, error: null })
    updateEq.mockResolvedValue({ error: null })
    updateMyProfile.mockResolvedValue({ success: true })
    updateUser.mockResolvedValue({ error: null })
    verifyOtp.mockResolvedValue({ error: null })
    signOut.mockResolvedValue({ error: null })
    upload.mockResolvedValue({ error: null })
    getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.test/avatar.png' } })
    ;(getMyStats as jest.Mock).mockResolvedValue(stats)
    ;(logoutOneSignalUser as jest.Mock).mockResolvedValue(undefined)
    ;(useAppLock as jest.Mock).mockReturnValue({
      isEnabled: false,
      isSupported: true,
      enroll: jest.fn().mockResolvedValue({ ok: true }),
      disable: jest.fn(),
    })
  })

  it('redirige a login si no hay usuario autenticado', async () => {
    getUser.mockResolvedValue({ data: { user: null } })

    render(<ProfilePage />)

    expect(await screen.findByLabelText('Cargando tu perfil')).toBeInTheDocument()
    await waitFor(() => expect(push).toHaveBeenCalledWith('/login/player'))
  })

  it('carga perfil, estadisticas y guarda cambios sin cambiar telefono', async () => {
    await renderLoadedProfile()

    expect(screen.getByDisplayValue('chepe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Jose Test')).toBeInTheDocument()
    expect(screen.getByDisplayValue('+573000000000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('jugador@mesa.test')).toBeDisabled()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()

    fireEvent.change(screen.getByDisplayValue('chepe'), { target: { value: 'nuevoAlias' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(updateEq).toHaveBeenCalledWith('id', 'user-1'))
    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('¡Perfil actualizado con éxito!')).toBeInTheDocument()
  })

  it('pide OTP al cambiar telefono y guarda perfil cuando el codigo es valido', async () => {
    await renderLoadedProfile()

    fireEvent.change(screen.getByDisplayValue('+573000000000'), { target: { value: '3000000001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ phone: '+573000000001' }))
    expect(screen.getByRole('heading', { name: 'Verificar número' })).toBeInTheDocument()
    expect(screen.getByText('+573000000001')).toBeInTheDocument()

    typeOtp('123456')
    expect(screen.getByLabelText('Dígito 6 de 6')).toHaveValue('6')
    fireEvent.click(screen.getByRole('button', { name: /verificar código/i }))

    await waitFor(() => expect(verifyOtp).toHaveBeenCalledWith({
      phone: '+573000000001',
      token: '123456',
      type: 'phone_change',
    }))
    await waitFor(() => expect(updateEq).toHaveBeenCalledWith('id', 'user-1'))
    expect(await screen.findByText('¡Perfil actualizado con éxito!')).toBeInTheDocument()
  })

  it('no permite verificar hasta tener 6 dígitos', async () => {
    await renderLoadedProfile()

    fireEvent.change(screen.getByDisplayValue('+573000000000'), { target: { value: '3000000001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByRole('heading', { name: 'Verificar número' })

    typeOtp('123')
    expect(screen.getByRole('button', { name: /verificar código/i })).toBeDisabled()
  })

  it('muestra error cuando falla el envio de codigo por cambio de telefono', async () => {
    updateUser.mockResolvedValueOnce({ error: { message: 'SMS apagado' } })
    await renderLoadedProfile()

    fireEvent.change(screen.getByDisplayValue('+573000000000'), { target: { value: '3000000001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('No pudimos enviar el código. Verifica el teléfono e intenta de nuevo.')).toBeInTheDocument()
    expect(screen.queryByText(/SMS apagado/)).not.toBeInTheDocument()
  })

  it('muestra error cuando el codigo OTP es incorrecto', async () => {
    verifyOtp.mockResolvedValueOnce({ error: { message: 'bad otp' } })
    await renderLoadedProfile()

    fireEvent.change(screen.getByDisplayValue('+573000000000'), { target: { value: '3000000001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByRole('heading', { name: 'Verificar número' })
    typeOtp('111111')
    fireEvent.click(screen.getByRole('button', { name: /verificar código/i }))

    expect(await screen.findByText('Código incorrecto. Intenta de nuevo.')).toBeInTheDocument()
  })

  it('cierra la hoja de verificación sin verificar al pulsar cerrar', async () => {
    await renderLoadedProfile()

    fireEvent.change(screen.getByDisplayValue('+573000000000'), { target: { value: '3000000001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByRole('heading', { name: 'Verificar número' })

    typeOtp('123')
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar verificación' }))
    expect(screen.queryByRole('heading', { name: 'Verificar número' })).not.toBeInTheDocument()
    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it('valida tipo/tamaño de imagen y actualiza avatar cuando la subida funciona', async () => {
    await renderLoadedProfile()
    const fileInput = document.querySelector('#avatar-upload') as HTMLInputElement

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [new File(['x'], 'archivo.txt', { type: 'text/plain' })] } })
    })
    expect(await screen.findByText('Solo se aceptan imágenes JPG, PNG o WebP')).toBeInTheDocument()

    const largeImage = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'grande.png', { type: 'image/png' })
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [largeImage] } })
    })
    expect(await screen.findByText('La imagen supera el límite de 2MB')).toBeInTheDocument()

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [new File(['ok'], 'avatar.png', { type: 'image/png' })] } })
    })

    await waitFor(() => expect(upload).toHaveBeenCalledWith(expect.stringMatching(/^user-1\/avatar-/), expect.any(File), { upsert: true }))
    // PlayerAvatar renderiza la foto como <img> con la URL pública.
    const avatarImg = document.querySelector('img[src="https://cdn.test/avatar.png"]')
    expect(avatarImg).toBeInTheDocument()
    expect(await screen.findByText('Imagen cargada. Toca “Guardar cambios” para conservarla.')).toBeInTheDocument()
  })

  it('muestra error cuando falla la subida de avatar', async () => {
    upload.mockResolvedValueOnce({ error: { message: 'bucket offline' } })
    await renderLoadedProfile()
    const fileInput = document.querySelector('#avatar-upload') as HTMLInputElement

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [new File(['ok'], 'avatar.png', { type: 'image/png' })] } })
    })

    expect(await screen.findByText('No pudimos subir la imagen. Intenta de nuevo.')).toBeInTheDocument()
    expect(screen.queryByText(/bucket offline/)).not.toBeInTheDocument()
  })

  it('activa y desactiva bloqueo biometrico segun estado actual', async () => {
    const enroll = jest.fn().mockResolvedValue({ ok: true })
    const disable = jest.fn()
    ;(useAppLock as jest.Mock).mockReturnValue({ isEnabled: false, isSupported: true, enroll, disable })
    await renderLoadedProfile()

    fireEvent.click(screen.getByRole('switch', { name: 'Activar bloqueo biométrico' }))
    await waitFor(() => expect(enroll).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('¡Bloqueo biométrico activado!')).toBeInTheDocument()

    cleanup()
    ;(useAppLock as jest.Mock).mockReturnValue({ isEnabled: true, isSupported: true, enroll, disable })
    await renderLoadedProfile()

    fireEvent.click(screen.getByRole('switch', { name: 'Activar bloqueo biométrico' }))
    expect(disable).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Bloqueo biométrico desactivado')).toBeInTheDocument()
  })

  it('no muestra la sección de seguridad si el bloqueo no es compatible', async () => {
    ;(useAppLock as jest.Mock).mockReturnValue({ isEnabled: false, isSupported: false, enroll: jest.fn(), disable: jest.fn() })
    await renderLoadedProfile()

    expect(screen.queryByRole('switch', { name: 'Activar bloqueo biométrico' })).not.toBeInTheDocument()
  })

  it('muestra error si la biometria no se puede enrolar', async () => {
    ;(useAppLock as jest.Mock).mockReturnValue({
      isEnabled: false,
      isSupported: true,
      enroll: jest.fn().mockResolvedValue({ ok: false, error: 'Sensor bloqueado' }),
      disable: jest.fn(),
    })
    await renderLoadedProfile()

    fireEvent.click(screen.getByRole('switch', { name: 'Activar bloqueo biométrico' }))

    expect(await screen.findByText('No se pudo activar el bloqueo biométrico. Intenta de nuevo.')).toBeInTheDocument()
    expect(screen.queryByText('Sensor bloqueado')).not.toBeInTheDocument()
  })

  it('muestra error y no refresca cuando falla la actualización de profiles', async () => {
    updateMyProfile.mockResolvedValueOnce({ error: 'No pudimos actualizar tu perfil. Intenta de nuevo.' })
    await renderLoadedProfile()

    fireEvent.change(screen.getByDisplayValue('chepe'), { target: { value: 'aliasFallido' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('No pudimos actualizar tu perfil. Intenta de nuevo.')).toBeInTheDocument()
    expect(updateEq).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('renderiza avatar SVG cuando avatar_url es un id reconocido del catálogo', async () => {
    await renderLoadedProfile({ avatar_url: 'avatar-ok' })

    expect(screen.getByTestId('profile-avatar-svg')).toBeInTheDocument()
  })

  it('cierra sesion solo cuando el usuario confirma en la hoja', async () => {
    await renderLoadedProfile()

    // Abre la hoja de confirmación pero cancela: no cierra sesión.
    // ("Cancelar" aparece dos veces: el botón de cerrar y el del pie.)
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(screen.getByRole('heading', { name: '¿Cerrar sesión?' })).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancelar' })[1])
    expect(signOut).not.toHaveBeenCalled()

    // Confirma: cierra OneSignal, limpia sesión, cierra Supabase y redirige.
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí, salir' }))

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
    expect(logoutOneSignalUser).toHaveBeenCalledTimes(1)
    expect(clearSessionValidated).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith('/login/player')
  })

  it('cierra la hoja de confirmación de salida al tocar el fondo', async () => {
    await renderLoadedProfile()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(screen.getByRole('heading', { name: '¿Cerrar sesión?' })).toBeInTheDocument()

    // El fondo de la hoja invoca onClose (que respeta el guard de loggingOut).
    fireEvent.click(screen.getByTestId('sheet-backdrop'))
    expect(screen.queryByRole('heading', { name: '¿Cerrar sesión?' })).not.toBeInTheDocument()
    expect(signOut).not.toHaveBeenCalled()
  })

  it('usa valores vacíos cuando el perfil no trae datos', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: '' } } })
    // Perfil con campos nulos: deben caer a cadenas vacías sin romper el render.
    maybeSingle.mockResolvedValue({ data: { username: null, full_name: null, phone: null, avatar_url: null }, error: null })
    ;(getMyStats as jest.Mock).mockResolvedValue(null)

    render(<ProfilePage />)

    // Sin alias el encabezado muestra "Jugador"; sin correo el hint lo indica.
    expect(await screen.findByRole('heading', { name: 'Jugador' })).toBeInTheDocument()
    expect(screen.getByText('Tu cuenta no tiene correo asociado.')).toBeInTheDocument()
  })

  it('ignora la subida de avatar cuando no se selecciona archivo', async () => {
    await renderLoadedProfile()
    const fileInput = document.querySelector('#avatar-upload') as HTMLInputElement

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [] } })
    })

    expect(upload).not.toHaveBeenCalled()
  })

  it('despacha el evento de soporte al tocar "Hablar con soporte"', async () => {
    const listener = jest.fn()
    window.addEventListener('open-support-chat', listener)
    await renderLoadedProfile()

    fireEvent.click(screen.getByRole('button', { name: 'Hablar con soporte' }))
    expect(listener).toHaveBeenCalledTimes(1)

    window.removeEventListener('open-support-chat', listener)
  })

  it('abre el selector de avatar al tocar el botón de cámara', async () => {
    await renderLoadedProfile()

    const fileInput = document.querySelector('#avatar-upload') as HTMLInputElement
    const pickFile = jest.spyOn(fileInput, 'click').mockImplementation(() => {})
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar avatar' }))
    expect(pickFile).toHaveBeenCalledTimes(1)

    fireEvent.change(screen.getByDisplayValue('Jose Test'), { target: { value: 'Jose Carlos' } })
    expect(screen.getByDisplayValue('Jose Carlos')).toBeInTheDocument()
  })

  it('muestra error cuando falla la actualizacion de profiles sin phoneOverride', async () => {
    updateEq.mockResolvedValueOnce({ error: { message: 'DB offline' } })
    await renderLoadedProfile()

    fireEvent.change(screen.getByDisplayValue('chepe'), { target: { value: 'aliasNuevo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('No pudimos actualizar el perfil. Intenta de nuevo.')).toBeInTheDocument()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('muestra error cuando falla la actualizacion de profiles con phoneOverride tras OTP', async () => {
    updateEq.mockResolvedValueOnce({ error: { message: 'DB offline' } })
    await renderLoadedProfile()

    fireEvent.change(screen.getByDisplayValue('+573000000000'), { target: { value: '3000000001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByRole('heading', { name: 'Verificar número' })
    typeOtp('123456')
    fireEvent.click(screen.getByRole('button', { name: /verificar código/i }))

    expect(await screen.findByText('No pudimos actualizar el teléfono. Intenta de nuevo.')).toBeInTheDocument()
    expect(refresh).not.toHaveBeenCalled()
  })
})

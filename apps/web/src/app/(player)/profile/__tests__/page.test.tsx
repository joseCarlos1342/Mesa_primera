import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ProfilePage from '../page'
import { getMyStats } from '@/app/actions/stats'
import { useAppLock } from '@/components/providers/AppLockProvider'
import { clearSessionValidated } from '@/lib/app-lock-session'

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

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
      <div {...props}>{children}</div>
    ),
  },
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

  expect(await screen.findByRole('heading', { name: 'Mi Perfil' })).toBeInTheDocument()
}

describe('ProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
    getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'jugador@mesa.test' } } })
    maybeSingle.mockResolvedValue({ data: profile, error: null })
    updateEq.mockResolvedValue({ error: null })
    updateUser.mockResolvedValue({ error: null })
    verifyOtp.mockResolvedValue({ error: null })
    signOut.mockResolvedValue({ error: null })
    upload.mockResolvedValue({ error: null })
    getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.test/avatar.png' } })
    ;(getMyStats as jest.Mock).mockResolvedValue(stats)
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

    expect(await screen.findByText('Abriendo Bóveda...')).toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => expect(updateEq).toHaveBeenCalledWith('id', 'user-1'))
    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('¡Perfil actualizado con éxito!')).toBeInTheDocument()
  })

  it('pide OTP al cambiar telefono y guarda perfil cuando el codigo es valido', async () => {
    await renderLoadedProfile()

    fireEvent.change(screen.getByDisplayValue('+573000000000'), { target: { value: '3000000001' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ phone: '+573000000001' }))
    expect(screen.getByText('Verificar Número')).toBeInTheDocument()
    expect(screen.getByText('+573000000001')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '12ab3456' } })
    expect(screen.getByPlaceholderText('000000')).toHaveValue('123456')
    fireEvent.click(screen.getByRole('button', { name: /verificar código/i }))

    await waitFor(() => expect(verifyOtp).toHaveBeenCalledWith({
      phone: '+573000000001',
      token: '123456',
      type: 'phone_change',
    }))
    await waitFor(() => expect(updateEq).toHaveBeenCalledWith('id', 'user-1'))
    expect(await screen.findByText('¡Perfil actualizado con éxito!')).toBeInTheDocument()
  })

  it('muestra error cuando falla el envio de codigo por cambio de telefono', async () => {
    updateUser.mockResolvedValueOnce({ error: { message: 'SMS apagado' } })
    await renderLoadedProfile()

    fireEvent.change(screen.getByDisplayValue('+573000000000'), { target: { value: '3000000001' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))

    expect(await screen.findByText('Error al enviar código: SMS apagado')).toBeInTheDocument()
  })

  it('muestra error cuando el codigo OTP es incorrecto', async () => {
    verifyOtp.mockResolvedValueOnce({ error: { message: 'bad otp' } })
    await renderLoadedProfile()

    fireEvent.change(screen.getByDisplayValue('+573000000000'), { target: { value: '3000000001' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }))
    await screen.findByText('Verificar Número')
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '111111' } })
    fireEvent.click(screen.getByRole('button', { name: /verificar código/i }))

    expect(await screen.findByText('Código incorrecto. Intenta de nuevo.')).toBeInTheDocument()
  })

  it('valida tipo/tamaño de imagen y actualiza avatar cuando la subida funciona', async () => {
    await renderLoadedProfile()
    const fileInput = document.querySelector('#avatar-upload') as HTMLInputElement

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [new File(['x'], 'archivo.txt', { type: 'text/plain' })] } })
    })
    expect(await screen.findByText('Selecciona solo archivos de imagen')).toBeInTheDocument()

    const largeImage = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'grande.png', { type: 'image/png' })
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [largeImage] } })
    })
    expect(await screen.findByText('La imagen supera el límite de 2MB')).toBeInTheDocument()

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [new File(['ok'], 'avatar.png', { type: 'image/png' })] } })
    })

    await waitFor(() => expect(upload).toHaveBeenCalledWith(expect.stringMatching(/^user-1\/avatar-/), expect.any(File), { upsert: true }))
    expect(screen.getByRole('img', { name: 'Avatar' })).toHaveAttribute('src', 'https://cdn.test/avatar.png')
    expect(await screen.findByText('Imagen cargada correctamente')).toBeInTheDocument()
  })

  it('muestra error cuando falla la subida de avatar', async () => {
    upload.mockResolvedValueOnce({ error: { message: 'bucket offline' } })
    await renderLoadedProfile()
    const fileInput = document.querySelector('#avatar-upload') as HTMLInputElement

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [new File(['ok'], 'avatar.png', { type: 'image/png' })] } })
    })

    expect(await screen.findByText('Error al subir: bucket offline')).toBeInTheDocument()
  })

  it('activa y desactiva bloqueo biometrico segun estado actual', async () => {
    const enroll = jest.fn().mockResolvedValue({ ok: true })
    const disable = jest.fn()
    ;(useAppLock as jest.Mock).mockReturnValue({ isEnabled: false, isSupported: true, enroll, disable })
    await renderLoadedProfile()

    fireEvent.click(screen.getByRole('button', { name: 'Activar bloqueo biométrico' }))
    await waitFor(() => expect(enroll).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('¡Bloqueo biométrico activado!')).toBeInTheDocument()

    cleanup()
    ;(useAppLock as jest.Mock).mockReturnValue({ isEnabled: true, isSupported: true, enroll, disable })
    await renderLoadedProfile()

    fireEvent.click(screen.getByRole('button', { name: 'Activar bloqueo biométrico' }))
    expect(disable).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Bloqueo biométrico desactivado')).toBeInTheDocument()
  })

  it('muestra error si la biometria no se puede enrolar', async () => {
    ;(useAppLock as jest.Mock).mockReturnValue({
      isEnabled: false,
      isSupported: true,
      enroll: jest.fn().mockResolvedValue({ ok: false, error: 'Sensor bloqueado' }),
      disable: jest.fn(),
    })
    await renderLoadedProfile()

    fireEvent.click(screen.getByRole('button', { name: 'Activar bloqueo biométrico' }))

    expect(await screen.findByText('Sensor bloqueado')).toBeInTheDocument()
  })

  it('cierra sesion solo cuando el usuario confirma', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    await renderLoadedProfile()

    fireEvent.click(screen.getByRole('button', { name: /salir/i }))
    expect(signOut).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /salir/i }))
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
    expect(clearSessionValidated).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith('/login/player')

    confirmSpy.mockRestore()
  })
})

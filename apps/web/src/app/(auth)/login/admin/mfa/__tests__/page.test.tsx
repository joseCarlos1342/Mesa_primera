import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminMFAPage from '../page'
import { redeemAdminRecoveryCode, verifyAdminTotp } from '@/app/(auth)/auth-actions'

jest.mock('@/app/(auth)/auth-actions', () => ({
  verifyAdminTotp: jest.fn(),
  redeemAdminRecoveryCode: jest.fn(),
}))

const mockVerifyAdminTotp = verifyAdminTotp as jest.MockedFunction<typeof verifyAdminTotp>
const mockRedeemAdminRecoveryCode = redeemAdminRecoveryCode as jest.MockedFunction<typeof redeemAdminRecoveryCode>

describe('AdminMFAPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('filtra codigo TOTP a digitos, verifica y muestra error', async () => {
    mockVerifyAdminTotp.mockResolvedValue({ error: 'Código inválido' })

    render(<AdminMFAPage />)

    const input = screen.getByPlaceholderText('000000')
    fireEvent.change(input, { target: { value: '12a34b56' } })
    expect(input).toHaveValue('123456')
    fireEvent.click(screen.getByRole('button', { name: 'Verificar Código' }))

    await waitFor(() => expect(mockVerifyAdminTotp).toHaveBeenCalled())
    expect(await screen.findByText('Código inválido')).toBeInTheDocument()
  })

  it('normaliza recovery code y muestra field error', async () => {
    mockRedeemAdminRecoveryCode.mockResolvedValue({ fieldErrors: { code: 'Código usado' } })

    render(<AdminMFAPage />)

    const recoveryInput = screen.getByPlaceholderText('ABCD-EFGH-IJKL')
    fireEvent.change(recoveryInput, { target: { value: 'abcd-efgh-ijkl' } })
    expect(recoveryInput).toHaveValue('ABCD-EFGH-IJKL')
    fireEvent.click(screen.getByRole('button', { name: 'Usar código de recuperación' }))

    expect(await screen.findByText('Código usado')).toBeInTheDocument()
  })
})

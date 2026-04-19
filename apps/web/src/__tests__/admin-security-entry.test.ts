import fs from 'fs'
import path from 'path'

describe('Admin security entry points', () => {
  it('adds a password recovery link to the admin login page', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(auth)/login/admin/page.tsx'),
      'utf-8'
    )

    expect(source).toContain('href="/login/admin/recovery"')
  })

  it('adds a security shortcut to the admin dashboard', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(admin)/admin/page.tsx'),
      'utf-8'
    )

    expect(source).toContain('href="/admin/security"')
  })

  it('exposes a recovery code fallback on the admin MFA page', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(auth)/login/admin/mfa/page.tsx'),
      'utf-8'
    )

    expect(source).toContain('Usar código de recuperación')
  })

  it('whitelists the auth confirmation route and password update page in middleware', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../utils/supabase/middleware.ts'),
      'utf-8'
    )

    expect(source).toContain("'/api/auth/confirm'")
    expect(source).toContain("'/login/admin/password'")
  })
})
import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests: Admin Security Hardening.
 *
 * Covers:
 *  - Password recovery request flow
 *  - Password reset completion (client-side validation)
 *  - Admin login → MFA gate
 *  - Recovery code redemption form on MFA page
 *  - Admin security panel (authenticated, requires MFA)
 *  - Session management actions
 *
 * Requirements: Supabase local running, web dev server on :3000.
 */

const BASE = 'http://localhost:3000';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE}/login/admin`);
  await page.fill('input[name="email"]', 'gomezjose7042@gmail.com');
  await page.fill('input[name="password"]', 'Bvf79h1010152653');
  await page.click('button[type="submit"]');
  // Admin login should redirect to MFA page or admin dashboard
  await page.waitForURL(/\/(admin|login\/admin\/mfa)/, { timeout: 15_000 });
}

/* ------------------------------------------------------------------ */
/*  1. Password Recovery Request Flow                                 */
/* ------------------------------------------------------------------ */

test.describe('Admin Password Recovery', () => {
  test('recovery page renders and accepts email submission', async ({ page }) => {
    await page.goto(`${BASE}/login/admin/recovery`);

    // Page title and form elements are visible
    await expect(page.locator('text=Restablecer acceso')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();

    // "Volver al login" link exists
    const backLink = page.locator('a[href="/login/admin"]');
    await expect(backLink).toBeVisible();

    // Submit with a valid admin email
    await page.fill('input[name="email"]', 'gomezjose7042@gmail.com');
    await page.click('button[type="submit"]');

    // Should show either success or error - not crash
    await page.waitForTimeout(3_000);
    const hasSuccess = await page.locator('text=enlace').isVisible().catch(() => false);
    const hasError = await page.locator('[class*="red"]').isVisible().catch(() => false);
    expect(hasSuccess || hasError).toBe(true);
  });

  test('recovery page shows invalid link error from query param', async ({ page }) => {
    await page.goto(`${BASE}/login/admin/recovery?error=invalid_or_expired_link`);

    await expect(page.locator('text=expiró')).toBeVisible();
  });

  test('admin login page has recovery link', async ({ page }) => {
    await page.goto(`${BASE}/login/admin`);

    const recoveryLink = page.locator('a[href="/login/admin/recovery"]');
    await expect(recoveryLink).toBeVisible();
    await expect(recoveryLink).toHaveText(/Restablecer acceso/i);
  });
});

/* ------------------------------------------------------------------ */
/*  2. Password Reset Completion (reached via email link)             */
/* ------------------------------------------------------------------ */

test.describe('Admin Password Reset Page', () => {
  test('password reset page renders form fields', async ({ page }) => {
    // This page is reached via confirm route, but we can verify UI structure
    await page.goto(`${BASE}/login/admin/password`);

    await expect(page.locator('text=Definir nueva clave')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="passwordConfirm"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('password reset shows validation errors for mismatched passwords', async ({ page }) => {
    await page.goto(`${BASE}/login/admin/password`);

    await page.fill('input[name="password"]', 'NewStrongP4ss!');
    await page.fill('input[name="passwordConfirm"]', 'DifferentPassword!');
    await page.click('button[type="submit"]');

    // Should show some error (either field-level or server-level)
    await page.waitForTimeout(2_000);
    const hasError = await page.locator('[class*="red"]').isVisible().catch(() => false);
    expect(hasError).toBe(true);
  });

  test('password reset has back link to admin login', async ({ page }) => {
    await page.goto(`${BASE}/login/admin/password`);

    const backLink = page.locator('a[href="/login/admin"]');
    await expect(backLink).toBeVisible();
  });
});

/* ------------------------------------------------------------------ */
/*  3. MFA Gate — TOTP + Recovery Code Forms                          */
/* ------------------------------------------------------------------ */

test.describe('Admin MFA Page', () => {
  test('MFA page renders TOTP and recovery code sections', async ({ page }) => {
    await page.goto(`${BASE}/login/admin/mfa`);

    // TOTP section
    await expect(page.locator('text=Verificación 2FA')).toBeVisible();
    const totpInput = page.locator('input[maxlength="6"]').first();
    await expect(totpInput).toBeVisible();

    // Recovery code section
    await expect(page.locator('text=Recuperación')).toBeVisible();
    const recoveryInput = page.locator('input[placeholder="ABCD-EFGH-IJKL"]');
    await expect(recoveryInput).toBeVisible();
  });

  test('TOTP verify button is disabled until 6 digits entered', async ({ page }) => {
    await page.goto(`${BASE}/login/admin/mfa`);

    const totpInput = page.locator('input[maxlength="6"]').first();
    const verifyButton = page.locator('button:has-text("Verificar Código")');

    // Button should be disabled with empty input
    await expect(verifyButton).toBeDisabled();

    // Type 5 digits — still disabled
    await totpInput.fill('12345');
    await expect(verifyButton).toBeDisabled();

    // Type 6 digits — enabled
    await totpInput.fill('123456');
    await expect(verifyButton).toBeEnabled();
  });

  test('recovery code input uppercases text', async ({ page }) => {
    await page.goto(`${BASE}/login/admin/mfa`);

    const recoveryInput = page.locator('input[placeholder="ABCD-EFGH-IJKL"]');
    await recoveryInput.fill('abcd-efgh-jklm');
    await expect(recoveryInput).toHaveValue('ABCD-EFGH-JKLM');
  });

  test('TOTP form shows error for invalid code', async ({ page }) => {
    await page.goto(`${BASE}/login/admin/mfa`);

    const totpInput = page.locator('input[maxlength="6"]').first();
    await totpInput.fill('000000');

    const verifyButton = page.locator('button:has-text("Verificar Código")');
    await verifyButton.click();

    // Should show an error (no valid session or wrong code)
    await page.waitForTimeout(3_000);
    const hasError = await page.locator('[class*="red"]').isVisible().catch(() => false);
    expect(hasError).toBe(true);
  });

  test('recovery code form shows error for invalid code', async ({ page }) => {
    await page.goto(`${BASE}/login/admin/mfa`);

    const recoveryInput = page.locator('input[placeholder="ABCD-EFGH-IJKL"]');
    await recoveryInput.fill('XXXX-YYYY-ZZZZ');

    const redeemButton = page.locator('button:has-text("Usar recovery code")');
    await redeemButton.click();

    await page.waitForTimeout(3_000);
    const hasError = await page.locator('[class*="red"]').isVisible().catch(() => false);
    expect(hasError).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  4. Admin Security Panel (requires authenticated admin + MFA)      */
/* ------------------------------------------------------------------ */

test.describe('Admin Security Panel', () => {
  test('unauthenticated user is redirected from /admin/security', async ({ page }) => {
    await page.goto(`${BASE}/admin/security`);

    // Should redirect to login or MFA
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/login/);
  });

  test('admin dashboard has security section link', async ({ page }) => {
    // Just verify the admin page structure includes the security link
    const response = await page.goto(`${BASE}/admin`);

    // If redirected to login, that's expected for unauthenticated
    if (page.url().includes('/login')) {
      // Try to login first
      await loginAsAdmin(page);
    }

    // After login (may be on MFA page), check what we can reach
    if (page.url().includes('/admin') && !page.url().includes('/login')) {
      const securityLink = page.locator('a[href="/admin/security"]');
      const linkVisible = await securityLink.isVisible().catch(() => false);
      expect(linkVisible).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  5. Security Panel Sections (smoke test with mocked auth)          */
/* ------------------------------------------------------------------ */

test.describe('Admin Security Panel Structure', () => {
  test.skip(true, 'Requires fully authenticated admin with MFA — run manually');

  test('panel renders all 5 security sections', async ({ page }) => {
    // This test requires a fully authenticated admin session with AAL2
    // It will be skipped in CI until proper test fixtures are available

    await page.goto(`${BASE}/admin/security`);

    // Email change section
    await expect(page.locator('text=Cambio endurecido de email')).toBeVisible();

    // Password recovery section
    await expect(page.locator('text=Recuperación controlada')).toBeVisible();

    // TOTP reset section
    await expect(page.locator('text=Restablecer factor')).toBeVisible();

    // Recovery codes section
    await expect(page.locator('text=Respaldo de MFA')).toBeVisible();

    // Session management section
    await expect(page.locator('text=Cierre remoto')).toBeVisible();
  });

  test('email change form requires TOTP code', async ({ page }) => {
    await page.goto(`${BASE}/admin/security`);

    const emailInput = page.locator('input[name="email"][type="email"]').first();
    const totpInput = page.locator('input[name="code"]').first();

    await expect(emailInput).toBeVisible();
    await expect(totpInput).toBeVisible();
  });

  test('recovery codes section shows active count', async ({ page }) => {
    await page.goto(`${BASE}/admin/security`);

    await expect(page.locator('text=Códigos activos:')).toBeVisible();
  });

  test('session management shows both revoke options', async ({ page }) => {
    await page.goto(`${BASE}/admin/security`);

    await expect(page.locator('text=Otras sesiones')).toBeVisible();
    await expect(page.locator('text=Cierre total')).toBeVisible();
    await expect(page.locator('button:has-text("Revocar otras")')).toBeVisible();
    await expect(page.locator('button:has-text("Cerrar todo")')).toBeVisible();
  });
});

/* ------------------------------------------------------------------ */
/*  6. Middleware Whitelisting (public routes accessible)              */
/* ------------------------------------------------------------------ */

test.describe('Middleware Route Access', () => {
  test('/login/admin/recovery is publicly accessible', async ({ page }) => {
    const response = await page.goto(`${BASE}/login/admin/recovery`);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('text=Restablecer acceso')).toBeVisible();
  });

  test('/login/admin/password is publicly accessible', async ({ page }) => {
    const response = await page.goto(`${BASE}/login/admin/password`);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('text=Definir nueva clave')).toBeVisible();
  });

  test('/login/admin/mfa is publicly accessible', async ({ page }) => {
    const response = await page.goto(`${BASE}/login/admin/mfa`);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('text=Verificación 2FA')).toBeVisible();
  });

  test('/api/auth/confirm is publicly accessible (GET)', async ({ page }) => {
    // Without valid params it may redirect, but should not 500
    const response = await page.goto(`${BASE}/api/auth/confirm?token_hash=invalid&type=email`);
    // Should redirect to recovery with error (not crash)
    expect(response?.status()).toBeLessThan(500);
  });
});

/* ------------------------------------------------------------------ */
/*  7. Navigation Flow Integration                                    */
/* ------------------------------------------------------------------ */

test.describe('Admin Security Navigation', () => {
  test('admin login → recovery → back to login roundtrip', async ({ page }) => {
    await page.goto(`${BASE}/login/admin`);
    await expect(page.locator('text=Admin')).toBeVisible();

    // Click recovery link
    await page.click('a[href="/login/admin/recovery"]');
    await page.waitForURL(/\/login\/admin\/recovery/);
    await expect(page.locator('text=Restablecer acceso')).toBeVisible();

    // Click back to login
    await page.click('a[href="/login/admin"]');
    await page.waitForURL(/\/login\/admin$/);
    await expect(page.locator('text=Admin')).toBeVisible();
  });

  test('confirm route redirects to recovery on invalid token', async ({ page }) => {
    await page.goto(`${BASE}/api/auth/confirm?token_hash=bogus&type=recovery&next=/login/admin/password`);

    // Should end up at recovery page with error param
    await page.waitForURL(/\/login\/admin\/recovery/, { timeout: 10_000 });
    await expect(page.locator('text=expiró')).toBeVisible();
  });
});

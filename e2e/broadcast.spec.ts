import { test, expect, Page } from '@playwright/test';

/**
 * E2E test: Admin sends a global broadcast → player sees the GSAP banner.
 *
 * Uses OTP-based phone login for the player and email/password for admin.
 * Requires: Supabase local running, game-server running, web dev server.
 */

const BASE = 'http://localhost:3000';

async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE}/admin/login`);
  await page.fill('input[type="email"], input[name="email"]', 'gomezjose7042@gmail.com');
  await page.fill('input[type="password"], input[name="password"]', 'Bvf79h1010152653');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/, { timeout: 15_000 });
}

async function loginAsPlayer(page: Page) {
  await page.goto(`${BASE}/login`);
  // Phone login: enter phone number
  await page.fill('input[type="tel"], input[name="phone"]', '0000000002');
  // Submit phone to get OTP
  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.click();
  // Wait for OTP input to appear
  await page.waitForTimeout(2_000);
  // Fill OTP code
  const otpInputs = page.locator('input[inputmode="numeric"], input[name*="otp"], input[name*="code"], input[type="tel"]');
  const count = await otpInputs.count();
  if (count >= 6) {
    // Individual digit inputs
    const digits = '123456'.split('');
    for (let i = 0; i < 6; i++) {
      await otpInputs.nth(i).fill(digits[i]);
    }
  } else {
    // Single input for the full code
    await otpInputs.first().fill('123456');
  }
  // Submit OTP
  const verifyBtn = page.locator('button:has-text("Verificar"), button:has-text("Confirmar"), button[type="submit"]');
  await verifyBtn.first().click();
  await page.waitForURL(/\/(lobby|profile|play)/, { timeout: 15_000 });
}

test.describe('Broadcast System E2E', () => {
  test('Admin sends broadcast → player sees banner', async ({ browser }) => {
    // Create two independent browser contexts
    const adminContext = await browser.newContext();
    const playerContext = await browser.newContext();

    const adminPage = await adminContext.newPage();
    const playerPage = await playerContext.newPage();

    try {
      // 1. Login both users
      await loginAsAdmin(adminPage);
      await loginAsPlayer(playerPage);

      // 2. Player navigates to lobby (where banner appears)
      await playerPage.goto(`${BASE}/lobby`);
      await playerPage.waitForTimeout(2_000);

      // 3. Admin navigates to broadcast page
      await adminPage.goto(`${BASE}/admin/broadcast`);
      await adminPage.waitForSelector('form', { timeout: 10_000 });

      // 4. Admin fills out broadcast form
      const testTitle = `E2E Test ${Date.now()}`;
      const testBody = 'Este es un mensaje de prueba E2E del sistema broadcast.';

      await adminPage.fill('input[required]', testTitle);
      await adminPage.fill('textarea[required]', testBody);

      // 5. Admin accepts the confirm dialog and sends
      adminPage.on('dialog', dialog => dialog.accept());
      await adminPage.click('button[type="submit"]');

      // 6. Wait for success overlay on admin side
      await expect(adminPage.locator('text=Broadcast Exitoso')).toBeVisible({ timeout: 15_000 });

      // 7. Player should see the broadcast banner (via Supabase Realtime or Socket.IO)
      // The banner fetches recent unread broadcasts on mount, plus listens for socket events.
      // Give it time to arrive via Realtime subscription.
      await playerPage.waitForTimeout(5_000);

      // Check for the banner — it should contain the title
      const banner = playerPage.locator('[role="alert"]');
      await expect(banner).toBeVisible({ timeout: 15_000 });
      await expect(banner).toContainText(testTitle);

      // 8. Player dismisses the banner
      const dismissBtn = banner.locator('button[aria-label="Cerrar anuncio"]');
      await dismissBtn.click();
      await expect(banner).toBeHidden({ timeout: 5_000 });

      // 9. Verify broadcast appears in admin history
      await adminPage.goto(`${BASE}/admin/broadcast/history`);
      await expect(adminPage.locator(`text=${testTitle}`)).toBeVisible({ timeout: 10_000 });
    } finally {
      await adminContext.close();
      await playerContext.close();
    }
  });

  test('Broadcast banner persists on page refresh', async ({ browser }) => {
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    try {
      await loginAsAdmin(adminPage);
      await loginAsPlayer(playerPage);

      // Admin sends broadcast
      await adminPage.goto(`${BASE}/admin/broadcast`);
      await adminPage.waitForSelector('form', { timeout: 10_000 });

      const testTitle = `Persist Test ${Date.now()}`;
      await adminPage.fill('input[required]', testTitle);
      await adminPage.fill('textarea[required]', 'Persistence check.');

      adminPage.on('dialog', dialog => dialog.accept());
      await adminPage.click('button[type="submit"]');
      await expect(adminPage.locator('text=Broadcast Exitoso')).toBeVisible({ timeout: 15_000 });

      // Player navigates to lobby
      await playerPage.goto(`${BASE}/lobby`);
      await playerPage.waitForTimeout(5_000);

      // Banner should be visible
      const banner = playerPage.locator('[role="alert"]');
      await expect(banner).toBeVisible({ timeout: 15_000 });

      // Refresh the page
      await playerPage.reload();
      await playerPage.waitForTimeout(3_000);

      // Banner should still be visible (fetched from DB on mount)
      await expect(playerPage.locator('[role="alert"]')).toBeVisible({ timeout: 10_000 });
    } finally {
      await adminContext.close();
      await playerContext.close();
    }
  });
});

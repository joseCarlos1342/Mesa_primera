import { test, expect } from '@playwright/test';
import { requireE2EAdminCredentials } from './credentials';

test.describe('Admin Observer Security', () => {
  test.beforeAll(() => {
    requireE2EAdminCredentials();
  });

  test('Admin observer websocket data strictly hides private cards', async ({ page }) => {
    const { email, password } = requireE2EAdminCredentials();
    const receivedFrames: string[] = [];
    page.on('websocket', ws => {
      ws.on('framereceived', frame => {
        receivedFrames.push(frame.payload.toString());
      });
    });

    await page.goto('/login/admin');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin(?:\/|$)/, { timeout: 15_000 });

    // Navigate to admin game monitor panel
    await page.goto('/admin/tables/e2e-test-room-1234');

    await expect(page.getByText('Monitor de Mesa')).toBeVisible();
    await expect(page.locator('.private-card-reveal-admin')).toBeHidden();

    await page.waitForTimeout(500);
    expect(receivedFrames.some((payload) => /private.?cards|privateState/i.test(payload))).toBe(false);
  });
});

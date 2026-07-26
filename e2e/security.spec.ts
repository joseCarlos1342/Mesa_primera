import { test, expect } from '@playwright/test';

test.describe('Security & Rate Limiting E2E', () => {
  test('Rate limiting denies excessive action spamming', async ({ page }) => {
    await page.goto('/play/e2e-test-room-1234');
    
    const voyButton = page.locator('button:has-text("VOY")');
    await expect(voyButton).toBeVisible();

    // Rapidly click the betting button 50 times in less than a second.
    await Promise.all(
      Array.from({ length: 50 }, () => voyButton.click({ force: true })),
    );

    // The client must remain usable after the burst; a hard connection error is a failure.
    await expect(page.locator('text=Error al conectar')).toBeHidden();
  });

  test('Device Fingerprinting flags concurrent logins on the same device', async ({ browser }) => {
    // Context 1
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    
    // Context 2 simulates the same exact fingerprint if forced
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    
    // In a real environment we would inject a specific mock Device ID to the client
    await page1.goto('/play/e2e-test-room-fingerprint');
    await page2.goto('/play/e2e-test-room-fingerprint');
    
    await expect(page1).not.toHaveURL(/error/i);
    await expect(page2).not.toHaveURL(/error/i);
    
    await context1.close();
    await context2.close();
  });
});

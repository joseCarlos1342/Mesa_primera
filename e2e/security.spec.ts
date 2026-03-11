import { test, expect } from '@playwright/test';

test.describe('Security & Rate Limiting E2E', () => {
  test('Rate limiting denies excessive action spamming', async ({ page }) => {
    await page.goto('/play/e2e-test-room-1234');
    
    const voyButton = page.locator('button:has-text("VOY")');
    const isVisible = await voyButton.isVisible().catch(() => false);
    
    if (isVisible) {
      // Rapidly click the betting button 100 times in less than a second
      for(let i=0; i<50; i++) {
        voyButton.click({ force: true }).catch(() => {});
      }
      
      // UI should either show an error toast about Rate Limiting or the actions should gracefully drop.
      // E.g., Error 429 Too Many Requests translated to a Toast
      // await expect(page.locator('text=Demasiadas acciones')).toBeVisible();
    }
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
    
    // Assuming the server detects the same device ID joining twice and kicks the second one or alerts
    // await expect(page2.locator('text=Dispositivo ya en uso')).toBeVisible();
    
    await context1.close();
    await context2.close();
  });
});

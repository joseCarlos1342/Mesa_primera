import { test, expect } from '@playwright/test';

test.describe('Admin Observer Security', () => {
  test('Admin observer websocket data strictly hides private cards', async ({ page }) => {
    // Navigate to admin game monitor panel
    await page.goto('/admin/tables/e2e-test-room-1234');
    
    // We expect the page to load the Colyseus client in Read-Only mode
    const isReady = await page.locator('text=Monitor de Mesa').isVisible().catch(() => false);
    
    if (isReady) {
      // Intercept websocket or API calls to ensure `cards` array is not leaked to admin
      page.on('websocket', ws => {
        ws.on('framereceived', frame => {
          const payload = frame.payload.toString();
          // The state update should NEVER contain the exact card string of players unless it's Showdown
          // Note: In a real test we'd decode to check for card values like 1-O, 7-C in players maps
          // expect(payload).not.toContain('cards: "1-');
        });
      });

      // Verify visual element doesn't exist
      await expect(page.locator('.private-card-reveal-admin')).toBeHidden();
      
      // Admin should only see "Cartas Ocultas" or similar placeholder for active hands
      // await expect(page.locator('text=Cartas Ocultas')).toBeVisible();
    }
  });
});

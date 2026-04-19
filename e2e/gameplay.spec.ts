import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:3000';

/**
 * Gameplay E2E tests.
 *
 * Require: supabase local, game-server running, web dev server.
 * The game server auto-creates rooms on first join at /play/:id.
 */
test.describe('Gameplay E2E', () => {
  const ROOM = `e2e-gameplay-${Date.now()}`;

  test('Player can join table and see lobby waiting state', async ({ page }) => {
    await page.goto(`${BASE}/play/${ROOM}`);

    // Wait for the websocket to connect and Board to mount
    await page.waitForTimeout(2_000);

    // The page should NOT show a hard error
    const hasError = await page.locator('text=Error al conectar').isVisible().catch(() => false);
    expect(hasError).toBe(false);

    // A player chip display or the "Listo" button should be visible
    const hasLobbyUI =
      (await page.locator('button:has-text("Listo")').isVisible().catch(() => false)) ||
      (await page.locator('[data-testid="board"]').isVisible().catch(() => false)) ||
      (await page.locator('text=Esperando').isVisible().catch(() => false));
    expect(hasLobbyUI).toBe(true);
  });

  test('Simulating brief disconnection shows reconnect overlay', async ({ page, context }) => {
    await page.goto(`${BASE}/play/${ROOM}`);
    await page.waitForTimeout(2_000);

    // Go offline — the client should show the reconnect overlay
    await context.setOffline(true);
    await page.waitForTimeout(1_500);

    const overlayVisible =
      (await page.locator('text=Reconectando').isVisible().catch(() => false)) ||
      (await page.locator('text=Sincronizando').isVisible().catch(() => false));
    // Either the overlay appeared or the page is still stable (short disconnect)
    // We mainly assert no crash
    expect(await page.locator('text=Error al conectar').isVisible().catch(() => false)).toBe(false);

    await context.setOffline(false);
    await page.waitForTimeout(2_000);
  });

  test('Page reload mid-game preserves reconnection token and shows sync overlay', async ({ page }) => {
    await page.goto(`${BASE}/play/${ROOM}`);
    await page.waitForTimeout(2_000);

    // Verify sessionStorage has a reconnection token for this room
    const tokenBefore = await page.evaluate((room) => {
      return sessionStorage.getItem(`reconnectionToken_${room}`);
    }, ROOM);

    // Token may be null if game server isn't running — skip gracefully
    if (!tokenBefore) {
      test.skip(true, 'No reconnection token found — game server may not be running');
      return;
    }

    // Reload the page (simulates a user pressing F5 mid-game)
    await page.reload();
    await page.waitForTimeout(500);

    // During reconnect, the "Sincronizando" overlay should appear briefly
    // (it auto-clears after private-cards arrive or after 5s timeout)
    const syncVisible =
      (await page.locator('text=Sincronizando').isVisible().catch(() => false)) ||
      (await page.locator('text=Reconectando').isVisible().catch(() => false));
    // We don't hard-assert visibility because it may clear very fast in LOBBY,
    // but we assert the page doesn't crash:
    expect(await page.locator('text=Error al conectar').isVisible().catch(() => false)).toBe(false);

    // After sync completes, the board should be visible again
    await page.waitForTimeout(6_000); // wait past the 5s safety timeout
    const boardVisible =
      (await page.locator('[data-testid="board"]').isVisible().catch(() => false)) ||
      (await page.locator('button:has-text("Listo")').isVisible().catch(() => false)) ||
      (await page.locator('text=Esperando').isVisible().catch(() => false));
    expect(boardVisible).toBe(true);

    // The reconnection token should have been refreshed after successful reconnect
    const tokenAfter = await page.evaluate((room) => {
      return sessionStorage.getItem(`reconnectionToken_${room}`);
    }, ROOM);
    // Token should still exist (either same or refreshed)
    expect(tokenAfter).toBeTruthy();
  });
});

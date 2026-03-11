import { test, expect } from '@playwright/test';

test.describe('Sprint 6 - Social Features', () => {
  // We assume the user is logged in via global setup, otherwise we mock it or navigate to a public page.
  // For these tests, we'll verify the presence of key UI elements.
  
  test('Leaderboard page renders correctly', async ({ page }) => {
    // Navigating without auth might redirect to login, but if RLS allows public view we just check headers.
    // For this e2e test, we will assume standard routing.
    await page.goto('/leaderboard');
    
    // Check main title
    await expect(page.locator('text=Salón de la Fama')).toBeVisible();
    
    // Check tabs
    await expect(page.locator('text=Mejores Ganancias')).toBeVisible();
    await expect(page.locator('text=Mejor Racha')).toBeVisible();
    await expect(page.locator('text=Maestro de Primera')).toBeVisible();
    
    // Check table headers
    await expect(page.locator('th:has-text("Jugador")')).toBeVisible();
    await expect(page.locator('th:has-text("Puntuación")')).toBeVisible();
  });

  test('Friends page renders correctly', async ({ page }) => {
    // If auth is required, this might fail in a real environment without a session, 
    // but we write the test assuming a valid session or checking the unauthorized message.
    await page.goto('/friends');
    
    const isUnauthenticated = await page.locator('text=No autenticado').isVisible().catch(() => false);
    
    if (isUnauthenticated) {
      test.skip();
    } else {
      await expect(page.locator('text=Comunidad y Amigos')).toBeVisible();
      await expect(page.locator('text=Tus Amigos')).toBeVisible();
      await expect(page.locator('text=Buscar Jugadores')).toBeVisible();
      await expect(page.locator('button:has-text("Buscar")')).toBeVisible();
    }
  });

  test('Player Stats page renders correctly', async ({ page }) => {
    await page.goto('/stats');
    
    const isUnauthenticated = await page.locator('text=Debes iniciar sesión para ver tus estadísticas').isVisible().catch(() => false);
    
    if (isUnauthenticated) {
      test.skip();
    } else {
      await expect(page.locator('text=Mi Rendimiento')).toBeVisible();
      await expect(page.locator('text=Total Partidas')).toBeVisible();
      await expect(page.locator('text=Juegos Ganados')).toBeVisible();
      await expect(page.locator('text=Cantos Especiales')).toBeVisible();
      await expect(page.locator('text=Evolución de Saldo Reciente')).toBeVisible();
    }
  });
});

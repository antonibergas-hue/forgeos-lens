import { test, expect } from '@playwright/test';

test.describe('smoke', () => {
  test('boots — page loads, top bar shows forgeos, health dot is ok', async ({ page }) => {
    await page.goto('/');

    // Top bar contains "forgeos"
    await expect(page.locator('header').filter({ hasText: 'forgeos' })).toBeVisible();

    // Health dot is green (ok state)
    await expect(page.locator('[aria-label="ok"]')).toBeVisible();
  });

  test('tabs render — click each tab and assert landmark is visible', async ({ page }) => {
    await page.goto('/');

    const tabs = ['Fleet', 'Governance', 'Logs', 'Topology', 'MCP', 'Manifest'];

    for (const label of tabs) {
      // Click the tab
      await page.click(`[role="tab"] >> text="${label}"`);

      // Assert the tab is selected and contains the label
      await expect(page.locator(`[role="tab"][aria-selected="true"]`)).toContainText(label);
    }
  });

  test('fleet row → sheet — click first agent row, assert detail sheet opens', async ({ page }) => {
    await page.goto('/');

    // Ensure we're on the Fleet tab (default)
    await page.click(`[role="tab"] >> text="Fleet"`);

    // Wait for agents to load from fixtures (list --json returns 3 agents)
    await page.waitForSelector('tbody tr', { state: 'visible', timeout: 10_000 });

    // Click the first agent row
    await page.click('tbody tr:first-child');

    // Assert the detail sheet (dialog) opens
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // The sheet should show the agent name ("builder" is the first fixture agent)
    await expect(dialog.locator('h2')).toContainText('builder');
  });

  test('context switch — open context dropdown, pick second context, fleet re-renders', async ({ page }) => {
    await page.goto('/');

    // Ensure we're on the Fleet tab
    await page.click(`[role="tab"] >> text="Fleet"`);

    // Wait for agents to load
    await page.waitForSelector('tbody tr', { state: 'visible', timeout: 10_000 });

    // Get initial agent count
    const initialRows = page.locator('tbody tr');
    await expect(initialRows).toHaveCount(3, { timeout: 10_000 });

    // Open the context dropdown (select with aria-label "ForgeOS context")
    const contextSelect = page.locator('select[aria-label="ForgeOS context"]');
    await expect(contextSelect).toBeVisible({ timeout: 10_000 });

    // Pick the second context ("local")
    await contextSelect.selectOption({ label: 'local' });

    // After context switch, the fleet table should still render (fixtures return same data)
    // The key assertion is that the app doesn't crash during the switch
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(3, { timeout: 10_000 });
  });

  test('logs unmount safety — navigate Logs → Manifest → Logs, assert zero errors', async ({ page }) => {
    await page.goto('/');

    // Collect errors from the page console
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Open Logs tab — this mounts the log stream component
    await page.click(`[role="tab"] >> text="Logs"`);
    await expect(page.locator(`[role="tab"][aria-selected="true"]`)).toContainText('Logs');

    // Navigate to Manifest tab — this should unmount the Logs tab and kill the stream
    await page.click(`[role="tab"] >> text="Manifest"`);
    await expect(page.locator(`[role="tab"][aria-selected="true"]`)).toContainText('Manifest');

    // Navigate back to Logs — this re-mounts; should not crash
    await page.click(`[role="tab"] >> text="Logs"`);
    await expect(page.locator(`[role="tab"][aria-selected="true"]`)).toContainText('Logs');

    // Brief wait for any async errors to surface
    await page.waitForTimeout(500);

    // Assert zero errors collected
    expect(errors).toEqual([]);
  });

  test('command palette — open via shortcut, search agents, close via ESC', async ({ page }) => {
    await page.goto('/');

    // Open command palette with shortcut (manually dispatching event to be safe)
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'k', bubbles: true }));
    });

    // Check that the palette input is visible
    // The command palette input has a unique placeholder "Search agents, tabs, contexts..."
    const input = page.locator('input[placeholder="Search agents, tabs, contexts..."]');
    await expect(input).toBeVisible({ timeout: 10_000 });

    // Type a search query for agent name "tester"
    await input.fill('tester');

    // The palette should show matching results
    // We search for a button containing "tester" inside the dialog
    const result = page.locator('[role="dialog"] button').filter({ hasText: 'tester' });
    await expect(result).toBeVisible({ timeout: 10_000 });

    // Close with Escape
    await page.keyboard.press('Escape');

    // Palette should be closed
    await expect(input).not.toBeVisible({ timeout: 10_000 });
  });
});

import { test, expect, Page } from "@playwright/test";

// Smoke harness — drives the Vite dev URL with the fixture branch active
// (no Tauri runtime → forgeos.ts routes to forgeos.fixtures.ts). Each
// assertion targets a specific bug class that slipped past the static
// pipeline in feat/lens-mc-shell; the comments name the bug it catches.

const TABS = ["Fleet", "Governance", "Logs", "Topology", "MCP", "Manifest"] as const;

async function captureErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
  });
  return errors;
}

test("body is themed dark (catches: missing CSS import / Tailwind v3-on-v4)", async ({
  page,
}) => {
  await page.goto("/");
  // bg-bg = #0d1117 = rgb(13, 17, 23). Defaults to rgba(0,0,0,0) on an
  // unstyled body; either way the assertion fails if Tailwind never shipped.
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(13, 17, 23)");
});

test("no pageerror across all tabs (catches: missing deps, plugin not wired)", async ({
  page,
}) => {
  const errors = await captureErrors(page);
  await page.goto("/");
  await expect(page.getByRole("tablist", { name: "Lens tabs" })).toBeVisible();
  for (const name of TABS) {
    await page.getByRole("tab", { name }).click();
    // Give the tab a moment to mount and fire its initial query.
    await page.waitForTimeout(400);
  }
  expect(errors, errors.join("\n")).toEqual([]);
});

test("ContextSwitcher renders a <select>, not the 'no context' fallback (catches: bad --json flag)", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("ForgeOS context")).toBeVisible();
  await expect(page.getByLabel("ForgeOS context")).toHaveJSProperty("tagName", "SELECT");
  // The fixture context table marks "cloud-run" current.
  await expect(page.getByLabel("ForgeOS context")).toHaveValue("cloud-run");
});

test("Fleet has rows and they don't oscillate (catches: useForgeos refetch loop)", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Fleet" }).click();

  // First, the count badge resolves to a positive number — fixture set has 7.
  const count = page.getByText(/^\d+\s+agents$/);
  await expect(count).toBeVisible();
  await expect(count).toHaveText(/^7 agents$/);

  // Then sit for 1.5s and confirm the row count never dipped to 0 in between.
  // Sample every 100ms — if the hook had its old infinite refetch + setData(null)
  // loop, at least one sample lands on the blanked-table window.
  const samples = await page.evaluate(async () => {
    const out: number[] = [];
    for (let i = 0; i < 15; i++) {
      out.push(document.querySelectorAll("tbody tr").length);
      await new Promise((r) => setTimeout(r, 100));
    }
    return out;
  });
  expect(samples.every((n) => n >= 7), `row counts oscillated: ${samples.join(",")}`).toBe(true);
});

test("each tab navigates and renders without error (writes screenshots)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("tablist", { name: "Lens tabs" })).toBeVisible();
  for (const name of TABS) {
    await page.getByRole("tab", { name }).click();
    await page.waitForTimeout(500);
    await expect(page.getByRole("tab", { name, selected: true })).toBeVisible();
    await page.screenshot({
      path: `test-results/${name.toLowerCase()}.png`,
      fullPage: false,
    });
  }
});

test("logs dropdown lists fixture agents (catches: empty-dropdown side of #6)", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Logs" }).click();
  const select = page.getByLabel("Agent");
  await expect(select).toBeVisible();
  // Seven fixture agents + the "Select an agent…" placeholder. Use the
  // auto-retrying matcher so the fixture's ~30ms latency doesn't race us.
  await expect(select.locator("option")).toHaveCount(8);
});

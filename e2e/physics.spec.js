import { expect, test } from "@playwright/test";

test("dice remain separated and inside the bowl across repeated rolls", async ({ page }) => {
  test.setTimeout(60_000);
  const browserErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:5173/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  for (let roll = 0; roll < 6; roll += 1) {
    await page.getByRole("button", { name: /开始博饼|再博一次/ }).click();
    await expect(page.getByRole("button", { name: "再博一次" })).toBeEnabled({ timeout: 8_000 });

    const diagnostics = await page.evaluate(() => window.__BOBING_DEBUG__.scene.getDiagnostics());
    expect(diagnostics.minimumDistance).toBeGreaterThanOrEqual(0.97);
    expect(diagnostics.maximumRadius).toBeLessThanOrEqual(1.49);
    await expect(page.locator(".history-count")).toHaveText(`${roll + 1} 博`);
  }

  await page.locator(".history-toggle").click();
  await expect(page.locator(".history-item")).toHaveCount(6);
  await page.reload();
  await expect(page.locator(".history-count")).toHaveText("6 博");
  await expect(page.locator(".history-item")).toHaveCount(6);

  await page.getByRole("button", { name: "清空" }).click();
  await page.getByRole("button", { name: "再次点击确认" }).click();
  await expect(page.locator(".history-count")).toHaveText("0 博");
  await expect(page.locator(".history-item")).toHaveCount(0);

  expect(browserErrors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

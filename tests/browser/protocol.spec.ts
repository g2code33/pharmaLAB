import { test, expect } from "@playwright/test";
test("provisional protocol records, exports, and restores offline without changing elapsed time", async ({
  page,
  context,
}) => {
  await page.goto("/#Laboratory");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((r) =>
        navigator.serviceWorker.addEventListener("controllerchange", r, {
          once: true,
        }),
      );
  });
  await page.getByLabel("Workspace mode").selectOption("Protocol simulation");
  await page.getByRole("button", { name: "New experiment" }).click();
  await page.getByLabel("Experiment name").fill("Protocol offline");
  await page.getByRole("button", { name: "Start experiment" }).click();
  await expect(page.getByLabel("Source profile")).toHaveValue("mplm");
  await page.getByLabel("Exposure protocol").selectOption("manual");
  await page.getByRole("button", { name: "Add ACh now" }).click();
  await expect(page.getByLabel("Source profile")).toBeDisabled();
  await page.getByRole("button", { name: "Start protocol" }).click();
  await expect(page.locator(".resting")).toContainText("10 s");
  await page.getByRole("button", { name: "Pause protocol" }).click();
  await page.getByRole("button", { name: "Wash now", exact: true }).click();
  const display = await page.locator(".resting").textContent();
  await page.getByRole("button", { name: "Save experiment" }).click();
  await expect(page.getByRole("status")).toContainText("saved locally");
  const file = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export trace CSV" }).click();
  expect((await file).suggestedFilename()).toMatch(/ach-trace.csv$/);
  await context.setOffline(true);
  await page.reload();
  await page
    .locator("aside")
    .getByRole("button", { name: "Experiments", exact: true })
    .click();
  await page.getByRole("button", { name: "Protocol offline" }).click();
  await expect(page.locator(".resting")).toHaveText(display!);
  await expect(
    page.getByRole("button", { name: "Resume protocol" }),
  ).toBeEnabled();
  await page
    .locator("aside")
    .getByRole("button", { name: "Analysis", exact: true })
    .click();
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await expect(
    page.getByRole("img", {
      name: "Simulated active response (%)",
      exact: true,
    }),
  ).toBeVisible();
});

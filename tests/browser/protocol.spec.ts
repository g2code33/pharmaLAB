import { resource } from "./navigation";
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

  await page.getByRole("button", { name: "New experiment" }).click();
  await page.getByLabel("Experiment name").fill("Protocol offline");
  await page.getByRole("button", { name: "Start experiment" }).click();
  await page.getByText("Experimental conditions", { exact: true }).click();
  await expect(page.getByLabel("Source profile")).toHaveValue("mplm");
  await page.getByLabel("Exposure protocol").selectOption("manual");
  await page.getByRole("button", { name: "Add to organ bath" }).click();
  await expect(page.getByLabel("Source profile")).toBeDisabled();
  await page.getByRole("button", { name: "Record", exact: true }).click();
  await expect(page.locator(".readingStrip")).not.toContainText("00:00");
  await page.getByRole("button", { name: "Pause" }).click();
  await page.getByRole("button", { name: "Wash", exact: true }).click();
  const display = await page.locator(".readingStrip").textContent();
  await page.getByRole("button", { name: "Save experiment" }).click();
  await expect(page.getByRole("status")).toContainText("saved locally");
  await page.getByText("Notebook, analysis & exports", { exact: true }).click();
  const file = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export trace CSV" }).click();
  expect((await file).suggestedFilename()).toMatch(/ach-trace.csv$/);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Notebooks", exact: true }).click();
  await page.getByRole("button", { name: "Protocol offline" }).click();
  await expect(page.locator(".readingStrip")).toHaveText(display!);
  await expect(page.getByRole("button", { name: "Resume" })).toBeEnabled();
  await resource(page, "Analysis");
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await expect(
    page.getByRole("img", {
      name: "Simulated active response (%)",
      exact: true,
    }),
  ).toBeVisible();
});

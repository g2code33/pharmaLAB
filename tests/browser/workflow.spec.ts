import { resource } from "./navigation";
import { test, expect } from "@playwright/test";
test("workspace, local record and offline restart", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Organ bath laboratory" }),
  ).toBeVisible();
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
  await page.getByLabel("Experiment type").selectOption("Simulation");
  await page.getByLabel("Experiment name").fill("Practical notebook");
  await page.getByRole("button", { name: "Start experiment" }).click();
  await page.getByLabel("Stock concentration", { exact: true }).fill("100");
  await page.getByLabel("Addition volume (mL)").fill("1");
  await page.getByRole("button", { name: "Add ACh" }).click();
  await page.getByRole("button", { name: "Save experiment" }).click();
  await expect(page.getByRole("status")).toContainText("saved locally");
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Notebooks", exact: true }).click();
  await page.getByRole("button", { name: "Practical notebook" }).click();
  await expect(page.getByText(/Add drug: Acetylcholine/)).toBeVisible();
  for (const p of [
    "Drug Library",
    "Analysis",
    "Reports",
    "Settings",
    "About PharmaLab",
    "Dashboard",
  ])
    await resource(page, p);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.getByLabel("Toggle navigation").click();
  await page
    .getByRole("navigation", { name: "Workspace resources" })
    .getByText("Tissue Library")
    .click();
  await expect(
    page.getByRole("heading", { name: "Preparation catalogue" }),
  ).toBeVisible();
});

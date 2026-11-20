import { test, expect } from "@playwright/test";
test("evidence comparison is not a simulated recording; target dose uses current bath", async ({
  page,
}) => {
  await page.goto("/#Laboratory");
  await page.getByText("Notebook, analysis & exports", { exact: true }).click();
  await page.getByText("Source evidence", { exact: true }).click();
  await page
    .getByLabel("Compare preparations")
    .selectOption("Longitudinal strip");
  await page.getByText(/Longitudinal strip · isotonic · EC50/).click();
  await expect(page.locator(".achEvidence")).toContainText(
    "Calculated pEC50: 7.40",
  );
  await expect(page.locator(".achEvidence")).toContainText("95% CI");
  await expect(
    page.getByRole("heading", { name: "Live recording" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "New experiment" }).click();
  await page.getByLabel("Experiment type").selectOption("Simulation");
  await page.getByLabel("Experiment name").fill("Target ACh");
  await page.getByRole("button", { name: "Start experiment" }).click();
  await page.getByLabel("Stock concentration", { exact: true }).fill("31");
  await page.getByLabel("Dose by").selectOption("target");
  await page.getByLabel("Target final concentration (µM)").fill("1");
  await page.getByRole("button", { name: "Add ACh" }).click();
  await expect(page.getByText(/Nominal bath:/)).toContainText(
    "1.000 µM · 31.000 mL",
  );
  await expect(
    page.getByRole("combobox", { name: "Preparation", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Add ACh" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("Awaiting validated signal")).toBeVisible();
  await page.getByRole("button", { name: "Wash preparation" }).click();
  await expect(page.getByText(/Nominal bath:/)).toContainText(
    "0.000 µM · 30.000 mL",
  );
});

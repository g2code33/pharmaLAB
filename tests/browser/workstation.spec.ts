import { test, expect } from "@playwright/test";
test("instrument controls, safe reset and display preferences", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (e) => {
    if (e.type() === "error") errors.push(e.text());
  });
  await page.goto("/");
  const nav = (n: string) =>
    page.locator("aside").getByRole("button", { name: n, exact: true }).click();
  await page.getByRole("button", { name: /Drug reference/ }).click();
  await page.getByLabel("Find a compound").fill("hist");
  await expect(page.locator(".listitem")).toHaveCount(1);
  await page.locator(".listitem").click();
  await expect(page.getByRole("heading", { name: "Histamine" })).toBeVisible();
  await nav("Laboratory");
  await page.getByRole("button", { name: "New experiment" }).click();
  await page.getByLabel("Experiment type").selectOption("Simulation");
  await page.getByLabel("Experiment name").fill("Instrument check");
  await page.getByRole("button", { name: "Start experiment" }).click();
  await page.getByLabel("Stock concentration", { exact: true }).fill("100");
  await page.getByLabel("Addition volume (mL)").fill("1");
  await page.getByRole("button", { name: "Add ACh" }).click();
  await page.getByRole("button", { name: "Wash preparation" }).click();
  await page.getByText("Administration history", { exact: true }).click();
  await expect(
    page.locator("details").filter({ hasText: "Administration history" }),
  ).toContainText("Full wash");
  for (const n of ["Start", "Pause", "Resume", "Stop"])
    await page.getByRole("button", { name: n, exact: true }).click();
  await page.getByLabel("Time scale").selectOption("120 s");
  await expect(page.locator(".timeTicks")).toContainText("120 s");
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Reset view" }).click();
  await page.getByRole("button", { name: "Add annotation" }).click();
  await page
    .getByRole("textbox", { name: "Annotation", exact: true })
    .fill("Checked setup");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add annotation" })
    .click();
  await page.getByRole("button", { name: "Reset experiment" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByText(/Annotation: Checked setup/)).toBeVisible();
  await page.getByRole("button", { name: "Reset experiment" }).click();
  await page.getByRole("button", { name: "Confirm reset" }).click();
  await expect(page.getByText(/Annotation: Checked setup/)).toHaveCount(0);
  await nav("Settings");
  await page.getByLabel("Reduced motion").selectOption("On");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await page.getByLabel("Reduced motion").selectOption("Off");
  await page.getByLabel("Graphics quality").selectOption("Low");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await page.getByLabel("Theme").selectOption("Dark");
  await nav("Laboratory");
  for (const width of [1440, 1024, 768, 360]) {
    await page.setViewportSize({ width, height: 820 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
  }
  expect(errors).toEqual([]);
});

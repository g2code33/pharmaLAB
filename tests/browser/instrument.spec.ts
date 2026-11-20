import { test, expect } from "@playwright/test";
import { resource } from "./navigation";
test("one-screen controls use the same bath as the calculator, recorder and reservoir", async ({
  page,
}) => {
  await page.goto("/");
  const btn = (name: string) => page.getByRole("button", { name, exact: true });
  const group = (s: string) =>
    page.locator(".ctrlGroup summary").getByText(s, { exact: true });
  await expect(page.getByLabel("Tissue type")).toHaveValue("Guinea pig ileum");
  await group("Stimulus").click();
  await expect(btn("ON")).toBeDisabled();
  await expect(page.getByLabel("Nerve stimulation")).toBeDisabled();
  await btn("Antagonist").click();
  await expect(page.getByText(/No antagonist module/)).toBeVisible();
  await btn("Unknown").click();
  await expect(page.getByText(/No unknown module/)).toBeVisible();
  await btn("Agonist").click();
  await expect(page.getByLabel("Active drug")).toHaveValue("Acetylcholine");
  await group("Experimental conditions").click();
  await page.getByLabel("Bath volume (mL)", { exact: true }).fill("9");
  await page.getByLabel("Bath volume (mL)", { exact: true }).press("Tab");
  await page.getByLabel("Passive load (g)", { exact: true }).fill("0.8");
  await page.getByLabel("Passive load (g)", { exact: true }).press("Tab");
  await group("Physiological solution").click();
  await page.getByLabel("Salt solution").selectOption("intact");
  await expect(page.locator(".controlRack")).toContainText("Tyrode (mM)");
  await btn("Dilution Formula").click();
  await page.getByLabel("Administration volume (mL)").fill("-1");
  await expect(btn("Add to organ bath")).toBeDisabled();
  await page.getByLabel("Administration volume (mL)").fill("1");
  await page.getByLabel("Stock concentration", { exact: true }).fill("0.1");
  await expect(page.locator(".stationCard")).toContainText("10 µM in 10 mL");
  await btn("Add to organ bath").click();
  await expect(page.locator(".stationCard")).toContainText(
    "Current bath: 10 µM × 10 mL",
  );
  await group("Reservoir").click();
  await btn("Prepare reservoir").click();
  await btn("Flush reservoir to bath").click();
  await btn("Clear drugs from reservoir").click();
  await expect(page.locator(".stationCard")).toContainText(
    "Current bath: 1 µM × 9 mL",
  );
  await btn("Flush reservoir to bath").click();
  await expect(page.locator(".stationCard")).toContainText(
    "Current bath: 0 µM × 9 mL",
  );
  await btn("Experimental Setup").click();
  await expect(page.getByLabel("Source profile")).toBeDisabled();
  await btn("Expand apparatus").click();
  await expect(page.locator(".setupBath")).toHaveClass(/expanded/);
  await btn("Chart").click();
  await btn("Add to organ bath").click();
  await btn("Record").click();
  await expect(page.locator(".graticule polyline")).toBeVisible();
  await btn("Pause").click();
  await btn("Zoom in").click();
  await expect(page.locator(".xTicks")).toContainText("30");
  await btn("Reset chart view").click();
  await expect(page.locator(".xTicks")).toContainText("60");
  await btn("Annotate").click();
  await page
    .getByRole("textbox", { name: "Annotation", exact: true })
    .fill("Check dose");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add annotation" })
    .click();
  await expect(
    page.locator(".scopeMark").filter({ hasText: "Check dose" }),
  ).toBeVisible();
  await btn("Stop").click();
  await expect(btn("Resume")).toBeDisabled();
  await resource(page, "Drug Library");
  await btn("Laboratory").click();
  await expect(page.locator(".statePill")).toHaveText("Stopped");
  await expect(page.getByLabel("Administration volume (mL)")).toHaveValue("1");
});
test("mobile drawer, chart, colour mode and navigable setup", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await expect(page.locator(".controlRack")).not.toBeVisible();
  await page.getByRole("button", { name: "Show experiment controls" }).click();
  await expect(page.getByLabel("Tissue type")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add to organ bath" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hide experiment controls" }).click();
  await page
    .getByRole("button", { name: "Experimental Setup", exact: true })
    .click();
  await page.getByLabel("Source profile").selectOption("intact");
  await expect(page.locator(".stationCard")).toContainText("Tyrode");
  await page.getByLabel("Switch theme").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "Dark");
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
});

test("example kymograph is inspectable and leaves the live bath untouched", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "View example tracing" }).click();
  await expect(
    page.getByRole("heading", { name: "Example kymograph" }),
  ).toBeVisible();
  await expect(
    page.locator(".scopeMark").filter({ hasText: "ACh" }),
  ).toHaveCount(4);
  await expect(
    page.locator(".scopeMark").filter({ hasText: "Wash" }),
  ).toHaveCount(4);
  await page.locator(".graticule").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".paperCursor output")).toContainText("1 s");
  await page.getByRole("button", { name: "Return to live chart" }).click();
  await expect(
    page.getByText("Ready to record", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".readingStrip")).toContainText("00:00 · 0 µM");
  await expect(page.locator(".graticule polyline")).toHaveCount(0);
});

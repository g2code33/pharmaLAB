import type { Page } from "@playwright/test";
export async function resource(page: Page, name: string) {
  await page.getByLabel("Toggle navigation").click();
  await page
    .getByRole("navigation", { name: "Workspace resources" })
    .getByRole("button", { name, exact: true })
    .click();
}

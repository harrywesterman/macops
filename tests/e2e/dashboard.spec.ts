import { expect, test } from "@playwright/test";

test("operator can search a serial and see direct actions", async ({ page }) => {
  await page.goto("/auth/login");
  await expect(page.getByRole("heading", { name: "Werkplekbeheer" })).toBeVisible();

  await page.getByPlaceholder("Serienummer").fill("C02");
  await page.getByRole("button", { name: "Zoeken" }).click();

  await expect(page.getByRole("cell", { name: "C02ZQ0ABCMD6" })).toBeVisible();
  await expect(page.getByRole("button", { name: /UEM SBT/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Basis Communicatie/ })).toBeVisible();
});

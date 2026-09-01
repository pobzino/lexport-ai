import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";

const loginEmail = process.env.E2E_LOGIN_EMAIL;
const loginPassword = process.env.E2E_LOGIN_PASSWORD;
const fixtureDirectory = path.join(tmpdir(), "lexport-e2e");
const fixturePath = path.join(fixtureDirectory, "upload-flow-service-agreement.pdf");

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

test.describe("Contract upload", () => {
  test.skip(
    !loginEmail || !loginPassword,
    "Set E2E_LOGIN_EMAIL and E2E_LOGIN_PASSWORD to run upload tests."
  );

  test.beforeAll(async () => {
    await mkdir(fixtureDirectory, { recursive: true });
    const document = await PDFDocument.create();
    const page = document.addPage([612, 792]);
    const font = await document.embedFont(StandardFonts.Helvetica);
    const lines = [
      "SERVICE AGREEMENT",
      "This agreement is between Lexport Test Ltd and Example Client Ltd.",
      "1. Services",
      "The supplier will provide product design and implementation services.",
      "2. Payment",
      "The client will pay GBP 4,000 in four equal stages.",
      "3. Governing Law",
      "This agreement is governed by the laws of England and Wales.",
      "SIGNATURES",
      "Signed for Lexport Test Ltd: ____________________",
    ];

    lines.forEach((line, index) => {
      page.drawText(line, { x: 54, y: 730 - index * 34, size: 12, font });
    });
    await writeFile(fixturePath, await document.save());
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    const rejectCookies = page.getByRole("button", { name: "Reject Non-Essential" });
    if (await rejectCookies.isVisible()) await rejectCookies.click();
    await page.getByPlaceholder("Email address").fill(loginEmail!);
    await page.getByPlaceholder("Password").fill(loginPassword!);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    const skipOnboarding = page.getByRole("button", { name: "Skip for now" });
    await skipOnboarding.waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined);
    if (await skipOnboarding.isVisible()) await skipOnboarding.click();
  });

  test("uploads directly to storage and cleans up after review", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto("/contracts/upload");
    await expect(
      page.getByRole("heading", { name: "Bring an existing contract into Lexport" })
    ).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles(fixturePath);

    const metadataResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/contracts/upload") &&
        response.request().method() === "POST"
    );
    const storageRequestPromise = page.waitForRequest(
      (request) =>
        request.url().includes("/storage/v1/object/upload/sign/") &&
        request.method() === "PUT"
    );

    await page.getByRole("button", { name: "Import contract" }).click();
    const metadataResponse = await metadataResponsePromise;
    const storageRequest = await storageRequestPromise;

    expect(metadataResponse.ok()).toBe(true);
    expect(metadataResponse.request().postDataJSON()).toMatchObject({
      fileName: "upload-flow-service-agreement.pdf",
      mimeType: "application/pdf",
    });
    expect(storageRequest.url()).toContain("contract-uploads");

    await expect(
      page.getByRole("heading", { name: "Confirm contract details" })
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/words$/)).toBeVisible();
    await expect(page.getByText("Original preserved")).toBeVisible();

    const lateOnboarding = page.getByRole("button", { name: "Skip for now" });
    if (await lateOnboarding.isVisible()) await lateOnboarding.click();

    const cleanupResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/contracts/upload") &&
        response.request().method() === "DELETE"
    );
    await page.getByRole("button", { name: "Use another file" }).click();
    expect((await cleanupResponsePromise).ok()).toBe(true);
    await expect(page.getByRole("button", { name: "Import contract" })).toBeDisabled();
    expect(consoleErrors).toEqual([]);
  });
});

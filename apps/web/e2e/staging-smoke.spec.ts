import { test, expect } from "@playwright/test";

const loginEmail = process.env.E2E_LOGIN_EMAIL;
const loginPassword = process.env.E2E_LOGIN_PASSWORD;

test.describe.configure({ mode: "serial" });

test.describe("Staging smoke", () => {
  test.skip(
    !loginEmail || !loginPassword,
    "Set E2E_LOGIN_EMAIL and E2E_LOGIN_PASSWORD to run staging smoke tests."
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email address").fill(loginEmail!);
    await page.getByPlaceholder("Password").fill(loginPassword!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
  });

  test("confirmed login reaches dashboard", async ({ page }) => {
    await expect(page.getByText(/dashboard/i).first()).toBeVisible();
  });

  test("async contract generation completes and opens the editor", async ({ page }) => {
    const createPayload = {
      contractType: "custom",
      metadata: {
        contractType: "custom",
        customContractName: "Staging Smoke Agreement",
        customContractDescription:
          "A smoke-test services agreement between a client and an independent contractor with payment and IP terms.",
        effectiveDate: "2026-03-12",
        jurisdiction: "us_california",
        signerGroups: [
          {
            role: "client",
            roleLabel: "Client",
            signers: [
              {
                id: "client-1",
                name: "Staging Client",
                email: "staging-client@example.com",
              },
            ],
          },
          {
            role: "contractor",
            roleLabel: "Contractor",
            signers: [
              {
                id: "contractor-1",
                name: "Staging Contractor",
                email: "staging-contractor@example.com",
              },
            ],
          },
        ],
      },
    };

    const queuedJob = await page.evaluate(async (payload) => {
      const response = await fetch("/api/contracts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      return {
        ok: response.ok,
        status: response.status,
        body: await response.json().catch(() => null),
      };
    }, createPayload);

    expect(queuedJob.ok).toBe(true);
    expect(typeof queuedJob.body?.jobId).toBe("string");

    const jobId = queuedJob.body.jobId as string;
    let contractId: string | null = null;

    for (let attempt = 0; attempt < 80; attempt += 1) {
      const jobStatus = await page.evaluate(async (queuedId) => {
        const response = await fetch(`/api/contracts/generate/${queuedId}`, {
          cache: "no-store",
        });
        return {
          ok: response.ok,
          body: await response.json().catch(() => null),
        };
      }, jobId);

      expect(jobStatus.ok).toBe(true);

      if (jobStatus.body?.status === "completed" && typeof jobStatus.body.contractId === "string") {
        contractId = jobStatus.body.contractId;
        break;
      }

      if (jobStatus.body?.status === "failed" || jobStatus.body?.status === "timed_out") {
        throw new Error(
          typeof jobStatus.body.error === "string"
            ? jobStatus.body.error
            : `Generation job ended with status ${jobStatus.body?.status}`
        );
      }

      await page.waitForTimeout(3000);
    }

    expect(contractId).toBeTruthy();
    await page.goto(`/contracts/${contractId}/edit`);
    await expect(page).toHaveURL(new RegExp(`/contracts/${contractId}/edit`), {
      timeout: 30000,
    });
    await expect(page.locator("body")).toContainText(/staging smoke agreement/i);
  });
});

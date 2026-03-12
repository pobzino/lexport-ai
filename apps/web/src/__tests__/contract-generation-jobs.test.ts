import { describe, expect, it, vi } from "vitest";
import {
  hasContractGenerationJobTimedOut,
  isTerminalContractGenerationJobStatus,
} from "@/lib/contracts/generation-jobs";

describe("contract generation jobs", () => {
  it("recognizes terminal statuses", () => {
    expect(isTerminalContractGenerationJobStatus("completed")).toBe(true);
    expect(isTerminalContractGenerationJobStatus("failed")).toBe(true);
    expect(isTerminalContractGenerationJobStatus("timed_out")).toBe(true);
    expect(isTerminalContractGenerationJobStatus("processing")).toBe(false);
    expect(isTerminalContractGenerationJobStatus("queued")).toBe(false);
  });

  it("does not mark recent active jobs as timed out", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-12T12:00:00.000Z"));

    expect(
      hasContractGenerationJobTimedOut({
        status: "processing",
        started_at: "2026-03-12T11:55:30.000Z",
        created_at: "2026-03-12T11:55:00.000Z",
      })
    ).toBe(false);

    vi.useRealTimers();
  });

  it("marks stale active jobs as timed out", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-12T12:00:00.000Z"));

    expect(
      hasContractGenerationJobTimedOut({
        status: "processing",
        started_at: "2026-03-12T11:45:00.000Z",
        created_at: "2026-03-12T11:44:30.000Z",
      })
    ).toBe(true);

    expect(
      hasContractGenerationJobTimedOut({
        status: "completed",
        started_at: "2026-03-12T11:45:00.000Z",
        created_at: "2026-03-12T11:44:30.000Z",
      })
    ).toBe(false);

    vi.useRealTimers();
  });
});

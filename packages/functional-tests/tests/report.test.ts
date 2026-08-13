import { describe, expect, it, vi } from "vitest";
import { postCheck } from "../src/checkClient.js";
import { summarize, toMarkdown, type SiteResult } from "../src/report.js";
import { TOP_25_SITES } from "../src/sites.js";

describe("TOP_25_SITES", () => {
  it("has 25 unique hostnames", () => {
    expect(TOP_25_SITES).toHaveLength(25);
    expect(new Set(TOP_25_SITES).size).toBe(25);
  });
});

describe("postCheck", () => {
  it("parses valid status", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      status: 200,
      text: async () => JSON.stringify({ status: "valid" }),
    });
    const res = await postCheck(
      "https://api.webnotary.org/v1/check",
      "example.com",
      "a".repeat(64),
      fetchImpl as unknown as typeof fetch,
    );
    expect(res.httpStatus).toBe(200);
    expect(res.status).toBe("valid");
  });
});

describe("report", () => {
  it("summarizes outcomes and renders markdown", () => {
    const results: SiteResult[] = [
      {
        hostname: "a.com",
        outcome: "api_valid",
        observeTlsValid: true,
        certificateSha256: "ab".repeat(32),
        apiStatus: "valid",
        apiHttpStatus: 200,
        durationMs: 10,
      },
      {
        hostname: "b.com",
        outcome: "api_unknown",
        observeTlsValid: true,
        certificateSha256: "cd".repeat(32),
        apiStatus: "unknown",
        apiHttpStatus: 200,
        durationMs: 11,
      },
      {
        hostname: "c.com",
        outcome: "observe_error",
        error: "timeout",
        durationMs: 12,
      },
    ];
    const summary = summarize(results);
    expect(summary.api_valid).toBe(1);
    expect(summary.api_unknown).toBe(1);
    expect(summary.observe_error).toBe(1);
    const md = toMarkdown({
      generatedAt: "2026-08-13T00:00:00.000Z",
      checkUrl: "https://api.webnotary.org/v1/check",
      siteCount: 3,
      summary,
      results,
    });
    expect(md).toContain("api_valid");
    expect(md).toContain("a.com");
  });
});

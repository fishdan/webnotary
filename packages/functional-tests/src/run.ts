import { observe } from "@webnotary/observer";
import { postCheck } from "./checkClient.js";
import {
  summarize,
  type RunReport,
  type SiteResult,
} from "./report.js";
import { TOP_25_SITES } from "./sites.js";

export interface RunOptions {
  checkUrl: string;
  hostnames?: readonly string[];
  concurrency?: number;
  fetchImpl?: typeof fetch;
}

async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]!, i);
    }
  }

  const n = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

export async function runFunctionalSuite(
  options: RunOptions,
): Promise<RunReport> {
  const hostnames = options.hostnames ?? TOP_25_SITES;
  const concurrency = options.concurrency ?? 2;

  const results = await mapPool(hostnames, concurrency, async (hostname) => {
    const started = Date.now();
    const row: SiteResult = {
      hostname,
      outcome: "observe_error",
      durationMs: 0,
    };

    try {
      const obs = await observe(hostname, { observerId: "functional-test" });
      row.observedAt = obs.observedAt;
      row.remoteIp = obs.remoteIp;
      row.observeTlsValid = obs.tlsValid;
      row.certificateSha256 = obs.certificateSha256;
      row.spkiSha256 = obs.spkiSha256;
      row.issuer = obs.issuer;

      const check = await postCheck(
        options.checkUrl,
        obs.hostname,
        obs.certificateSha256,
        options.fetchImpl,
      );
      row.apiHttpStatus = check.httpStatus;
      row.apiStatus = check.status;
      if (check.error) {
        row.outcome = "api_error";
        row.error = check.error;
      } else if (check.httpStatus !== 200 || !check.status) {
        row.outcome = "api_error";
        row.error = `HTTP ${check.httpStatus}: ${check.rawBody.slice(0, 200)}`;
      } else if (check.status === "valid") {
        row.outcome = "api_valid";
      } else if (check.status === "conflict") {
        row.outcome = "api_conflict";
      } else {
        row.outcome = "api_unknown";
      }
    } catch (err) {
      row.outcome = "observe_error";
      row.error = err instanceof Error ? err.message : String(err);
    }

    row.durationMs = Date.now() - started;
    const tag =
      row.outcome === "observe_error" || row.outcome === "api_error"
        ? "FAIL"
        : "OK";
    console.log(
      `[${tag}] ${hostname} → ${row.outcome}` +
        (row.apiStatus ? ` (${row.apiStatus})` : "") +
        ` ${row.durationMs}ms` +
        (row.error ? ` — ${row.error}` : ""),
    );
    return row;
  });

  return {
    generatedAt: new Date().toISOString(),
    checkUrl: options.checkUrl,
    siteCount: hostnames.length,
    summary: summarize(results),
    results,
  };
}

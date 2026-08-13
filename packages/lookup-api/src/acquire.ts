import { observe, type Observation } from "@webnotary/observer";
import type { PublicStatus } from "@webnotary/trust-policy";
import type { ObservedCertUpserter } from "./dynamo.js";

export interface AcquireDeps {
  observeFn?: typeof observe;
  upsertObserved: ObservedCertUpserter;
  timeoutMs: number;
  observerId?: string;
}

export type AcquireResult =
  | { ok: true; status: PublicStatus; observation: Observation }
  | { ok: false; reason: "timeout" | "tls_invalid" | "error"; error?: string };

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`acquire timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Independently observe hostname within timeout and persist trust for the observed cert.
 * Compares to the client-reported fingerprint for the public status of *this* check.
 */
export async function acquireUnknown(input: {
  hostname: string;
  clientCertificateSha256: string;
  deps: AcquireDeps;
}): Promise<AcquireResult> {
  const observeFn = input.deps.observeFn ?? observe;
  const connectBudget = Math.max(500, input.deps.timeoutMs - 250);

  try {
    const observation = await withTimeout(
      observeFn(input.hostname, {
        connectTimeoutMs: connectBudget,
        observerId: input.deps.observerId ?? "lookup-acquire",
      }),
      input.deps.timeoutMs,
    );

    if (!observation.tlsValid) {
      return { ok: false, reason: "tls_invalid" };
    }

    await input.deps.upsertObserved.upsert({
      hostname: observation.hostname,
      certificateSha256: observation.certificateSha256,
      spkiSha256: observation.spkiSha256,
      notBefore: observation.notBefore,
      notAfter: observation.notAfter,
      issuer: observation.issuer,
      observedAt: observation.observedAt,
      evidenceKey: "acquire/inline",
    });

    const matches =
      observation.certificateSha256.toLowerCase() ===
      input.clientCertificateSha256.toLowerCase();

    return {
      ok: true,
      status: matches ? "valid" : "conflict",
      observation,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("timed out")) {
      return { ok: false, reason: "timeout", error: message };
    }
    return { ok: false, reason: "error", error: message };
  }
}

export function isAcquireModeEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const v = (env.ACQUIRE_MODE ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function acquireTimeoutMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.ACQUIRE_TIMEOUT_MS;
  const n = raw ? Number(raw) : 5000;
  if (!Number.isFinite(n) || n < 500) return 5000;
  return Math.min(n, 12_000);
}

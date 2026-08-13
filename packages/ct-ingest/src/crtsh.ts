import { X509Certificate } from "node:crypto";
import { normalizeCertificateForInventory } from "./normalize.js";
import type { InventoryUpsertFields } from "./normalize.js";

export interface CrtShSearchRow {
  id: number;
  issuer_name?: string;
  name_value?: string;
  not_before?: string;
  not_after?: string;
  serial_number?: string;
  entry_timestamp?: string;
}

export interface CrtShClient {
  searchByHostname(hostname: string): Promise<CrtShSearchRow[]>;
  fetchCertificatePem(id: number): Promise<string>;
}

export interface FetchOptions {
  maxCertsPerHost?: number;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  timeoutMs?: number;
}

const DEFAULT_MAX = 20;
const DEFAULT_TIMEOUT_MS = 20_000;

export function createCrtShClient(options: FetchOptions = {}): CrtShClient {
  const baseUrl = options.baseUrl ?? "https://crt.sh";
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function getText(url: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        signal: controller.signal,
        headers: { Accept: "application/json, text/plain, */*" },
      });
      if (!res.ok) {
        throw new Error(`crt.sh HTTP ${res.status} for ${url}`);
      }
      return await res.text();
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async searchByHostname(hostname) {
      const q = encodeURIComponent(hostname);
      const text = await getText(`${baseUrl}/?q=${q}&output=json`);
      const parsed = JSON.parse(text) as CrtShSearchRow[];
      if (!Array.isArray(parsed)) {
        throw new Error("crt.sh search did not return a JSON array");
      }
      return parsed;
    },

    async fetchCertificatePem(id) {
      const text = await getText(`${baseUrl}/?d=${id}`);
      if (!text.includes("BEGIN CERTIFICATE")) {
        throw new Error(`crt.sh cert ${id} did not return PEM`);
      }
      return text;
    },
  };
}

export async function collectFromCrtSh(input: {
  hostname: string;
  client?: CrtShClient;
  maxCertsPerHost?: number;
}): Promise<InventoryUpsertFields[]> {
  const client = input.client ?? createCrtShClient();
  const max = input.maxCertsPerHost ?? DEFAULT_MAX;
  const rows = await client.searchByHostname(input.hostname);

  const uniqueIds: number[] = [];
  const seen = new Set<number>();
  for (const row of rows) {
    if (typeof row.id !== "number") continue;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    uniqueIds.push(row.id);
    if (uniqueIds.length >= max) break;
  }

  const byFp = new Map<string, InventoryUpsertFields>();

  for (const id of uniqueIds) {
    try {
      const pem = await client.fetchCertificatePem(id);
      const cert = new X509Certificate(pem);
      const row = rows.find((r) => r.id === id);
      const ctSeenAt = row?.entry_timestamp
        ? new Date(row.entry_timestamp).toISOString()
        : new Date().toISOString();
      const fields = normalizeCertificateForInventory({
        cert,
        ctSource: "crt.sh",
        ctSeenAt,
      });
      // Prefer earliest ctSeenAt if duplicate fingerprints appear
      const existing = byFp.get(fields.certificateSha256);
      if (!existing || fields.ctSeenAt < existing.ctSeenAt) {
        byFp.set(fields.certificateSha256, fields);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`crt.sh cert id=${id} skipped: ${message}`);
    }
  }

  return [...byFp.values()];
}

export { DEFAULT_MAX as DEFAULT_MAX_CERTS_PER_HOST };

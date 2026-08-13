import type { InventoryUpsertFields } from "./normalize.js";
import { normalizeCertificateForInventory } from "./normalize.js";
import { loadCertificateFromFile } from "./parse.js";
import { collectFromCrtSh, createCrtShClient, type CrtShClient } from "./crtsh.js";
import type { InventoryUpserter } from "./upsert.js";

export async function ingestFromFile(input: {
  path: string;
  format: "pem" | "der";
  ctSource?: string;
  upserter?: InventoryUpserter;
  dryRun?: boolean;
}): Promise<InventoryUpsertFields> {
  const cert = loadCertificateFromFile(input.path, input.format);
  const fields = normalizeCertificateForInventory({
    cert,
    ctSource: input.ctSource ?? "file",
  });
  if (!input.dryRun) {
    if (!input.upserter) {
      throw new Error("upserter required unless --dry-run");
    }
    await input.upserter.upsert(fields);
  }
  return fields;
}

export async function ingestHostname(input: {
  hostname: string;
  maxCertsPerHost?: number;
  client?: CrtShClient;
  upserter?: InventoryUpserter;
  dryRun?: boolean;
}): Promise<InventoryUpsertFields[]> {
  const fieldsList = await collectFromCrtSh({
    hostname: input.hostname,
    client: input.client ?? createCrtShClient(),
    maxCertsPerHost: input.maxCertsPerHost,
  });

  if (!input.dryRun) {
    if (!input.upserter) {
      throw new Error("upserter required unless --dry-run");
    }
    for (const fields of fieldsList) {
      await input.upserter.upsert(fields);
    }
  }

  return fieldsList;
}

export async function ingestSeedHostnames(input: {
  hostnames: string[];
  maxCertsPerHost?: number;
  client?: CrtShClient;
  upserter: InventoryUpserter;
}): Promise<{ hostname: string; ok: boolean; count: number; error?: string }[]> {
  const results: { hostname: string; ok: boolean; count: number; error?: string }[] =
    [];

  for (const hostname of input.hostnames) {
    try {
      const items = await ingestHostname({
        hostname,
        maxCertsPerHost: input.maxCertsPerHost,
        client: input.client,
        upserter: input.upserter,
      });
      results.push({ hostname, ok: true, count: items.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ hostname, ok: false, count: 0, error: message });
    }
  }

  return results;
}

export function parseSeedHostnames(raw: string | undefined): string[] {
  if (!raw?.trim()) return ["example.com"];
  return raw
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
}

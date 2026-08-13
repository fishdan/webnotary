import { createDynamoInventoryUpserter } from "./upsert.js";
import { ingestSeedHostnames, parseSeedHostnames } from "./ingest.js";
import { DEFAULT_MAX_CERTS_PER_HOST } from "./crtsh.js";

export async function handler(): Promise<{
  results: { hostname: string; ok: boolean; count: number; error?: string }[];
}> {
  const tableName = process.env.TABLE_NAME;
  if (!tableName) {
    throw new Error("TABLE_NAME is required");
  }

  const hostnames = parseSeedHostnames(process.env.CT_SEED_HOSTNAMES);
  const maxRaw = process.env.CT_MAX_CERTS_PER_HOST;
  const maxCertsPerHost = maxRaw
    ? Number(maxRaw)
    : DEFAULT_MAX_CERTS_PER_HOST;

  const upserter = createDynamoInventoryUpserter(tableName);
  const results = await ingestSeedHostnames({
    hostnames,
    maxCertsPerHost,
    upserter,
  });

  for (const r of results) {
    if (r.ok) {
      console.log(`ct-ingest ok host=${r.hostname} count=${r.count}`);
    } else {
      console.error(`ct-ingest fail host=${r.hostname} error=${r.error}`);
    }
  }

  // Fail the invocation only if every seed host failed (partial success OK).
  if (results.length > 0 && results.every((r) => !r.ok)) {
    throw new Error("all CT seed hostnames failed");
  }

  return { results };
}

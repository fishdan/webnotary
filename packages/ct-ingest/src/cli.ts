#!/usr/bin/env node
import { NormalizationError } from "@webnotary/data-model";
import { createDynamoInventoryUpserter } from "./upsert.js";
import { ingestFromFile, ingestHostname } from "./ingest.js";

function usage(): never {
  console.error(`usage:
  webnotary-ct-ingest host <hostname> [--dry-run] [--max-certs N]
  webnotary-ct-ingest file --pem|--der <path> [--ct-source name] [--dry-run]

Environment:
  TABLE_NAME   DynamoDB table (required unless --dry-run)
`);
  process.exit(2);
}

function takeFlag(args: string[], name: string): boolean {
  const i = args.indexOf(name);
  if (i >= 0) {
    args.splice(i, 1);
    return true;
  }
  return false;
}

function takeOption(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  if (i >= 0) {
    const v = args[i + 1];
    args.splice(i, 2);
    return v;
  }
  return undefined;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) usage();

  const dryRun = takeFlag(args, "--dry-run");
  const cmd = args.shift();
  const tableName = process.env.TABLE_NAME;
  const upserter =
    dryRun || !tableName ? undefined : createDynamoInventoryUpserter(tableName);

  if (!dryRun && !tableName) {
    console.error("TABLE_NAME is required unless --dry-run");
    process.exit(2);
  }

  try {
    if (cmd === "host") {
      const hostname = args.shift();
      if (!hostname) usage();
      const maxRaw = takeOption(args, "--max-certs");
      const maxCertsPerHost = maxRaw ? Number(maxRaw) : undefined;
      const items = await ingestHostname({
        hostname,
        maxCertsPerHost,
        upserter,
        dryRun,
      });
      process.stdout.write(`${JSON.stringify({ count: items.length, items }, null, 2)}\n`);
      return;
    }

    if (cmd === "file") {
      const format = takeFlag(args, "--pem")
        ? "pem"
        : takeFlag(args, "--der")
          ? "der"
          : null;
      const path = args.shift();
      const ctSource = takeOption(args, "--ct-source");
      if (!format || !path) usage();
      const item = await ingestFromFile({
        path,
        format,
        ctSource,
        upserter,
        dryRun,
      });
      process.stdout.write(`${JSON.stringify(item, null, 2)}\n`);
      return;
    }

    usage();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    process.exit(err instanceof NormalizationError ? 1 : 1);
  }
}

main();

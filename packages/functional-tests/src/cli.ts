#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { toMarkdown } from "./report.js";
import { runFunctionalSuite } from "./run.js";

function usage(): never {
  console.error(`usage: webnotary-functional-test [--out-dir DIR] [--concurrency N]

Env:
  WEBNOTARY_CHECK_URL   default https://api.webnotary.org/v1/check
`);
  process.exit(2);
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
  if (args.includes("-h") || args.includes("--help")) usage();

  const outDir = takeOption(args, "--out-dir") ?? join(process.cwd(), "reports");
  const concurrencyRaw = takeOption(args, "--concurrency");
  const concurrency = concurrencyRaw ? Number(concurrencyRaw) : 2;
  if (args.length > 0) usage();

  const checkUrl =
    process.env.WEBNOTARY_CHECK_URL ?? "https://api.webnotary.org/v1/check";

  console.log(`WebNotary functional test`);
  console.log(`  checkUrl: ${checkUrl}`);
  console.log(`  outDir:   ${outDir}`);
  console.log(`  concurrency: ${concurrency}`);
  console.log(``);

  const report = await runFunctionalSuite({ checkUrl, concurrency });
  mkdirSync(outDir, { recursive: true });
  const stamp = report.generatedAt.replace(/[:.]/g, "-");
  const jsonPath = join(outDir, `report-${stamp}.json`);
  const mdPath = join(outDir, `report-${stamp}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, toMarkdown(report));

  console.log(``);
  console.log(`Summary:`, report.summary);
  console.log(`Wrote ${mdPath}`);
  console.log(`Wrote ${jsonPath}`);

  const hardFails =
    report.summary.observe_error + report.summary.api_error;
  if (hardFails > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
import { NormalizationError } from "@webnotary/data-model";
import { NetPolicyError } from "./netPolicy.js";
import { observe } from "./observe.js";

async function main(): Promise<void> {
  const hostname = process.argv[2];
  if (!hostname) {
    console.error("usage: webnotary-observer <hostname>");
    process.exit(2);
  }

  try {
    const observation = await observe(hostname);
    process.stdout.write(`${JSON.stringify(observation, null, 2)}\n`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    if (err instanceof NormalizationError || err instanceof NetPolicyError) {
      process.exit(1);
    }
    process.exit(1);
  }
}

main();

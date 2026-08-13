export type RowOutcome =
  | "api_valid"
  | "api_unknown"
  | "api_conflict"
  | "observe_error"
  | "api_error";

export interface SiteResult {
  hostname: string;
  outcome: RowOutcome;
  observedAt?: string;
  remoteIp?: string;
  observeTlsValid?: boolean;
  certificateSha256?: string;
  spkiSha256?: string;
  issuer?: string;
  apiHttpStatus?: number;
  apiStatus?: string;
  error?: string;
  durationMs: number;
}

export interface RunReport {
  generatedAt: string;
  checkUrl: string;
  siteCount: number;
  summary: Record<RowOutcome, number>;
  results: SiteResult[];
}

export function summarize(results: SiteResult[]): Record<RowOutcome, number> {
  const summary: Record<RowOutcome, number> = {
    api_valid: 0,
    api_unknown: 0,
    api_conflict: 0,
    observe_error: 0,
    api_error: 0,
  };
  for (const r of results) {
    summary[r.outcome] += 1;
  }
  return summary;
}

export function toMarkdown(report: RunReport): string {
  const lines: string[] = [];
  lines.push(`# WebNotary functional report`);
  lines.push(``);
  lines.push(`- Generated: ${report.generatedAt}`);
  lines.push(`- Check URL: \`${report.checkUrl}\``);
  lines.push(`- Sites: ${report.siteCount}`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`| Outcome | Count |`);
  lines.push(`|---------|------:|`);
  for (const [k, v] of Object.entries(report.summary)) {
    lines.push(`| ${k} | ${v} |`);
  }
  lines.push(``);
  lines.push(`## Per-site results`);
  lines.push(``);
  lines.push(
    `| Hostname | Observe TLS | Fingerprint (12) | API | HTTP | ms | Error |`,
  );
  lines.push(`|----------|:-----------:|------------------|-----|-----:|---:|-------|`);
  for (const r of report.results) {
    const fp = r.certificateSha256 ? r.certificateSha256.slice(0, 12) : "—";
    const tls =
      r.observeTlsValid === undefined ? "—" : r.observeTlsValid ? "yes" : "no";
    const api = r.apiStatus ?? r.outcome;
    const http = r.apiHttpStatus ?? "—";
    const err = (r.error ?? "").replace(/\|/g, "/").slice(0, 80);
    lines.push(
      `| ${r.hostname} | ${tls} | \`${fp}\` | ${api} | ${http} | ${r.durationMs} | ${err} |`,
    );
  }
  lines.push(``);
  lines.push(`## How to read this`);
  lines.push(``);
  lines.push(
    `- **Observe TLS** = PKI validation of the live connection (not WebNotary trust).`,
  );
  lines.push(
    `- **API valid/unknown/conflict** = WebNotary public status for that hostname+fingerprint.`,
  );
  lines.push(
    `- Many **unknown** results are expected until CT inventory + independent observers establish trust.`,
  );
  lines.push(``);
  return lines.join("\n");
}

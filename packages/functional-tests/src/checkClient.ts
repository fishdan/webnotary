export type PublicStatus = "valid" | "unknown" | "conflict";

export interface CheckResult {
  httpStatus: number;
  status?: PublicStatus;
  rawBody: string;
  error?: string;
}

export async function postCheck(
  checkUrl: string,
  hostname: string,
  certificateSha256: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CheckResult> {
  try {
    const res = await fetchImpl(checkUrl, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ hostname, certificateSha256 }),
    });
    const rawBody = await res.text();
    let status: PublicStatus | undefined;
    try {
      const parsed = JSON.parse(rawBody) as { status?: string };
      if (
        parsed.status === "valid" ||
        parsed.status === "unknown" ||
        parsed.status === "conflict"
      ) {
        status = parsed.status;
      }
    } catch {
      // keep raw
    }
    return { httpStatus: res.status, status, rawBody };
  } catch (err) {
    return {
      httpStatus: 0,
      rawBody: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

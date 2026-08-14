/**
 * @param {string} checkUrl
 * @param {string} hostname
 * @param {string} certificateSha256
 * @param {number} [timeoutMs]
 * @returns {Promise<{
 *   status: 'valid'|'unknown'|'conflict',
 *   conflict?: { reason?: string, knownCertificateSha256s?: string[] },
 *   raw: unknown
 * }>}
 */
export async function postCheck(checkUrl, hostname, certificateSha256, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(checkUrl, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ hostname, certificateSha256 }),
      signal: controller.signal,
    });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(`non-JSON response HTTP ${res.status}`);
    }
    if (!res.ok) {
      throw new Error(body?.message || `HTTP ${res.status}`);
    }
    const status = body?.status;
    if (status !== "valid" && status !== "unknown" && status !== "conflict") {
      throw new Error(`unexpected status: ${status}`);
    }
    const conflict =
      status === "conflict" && body?.conflict && typeof body.conflict === "object"
        ? {
            reason:
              typeof body.conflict.reason === "string"
                ? body.conflict.reason
                : undefined,
            knownCertificateSha256s: Array.isArray(
              body.conflict.knownCertificateSha256s,
            )
              ? body.conflict.knownCertificateSha256s.filter(
                  (x) => typeof x === "string",
                )
              : [],
          }
        : undefined;
    return { status, conflict, raw: body };
  } finally {
    clearTimeout(timer);
  }
}

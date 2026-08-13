/**
 * @param {string} checkUrl
 * @param {string} hostname
 * @param {string} certificateSha256
 * @param {number} [timeoutMs]
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
    return { status, raw: body };
  } finally {
    clearTimeout(timer);
  }
}

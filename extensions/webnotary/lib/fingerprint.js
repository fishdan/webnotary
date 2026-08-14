/** Normalize Chrome/Firefox-ish fingerprint strings to lowercase 64-hex. */
export function normalizeCertificateSha256(input) {
  if (input == null) {
    throw new Error("fingerprint missing");
  }
  if (input instanceof ArrayBuffer) {
    input = [...new Uint8Array(input)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } else if (ArrayBuffer.isView?.(input)) {
    input = [...new Uint8Array(input.buffer, input.byteOffset, input.byteLength)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let s = String(input).trim().toLowerCase();
  // Strip common separators
  s = s.replace(/[:\s-]/g, "");
  // If base64-looking and not hex length, try decode
  if (!/^[0-9a-f]{64}$/.test(s) && /^[a-z0-9+/]+=*$/i.test(String(input).trim())) {
    const bin = atob(String(input).trim());
    s = [...bin].map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
  }
  if (!/^[0-9a-f]{64}$/.test(s)) {
    throw new Error(`fingerprint must be 64 hex chars, got: ${String(input).slice(0, 24)}…`);
  }
  return s;
}

export function hostnameFromUrl(url) {
  const u = new URL(url);
  if (u.protocol !== "https:") {
    throw new Error("only https URLs are supported");
  }
  return u.hostname.replace(/\.$/, "").toLowerCase();
}

/**
 * Hosts where Chrome often blocks extension webRequest / cert access.
 * Recheck cannot invent a leaf fingerprint without a successful capture.
 */
export function describeCheckBlocker(url) {
  if (!url || typeof url !== "string") {
    return { blocked: true, code: "no_url", message: "No active tab URL." };
  }
  let u;
  try {
    u = new URL(url);
  } catch {
    return { blocked: true, code: "bad_url", message: "Tab URL is not parseable." };
  }
  if (u.protocol === "chrome:" || u.protocol === "chrome-extension:" || u.protocol === "about:") {
    return {
      blocked: true,
      code: "browser_page",
      message: "Browser internal pages have no site certificate to check.",
    };
  }
  if (u.protocol !== "https:") {
    return {
      blocked: true,
      code: "not_https",
      message: "WebNotary only checks https pages.",
    };
  }
  const host = u.hostname.toLowerCase();
  if (
    host === "chrome.google.com" ||
    host.endsWith(".chrome.google.com") ||
    host === "chromewebstore.google.com" ||
    host.endsWith(".chromewebstore.google.com")
  ) {
    return {
      blocked: true,
      code: "restricted_host",
      message:
        "Chrome restricts extension certificate access on Chrome Web Store / chrome.google.com pages. Open a normal site (e.g. example.com), reload that tab after installing/reloading WebNotary, then open this popup.",
    };
  }
  return { blocked: false, hostname: host };
}

/** Extract leaf SHA-256 from webRequest securityInfo details. */
export function leafFingerprintFromSecurityInfo(securityInfo) {
  if (!securityInfo || securityInfo.state === "insecure") {
    throw new Error("connection is not secure");
  }
  const certs = securityInfo.certificates;
  if (!Array.isArray(certs) || certs.length === 0) {
    throw new Error("no certificates in securityInfo");
  }
  const leaf = certs[0];
  const fp = leaf?.fingerprint?.sha256 ?? leaf?.fingerprint?.sha256Fingerprint;
  if (!fp) {
    throw new Error("certificate fingerprint missing from securityInfo");
  }
  return normalizeCertificateSha256(fp);
}

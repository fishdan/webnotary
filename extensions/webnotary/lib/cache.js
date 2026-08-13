const SETTINGS_KEY = "webnotary.settings";
const TRUST_PREFIX = "webnotary.trust.";

export const DEFAULT_SETTINGS = {
  checkUrl: "https://api.webnotary.org/v1/check",
  /** Max age for cached valid trust (ms). Also capped by cert notAfter when known. */
  maxTrustAgeMs: 7 * 24 * 60 * 60 * 1000,
  /** Cooldown before re-querying after unknown/conflict (ms). */
  recheckCooldownMs: 5 * 60 * 1000,
};

export async function getSettings() {
  const { [SETTINGS_KEY]: s } = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(s || {}) };
}

export async function saveSettings(partial) {
  const next = { ...(await getSettings()), ...partial };
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

function trustKey(hostname) {
  return `${TRUST_PREFIX}${hostname}`;
}

/**
 * @typedef {{
 *   hostname: string,
 *   certificateSha256: string,
 *   status: 'valid'|'unknown'|'conflict',
 *   validatedAt: string,
 *   notAfter?: string,
 *   expiresAt: string,
 * }} TrustEntry
 */

export async function getTrust(hostname) {
  const key = trustKey(hostname);
  const bag = await chrome.storage.local.get(key);
  return bag[key] || null;
}

export async function putTrust(entry) {
  await chrome.storage.local.set({ [trustKey(entry.hostname)]: entry });
}

export function computeExpiresAt(settings, validatedAtIso, notAfterIso) {
  const validatedAt = Date.parse(validatedAtIso);
  const byAge = validatedAt + settings.maxTrustAgeMs;
  let expires = byAge;
  if (notAfterIso) {
    const notAfter = Date.parse(notAfterIso);
    if (Number.isFinite(notAfter)) {
      expires = Math.min(expires, notAfter);
    }
  }
  return new Date(expires).toISOString();
}

/**
 * Decide whether we need to call the API.
 * @returns {{ action: 'use_cache'|'check', entry?: TrustEntry, reason: string }}
 */
export function planCheck(settings, entry, certificateSha256, nowMs = Date.now()) {
  if (!entry) {
    return { action: "check", reason: "no_cache" };
  }
  if (entry.certificateSha256 !== certificateSha256) {
    return { action: "check", reason: "fingerprint_changed", entry };
  }
  const expiresAt = Date.parse(entry.expiresAt);
  if (entry.status === "valid" && Number.isFinite(expiresAt) && nowMs < expiresAt) {
    return { action: "use_cache", reason: "valid_unexpired", entry };
  }
  if (entry.status === "valid") {
    return { action: "check", reason: "valid_expired", entry };
  }
  // unknown / conflict: cooldown
  const validatedAt = Date.parse(entry.validatedAt);
  if (
    Number.isFinite(validatedAt) &&
    nowMs - validatedAt < settings.recheckCooldownMs
  ) {
    return { action: "use_cache", reason: "cooldown", entry };
  }
  return { action: "check", reason: "recheck", entry };
}

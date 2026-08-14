const CONFLICT_LOG_KEY = "webnotary.conflictLog";
/** Keep the last N conflict alerts for the options page / export. */
export const MAX_CONFLICTS = 25;

/**
 * @typedef {{
 *   id: string,
 *   hostname: string,
 *   certificateSha256: string,
 *   knownCertificateSha256s: string[],
 *   reason?: string,
 *   reasonLabel?: string,
 *   checkedAt: string,
 *   tabId?: number,
 * }} ConflictRecord
 */

export function conflictReasonLabel(reason) {
  switch (reason) {
    case "sibling_observed":
      return "WebNotary already observed a different certificate for this host.";
    case "acquire_mismatch":
      return "A live observer saw a different leaf certificate than your browser.";
    case "stored_conflict":
      return "This hostname/certificate pair is recorded as a conflict.";
    default:
      return "The certificate your browser sees disagrees with WebNotary evidence.";
  }
}

export async function recordConflict(entry) {
  const bag = await chrome.storage.local.get(CONFLICT_LOG_KEY);
  /** @type {ConflictRecord[]} */
  const prev = Array.isArray(bag[CONFLICT_LOG_KEY]) ? bag[CONFLICT_LOG_KEY] : [];
  const checkedAt = entry.checkedAt || new Date().toISOString();
  const id =
    entry.id ||
    `${entry.hostname}:${entry.certificateSha256}:${checkedAt}`;
  const record = {
    ...entry,
    id,
    checkedAt,
    reasonLabel: entry.reasonLabel || conflictReasonLabel(entry.reason),
    knownCertificateSha256s: Array.isArray(entry.knownCertificateSha256s)
      ? entry.knownCertificateSha256s
      : [],
  };
  const next = [record, ...prev.filter((c) => c.id !== id)].slice(
    0,
    MAX_CONFLICTS,
  );
  await chrome.storage.local.set({ [CONFLICT_LOG_KEY]: next });
  return next[0];
}

export async function listConflicts() {
  const bag = await chrome.storage.local.get(CONFLICT_LOG_KEY);
  const all = Array.isArray(bag[CONFLICT_LOG_KEY]) ? bag[CONFLICT_LOG_KEY] : [];
  return all.slice(0, MAX_CONFLICTS);
}

export async function getConflict(id) {
  const all = await listConflicts();
  return all.find((c) => c.id === id) || null;
}

export async function clearConflicts() {
  await chrome.storage.local.remove(CONFLICT_LOG_KEY);
}

/** Plain-text archive suitable for saving as a .txt file. */
export function formatConflictsArchive(conflicts) {
  const lines = [
    "WebNotary conflict alert archive",
    `Generated: ${new Date().toISOString()}`,
    `Count: ${conflicts.length} (max ${MAX_CONFLICTS})`,
    "",
  ];
  if (!conflicts.length) {
    lines.push("(no alerts recorded)");
    return lines.join("\n");
  }
  conflicts.forEach((c, i) => {
    lines.push(`--- Alert ${i + 1} ---`);
    lines.push(`Time:     ${c.checkedAt || "—"}`);
    lines.push(`Host:     ${c.hostname || "—"}`);
    lines.push(`Cause:    ${c.reasonLabel || conflictReasonLabel(c.reason)}`);
    if (c.reason) lines.push(`Reason:   ${c.reason}`);
    lines.push(`Browser:  ${c.certificateSha256 || "—"}`);
    const known = c.knownCertificateSha256s || [];
    if (known.length) {
      known.forEach((fp, j) => {
        lines.push(`Known[${j}]: ${fp}`);
      });
    } else {
      lines.push("Known:    (none returned)");
    }
    lines.push("");
  });
  return lines.join("\n");
}

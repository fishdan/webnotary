const CONFLICT_LOG_KEY = "webnotary.conflictLog";
/** Keep the last N distinct conflict situations for the options page / export. */
export const MAX_CONFLICTS = 25;

/**
 * @typedef {{
 *   id: string,
 *   hostname: string,
 *   certificateSha256: string,
 *   knownCertificateSha256s: string[],
 *   reason?: string,
 *   reasonLabel?: string,
 *   firstSeenAt: string,
 *   lastSeenAt: string,
 *   seenCount: number,
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

/** Stable id for one conflict situation (host + browser leaf + known set). */
export function conflictSignature(entry) {
  const host = String(entry.hostname || "")
    .trim()
    .toLowerCase();
  const leaf = String(entry.certificateSha256 || "")
    .trim()
    .toLowerCase();
  const known = (entry.knownCertificateSha256s || [])
    .map((fp) => String(fp).trim().toLowerCase())
    .filter(Boolean)
    .sort();
  return `${host}|${leaf}|${known.join(",")}`;
}

function knownEqual(a, b) {
  const norm = (xs) =>
    (xs || [])
      .map((fp) => String(fp).trim().toLowerCase())
      .filter(Boolean)
      .sort()
      .join(",");
  return norm(a) === norm(b);
}

/**
 * Upsert by situation signature. Same host+leaves → bump lastSeen/count, no new row.
 * @returns {Promise<{ record: ConflictRecord, isNew: boolean, changed: boolean }>}
 */
export async function recordConflict(entry) {
  const bag = await chrome.storage.local.get(CONFLICT_LOG_KEY);
  /** @type {ConflictRecord[]} */
  const prev = Array.isArray(bag[CONFLICT_LOG_KEY]) ? bag[CONFLICT_LOG_KEY] : [];
  const now = entry.checkedAt || new Date().toISOString();
  const knownCertificateSha256s = Array.isArray(entry.knownCertificateSha256s)
    ? entry.knownCertificateSha256s
    : [];
  const id = conflictSignature({
    hostname: entry.hostname,
    certificateSha256: entry.certificateSha256,
    knownCertificateSha256s,
  });
  const reasonLabel = entry.reasonLabel || conflictReasonLabel(entry.reason);

  const existing = prev.find((c) => c.id === id);
  if (existing) {
    const changed =
      existing.reason !== entry.reason ||
      !knownEqual(existing.knownCertificateSha256s, knownCertificateSha256s);
    const record = {
      ...existing,
      ...entry,
      id,
      knownCertificateSha256s,
      reasonLabel,
      firstSeenAt: existing.firstSeenAt || existing.checkedAt || now,
      lastSeenAt: now,
      checkedAt: now,
      seenCount: (existing.seenCount || 1) + 1,
    };
    const next = [record, ...prev.filter((c) => c.id !== id)].slice(
      0,
      MAX_CONFLICTS,
    );
    await chrome.storage.local.set({ [CONFLICT_LOG_KEY]: next });
    return { record, isNew: false, changed };
  }

  const record = {
    ...entry,
    id,
    knownCertificateSha256s,
    reasonLabel,
    firstSeenAt: now,
    lastSeenAt: now,
    checkedAt: now,
    seenCount: 1,
  };
  const next = [record, ...prev].slice(0, MAX_CONFLICTS);
  await chrome.storage.local.set({ [CONFLICT_LOG_KEY]: next });
  return { record, isNew: true, changed: true };
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
    `Count: ${conflicts.length} distinct situations (max ${MAX_CONFLICTS})`,
    "",
  ];
  if (!conflicts.length) {
    lines.push("(no alerts recorded)");
    return lines.join("\n");
  }
  conflicts.forEach((c, i) => {
    lines.push(`--- Situation ${i + 1} ---`);
    lines.push(`Host:      ${c.hostname || "—"}`);
    lines.push(`Cause:     ${c.reasonLabel || conflictReasonLabel(c.reason)}`);
    if (c.reason) lines.push(`Reason:    ${c.reason}`);
    lines.push(`First seen:${c.firstSeenAt || c.checkedAt || "—"}`);
    lines.push(`Last seen: ${c.lastSeenAt || c.checkedAt || "—"}`);
    lines.push(`Seen count:${c.seenCount || 1}`);
    lines.push(`Browser:   ${c.certificateSha256 || "—"}`);
    const known = c.knownCertificateSha256s || [];
    if (known.length) {
      known.forEach((fp, j) => {
        lines.push(`Known[${j}]:  ${fp}`);
      });
    } else {
      lines.push("Known:     (none returned)");
    }
    lines.push("");
  });
  return lines.join("\n");
}

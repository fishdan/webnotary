import {
  conflictReasonLabel,
  getConflict,
  listConflicts,
} from "./lib/conflicts.js";

const params = new URLSearchParams(location.search);
const focusId = params.get("id");

const lead = document.getElementById("lead");
const detail = document.getElementById("detail");
const list = document.getElementById("list");
const empty = document.getElementById("empty");

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // ignore
  }
}

function renderDetail(c) {
  if (!c) {
    lead.textContent =
      "Conflict not found in local history (it may have been cleared).";
    detail.hidden = true;
    return;
  }
  lead.textContent =
    c.summary || c.reasonLabel || conflictReasonLabel(c.reason, c.severity);
  const known = (c.knownCertificateSha256s || [])
    .map(
      (fp) =>
        `<span class="fp mono">${escapeHtml(fp)} <button type="button" data-copy="${escapeHtml(fp)}">Copy</button></span>`,
    )
    .join("") ||
    `<span class="muted">No known fingerprints returned by the API yet.</span>`;

  detail.hidden = false;
  detail.innerHTML = `
    <div><strong>Host</strong> ${escapeHtml(c.hostname)}</div>
    <div class="muted" style="margin-top:6px">Severity: <code>${escapeHtml(c.severity || "—")}</code></div>
    <div style="margin-top:8px"><strong>Certificate your browser sees (PKI-accepted)</strong></div>
    <span class="fp mono">${escapeHtml(c.certificateSha256)}
      <button type="button" data-copy="${escapeHtml(c.certificateSha256)}">Copy</button>
    </span>
    <div style="margin-top:8px"><strong>Public observation (WebNotary)</strong></div>
    ${known}
    <div class="muted" style="margin-top:10px">
      First ${escapeHtml(c.firstSeenAt || c.checkedAt || "—")}
      · Last ${escapeHtml(c.lastSeenAt || c.checkedAt || "—")}
      · Seen ${escapeHtml(String(c.seenCount || 1))}×
      ${c.reason ? ` · <code>${escapeHtml(c.reason)}</code>` : ""}
    </div>
    <p class="muted" style="margin:10px 0 0">
      This is a path-vs-public-observation signal. Your browser already accepted the leaf under local PKI;
      WebNotary reports that it differs from independently observed leaf(es) for this hostname.
    </p>
    <p style="margin:12px 0 0"><a href="options.html">Open Options alert archive</a></p>
  `;
  detail.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () =>
      copyText(btn.getAttribute("data-copy") || ""),
    );
  });
}

function renderList(conflicts) {
  list.innerHTML = "";
  if (!conflicts.length) {
    empty.hidden = false;
    empty.textContent = "No conflicts in the local archive yet.";
    return;
  }
  empty.hidden = true;
  for (const c of conflicts) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `conflict.html?id=${encodeURIComponent(c.id)}`;
    a.textContent = `${c.hostname} · ${c.severity || "conflict"} · ${c.lastSeenAt || c.checkedAt || ""}`;
    li.appendChild(a);
    if (c.id === focusId) li.style.fontWeight = "700";
    list.appendChild(li);
  }
}

try {
  lead.textContent = "Loading archive…";
  const conflicts = await listConflicts();
  renderList(conflicts);
  if (focusId) {
    renderDetail((await getConflict(focusId)) || null);
  } else if (conflicts[0]) {
    renderDetail(conflicts[0]);
  } else {
    lead.textContent = "No conflict selected.";
  }
} catch (err) {
  lead.textContent = `Failed to load alert archive: ${
    err instanceof Error ? err.message : String(err)
  }`;
}

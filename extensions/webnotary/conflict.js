import { conflictReasonLabel } from "./lib/conflicts.js";

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
    lead.textContent = "Conflict not found in local history (it may have been cleared).";
    detail.hidden = true;
    return;
  }
  lead.textContent = conflictReasonLabel(c.reason);
  const known = (c.knownCertificateSha256s || [])
    .map(
      (fp) =>
        `<span class="fp mono">${escapeHtml(fp)} <button type="button" data-copy="${escapeHtml(fp)}">Copy</button></span>`,
    )
    .join("") || `<span class="muted">No known fingerprints returned by the API yet.</span>`;

  detail.hidden = false;
  detail.innerHTML = `
    <div><strong>Host</strong> ${escapeHtml(c.hostname)}</div>
    <div style="margin-top:8px"><strong>Your browser leaf</strong></div>
    <span class="fp mono">${escapeHtml(c.certificateSha256)}
      <button type="button" data-copy="${escapeHtml(c.certificateSha256)}">Copy</button>
    </span>
    <div style="margin-top:8px"><strong>Known to WebNotary</strong></div>
    ${known}
    <div class="muted" style="margin-top:10px">
      Detected ${escapeHtml(c.checkedAt || "—")}
      ${c.reason ? ` · reason <code>${escapeHtml(c.reason)}</code>` : ""}
    </div>
    <p class="muted" style="margin:10px 0 0">
      Large CDNs (e.g. Google) often present different leaves by edge/POP.
      A conflict means WebNotary’s observer evidence does not match <em>this</em> leaf — not that the site failed PKI.
    </p>
  `;
  detail.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => copyText(btn.getAttribute("data-copy") || ""));
  });
}

function renderList(conflicts) {
  list.innerHTML = "";
  if (!conflicts.length) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  for (const c of conflicts) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `conflict.html?id=${encodeURIComponent(c.id)}`;
    a.textContent = `${c.hostname} · ${c.checkedAt || ""}`;
    li.appendChild(a);
    if (c.id === focusId) {
      li.style.fontWeight = "700";
    }
    list.appendChild(li);
  }
}

const res = await chrome.runtime.sendMessage({ type: "LIST_CONFLICTS" });
const conflicts = res?.conflicts || [];
renderList(conflicts);

if (focusId) {
  const one = await chrome.runtime.sendMessage({ type: "GET_CONFLICT", id: focusId });
  renderDetail(one?.conflict || null);
} else if (conflicts[0]) {
  renderDetail(conflicts[0]);
  lead.textContent = conflictReasonLabel(conflicts[0].reason);
} else {
  lead.textContent = "No conflict selected.";
}

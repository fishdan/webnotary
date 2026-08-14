import {
  clearConflicts,
  conflictReasonLabel,
  formatConflictsArchive,
  listConflicts,
  MAX_CONFLICTS,
} from "./lib/conflicts.js";

const checkUrlEl = document.getElementById("checkUrl");
const msgEl = document.getElementById("msg");
const alertsEl = document.getElementById("alerts");
const emptyEl = document.getElementById("empty");

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shortTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function renderAlerts(conflicts) {
  alertsEl.innerHTML = "";
  if (!conflicts.length) {
    emptyEl.classList.add("show");
    return;
  }
  emptyEl.classList.remove("show");

  for (const c of conflicts.slice(0, MAX_CONFLICTS)) {
    const known = c.knownCertificateSha256s || [];
    const cause = c.reasonLabel || conflictReasonLabel(c.reason);
    const article = document.createElement("article");
    article.className = "alert";
    article.innerHTML = `
      <header>
        <span class="host">${escapeHtml(c.hostname || "—")}</span>
        <span class="when">${escapeHtml(shortTime(c.checkedAt))}</span>
      </header>
      <div class="cause">${escapeHtml(cause)}</div>
      ${c.reason ? `<div class="label">Code: <code>${escapeHtml(c.reason)}</code></div>` : ""}
      <div class="label" style="margin-top:0.5rem">Your browser leaf</div>
      <span class="fp mono">${escapeHtml(c.certificateSha256 || "—")}</span>
      <div class="label" style="margin-top:0.5rem">Known to WebNotary</div>
      ${
        known.length
          ? known
              .map((fp) => `<span class="fp mono">${escapeHtml(fp)}</span>`)
              .join("")
          : `<span class="muted">(none returned)</span>`
      }
    `;
    alertsEl.appendChild(article);
  }
}

async function loadSettings() {
  const res = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  checkUrlEl.value = res?.settings?.checkUrl || "";
}

async function loadAlerts() {
  const conflicts = await listConflicts();
  renderAlerts(conflicts);
}

document.getElementById("save").addEventListener("click", async () => {
  const checkUrl = checkUrlEl.value.trim();
  const res = await chrome.runtime.sendMessage({
    type: "SAVE_SETTINGS",
    payload: { checkUrl },
  });
  msgEl.textContent = res?.ok ? "Saved." : res?.error || "Save failed";
});

document.getElementById("download").addEventListener("click", async () => {
  const conflicts = await listConflicts();
  const text = formatConflictsArchive(conflicts);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  a.href = url;
  a.download = `webnotary-conflicts-${stamp}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("clear").addEventListener("click", async () => {
  if (!confirm(`Clear all stored conflict alerts (up to ${MAX_CONFLICTS})?`)) {
    return;
  }
  await clearConflicts();
  renderAlerts([]);
  msgEl.textContent = "Alert archive cleared.";
});

loadSettings();
loadAlerts();

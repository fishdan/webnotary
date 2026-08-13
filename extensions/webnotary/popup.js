const statusEl = document.getElementById("status");
const metaEl = document.getElementById("meta");
const recheckBtn = document.getElementById("recheck");

function render(state) {
  if (!state) {
    statusEl.textContent = "No data yet";
    statusEl.className = "status";
    metaEl.textContent = "Navigate to an https page, then open this popup.";
    recheckBtn.disabled = true;
    return;
  }
  statusEl.textContent = String(state.status || "—").toUpperCase();
  statusEl.className = `status ${state.status || ""}`;
  const fp = state.certificateSha256
    ? `${state.certificateSha256.slice(0, 16)}…`
    : "—";
  metaEl.innerHTML = `
    <div><strong>Host</strong> ${escapeHtml(state.hostname || "—")}</div>
    <div><strong>Fingerprint</strong> ${escapeHtml(fp)}</div>
    <div><strong>Checked</strong> ${escapeHtml(state.checkedAt || "—")}</div>
    <div><strong>Cache</strong> ${escapeHtml(state.cacheReason || state.cacheAction || "—")}</div>
    ${state.error ? `<div><strong>Error</strong> ${escapeHtml(state.error)}</div>` : ""}
  `;
  recheckBtn.disabled = !state.certificateSha256;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function activeTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function refresh() {
  const tabId = await activeTabId();
  if (tabId == null) {
    render(null);
    return;
  }
  const res = await chrome.runtime.sendMessage({ type: "GET_TAB_STATE", tabId });
  render(res?.state || null);
}

recheckBtn.addEventListener("click", async () => {
  recheckBtn.disabled = true;
  const tabId = await activeTabId();
  const res = await chrome.runtime.sendMessage({ type: "RECHECK_TAB", tabId });
  if (!res?.ok) {
    statusEl.textContent = "ERROR";
    statusEl.className = "status error";
    metaEl.textContent = res?.error || "recheck failed";
  } else {
    render(res.state);
  }
  recheckBtn.disabled = false;
});

refresh();

const statusEl = document.getElementById("status");
const metaEl = document.getElementById("meta");
const explainEl = document.getElementById("explain");
const hintEl = document.getElementById("hint");
const recheckBtn = document.getElementById("recheck");
const reloadBtn = document.getElementById("reload");
const detailsBtn = document.getElementById("details");

function render(state) {
  if (!state) {
    statusEl.textContent = "No data yet";
    statusEl.className = "status";
    explainEl.hidden = true;
    hintEl.hidden = false;
    hintEl.textContent =
      "Open an https site and reload the tab after installing or reloading WebNotary.";
    detailsBtn.hidden = true;
    reloadBtn.hidden = false;
    metaEl.textContent = "";
    recheckBtn.disabled = true;
    return;
  }

  const hasCert = Boolean(state.certificateSha256);
  const isConflict = state.status === "conflict";
  const unavailable = state.status === "n/a" || (!hasCert && state.error);
  const severity = state.conflictSeverity || "";

  statusEl.textContent = unavailable
    ? "UNAVAILABLE"
    : isConflict && severity === "info"
      ? "CONFLICT (INFO)"
      : isConflict && severity === "attention"
        ? "PATH MISMATCH"
        : String(state.status || "—").toUpperCase();
  statusEl.className = `status ${unavailable ? "n/a" : state.status || ""}`;

  if (isConflict && hasCert) {
    explainEl.hidden = false;
    explainEl.textContent =
      state.conflictSummary ||
      state.conflictExplain ||
      "Your browser accepted a certificate that differs from WebNotary public observation.";
    detailsBtn.hidden = false;
    detailsBtn.dataset.conflictId = state.conflictId || "";
  } else {
    explainEl.hidden = true;
    detailsBtn.hidden = true;
  }

  if (state.restricted) {
    hintEl.hidden = false;
    hintEl.textContent = state.error;
    reloadBtn.hidden = true;
  } else if (state.needsReload || (!hasCert && state.error)) {
    hintEl.hidden = false;
    hintEl.textContent =
      state.error ||
      "Reload this page so WebNotary can capture the leaf certificate, then reopen the popup.";
    reloadBtn.hidden = false;
  } else if (state.recovered) {
    hintEl.hidden = false;
    hintEl.textContent =
      "Restored last known fingerprint from local cache (service worker had restarted). Recheck is available.";
    reloadBtn.hidden = true;
  } else {
    hintEl.hidden = true;
    reloadBtn.hidden = true;
  }

  const fp = state.certificateSha256 || "—";
  const known = Array.isArray(state.knownCertificateSha256s)
    ? state.knownCertificateSha256s
    : [];
  const knownHtml =
    known.length > 0
      ? known
          .map((k) => `<div class="mono">${escapeHtml(k)}</div>`)
          .join("")
      : isConflict && hasCert
        ? `<div>(no known fingerprints in this response)</div>`
        : "";

  metaEl.innerHTML = `
    <div><strong>Host</strong> ${escapeHtml(state.hostname || "—")}</div>
    ${
      hasCert
        ? `<div><strong>Certificate your browser sees (PKI-accepted)</strong></div><div class="mono">${escapeHtml(fp)}</div>`
        : ""
    }
    ${
      isConflict && hasCert
        ? `<div style="margin-top:6px"><strong>Public observation (WebNotary)</strong></div>${knownHtml}
           ${severity ? `<div><strong>Severity</strong> ${escapeHtml(severity)}</div>` : ""}`
        : ""
    }
    ${state.checkedAt ? `<div><strong>Checked</strong> ${escapeHtml(state.checkedAt)}</div>` : ""}
    ${
      state.cacheReason
        ? `<div><strong>Cache</strong> ${escapeHtml(state.cacheReason)}</div>`
        : ""
    }
    ${
      state.error && !state.restricted && hasCert
        ? `<div><strong>Error</strong> ${escapeHtml(state.error)}</div>`
        : ""
    }
  `;
  recheckBtn.disabled = !hasCert;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function refresh() {
  const tab = await activeTab();
  if (tab?.id == null) {
    render(null);
    return;
  }
  const res = await chrome.runtime.sendMessage({
    type: "GET_TAB_STATE",
    tabId: tab.id,
    tabUrl: tab.url,
  });
  render(res?.state || null);
}

recheckBtn.addEventListener("click", async () => {
  recheckBtn.disabled = true;
  const tab = await activeTab();
  const res = await chrome.runtime.sendMessage({
    type: "RECHECK_TAB",
    tabId: tab?.id,
    tabUrl: tab?.url,
  });
  if (!res?.ok) {
    statusEl.textContent = "ERROR";
    statusEl.className = "status error";
    explainEl.hidden = true;
    hintEl.hidden = false;
    hintEl.textContent = res?.error || "recheck failed";
  } else {
    render(res.state);
  }
  recheckBtn.disabled = false;
});

reloadBtn.addEventListener("click", async () => {
  const tab = await activeTab();
  if (tab?.id == null) return;
  await chrome.tabs.reload(tab.id);
  window.close();
});

detailsBtn.addEventListener("click", () => {
  const id = detailsBtn.dataset.conflictId;
  const url = chrome.runtime.getURL(
    id ? `conflict.html?id=${encodeURIComponent(id)}` : "conflict.html",
  );
  chrome.tabs.create({ url });
});

refresh();

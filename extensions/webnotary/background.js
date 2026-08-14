import {
  computeExpiresAt,
  getSettings,
  getTabState,
  getTrust,
  planCheck,
  putTabState,
  putTrust,
  saveSettings,
} from "./lib/cache.js";
import { postCheck } from "./lib/check.js";
import {
  conflictReasonLabel,
  recordConflict,
  shouldStickyNotify,
} from "./lib/conflicts.js";
import {
  describeCheckBlocker,
  hostnameFromUrl,
  leafFingerprintFromSecurityInfo,
} from "./lib/fingerprint.js";

/** @type {Map<number, object>} */
const tabState = new Map();

async function rememberTabState(tabId, state) {
  tabState.set(tabId, state);
  try {
    await putTabState(tabId, state);
  } catch (e) {
    console.warn("persist tab state failed", e);
  }
  return state;
}

/**
 * Resolve state for popup/recheck: memory → session → trust cache by tab URL.
 */
async function resolveTabState(tabId, tabUrl) {
  let state = tabState.get(tabId) || (await getTabState(tabId));
  if (state?.certificateSha256) {
    tabState.set(tabId, state);
    return { state, blocker: null };
  }

  const blocker = describeCheckBlocker(tabUrl);
  if (blocker.blocked) {
    return {
      state: {
        status: "n/a",
        hostname: blocker.hostname || tabUrl || "",
        certificateSha256: "",
        error: blocker.message,
        checkedAt: null,
        cacheReason: blocker.code,
        needsReload: false,
        restricted: true,
      },
      blocker,
    };
  }

  if (state && !state.certificateSha256) {
    return { state: { ...state, needsReload: true }, blocker: null };
  }

  try {
    const hostname = hostnameFromUrl(tabUrl);
    const trust = await getTrust(hostname);
    if (trust?.certificateSha256) {
      const recovered = {
        hostname,
        certificateSha256: trust.certificateSha256,
        status: trust.status,
        checkedAt: trust.validatedAt,
        cacheAction: "use_cache",
        cacheReason: "recovered_from_trust",
        conflictReason: trust.conflictReason,
        conflictSeverity: trust.conflictSeverity,
        conflictExplain:
          trust.conflictSummary ||
          (trust.conflictReason
            ? conflictReasonLabel(trust.conflictReason, trust.conflictSeverity)
            : undefined),
        conflictSummary: trust.conflictSummary,
        knownCertificateSha256s: trust.knownCertificateSha256s || [],
        conflictId: trust.conflictId,
        recovered: true,
      };
      await rememberTabState(tabId, recovered);
      return { state: recovered, blocker: null };
    }
    return {
      state: {
        status: "n/a",
        hostname,
        certificateSha256: "",
        error:
          "No certificate captured for this tab yet. Reload the page after installing or reloading WebNotary, then reopen this popup.",
        checkedAt: null,
        cacheReason: "needs_reload",
        needsReload: true,
      },
      blocker: null,
    };
  } catch (e) {
    return {
      state: {
        status: "n/a",
        hostname: tabUrl || "",
        certificateSha256: "",
        error: e instanceof Error ? e.message : String(e),
        needsReload: false,
      },
      blocker: null,
    };
  }
}

function setBadge(tabId, status, severity) {
  if (tabId < 0) return;
  if (status === "valid") {
    chrome.action.setBadgeText({ tabId, text: "" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#1b7f4e" });
    chrome.action.setTitle({ tabId, title: "WebNotary: valid" });
  } else if (status === "unknown") {
    chrome.action.setBadgeText({ tabId, text: "?" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#c48a00" });
    chrome.action.setTitle({ tabId, title: "WebNotary: unknown" });
  } else if (status === "conflict") {
    if (severity === "info") {
      chrome.action.setBadgeText({ tabId, text: "~" });
      chrome.action.setBadgeBackgroundColor({ tabId, color: "#6b7280" });
      chrome.action.setTitle({
        tabId,
        title: "WebNotary: multi-cert difference (info) — open popup",
      });
    } else {
      chrome.action.setBadgeText({ tabId, text: "!" });
      chrome.action.setBadgeBackgroundColor({ tabId, color: "#b00020" });
      chrome.action.setTitle({
        tabId,
        title: "WebNotary: path mismatch — open popup for details",
      });
    }
  } else {
    chrome.action.setBadgeText({ tabId, text: "" });
    chrome.action.setTitle({ tabId, title: "WebNotary" });
  }
}

function shortFp(fp) {
  if (!fp || fp.length < 16) return fp || "—";
  return `${fp.slice(0, 12)}…${fp.slice(-8)}`;
}

async function maybeNotifyConflict(record) {
  if (!shouldStickyNotify(record.severity)) {
    return;
  }
  const known = record.knownCertificateSha256s || [];
  const knownLine =
    known.length > 0
      ? `Public observation: ${known.map(shortFp).join(", ")}`
      : "Open WebNotary for full fingerprints.";
  const message = [
    record.summary || conflictReasonLabel(record.reason, record.severity),
    `Your browser (PKI-accepted): ${shortFp(record.certificateSha256)}`,
    knownLine,
  ].join("\n");

  try {
    const notificationId = `webnotary-conflict:${record.id}`;
    await chrome.notifications.create(notificationId, {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: `WebNotary path mismatch: ${record.hostname}`,
      message,
      contextMessage: "Stays until dismissed — click for details",
      priority: 2,
      requireInteraction: true,
      buttons: [{ title: "Open details" }],
    });
  } catch (e) {
    console.warn("notification failed", e);
  }
}

async function handleConflictResult({
  hostname,
  certificateSha256,
  conflict,
  tabId,
  checkedAt,
}) {
  const knownCertificateSha256s = conflict?.knownCertificateSha256s || [];
  const reason = conflict?.reason;
  const severity = conflict?.severity || "attention";
  const summary = conflict?.summary;
  const signals = conflict?.signals;
  const { record, isNew, changed } = await recordConflict({
    hostname,
    certificateSha256,
    knownCertificateSha256s,
    reason,
    severity,
    summary,
    signals,
    checkedAt,
    tabId,
  });
  if (isNew || changed) {
    await maybeNotifyConflict(record);
  }
  return {
    conflictReason: reason,
    conflictSeverity: severity,
    conflictExplain: summary || conflictReasonLabel(reason, severity),
    conflictSummary: summary,
    knownCertificateSha256s,
    conflictId: record.id,
    conflictSeenCount: record.seenCount,
  };
}

async function applyCheckResult(settings, stateBase, result, tabId) {
  const validatedAt = new Date().toISOString();
  const expiresAt =
    result.status === "valid"
      ? computeExpiresAt(settings, validatedAt, undefined)
      : new Date(Date.now() + settings.recheckCooldownMs).toISOString();

  let conflictFields = {};
  if (result.status === "conflict") {
    conflictFields = await handleConflictResult({
      hostname: stateBase.hostname,
      certificateSha256: stateBase.certificateSha256,
      conflict: result.conflict,
      tabId,
      checkedAt: validatedAt,
    });
  }

  await putTrust({
    hostname: stateBase.hostname,
    certificateSha256: stateBase.certificateSha256,
    status: result.status,
    validatedAt,
    expiresAt,
    conflictReason: conflictFields.conflictReason,
    conflictSeverity: conflictFields.conflictSeverity,
    conflictSummary: conflictFields.conflictSummary,
    knownCertificateSha256s: conflictFields.knownCertificateSha256s,
    conflictId: conflictFields.conflictId,
  });

  const next = {
    ...stateBase,
    status: result.status,
    checkedAt: validatedAt,
    ...conflictFields,
  };
  tabState.set(tabId, next);
  setBadge(tabId, result.status, conflictFields.conflictSeverity);
  await putTabState(tabId, next);
  return next;
}

async function evaluateNavigation(details) {
  if (details.tabId < 0) return;
  if (details.type !== "main_frame") return;

  let hostname;
  let certificateSha256;
  try {
    hostname = hostnameFromUrl(details.url);
    certificateSha256 = leafFingerprintFromSecurityInfo(details.securityInfo);
  } catch (e) {
    await rememberTabState(details.tabId, {
      hostname: details.url,
      certificateSha256: "",
      status: "n/a",
      error: e instanceof Error ? e.message : String(e),
      checkedAt: new Date().toISOString(),
      needsReload: false,
    });
    setBadge(details.tabId, null);
    return;
  }

  const settings = await getSettings();
  const cached = await getTrust(hostname);
  const plan = planCheck(settings, cached, certificateSha256);

  let status = cached?.status;
  let error;
  let conflictFields = {};

  if (plan.action === "use_cache") {
    status = plan.entry.status;
    if (status === "conflict") {
      conflictFields = {
        conflictReason: cached.conflictReason,
        conflictSeverity: cached.conflictSeverity,
        conflictExplain:
          cached.conflictSummary ||
          conflictReasonLabel(cached.conflictReason, cached.conflictSeverity),
        conflictSummary: cached.conflictSummary,
        knownCertificateSha256s: cached.knownCertificateSha256s || [],
        conflictId: cached.conflictId,
      };
    }
  } else {
    try {
      const result = await postCheck(
        settings.checkUrl,
        hostname,
        certificateSha256,
      );
      status = result.status;
      const validatedAt = new Date().toISOString();
      const expiresAt =
        status === "valid"
          ? computeExpiresAt(settings, validatedAt, undefined)
          : new Date(
              Date.now() + settings.recheckCooldownMs,
            ).toISOString();

      let extraTrust = {};
      if (status === "conflict") {
        conflictFields = await handleConflictResult({
          hostname,
          certificateSha256,
          conflict: result.conflict,
          tabId: details.tabId,
          checkedAt: validatedAt,
        });
        extraTrust = {
          conflictReason: conflictFields.conflictReason,
          conflictSeverity: conflictFields.conflictSeverity,
          conflictSummary: conflictFields.conflictSummary,
          knownCertificateSha256s: conflictFields.knownCertificateSha256s,
          conflictId: conflictFields.conflictId,
        };
      }

      await putTrust({
        hostname,
        certificateSha256,
        status,
        validatedAt,
        expiresAt,
        ...extraTrust,
      });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      status = "error";
    }
  }

  await rememberTabState(details.tabId, {
    hostname,
    certificateSha256,
    status: status || "unknown",
    error,
    checkedAt: new Date().toISOString(),
    cacheAction: plan.action,
    cacheReason: plan.reason,
    ...conflictFields,
  });
  setBadge(
    details.tabId,
    status === "error" ? "unknown" : status,
    conflictFields.conflictSeverity,
  );
}

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    evaluateNavigation(details).catch((err) =>
      console.warn("evaluateNavigation failed", err),
    );
  },
  { urls: ["https://*/*"], types: ["main_frame"] },
  ["securityInfo"],
);

function openConflictDetails(notificationId) {
  const prefix = "webnotary-conflict:";
  const id = notificationId.startsWith(prefix)
    ? notificationId.slice(prefix.length)
    : "";
  const url = chrome.runtime.getURL(
    id ? `options.html#alert=${encodeURIComponent(id)}` : "options.html",
  );
  chrome.tabs.create({ url });
}

chrome.notifications.onClicked.addListener((notificationId) => {
  if (!notificationId.startsWith("webnotary-conflict:")) return;
  openConflictDetails(notificationId);
  chrome.notifications.clear(notificationId);
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (!notificationId.startsWith("webnotary-conflict:")) return;
  if (buttonIndex === 0) openConflictDetails(notificationId);
  chrome.notifications.clear(notificationId);
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === "GET_TAB_STATE") {
      const tabId = msg.tabId;
      const resolved = await resolveTabState(tabId, msg.tabUrl);
      sendResponse({ ok: true, state: resolved.state });
      return;
    }
    if (msg?.type === "GET_SETTINGS") {
      sendResponse({ ok: true, settings: await getSettings() });
      return;
    }
    if (msg?.type === "SAVE_SETTINGS") {
      const settings = await saveSettings(msg.payload || {});
      sendResponse({ ok: true, settings });
      return;
    }
    if (msg?.type === "LIST_CONFLICTS") {
      const { listConflicts } = await import("./lib/conflicts.js");
      sendResponse({ ok: true, conflicts: await listConflicts() });
      return;
    }
    if (msg?.type === "GET_CONFLICT") {
      const { getConflict } = await import("./lib/conflicts.js");
      sendResponse({ ok: true, conflict: await getConflict(msg.id) });
      return;
    }
    if (msg?.type === "CLEAR_CONFLICTS") {
      const { clearConflicts } = await import("./lib/conflicts.js");
      await clearConflicts();
      sendResponse({ ok: true });
      return;
    }
    if (msg?.type === "RECHECK_TAB") {
      const resolved = await resolveTabState(msg.tabId, msg.tabUrl);
      const state = resolved.state;
      if (!state?.hostname || !state.certificateSha256) {
        sendResponse({
          ok: false,
          error:
            state?.error ||
            "No certificate for this tab yet. Reload the page, then try Recheck.",
        });
        return;
      }
      const settings = await getSettings();
      try {
        const result = await postCheck(
          settings.checkUrl,
          state.hostname,
          state.certificateSha256,
        );
        const next = await applyCheckResult(
          settings,
          {
            ...state,
            cacheAction: "check",
            cacheReason: "manual",
          },
          result,
          msg.tabId,
        );
        sendResponse({ ok: true, state: next });
      } catch (e) {
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
      return;
    }
    sendResponse({ ok: false, error: "unknown message" });
  })();
  return true;
});

chrome.runtime.onInstalled.addListener(async () => {
  await saveSettings(await getSettings());
});

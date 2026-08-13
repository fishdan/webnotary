import {
  computeExpiresAt,
  getSettings,
  getTrust,
  planCheck,
  putTrust,
  saveSettings,
} from "./lib/cache.js";
import { postCheck } from "./lib/check.js";
import {
  hostnameFromUrl,
  leafFingerprintFromSecurityInfo,
} from "./lib/fingerprint.js";

/** @type {Map<number, { hostname: string, certificateSha256: string, status: string, error?: string, checkedAt: string }>} */
const tabState = new Map();

function setBadge(tabId, status) {
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
    chrome.action.setBadgeText({ tabId, text: "!" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#b00020" });
    chrome.action.setTitle({ tabId, title: "WebNotary: CONFLICT" });
  } else {
    chrome.action.setBadgeText({ tabId, text: "" });
    chrome.action.setTitle({ tabId, title: "WebNotary" });
  }
}

async function maybeNotifyConflict(hostname) {
  try {
    await chrome.notifications.create(`webnotary-conflict-${hostname}`, {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "WebNotary conflict",
      message: `Certificate for ${hostname} conflicts with WebNotary evidence.`,
      priority: 2,
    });
  } catch (e) {
    console.warn("notification failed", e);
  }
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
    tabState.set(details.tabId, {
      hostname: details.url,
      certificateSha256: "",
      status: "n/a",
      error: e instanceof Error ? e.message : String(e),
      checkedAt: new Date().toISOString(),
    });
    setBadge(details.tabId, null);
    return;
  }

  const settings = await getSettings();
  const cached = await getTrust(hostname);
  const plan = planCheck(settings, cached, certificateSha256);

  let status = cached?.status;
  let error;

  if (plan.action === "use_cache") {
    status = plan.entry.status;
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
      await putTrust({
        hostname,
        certificateSha256,
        status,
        validatedAt,
        expiresAt,
      });
      if (status === "conflict") {
        await maybeNotifyConflict(hostname);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      status = "error";
    }
  }

  tabState.set(details.tabId, {
    hostname,
    certificateSha256,
    status: status || "unknown",
    error,
    checkedAt: new Date().toISOString(),
    cacheAction: plan.action,
    cacheReason: plan.reason,
  });
  setBadge(details.tabId, status === "error" ? "unknown" : status);
}

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    // Fire-and-forget async work; MV3 webRequest is non-blocking.
    evaluateNavigation(details).catch((err) =>
      console.warn("evaluateNavigation failed", err),
    );
  },
  { urls: ["https://*/*"], types: ["main_frame"] },
  ["securityInfo"],
);

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === "GET_TAB_STATE") {
      const tabId = msg.tabId;
      sendResponse({ ok: true, state: tabState.get(tabId) || null });
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
    if (msg?.type === "RECHECK_TAB") {
      // Popup-driven recheck uses last known FP for that tab if present.
      const state = tabState.get(msg.tabId);
      if (!state?.hostname || !state.certificateSha256) {
        sendResponse({ ok: false, error: "no cert state for tab" });
        return;
      }
      const settings = await getSettings();
      try {
        const result = await postCheck(
          settings.checkUrl,
          state.hostname,
          state.certificateSha256,
        );
        const validatedAt = new Date().toISOString();
        const expiresAt =
          result.status === "valid"
            ? computeExpiresAt(settings, validatedAt, undefined)
            : new Date(Date.now() + settings.recheckCooldownMs).toISOString();
        await putTrust({
          hostname: state.hostname,
          certificateSha256: state.certificateSha256,
          status: result.status,
          validatedAt,
          expiresAt,
        });
        const next = {
          ...state,
          status: result.status,
          checkedAt: validatedAt,
          cacheAction: "check",
          cacheReason: "manual",
        };
        tabState.set(msg.tabId, next);
        setBadge(msg.tabId, result.status);
        if (result.status === "conflict") await maybeNotifyConflict(state.hostname);
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

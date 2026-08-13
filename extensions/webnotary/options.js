const checkUrlEl = document.getElementById("checkUrl");
const msgEl = document.getElementById("msg");

async function load() {
  const res = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" });
  checkUrlEl.value = res?.settings?.checkUrl || "";
}

document.getElementById("save").addEventListener("click", async () => {
  const checkUrl = checkUrlEl.value.trim();
  const res = await chrome.runtime.sendMessage({
    type: "SAVE_SETTINGS",
    payload: { checkUrl },
  });
  msgEl.textContent = res?.ok ? "Saved." : res?.error || "Save failed";
});

load();

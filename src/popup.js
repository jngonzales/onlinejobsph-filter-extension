(() => {
  "use strict";

  const DEFAULT_SETTINGS = {
    recommendedOnly: true,
    strictAsync: true,
    minFitScore: 70,
    includeGig: true,
    includeAny: true,
    includeFullTime: false,
    includePartTime: false,
    showRejected: false
  };

  let activeTabId = null;
  let currentSettings = { ...DEFAULT_SETTINGS };

  const $ = (id) => document.getElementById(id);

  function setMessage(text, tone = "") {
    const node = $("message");
    node.textContent = text;
    node.dataset.tone = tone;
  }

  function setConnection(connected, text) {
    $("connectionDot").classList.toggle("connected", connected);
    $("connectionStatus").textContent = text;
  }

  function updateMetrics(state) {
    $("recommendedCount").textContent = state?.recommended ?? "-";
    $("passingCount").textContent = state?.passing ?? "-";
    $("hiddenCount").textContent = state?.hidden ?? "-";
  }

  function applySettingsToForm(settings) {
    currentSettings = { ...DEFAULT_SETTINGS, ...(settings || {}) };
    for (const key of ["recommendedOnly", "strictAsync", "showRejected", "includeGig", "includeAny", "includeFullTime", "includePartTime"]) {
      $(key).checked = Boolean(currentSettings[key]);
    }
    $("minFitScore").value = String(currentSettings.minFitScore);
    $("minFitValue").value = String(currentSettings.minFitScore);
    $("minFitValue").textContent = String(currentSettings.minFitScore);
  }

  function settingsFromForm() {
    return {
      recommendedOnly: $("recommendedOnly").checked,
      strictAsync: $("strictAsync").checked,
      showRejected: $("showRejected").checked,
      minFitScore: Number($("minFitScore").value),
      includeGig: $("includeGig").checked,
      includeAny: $("includeAny").checked,
      includeFullTime: $("includeFullTime").checked,
      includePartTime: $("includePartTime").checked
    };
  }

  function sendToPage(message, callback) {
    if (activeTabId === null) {
      setConnection(false, "Open an OLJ search page");
      setMessage("This popup only works on OnlineJobs.ph search pages.", "warning");
      return;
    }
    chrome.tabs.sendMessage(activeTabId, message, (response) => {
      if (chrome.runtime.lastError || !response?.ready) {
        setConnection(false, "Open an OLJ search page");
        setMessage("Open an OnlineJobs.ph search results page, then reopen this popup.", "warning");
        return;
      }
      setConnection(true, "OnlineJobs.ph search page connected");
      updateMetrics(response);
      if (response.settings) applySettingsToForm(response.settings);
      if (callback) callback(response);
    });
  }

  function refreshState() {
    sendToPage({ type: "GET_STATE" });
  }

  function persistAndApply() {
    currentSettings = settingsFromForm();
    chrome.storage.local.set({ settings: currentSettings }, () => {
      sendToPage({ type: "APPLY_SETTINGS", settings: currentSettings }, (state) => {
        setMessage(`${state.recommended} recommended of ${state.total} cards.`, "success");
      });
    });
  }

  function initialise() {
    chrome.storage.local.get(["settings"], (result) => {
      applySettingsToForm(result?.settings || DEFAULT_SETTINGS);
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        activeTabId = tabs?.[0]?.id ?? null;
        refreshState();
      });
    });
  }

  for (const id of ["recommendedOnly", "strictAsync", "showRejected", "includeGig", "includeAny", "includeFullTime", "includePartTime"]) {
    $(id).addEventListener("change", persistAndApply);
  }

  $("minFitScore").addEventListener("input", () => {
    $("minFitValue").value = $("minFitScore").value;
    $("minFitValue").textContent = $("minFitScore").value;
  });
  $("minFitScore").addEventListener("change", persistAndApply);

  $("rescan").addEventListener("click", () => {
    setMessage("Scanning visible job cards...", "busy");
    sendToPage({ type: "RESCAN" }, (state) => {
      setMessage(`${state.recommended} recommended of ${state.total} cards.`, "success");
    });
  });

  $("deepScan").addEventListener("click", () => {
    const button = $("deepScan");
    button.disabled = true;
    button.textContent = "Scanning one by one...";
    setMessage("Reading visible detail pages locally. No account data is sent.", "busy");
    sendToPage({ type: "DEEP_SCAN" }, (state) => {
      const result = state.deepScanResult || { completed: 0, failed: 0 };
      setMessage(`Deep scan: ${result.completed} read, ${result.failed} unavailable.`, "success");
      button.disabled = false;
      button.textContent = "Deep scan visible";
    });
  });

  initialise();
})();

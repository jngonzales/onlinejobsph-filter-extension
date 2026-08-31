(() => {
  "use strict";

  const scoring = globalThis.OLJSignalScoring;
  const parser = globalThis.OLJSignalParser;
  if (!scoring || !parser) return;

  const MAX_DEEP_SCAN = 20;
  const FETCH_DELAY_MS = 700;
  let settings = scoring.mergeSettings({});
  let records = new Map();
  const detailCache = new Map();
  let scanTimer = null;
  let observer = null;

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function readSettings() {
    return new Promise((resolve) => {
      if (!globalThis.chrome?.storage?.local) return resolve();
      chrome.storage.local.get(["settings"], (result) => {
        settings = scoring.mergeSettings(result?.settings || {});
        resolve();
      });
    });
  }

  function stateSnapshot(extra = {}) {
    const items = [...records.values()];
    return {
      ready: true,
      total: items.length,
      passing: items.filter((item) => item.evaluation.passes).length,
      recommended: items.filter((item) => item.evaluation.recommended).length,
      visible: items.filter((item) => item.visible).length,
      hidden: items.filter((item) => !item.visible).length,
      deepScanned: detailCache.size,
      settings: { ...settings },
      ...extra
    };
  }

  function restoreDisplay(element) {
    if (!element.dataset.oljSignalOriginalDisplay) {
      element.dataset.oljSignalOriginalDisplay = element.style.display || "__empty__";
    }
    const original = element.dataset.oljSignalOriginalDisplay;
    element.style.display = original === "__empty__" ? "" : original;
  }

  function setDisplay(element, visible) {
    if (visible) {
      restoreDisplay(element);
      element.classList.remove("olj-signal-hidden");
    } else {
      if (!element.dataset.oljSignalOriginalDisplay) {
        element.dataset.oljSignalOriginalDisplay = element.style.display || "__empty__";
      }
      element.classList.add("olj-signal-hidden");
    }
  }

  function decorate(item) {
    const { job, evaluation } = item;
    const element = job.element;
    if (!element || !element.isConnected) return;

    element.classList.add("olj-signal-card");
    let badge = element.querySelector(".olj-signal-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.className = "olj-signal-badge";
      element.insertBefore(badge, element.firstChild);
    }

    const badgeState = !evaluation.passes ? "reject" : evaluation.recommended ? "recommended" : "maybe";
    badge.dataset.state = badgeState;
    badge.textContent = `${evaluation.fitScore} fit · ${evaluation.vibecodeability} vibe`;
    badge.title = [...evaluation.reasons, ...evaluation.flags].join(" | ");
    badge.setAttribute("aria-label", `OLJ Signal Filter: ${badge.title}`);

    const visible = evaluation.passes
      ? (!settings.recommendedOnly || evaluation.recommended)
      : settings.showRejected;
    item.visible = visible;
    setDisplay(element, visible);
  }

  function scanNow() {
    const parsed = parser.parseVisibleJobs(document);
    const next = new Map();

    for (const job of parsed) {
      const detail = detailCache.get(job.url);
      const enriched = detail
        ? { ...job, ...detail, url: job.url, element: job.element }
        : job;
      const evaluation = scoring.evaluateJob(enriched, settings);
      const item = { job: enriched, evaluation, visible: false };
      next.set(job.url, item);
      decorate(item);
    }

    for (const previous of records.values()) {
      if (previous.job.element?.isConnected && !next.has(previous.job.url)) {
        setDisplay(previous.job.element, true);
      }
    }

    records = next;
    return stateSnapshot();
  }

  function scheduleScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => scanNow(), 120);
  }

  async function deepScan() {
    const targets = [...records.values()]
      .filter((item) => item.evaluation.passes)
      .slice(0, MAX_DEEP_SCAN);
    let completed = 0;
    let failed = 0;

    for (const item of targets) {
      try {
        const response = await fetch(item.job.url, {
          credentials: "omit",
          headers: { Accept: "text/html" }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        const detail = parser.parseDetailHtml(html, item.job.url);
        if (!detail.description || detail.description.length < 40) {
          throw new Error("full job description unavailable");
        }
        detailCache.set(item.job.url, detail);
        completed += 1;
      } catch {
        failed += 1;
      }
      if (completed + failed < targets.length) await wait(FETCH_DELAY_MS);
    }

    scanNow();
    return stateSnapshot({ deepScanResult: { completed, failed, attempted: targets.length } });
  }

  function applySettings(nextSettings) {
    settings = scoring.mergeSettings(nextSettings);
    if (globalThis.chrome?.storage?.local) {
      chrome.storage.local.set({ settings });
    }
    return scanNow();
  }

  function handleMessage(message, sendResponse) {
    if (!message?.type) return false;
    if (message.type === "GET_STATE") {
      sendResponse(stateSnapshot());
      return false;
    }
    if (message.type === "RESCAN") {
      sendResponse(scanNow());
      return false;
    }
    if (message.type === "APPLY_SETTINGS") {
      sendResponse(applySettings(message.settings));
      return false;
    }
    if (message.type === "DEEP_SCAN") {
      deepScan().then(sendResponse);
      return true;
    }
    return false;
  }

  chrome.runtime.onMessage.addListener(handleMessage);

  readSettings().then(() => {
    scanNow();
    if (document.body) {
      observer = new MutationObserver(scheduleScan);
      observer.observe(document.body, { childList: true, subtree: true });
    }
  });
})();

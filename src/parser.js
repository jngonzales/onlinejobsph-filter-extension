(() => {
  "use strict";

  function clean(value) {
    return String(value || "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  }

  function normalizeJobUrl(value, baseUrl = globalThis.location?.href || "https://www.onlinejobs.ph/") {
    try {
      return new URL(value, baseUrl).href;
    } catch {
      return String(value || "");
    }
  }

  function linesOf(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function valueAfterLabel(lines, labels) {
    const normalized = labels.map((label) => label.toLowerCase());
    const index = lines.findIndex((line) => normalized.some((label) => line.toLowerCase() === label));
    return index >= 0 ? lines[index + 1] || "" : "";
  }

  function parseMeta(rawText = "") {
    const text = clean(rawText);
    const lines = linesOf(rawText);
    const postedMatch = text.match(/Posted on[^\n]+/i);
    return {
      workType: valueAfterLabel(lines, ["TYPE OF WORK", "TYPE OF WORK:"]),
      pay: valueAfterLabel(lines, ["WAGE / SALARY", "WAGE/SALARY", "WAGE / SALARY:"]),
      hours: valueAfterLabel(lines, ["HOURS PER WEEK", "HOURS PER WEEK:"]),
      updated: valueAfterLabel(lines, ["DATE UPDATED", "DATE UPDATED:"]),
      posted: postedMatch ? postedMatch[0].trim() : ""
    };
  }

  function findCardElement(link) {
    let node = link;
    for (let depth = 0; node && depth < 7; depth += 1, node = node.parentElement) {
      const text = clean(node.innerText || node.textContent);
      const links = node.querySelectorAll?.('a[href*="/jobseekers/job/"]') || [];
      const taggedCard = node.matches?.("article, li, [class*='job-card'], [class*='job-card'], [class*='listing'], [class*='card']");
      if (text.length >= 30 && text.length <= 3000 && (taggedCard || (depth >= 1 && links.length === 1))) {
        return node;
      }
    }
    return link.parentElement || link;
  }

  function titleFromCard(card, link) {
    const heading = card.querySelector?.("h1, h2, h3, h4, [class*='title']");
    return clean(heading?.textContent || link.textContent || "Untitled OLJ job");
  }

  function parseVisibleJobs(root = document) {
    const links = [...root.querySelectorAll('a[href*="/jobseekers/job/"]')];
    const seen = new Map();
    for (const link of links) {
      const url = normalizeJobUrl(link.getAttribute("href") || link.href);
      if (!url || seen.has(url)) continue;
      const element = findCardElement(link);
      const rawText = clean(element.innerText || element.textContent);
      const meta = parseMeta(rawText);
      seen.set(url, {
        id: url.match(/(?:-|\/)(\d+)(?:\/?$)/)?.[1] || url,
        url,
        title: titleFromCard(element, link),
        description: rawText,
        snippet: rawText,
        element,
        ...meta
      });
    }
    return [...seen.values()];
  }

  function parseDetailHtml(html, url) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const description = clean(doc.querySelector("#job-description")?.innerText || "");
    const bodyText = clean(doc.body?.innerText || "");
    const meta = parseMeta(bodyText);
    const title = clean(doc.querySelector("h1")?.textContent || doc.title || "");
    return {
      url: normalizeJobUrl(url),
      title,
      description,
      snippet: description,
      ...meta
    };
  }

  globalThis.OLJSignalParser = {
    clean,
    normalizeJobUrl,
    parseMeta,
    parseVisibleJobs,
    parseDetailHtml
  };
})();

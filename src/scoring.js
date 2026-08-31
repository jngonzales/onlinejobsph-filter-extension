(() => {
  "use strict";

  const DEFAULT_SETTINGS = Object.freeze({
    recommendedOnly: true,
    strictAsync: true,
    minFitScore: 70,
    includeGig: true,
    includeAny: true,
    includeFullTime: false,
    includePartTime: false,
    showRejected: false
  });

  const TECH_TERMS = [
    ["Full stack", /\bfull[- ]?stack\b/i],
    ["React", /\breact(?:\.js|js)?\b/i],
    ["Next.js", /\bnext(?:\.js|js)\b/i],
    ["JavaScript", /\bjavascript\b|\bjs\b/i],
    ["TypeScript", /\btypescript\b|\bts\b/i],
    ["Node.js", /\bnode(?:\.js|js)?\b/i],
    ["Python", /\bpython\b/i],
    ["Shopify", /\bshopify\b|\bliquid\b/i],
    ["API", /\bapis?\b|\brest(?:ful)?\b|\bgraphql\b/i],
    ["Automation", /\bautomation\b|\bplaywright\b|\bselenium\b|\bn8n\b|\bmake\.com\b/i],
    ["Scraping", /\bscrap(?:e|ing|er|ers)\b|\bdata extraction\b/i],
    ["AI/LLM", /\bai\b|\bllm\b|\bopenai\b|\bclaude\b|\brag\b|\bmcp\b/i],
    ["QA/testing", /\bqa\b|\btesting\b|\btest automation\b|\be2e\b/i],
    ["Database", /\bdatabase\b|\bpostgres(?:ql)?\b|\bsupabase\b|\bsql\b|\bmysql\b/i],
    ["Web", /\bweb(?:site|app|application)?\b|\bhtml\b|\bcss\b/i]
  ];

  const COMMUNICATION_BLOCKS = [
    ["interview", /\b(?:video|live|phone|technical|screening)?\s*interviews?\b/i],
    ["video or voice requirement", /\b(?:video|voice)\s+(?:call|interview|introduction|submission|meeting)\b/i],
    ["meeting requirement", /\b(?:daily|weekly|regular|recurring|mandatory|scheduled|team|client)\s+(?:a\s+)?meetings?\b/i],
    ["call requirement", /\b(?:daily|weekly|regular|recurring|mandatory|scheduled|client|team)\s+(?:a\s+)?(?:phone\s+)?calls?\b/i],
    ["live platform", /\b(?:zoom|google\s+meet|microsoft\s+teams)\b/i],
    ["standup or sync", /\b(?:daily|weekly|regular|mandatory)?\s*(?:stand[- ]?ups?|syncs?|sprint meetings?)\b/i],
    ["spoken or verbal work", /\b(?:spoken|verbal)\s+(?:english|communication|work)\b/i],
    ["phone or voice support", /\b(?:phone|voice)\s+(?:support|sales|calls?)\b/i],
    ["cold calling", /\bcold[- ]?call(?:ing|s)?\b/i],
    ["talking to clients by voice", /\btalk(?:ing)?\s+(?:to|with)\s+clients?\s+(?:by|over|on)\s+(?:phone|call|video|voice)\b/i]
  ];

  const AI_BAN = /\b(?:no\s+(?:ai|artificial intelligence)|do\s+not\s+use\s+(?:ai|chatgpt)|(?:ai|chatgpt)\s+(?:tools?|assistance|generated communication|use)\s+(?:is|are)?\s*(?:not allowed|prohibited|banned))\b/i;
  const NON_DEV = /\b(?:customer\s+support|virtual\s+assistant|data\s+entry|lead\s+generation|bookkeep(?:er|ing)|executive\s+assistant|administrative\s+assistant|content\s+writer|social\s+media\s+manager)\b/i;
  const PROJECT = /\b(?:project|gig|contract|fixed[- ]?price|milestone|piece\s+work|deliverable|scope)\b/i;
  const BOUNDED = /\b(?:build|create|fix|implement|integrat(?:e|ion)|migrat(?:e|ion)|refactor|scrap(?:e|ing)|dashboard|website|api|crud|test|export|pipeline|workflow)\b/i;
  const ASYNC = /\b(?:async|asynchronous|chat[- ]only|no calls?|no meetings?|written communication|written updates?|slack|discord|documentation|docs)\b/i;
  const PAY = /(?:\$|₱|\b(?:usd|php)\b|\bbudget\b|\brate\b|\bwage\b|\bsalary\b|\bpayment\b|\bfixed\s+(?:price|rate)\b)/i;
  const SPECIFIC = /\b(?:written specs?|requirements?|examples?|acceptance criteria|provided designs?|assets?|test cases?|scope)\b/i;
  const RISK = /\b(?:production ownership|24\s*\/\s*7|on[- ]?call|security|compliance|regulated|hipaa|pci|financial system|medical|high[- ]stakes?)\b/i;

  function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, Math.round(value)));
  }

  function mergeSettings(input = {}) {
    const merged = { ...DEFAULT_SETTINGS, ...(input || {}) };
    merged.minFitScore = clamp(Number(merged.minFitScore) || DEFAULT_SETTINGS.minFitScore, 40, 95);
    for (const key of ["recommendedOnly", "strictAsync", "includeGig", "includeAny", "includeFullTime", "includePartTime", "showRejected"]) {
      merged[key] = Boolean(merged[key]);
    }
    return merged;
  }

  function jobText(job = {}) {
    return [
      job.title,
      job.description,
      job.snippet,
      job.workType,
      job.pay,
      job.hours,
      job.posted,
      job.updated
    ].filter(Boolean).join("\n").replace(/\s+/g, " ").trim();
  }

  function workType(job = {}) {
    return String(job.workType || job.type || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function passesWorkType(job = {}, settings = DEFAULT_SETTINGS) {
    const current = mergeSettings(settings);
    const type = workType(job);
    if (!type) return true;
    if (/gig|project|contract|fixed[- ]?price|piece/.test(type)) return current.includeGig;
    if (/\bany\b/.test(type)) return current.includeAny;
    if (/full[- ]?time/.test(type)) return current.includeFullTime;
    if (/part[- ]?time/.test(type)) return current.includePartTime;
    return true;
  }

  function matchingLabels(pairs, text) {
    return pairs.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
  }

  function evaluateJob(job = {}, settings = DEFAULT_SETTINGS) {
    const current = mergeSettings(settings);
    const text = jobText(job);
    const reasons = [];
    const flags = [];
    const stackMatches = matchingLabels(TECH_TERMS, text);
    const communicationMatches = current.strictAsync ? matchingLabels(COMMUNICATION_BLOCKS, text) : [];
    const projectSignal = PROJECT.test(text);
    const boundedSignal = BOUNDED.test(text);
    const asyncSignal = ASYNC.test(text);
    const paySignal = PAY.test(text);
    const specificSignal = SPECIFIC.test(text);
    const riskMatches = RISK.test(text) ? ["higher delivery risk"] : [];
    const typePass = passesWorkType(job, current);
    const recentPass = job.updatedWithinWindow !== false;
    const hasTechnicalSignal = stackMatches.length > 0;

    if (stackMatches.length) reasons.push(`Stack match: ${stackMatches.slice(0, 4).join(", ")}`);
    if (projectSignal) reasons.push("Project, gig, or milestone signal");
    if (boundedSignal) reasons.push("Bounded deliverable signal");
    if (asyncSignal) reasons.push("Async communication signal");
    if (paySignal) reasons.push("Budget or rate is visible");
    if (!asyncSignal) reasons.push("No live communication signal found; treated as async");
    if (communicationMatches.length) {
      const message = `Rejected communication requirement: ${communicationMatches.join(", ")}`;
      flags.push(message);
      reasons.push(message);
    }
    if (AI_BAN.test(text)) {
      const message = "Rejected: AI tools explicitly prohibited";
      flags.push(message);
      reasons.push(message);
    }
    if (NON_DEV.test(text)) {
      const message = "Rejected: manual, support, or non-development role";
      flags.push(message);
      reasons.push(message);
    }
    if (!typePass) {
      const message = `Rejected work type: ${job.workType || job.type}`;
      flags.push(message);
      reasons.push(message);
    }
    if (!recentPass) {
      const message = "Rejected: outside the verified time window";
      flags.push(message);
      reasons.push(message);
    }
    if (riskMatches.length) flags.push(...riskMatches);
    if (!hasTechnicalSignal) {
      const message = "Rejected: no clear coding, programming, or automation signal";
      flags.push(message);
      reasons.push(message);
    }

    let fitScore = 30;
    fitScore += hasTechnicalSignal ? 25 : 0;
    fitScore += projectSignal ? 15 : 0;
    fitScore += boundedSignal ? 10 : 0;
    fitScore += asyncSignal ? 10 : 5;
    fitScore += paySignal ? 5 : 0;
    fitScore += recentPass ? 5 : -15;
    fitScore -= riskMatches.length * 6;
    if (text.length < 80) fitScore -= 10;
    fitScore = clamp(fitScore);

    let vibecodeability = 35;
    vibecodeability += Math.min(25, stackMatches.length * 8);
    vibecodeability += projectSignal ? 15 : 0;
    vibecodeability += boundedSignal ? 15 : 0;
    vibecodeability += specificSignal ? 10 : 0;
    vibecodeability += paySignal ? 5 : 0;
    vibecodeability += asyncSignal ? 5 : 0;
    vibecodeability -= riskMatches.length * 8;
    if (text.length < 80) vibecodeability -= 15;
    if (NON_DEV.test(text)) vibecodeability -= 25;
    vibecodeability = clamp(vibecodeability);

    const hardPass = Boolean(
      text &&
      hasTechnicalSignal &&
      typePass &&
      recentPass &&
      !communicationMatches.length &&
      !AI_BAN.test(text) &&
      !NON_DEV.test(text)
    );

    if (!hardPass && !reasons.length) reasons.push("Does not meet the current OLJ filters");

    return {
      passes: hardPass,
      recommended: hardPass && fitScore >= current.minFitScore,
      fitScore,
      vibecodeability,
      stackMatches,
      flags,
      reasons,
      signals: {
        project: projectSignal,
        bounded: boundedSignal,
        async: asyncSignal,
        pay: paySignal,
        specific: specificSignal,
        risk: riskMatches.length > 0
      }
    };
  }

  globalThis.OLJSignalScoring = {
    DEFAULT_SETTINGS,
    evaluateJob,
    mergeSettings,
    passesWorkType
  };
})();

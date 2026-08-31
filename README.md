# OLJ Signal Filter

A local, read-only Chrome and Brave extension for filtering OnlineJobs.ph search results to the work JN actually wants.

## What it does

On OnlineJobs.ph search pages, the extension parses visible job cards and adds two scores:

- **Fit**: stack match, work type, project shape, async signals, pay visibility, freshness, and delivery risk.
- **Vibe**: how suitable the task looks for AI-assisted implementation after requirements are understood and the output is reviewed.

The default profile favors:

- Full-stack, React, Next.js, Node.js, TypeScript, Python, Shopify, APIs, automation, scraping, AI/LLM, databases, and testing
- Gig, Any, project, fixed-price, contract, milestone, and clear-deliverable work
- Async written communication
- Work with concrete scope, examples, requirements, and testable acceptance criteria

It hides obvious non-fit listings such as live calls, meetings, interviews, voice/video requirements, AI-banned work, customer support, VA-only work, and non-technical roles.

## Privacy and safety

- No backend, analytics, telemetry, or LLM API
- Uses `chrome.storage.local` for settings only
- Does not read or store passwords, cookies, tokens, or MFA codes
- Does not click Apply, Reply, Send Message, Bookmark, Archive, Delete, or profile controls
- Deep scan fetches visible OLJ detail pages one at a time with credentials omitted
- No requests are made to domains outside OnlineJobs.ph

This extension only helps JN decide which listings to inspect. It does not apply for jobs.

## Install in Chrome or Brave

1. Open `chrome://extensions` in Chrome or `brave://extensions` in Brave.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder:

   `C:\Users\jngon\dev\onlinejobsph-filter-extension`

5. Open an OnlineJobs.ph search page and click the extension icon.

After code changes, click **Reload** on the extension card.

## Controls

- **Recommended only**: hide hard-pass jobs below the minimum fit score.
- **Strict async**: reject live communication requirements.
- **Show rejected**: keep rejected cards visible with a red explanation badge.
- **Minimum fit score**: tune how selective the recommended view is.
- **Gig / Any / Full time / Part time**: choose allowed work types. Full time and Part time are off by default based on JN's application history.
- **Rescan page**: re-read cards after pagination or page changes.
- **Deep scan visible**: fetch up to 20 passing detail pages sequentially to inspect the full description. It does not submit anything.

## Development

No npm dependencies are required.

```bash
npm test
npm run verify
```

The tests cover the scoring rules, work-type gates, communication rejection, metadata parsing, manifest permissions, and extension entry files.

## Relationship to the Python scraper

The existing Python scraper remains the source of the broader authenticated workflow. This extension is a standalone browser-side view for fast local filtering. It mirrors the current filter intent without requiring a Python server or a CDP connection.

The current application-history signals are documented in the canonical Hermes skill and the local OLJ analysis report. They are treated as observations, not guarantees.

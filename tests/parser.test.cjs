const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBrowserScript } = require('./helpers.cjs');

const context = loadBrowserScript('src/parser.js');
const parser = context.OLJSignalParser;

test('parses common OLJ card metadata', () => {
  const meta = parser.parseMeta(`
    TYPE OF WORK
    Gig
    WAGE / SALARY
    $900 fixed
    HOURS PER WEEK
    Flexible
    DATE UPDATED
    Aug 31, 2026
    Posted on Aug 31, 2026, 09:30 AM
  `);

  assert.equal(meta.workType, 'Gig');
  assert.equal(meta.pay, '$900 fixed');
  assert.equal(meta.hours, 'Flexible');
  assert.equal(meta.updated, 'Aug 31, 2026');
  assert.match(meta.posted, /Posted on Aug 31/);
});

test('normalizes relative job URLs without changing external URLs', () => {
  assert.equal(
    parser.normalizeJobUrl('/jobseekers/job/example-123', 'https://v2.onlinejobs.ph/jobseekers/search/c/software'),
    'https://v2.onlinejobs.ph/jobseekers/job/example-123'
  );
  assert.equal(
    parser.normalizeJobUrl('https://www.onlinejobs.ph/jobseekers/job/example-123', 'https://v2.onlinejobs.ph/'),
    'https://www.onlinejobs.ph/jobseekers/job/example-123'
  );
});

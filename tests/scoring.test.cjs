const test = require('node:test');
const assert = require('node:assert/strict');
const fixtures = require('./fixtures/jobs.json');
const { loadBrowserScript } = require('./helpers.cjs');

const context = loadBrowserScript('src/scoring.js');
const scoring = context.OLJSignalScoring;

const defaults = scoring.mergeSettings({});

test('exposes safe recommended defaults', () => {
  assert.equal(defaults.strictAsync, true);
  assert.equal(defaults.recommendedOnly, true);
  assert.equal(defaults.minFitScore, 70);
  assert.equal(defaults.includeFullTime, false);
  assert.equal(defaults.includePartTime, false);
});

test('passes a bounded async full-stack gig', () => {
  const result = scoring.evaluateJob(fixtures[0], defaults);
  assert.equal(result.passes, true);
  assert.equal(result.fitScore >= 70, true);
  assert.equal(result.vibecodeability >= 70, true);
  assert.match(result.reasons.join(' '), /stack|project|async/i);
});

test('passes a bounded Python automation project', () => {
  const result = scoring.evaluateJob(fixtures[1], defaults);
  assert.equal(result.passes, true);
  assert.equal(result.vibecodeability >= 60, true);
});

test('rejects live communication requirements', () => {
  const result = scoring.evaluateJob(fixtures[2], defaults);
  assert.equal(result.passes, false);
  assert.match(result.reasons.join(' '), /call|meeting|zoom/i);
});

test('rejects manual customer support work', () => {
  const result = scoring.evaluateJob(fixtures[3], defaults);
  assert.equal(result.passes, false);
  assert.match(result.reasons.join(' '), /support|coding|technical/i);
});

test('does not mistake normal API calls for phone calls', () => {
  const result = scoring.evaluateJob({
    title: 'Node.js API integration project',
    description: 'Implement REST API calls and write tests from the provided specification.',
    workType: 'Gig',
    pay: '$500 fixed',
    updatedWithinWindow: true
  }, defaults);
  assert.equal(result.passes, true);
});

test('rejects listings that ban AI tools', () => {
  const result = scoring.evaluateJob({
    title: 'React developer',
    description: 'Build the dashboard from written specs. No AI tools or ChatGPT allowed.',
    workType: 'Gig',
    pay: '$800 fixed',
    updatedWithinWindow: true
  }, defaults);
  assert.equal(result.passes, false);
  assert.match(result.reasons.join(' '), /AI tools/i);
});

test('work-type gate keeps full-time and part-time opt-in', () => {
  assert.equal(scoring.passesWorkType({ workType: 'Gig' }, defaults), true);
  assert.equal(scoring.passesWorkType({ workType: 'Full Time' }, defaults), false);
  assert.equal(scoring.passesWorkType({ workType: 'Part Time' }, defaults), false);
  assert.equal(scoring.passesWorkType({ workType: 'Full Time' }, { ...defaults, includeFullTime: true }), true);
});

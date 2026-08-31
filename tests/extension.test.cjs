const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root } = require('./helpers.cjs');

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

test('manifest is a read-only MV3 OLJ extension', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.deepEqual(manifest.host_permissions.sort(), [
    'https://v2.onlinejobs.ph/*',
    'https://www.onlinejobs.ph/*'
  ]);
  assert.equal(manifest.content_scripts.length, 1);
  assert.deepEqual(manifest.content_scripts[0].js, [
    'src/scoring.js',
    'src/parser.js',
    'src/content.js'
  ]);
  assert.equal('background' in manifest, false);
});

test('all extension entry files exist', () => {
  const files = [
    'popup.html',
    'src/popup.js',
    'src/popup.css',
    'src/content.js',
    'src/content.css',
    'src/parser.js',
    'src/scoring.js'
  ];
  for (const file of files) {
    assert.equal(fs.existsSync(path.join(root, file)), true, file);
  }
});

test('extension source has no external runtime URLs', () => {
  const files = ['popup.html', 'src/popup.js', 'src/content.js', 'src/parser.js', 'src/scoring.js'];
  const source = files.map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
  assert.doesNotMatch(source, /https?:\/\/(?!www\.onlinejobs\.ph|v2\.onlinejobs\.ph)/i);
});

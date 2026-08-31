const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

if (manifest.manifest_version !== 3) throw new Error('Manifest V3 is required');
if (JSON.stringify(manifest.permissions || []) !== JSON.stringify(['storage'])) {
  throw new Error('Unexpected permissions');
}
if ((manifest.host_permissions || []).some((value) => !/^https:\/\/(?:www\.|v2\.)?onlinejobs\.ph\/\*$/.test(value))) {
  throw new Error('Unexpected host permission');
}
for (const file of [
  'popup.html',
  'src/popup.js',
  'src/popup.css',
  'src/content.js',
  'src/content.css',
  'src/parser.js',
  'src/scoring.js'
]) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}`);
}

console.log('Extension package structure: OK');
console.log('Permissions: storage only');
console.log(`Content scripts: ${manifest.content_scripts[0].js.join(', ')}`);

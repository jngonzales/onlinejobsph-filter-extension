const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function loadBrowserScript(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const context = {
    console,
    URL,
    setTimeout,
    clearTimeout,
  };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: relativePath });
  return context;
}

module.exports = { root, loadBrowserScript };

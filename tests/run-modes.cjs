// Optional developer check: node tests/run-modes.cjs (no npm dependencies).
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(base, file), 'utf8');
const sources = {html:read('index.html'), css:read('styles.css')};
for (const file of ['data/vocabulary.js','core.js','pairs.js','app.js','data/vocabulary-icons.js','learning.js']) sources[file] = read(file);
const context = vm.createContext({});
vm.runInContext(read('tests/modes.test.js'), context);
const result = context.runModeTests(sources, vm);
console.log(JSON.stringify(result, null, 2));
if (result.failed) process.exitCode = 1;

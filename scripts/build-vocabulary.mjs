import fs from 'node:fs';
import {buildVocabulary} from './extract-vocabulary.mjs';
const source = new URL('../data/source-extracted.json', import.meta.url);
const vocab = buildVocabulary(JSON.parse(fs.readFileSync(source, 'utf8').replace(/^\uFEFF/, '')));
fs.writeFileSync(new URL('../data/vocabulary.json', import.meta.url), JSON.stringify(vocab, null, 2));
fs.writeFileSync(new URL('../data/vocabulary.js', import.meta.url), 'globalThis.FRENCH_VOCAB = ' + JSON.stringify(vocab) + ';\n');
console.log(`已生成 ${vocab.entries.length} 道练习题。`);

// End is text navigation; contiguous phrase generation is an explicit action.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const calcSource = fs.readFileSync(path.join(root, 'calc', 'calc.js'), 'utf8');
const guideSource = fs.readFileSync(path.join(root, 'calc', 'quick-guide.js'), 'utf8');

function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} exists`);
  const open = source.indexOf('{', start);
  let depth = 0, quote = null, escaped = false, lineComment = false, blockComment = false;
  for (let i = open; i < source.length; i++) {
    const ch = source[i], next = source[i + 1];
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && next === '/') { blockComment = false; i++; } continue; }
    if (quote !== null) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && next === '/') { lineComment = true; i++; continue; }
    if (ch === '/' && next === '*') { blockComment = true; i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    if (ch === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

function phraseFixture({ value, history = [], limit = 5, newFirst = false } = {}) {
  const phraseBox = { value };
  let historyRedraws = 0;
  let otherRedraws = 0;
  const context = {
    sHistory: history.slice(),
    optPhraseLimit: limit,
    optNewPhrasesGoFirst: newFirst,
    sVal: () => phraseBox.value,
    document: { getElementById: id => (id === 'phraseBox' ? phraseBox : { innerHTML: '' }) },
    updateHistoryTable: () => { historyRedraws += 1; },
    updateWordBreakdown: () => { otherRedraws += 1; },
    updateEnabledCipherTable: () => { otherRedraws += 1; },
    updateTables: () => { otherRedraws += 1; },
    addPhraseToHistory() { throw new Error('explicit generator must retain direct-append behavior'); },
    addPhraseToHistoryUnshift() { throw new Error('explicit generator must ignore new-phrases-first'); }
  };
  vm.createContext(context);
  vm.runInContext(functionSource(calcSource, 'phraseBoxKeypress'), context, { filename: 'calc/calc.js' });
  vm.runInContext(functionSource(calcSource, 'enterPhraseAsWords'), context, { filename: 'calc/calc.js' });
  return {
    context,
    phraseBox,
    historyRedraws: () => historyRedraws,
    otherRedraws: () => otherRedraws
  };
}

test('key code 35 is native navigation and cannot mutate phrase history', () => {
  const f = phraseFixture({ value: 'stop doing what youre doing', history: ['already here'] });
  f.context.phraseBoxKeypress(35);

  assert.deepEqual(Array.from(f.context.sHistory), ['already here']);
  assert.equal(f.phraseBox.value, 'stop doing what youre doing');
  assert.equal(f.historyRedraws(), 0);
  assert.equal(f.otherRedraws(), 0);
  assert.doesNotMatch(functionSource(calcSource, 'phraseBoxKeypress'), /case\s+35\s*:/);
});

test('the explicit action preserves the repeated-word batch and its exact order', () => {
  const f = phraseFixture({ value: 'stop doing what youre doing' });
  f.context.enterPhraseAsWords();

  assert.deepEqual(Array.from(f.context.sHistory), [
    'stop',
    'stop doing',
    'doing',
    'stop doing what',
    'doing what',
    'what',
    'stop doing what youre',
    'doing what youre',
    'what youre',
    'youre',
    'stop doing what youre doing',
    'doing what youre doing',
    'what youre doing',
    'youre doing'
  ]);
  assert.equal(f.phraseBox.value, 'stop doing what youre doing', 'explicit generation leaves the input intact');
  assert.equal(f.historyRedraws(), 1, 'the batch redraws once');
  assert.equal(f.otherRedraws(), 0);
});

test('normalization, numeric exclusion, direct append, and existing duplicates stay unchanged', () => {
  const f = phraseFixture({
    value: 'alpha   2\tbeta',
    history: ['alpha'],
    limit: 2,
    newFirst: true
  });
  f.context.enterPhraseAsWords();

  assert.deepEqual(Array.from(f.context.sHistory), [
    'alpha',
    'alpha',
    'alpha 2',
    '2 beta',
    'beta'
  ]);
  assert.equal(f.historyRedraws(), 1);
});

test('the visible menu calls the named action and the guide advertises no End shortcut', () => {
  assert.match(functionSource(calcSource, 'createFindMatchesMenu'), /value="Enter As Words" onclick="enterPhraseAsWords\(\)"/);
  assert.doesNotMatch(calcSource, /phraseBoxKeypress\(35\)/);
  assert.doesNotMatch(guideSource, /<span class="qgBold">End<\/span>/);
});

test('served calculator and guide assets use their content hashes', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const [asset, source] of [['calc/calc.js', calcSource], ['calc/quick-guide.js', guideSource]]) {
    const hash = crypto.createHash('sha256').update(source).digest('hex').slice(0, 16);
    assert.match(html, new RegExp(asset.replace('.', '\\.') + '\\?v=' + hash + '(?:"|&)'));
  }
});

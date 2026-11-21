const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const calcSource = fs.readFileSync(path.join(root, 'calc', 'calc.js'), 'utf8');
const initSource = fs.readFileSync(path.join(root, 'calc', 'init-variables.js'), 'utf8');
const cssSource = fs.readFileSync(path.join(root, 'calc', 'styles.css'), 'utf8');
const profileSource = fs.readFileSync(path.join(root, 'calc', 'profile-tab.js'), 'utf8');

function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} exists`);
  const open = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];
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

function historyFixture({ visible = [], full, signedIn = true } = {}) {
  const historyArea = { innerHTML: 'old history markup' };
  const calls = { redraw: 0, flush: 0, disarm: 0, notice: [] };
  const context = {
    console,
    sHistory: visible.slice(),
    userHistory: full === undefined ? [] : full.slice(),
    histDisplayOrder: { stale: true },
    histSelectionMode: false,
    histSelectedPhrases: new Set(),
    document: {
      getElementById(id) { return id === 'HistoryTableArea' ? historyArea : null; },
      querySelectorAll() { return []; },
      querySelector() { return null; }
    },
    updateTables() { calls.redraw++; },
    profileDisarm() { calls.disarm++; },
    displayCalcNotification(message) { calls.notice.push(message); }
  };
  if (signedIn) context.histSyncFlush = () => { calls.flush++; };
  context.window = context;
  vm.createContext(context);
  for (const name of [
    'historyUniquePhrases', 'historyWithoutPhrases', 'histSelectionReset',
    'histSelectionPruneToVisible', 'histSelectionRowCount',
    'historyRemovePhrases', 'histRemoveSelectedClick'
  ]) vm.runInContext(functionSource(calcSource, name), context, { filename: 'calc/calc.js' });
  return { context, calls, historyArea };
}

test('exact phrase removal eliminates every duplicate from visible and filtered canonical history', () => {
  const f = historyFixture({
    visible: ['keep visible', 'remove me', 'remove me'],
    full: ['hidden phrase', 'remove me', 'keep visible', 'remove me']
  });

  const removed = f.context.historyRemovePhrases(['remove me', 'remove me'], true);

  assert.equal(removed, 1, 'the action counts unique phrase identities');
  assert.deepEqual(Array.from(f.context.sHistory), ['keep visible']);
  assert.deepEqual(Array.from(f.context.userHistory), ['hidden phrase', 'keep visible']);
  assert.equal(f.calls.redraw, 1);
  assert.equal(f.calls.flush, 1);
  assert.equal(f.context.histDisplayOrder, null);
});

test('signed-out removal still applies once and never invents an account request', () => {
  const f = historyFixture({ visible: ['alpha', 'beta'], signedIn: false });
  assert.doesNotThrow(() => f.context.historyRemovePhrases(['alpha'], true));
  assert.deepEqual(Array.from(f.context.sHistory), ['beta']);
  assert.equal(f.calls.redraw, 1);
  assert.equal(f.calls.flush, 0);
});

test('removing the last phrase clears stale markup before the single redraw', () => {
  const f = historyFixture({ visible: ['last phrase'], full: ['last phrase'] });
  f.context.historyRemovePhrases(['last phrase'], true);
  assert.deepEqual(Array.from(f.context.sHistory), []);
  assert.deepEqual(Array.from(f.context.userHistory), []);
  assert.equal(f.historyArea.innerHTML, '');
  assert.equal(f.calls.redraw, 1);
  assert.equal(f.calls.flush, 1);
});

test('a redraw prunes selected identities that are no longer visible and disarms removal', () => {
  const f = historyFixture({ visible: ['alpha', 'beta'] });
  f.context.histSelectionMode = true;
  f.context.histSelectedPhrases.add('alpha');
  f.context.histSelectedPhrases.add('beta');

  assert.equal(f.context.histSelectionPruneToVisible(['beta']), true);
  assert.deepEqual(Array.from(f.context.histSelectedPhrases), ['beta']);
  assert.equal(f.calls.disarm, 1);
});

test('armed batch removal mutates nothing on the first activation and applies once on the second', () => {
  const f = historyFixture({ visible: ['alpha', 'alpha', 'beta'], full: ['alpha', 'beta'] });
  f.context.histSelectionMode = true;
  f.context.histSelectedPhrases.add('alpha');
  let armed = null;
  f.context.profileConfirmClick = btn => {
    if (armed === btn) { armed = null; return true; }
    armed = btn;
    return false;
  };
  const button = {};

  f.context.histRemoveSelectedClick(button);
  assert.deepEqual(Array.from(f.context.sHistory), ['alpha', 'alpha', 'beta']);
  assert.equal(f.calls.redraw, 0);
  assert.equal(f.calls.flush, 0);

  f.context.histRemoveSelectedClick(button);
  assert.deepEqual(Array.from(f.context.sHistory), ['beta']);
  assert.deepEqual(Array.from(f.context.userHistory), ['beta']);
  assert.equal(f.calls.redraw, 1);
  assert.equal(f.calls.flush, 1);
  assert.equal(f.context.histSelectionMode, false);
  assert.equal(f.context.histSelectedPhrases.size, 0);
});

test('table selection is explicit, accessible, and absent from ordinary rows', () => {
  const button = functionSource(calcSource, 'histSelectionModeButtonHtml');
  const toolbar = functionSource(calcSource, 'histSelectionToolbarHtml');
  const table = functionSource(calcSource, 'updateHistoryTable');
  assert.match(button, /aria-label="Select history phrases"/);
  assert.match(button, /aria-pressed=/);
  assert.match(toolbar, /role="toolbar"/);
  assert.match(toolbar, /aria-live="polite"/);
  assert.match(toolbar, />Select visible</);
  assert.match(toolbar, />Remove</);
  assert.match(toolbar, />Cancel</);
  assert.match(table, /if \(histSelectionMode\)[\s\S]*?type="checkbox"/);
  assert.match(cssSource, /\.histSelectModeBtn\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/);
  assert.match(cssSource, /\.histBatchBtn\s*\{[\s\S]*?min-height:\s*44px;/);
  assert.match(cssSource, /\.histRowSelected td[\s\S]*?box-shadow:/);
  assert.match(cssSource, /\.histPhraseSelected[\s\S]*?text-decoration:/);
});

test('duplicate selection names both phrase identity and every matching row to assistive technology', () => {
  const refresh = functionSource(calcSource, 'histSelectionRefreshDom');
  const remove = functionSource(calcSource, 'histRemoveSelectedClick');
  assert.match(refresh, /this will remove all " \+ histSelectionRowCount\(\) \+ " matching rows/);
  assert.match(remove, /if \(rows > count\) label \+= " \/ " \+ rows \+ " rows"/);

  const button = {
    innerHTML: 'Remove',
    textContent: 'Remove',
    dataset: {},
    attrs: { 'aria-label': 'Remove 1 selected phrase from history; this will remove all 2 matching rows' },
    classList: { add() {}, remove() {} },
    hasAttribute(name) { return Object.hasOwn(this.attrs, name); },
    getAttribute(name) { return this.hasAttribute(name) ? this.attrs[name] : null; },
    setAttribute(name, value) { this.attrs[name] = String(value); },
    removeAttribute(name) { delete this.attrs[name]; }
  };
  const context = { setTimeout, clearTimeout };
  vm.createContext(context);
  vm.runInContext('var profileArmedBtn = null; var profileArmedTimer = null;', context);
  vm.runInContext(functionSource(profileSource, 'profileDisarm'), context);
  vm.runInContext(functionSource(profileSource, 'profileConfirmClick'), context);

  assert.equal(context.profileConfirmClick(button, 'Remove 1 phrase / 2 rows?'), false);
  assert.equal(button.attrs['aria-label'], 'Remove 1 phrase / 2 rows?');
  assert.equal(context.profileConfirmClick(button, 'Remove 1 phrase / 2 rows?'), true);
  assert.equal(button.attrs['aria-label'], 'Remove 1 selected phrase from history; this will remove all 2 matching rows');
});

test('row x and shift-click share the exact-phrase removal contract', () => {
  assert.match(functionSource(calcSource, 'histDeleteBtnClick'), /historyRemovePhrases\(\[sHistory\[ind\]\], true\)/);
  const clickHandler = initSource.slice(
    initSource.indexOf('// Click on phrase in history table'),
    initSource.indexOf('// Ctrl + Right click on phrase in history table')
  );
  assert.match(clickHandler, /histSelectionMode/);
  assert.match(clickHandler, /historyRemovePhrases\(\[sHistory\[ii\]\], true\)/);
  assert.doesNotMatch(clickHandler, /sHistory\.splice/);
});

test('selection Escape and context-menu guards are present at the delegated event layer', () => {
  assert.match(initSource, /keydown\.histSelection/);
  assert.match(initSource, /histSelectionCancel\(\)/);
  const contextHandler = initSource.slice(
    initSource.indexOf('// Ctrl + Right click on phrase in history table'),
    initSource.indexOf('// Escape is the non-destructive exit')
  );
  assert.match(contextHandler, /histSelectionMode[^\n]*return false/);
});

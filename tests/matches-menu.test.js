// Matches menu cleanup (specs/matches-menu-cleanup.md, revision 8).
// Builds the real menu from calc/calc.js in an isolated VM and checks the
// invariants the spec names: every control kept once with its handler, the
// Find Matches button and the tab run the same thing, the agreed order, and
// restored option values reach the redrawn controls.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const calcSource = fs.readFileSync(path.join(root, 'calc', 'calc.js'), 'utf8');

function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} exists`);
  let depth = 0, quote = null, escaped = false, lineComment = false, blockComment = false;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
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

const DEFAULTS = {
  optNumerologyMode: false, optFiltCrossCipherMatch: true, optFiltSameCipherMatch: false,
  optShowOnlyMatching: false, optLoadUserHistCiphers: true, optNumCalcMethod: 1,
  optGemSubstitutionMode: true, optGemMultCharPos: false, optGemMultCharPosReverse: false,
  optPhraseLimit: 5, dbPageItems: 15, dbScrollItems: 1
};

function buildMenu(overrides = {}) {
  const panel = { innerHTML: '' };
  const context = vm.createContext({
    ...DEFAULTS, ...overrides,
    document: { getElementById: id => (id === 'calcOptionsPanel' ? panel : null) }
  });
  for (const name of ['create_NumCalc', 'create_GemCalc', 'create_PL', 'createFindMatchesMenu']) {
    vm.runInContext(functionSource(calcSource, name), context, { filename: 'calc/calc.js' });
  }
  context.createFindMatchesMenu();
  return panel.innerHTML;
}

// every element carrying an onclick/onchange, as [id-or-label, handler]
function controls(html) {
  const out = [];
  const re = /<(input|button)\b([^>]*)>([^<]*)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[2];
    const handler = (attrs.match(/\bon(?:click|change)="([^"]*)"/) || [])[1];
    if (!handler) continue;
    const id = (attrs.match(/\bid="([^"]*)"/) || [])[1];
    const value = (attrs.match(/\bvalue="([^"]*)"/) || [])[1];
    out.push({ key: id || value || m[3].trim(), handler, attrs });
  }
  return out;
}

// Ids and handlers exactly as shipped at 182d088. Losing or renaming one
// breaks settings restore, the database load path, or the conf_* toggles.
const EXPECTED = {
  chkbox_CCM: 'conf_CCM()', chkbox_SCM: 'conf_SCM()', chkbox_SOM: 'conf_SOM()',
  chkbox_NMD: 'conf_NMD()', chkbox_SWC: 'conf_SWC()',
  chkbox_fullNumCalc: 'conf_NumCalc(1)', chkbox_redNumCalc: 'conf_NumCalc(2)', chkbox_offNumCalc: 'conf_NumCalc(0)',
  chkbox_subGemCalc: 'conf_GemCalc(&quot;sub&quot;)', chkbox_multGemCalc: 'conf_GemCalc(&quot;mult&quot;)',
  chkbox_multRevGemCalc: 'conf_GemCalc(&quot;multRev&quot;)',
  phrLimitBox: 'conf_PL()', dbPageItemsBox: 'conf_DPI()', dbScrollItemsBox: 'conf_DSI()',
  clearDBqueryBtn: 'clearDatabaseQueryTable()', unloadDBBtn: 'unloadDatabase()',
  'Reset Order': 'clearHistMatchSort()', 'Enter As Words': 'enterPhraseAsWords()',
  'Clear History': 'histClearAllBtnClick(this)'
};

test('every existing matches control is present exactly once with its original handler', () => {
  const html = buildMenu();
  const found = controls(html);
  for (const [key, handler] of Object.entries(EXPECTED)) {
    const hits = found.filter(c => c.key === key);
    assert.equal(hits.length, 1, `${key} appears exactly once`);
    assert.equal(hits[0].handler, handler, `${key} keeps its handler`);
  }
  for (const id of Object.keys(EXPECTED).filter(k => !k.includes(' '))) {
    assert.equal(html.split(`id="${id}"`).length - 1, 1, `id ${id} is unique`);
  }
});

test('the Find Matches button runs exactly what the Matches tab runs', () => {
  const found = controls(buildMenu());
  const tab = found.find(c => /findMatchesTab/.test(c.attrs));
  const button = found.find(c => c.key === 'Find Matches');
  assert.ok(tab && button, 'tab and button both exist');
  assert.equal(button.handler, tab.handler);
  assert.match(button.handler, /updateHistoryTableAutoHlt\(\)/);
});

test('the panel follows the agreed order and drops the old hint', () => {
  const html = buildMenu();
  const order = ['value="Find Matches"', 'value="Reset Order"', '>Clear History</button>',
    '>Match</div>', 'id="chkbox_CCM"', '>Input</div>', 'value="Enter As Words"', 'id="phrLimitBox"',
    '>Calculate</div>', 'id="chkbox_fullNumCalc"', 'id="chkbox_subGemCalc"',
    '<details class="qgAcc matchFilesDb">', 'id="chkbox_SWC"', 'id="dbPageItemsBox"',
    'id="dbScrollItemsBox"', 'id="clearDBqueryBtn"', 'id="unloadDBBtn"', '</details>'];
  let at = -1;
  for (const marker of order) {
    const next = html.indexOf(marker);
    assert.ok(next > at, `${marker} comes after the previous item`);
    at = next;
  }
  assert.doesNotMatch(html, /findMatchesHint|Click to Find Matches/);
  assert.doesNotMatch(html, /<details[^>]*\bopen\b/, 'Files & Database starts closed');
  assert.match(html, /class="intBtn intBtnDanger"[^>]*onclick="histClearAllBtnClick\(this\)"/);
});

test('redrawing with restored non-default options shows each restored value', () => {
  const html = buildMenu({
    optNumerologyMode: true, optFiltCrossCipherMatch: false, optFiltSameCipherMatch: true,
    optShowOnlyMatching: true, optLoadUserHistCiphers: false, optNumCalcMethod: 2,
    optGemSubstitutionMode: false, optGemMultCharPos: false, optGemMultCharPosReverse: true,
    optPhraseLimit: 9, dbPageItems: 40, dbScrollItems: 3
  });
  const checked = id => new RegExp(`id="${id}"[^>]*\\schecked\\b`).test(html);
  assert.deepEqual(
    ['chkbox_CCM', 'chkbox_SCM', 'chkbox_SOM', 'chkbox_NMD', 'chkbox_SWC'].map(checked),
    [false, true, true, true, false]);
  assert.deepEqual(
    ['chkbox_fullNumCalc', 'chkbox_redNumCalc', 'chkbox_offNumCalc'].map(checked), [false, true, false]);
  assert.deepEqual(
    ['chkbox_subGemCalc', 'chkbox_multGemCalc', 'chkbox_multRevGemCalc'].map(checked), [false, false, true]);
  assert.match(html, /id="phrLimitBox"[^>]*value="9"/);
  assert.match(html, /id="dbPageItemsBox"[^>]*value="40"/);
  assert.match(html, /id="dbScrollItemsBox"[^>]*value="3"/);
});

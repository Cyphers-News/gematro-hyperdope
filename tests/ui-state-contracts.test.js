const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

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
    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') { blockComment = false; i++; }
      continue;
    }
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

function classList() {
  const values = new Set();
  return {
    toggle(name, force) {
      if (force === undefined) force = !values.has(name);
      if (force) values.add(name); else values.delete(name);
      return force;
    },
    contains: (name) => values.has(name)
  };
}

function chartFixture() {
  const source = read('calc/calc.js');
  const body = { classList: classList() };
  const chart = { classList: classList(), innerHTML: '' };
  const globalInput = { checked: true };
  const focusInput = {
    checked: true,
    getAttribute(name) { return name === 'data-focus-option' ? 'optFocusShowCipherChart' : null; }
  };
  const nodes = { ChartSpot: chart, chkbox_CC: globalInput };
  const context = {
    document: {
      body,
      getElementById: (id) => nodes[id] || null,
      querySelectorAll: () => [focusInput]
    },
    optShowCipherChart: true,
    optFocusShowWordSums: false,
    optFocusShowBreakdown: false,
    optFocusShowCipherChart: true,
    optFocusShowHistoryTable: true,
    redraws: 0
  };
  context.window = context;
  vm.createContext(context);
  for (const name of ['applyFocusModeVisibility', 'applyCipherChartVisibility', 'conf_CC']) {
    vm.runInContext(functionSource(source, name), context, { filename: 'calc/calc.js' });
  }
  context.updateWordBreakdown = function () {
    context.redraws++;
    chart.innerHTML = context.optShowCipherChart ? '<table>chart</table>' : '';
    context.applyCipherChartVisibility();
  };
  return { context, body, chart, globalInput, focusInput };
}

test('cipher chart visibility is projected from restored truth, not inverted dom state', () => {
  const f = chartFixture();
  f.context.optShowCipherChart = false;
  f.chart.classList.toggle('hideValue', false); // fresh dom contradicts restored false
  f.context.applyCipherChartVisibility();

  assert.equal(f.chart.classList.contains('hideValue'), true);
  assert.equal(f.globalInput.checked, false);
  assert.equal(f.body.classList.contains('focusHideCipherChart'), true);

  f.context.conf_CC(true); // one checked activation enables it
  assert.equal(f.context.optShowCipherChart, true);
  assert.equal(f.context.redraws, 1);
  assert.equal(f.chart.innerHTML, '<table>chart</table>');
  assert.equal(f.chart.classList.contains('hideValue'), false);
  assert.equal(f.globalInput.checked, true);
});

test('global and focus chart scopes satisfy every visibility-matrix row', () => {
  const f = chartFixture();
  for (const global of [false, true]) {
    for (const focusMode of [false, true]) {
      for (const focusChoice of [false, true]) {
        f.context.optShowCipherChart = global;
        f.context.optFocusShowCipherChart = focusChoice;
        f.body.classList.toggle('focusMode', focusMode);
        f.context.applyCipherChartVisibility();
        const actual = !f.chart.classList.contains('hideValue') &&
          !(focusMode && f.body.classList.contains('focusHideCipherChart'));
        const expected = global && (!focusMode || focusChoice);
        assert.equal(actual, expected, `global=${global}, focus=${focusMode}, choice=${focusChoice}`);
        assert.equal(f.focusInput.checked, focusChoice);
      }
    }
  }
});

test('settings import reprojects chart and focus state without replaying a toggle', () => {
  const source = read('calc/export-csv.js');
  const context = {
    calcOptionsArr: ["'optShowCipherChart'+' = '+optShowCipherChart"],
    optShowCipherChart: true,
    projected: 0,
    rain: 0,
    console
  };
  context.toggleCodeRain = () => { context.rain++; };
  context.applyCipherChartVisibility = () => { context.projected++; };
  context.window = context;
  vm.createContext(context);
  for (const name of ['calcOptionNames', 'importCalcOptions']) {
    vm.runInContext(functionSource(source, name), context, { filename: 'calc/export-csv.js' });
  }
  context.importCalcOptions(['optShowCipherChart = false']);
  assert.equal(context.optShowCipherChart, false);
  assert.equal(context.projected, 1);
  assert.equal(context.rain, 1);
});

test('redraw entry points project chart state before the empty-cipher return', () => {
  const source = functionSource(read('calc/breakdown.js'), 'updateWordBreakdown');
  const projection = source.indexOf('applyCipherChartVisibility()');
  const earlyReturn = source.indexOf('enabledCiphCount == 0');
  assert.ok(projection !== -1 && projection < earlyReturn);
  assert.match(functionSource(read('calc/breakdown.js'), 'updateCipherChart'), /applyCipherChartVisibility\(\)/);
  assert.match(functionSource(read('calc/breakdown.js'), 'updateCipherChartGemCard'), /applyCipherChartVisibility\(\)/);
});

test('focus chart control is explicitly scoped and live controls are synchronizable', () => {
  const source = read('calc/calc.js');
  assert.match(source, /Cipher chart in focus mode/);
  assert.match(source, /data-focus-option=/);
  assert.match(source, /displayOptionRow\("Cipher Chart", "chkbox_CC", "conf_CC", optShowCipherChart, true\)/);
});

test('changed chart assets are served under their source hashes', () => {
  const html = read('index.html');
  for (const file of ['calc/calc.js', 'calc/breakdown.js', 'calc/export-csv.js']) {
    const key = crypto.createHash('sha256').update(read(file)).digest('hex').slice(0, 16);
    assert.match(html, new RegExp(`${file.replace(/[./-]/g, '\\$&')}\\?v=${key}`));
  }
});

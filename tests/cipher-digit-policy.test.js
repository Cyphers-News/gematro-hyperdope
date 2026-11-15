const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function fixture() {
  const context = {
    console,
    optAllowPhraseComments: false,
    optGemSubstitutionMode: true,
    optGemMultCharPos: false,
    optGemMultCharPosReverse: false,
    optNumCalcMethod: 1,
  };
  vm.createContext(context);
  vm.runInContext(read('calc/gematria.js'), context, { filename: 'calc/gematria.js' });
  vm.runInContext(read('calc/ciphers.js'), context, { filename: 'calc/ciphers.js' });
  return context;
}

test('standard ignores digits in totals and breakdowns', () => {
  const context = fixture();
  const standard = vm.runInContext('cipherList.find((c) => c.cipherName === "Standard")', context);

  assert.equal(standard.ignoreDigits, true);
  assert.equal(standard.calcGematria('32 names of god'), 333);
  assert.equal(standard.calcGematria('32'), 0);

  standard.calcBreakdown('32 names of god');
  assert.deepEqual(Array.from(standard.sumArr), [196, 66, 71]);
  assert.equal(standard.WordCount, 3);
  assert.equal(standard.LetterCount, 10);
  assert.ok(!standard.cp.some((part) => typeof part === 'string' && part.startsWith('num')));

  standard.calcBreakdown('a1b');
  assert.deepEqual(Array.from(standard.sumArr), [3]);
  assert.equal(standard.WordCount, 1, 'an ignored digit does not split a word');

  context.optNumCalcMethod = 2;
  assert.equal(standard.calcGematria('32 names of god'), 333);
});

test('digit policy is narrow and survives import and old workspace restore', () => {
  const context = fixture();
  const ordinal = vm.runInContext('cipherList.find((c) => c.cipherName === "Ordinal")', context);
  assert.equal(ordinal.calcGematria('32'), 32, 'ordinary ciphers retain full-number fallback');
  context.optNumCalcMethod = 2;
  assert.equal(ordinal.calcGematria('32'), 5, 'ordinary ciphers retain reduced-digit fallback');

  const imported = vm.runInContext(
    'cipherFromArgString("\\\"Synthetic\\\",\\\"Test\\\",0,50,50,[97],[1],true,false,false,null,true")',
    context,
  );
  assert.equal(imported.ignoreDigits, true);
  assert.equal(imported.calcGematria('1a2'), 1);

  vm.runInContext(`
    var shippedStandard = cipherList.find(function (c) { return c.cipherName === "Standard" })
    cipherList = [new cipher(
      shippedStandard.cipherName, shippedStandard.cipherCategory,
      shippedStandard.H, shippedStandard.S, shippedStandard.L,
      shippedStandard.cArr.slice(), shippedStandard.vArr.slice(),
      shippedStandard.diacriticsAsRegular, shippedStandard.enabled,
      shippedStandard.caseSensitive
    )]
    mergeBuiltinCiphers()
  `, context);
  const restored = vm.runInContext('cipherList.find((c) => c.cipherName === "Standard")', context);
  assert.equal(restored.ignoreDigits, true, 'an untouched stored Standard adopts shipped input policy');
  assert.equal(restored.calcGematria('32 names of god'), 333);

  const exportSource = read('calc/export.js');
  const exportStart = exportSource.indexOf('function exportCiphersDB(');
  const exportEnd = exportSource.indexOf('\n// The options block', exportStart);
  assert.notEqual(exportStart, -1);
  assert.notEqual(exportEnd, -1);
  vm.runInContext(exportSource.slice(exportStart, exportEnd), context, { filename: 'calc/export.js' });
  context.exportCalcOptions = () => '';
  vm.runInContext('cipherList = [cipherList.find((c) => c.cipherName === "Standard")]', context);
  const exported = vm.runInContext('exportCiphersDB(true)', context);
  const argsStart = exported.indexOf('new cipher(') + 'new cipher('.length;
  const argsEnd = exported.lastIndexOf('\n\t)\n]');
  const roundTripped = context.cipherFromArgString(exported.slice(argsStart, argsEnd));
  assert.equal(roundTripped.ignoreDigits, true, 'export/import preserves the input policy');
  assert.equal(roundTripped.calcGematria('32 names of god'), 333);
});

test('changed cipher assets are served under their source hashes', () => {
  const html = read('index.html');
  assert.match(html, /calc\/gematria\.js\?v=15114877ebed/);
  assert.match(html, /calc\/ciphers\.js\?v=7b41dd90dd5a/);
});

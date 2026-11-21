const assert = require('node:assert/strict');
const crypto = require('node:crypto');
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

test('standard follows the shared Numbers setting in totals and breakdowns', () => {
  const context = fixture();
  const standard = vm.runInContext('cipherList.find((c) => c.cipherName === "Standard")', context);

  assert.equal(standard.ignoreDigits, false);
  assert.equal(standard.calcGematria('32 names of god'), 365);
  assert.equal(standard.calcGematria('32'), 32);

  standard.calcBreakdown('32 names of god');
  assert.deepEqual(Array.from(standard.sumArr), [32, 196, 66, 71]);
  assert.equal(standard.WordCount, 4);
  assert.equal(standard.LetterCount, 10);
  assert.ok(standard.cp.some((part) => part === 'num32'));

  context.optNumCalcMethod = 2;
  assert.equal(standard.calcGematria('32 names of god'), 338);
  standard.calcBreakdown('32 names of god');
  assert.deepEqual(Array.from(standard.sumArr), [5, 196, 66, 71]);

  context.optNumCalcMethod = 0;
  assert.equal(standard.calcGematria('32 names of god'), 333);
  assert.equal(standard.calcGematria('32'), 0);
});

test('explicit custom digit policy survives import while shipped Standard clears the stale override', () => {
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
      shippedStandard.caseSensitive, null, true
    )]
    mergeBuiltinCiphers()
  `, context);
  const restored = vm.runInContext('cipherList.find((c) => c.cipherName === "Standard")', context);
  assert.equal(restored.ignoreDigits, false, 'an untouched stored Standard adopts the corrected shipped input policy');
  context.optNumCalcMethod = 1;
  assert.equal(restored.calcGematria('32 names of god'), 365);

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
  assert.equal(roundTripped.ignoreDigits, false, 'export/import preserves the corrected input policy');
  assert.equal(roundTripped.calcGematria('32 names of god'), 365);
});

test('the guide tells new users exactly how typed numbers enter a calculation', () => {
  const guide = read('calc/quick-guide.js');
  assert.match(guide, /Reduced \(<span class="qgBold">default<\/span>\) adds their digits/);
  assert.match(guide, /Full adds the whole number \(2026\), and Off ignores them/);
  assert.match(guide, /Cyphers with their own digit values[\s\S]*always use those/);
});

test('changed cipher and guide assets are served under their source hashes', () => {
  const html = read('index.html');
  const assets = { 'calc/ciphers.js': 12, 'calc/quick-guide.js': 16 };
  for (const [file, keyLength] of Object.entries(assets)) {
    const key = crypto.createHash('sha256').update(read(file)).digest('hex').slice(0, keyLength);
    assert.match(html, new RegExp(`${file.replace(/[./-]/g, '\\$&')}\\?v=${key}(?:"|&)`));
  }
});

// Canonical names for the ten newly shipped ciphers (specs/cipher-additions.md,
// decision 4). A stored same-name cipher is reconciled into the shipped one
// when its mapping is identical, and otherwise kept exactly, renamed
// "<name> (custom)", with the shipped cipher added alongside. Runs the real
// restore functions from calc/ciphers.js against hand-built stored lists.
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

// A stored workspace: every shipped cipher EXCEPT the named ones, plus the
// member's own entries. `restore()` runs what applyCalcSettingsString runs.
function storedWorkspace(context, without, own) {
  context.__without = without;
  context.__own = own;
  vm.runInContext(`
    cipherList = cipherList.filter(function (c) { return __without.indexOf(c.cipherName) === -1 })
    __own.forEach(function (o) {
      cipherList.push(new cipher(o.name, o.category, o.H, o.S, o.L, o.cArr, o.vArr, true, o.enabled, false))
    })
  `, context);
}
const restore = (context) => vm.runInContext('mergeBuiltinCiphers(); applyCipherOrdering()', context);
const list = (context) => vm.runInContext('cipherList', context);
const named = (context, name) => list(context).filter((c) => c.cipherName === name);
const shipped = (context, name) => vm.runInContext(`builtinCipherDef(${JSON.stringify(name)})`, context);

const codes = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const AZ_09 = [...codes(97, 122), ...codes(48, 57)];
const ZERO9_AZ = [...codes(48, 57), ...codes(97, 122)];

// Reloading means a fresh page restoring the list it last saved.
function reload(context) {
  const saved = Array.from(list(context), (c) => ({
    name: c.cipherName, category: c.cipherCategory, H: c.H, S: c.S, L: c.L,
    cArr: Array.from(c.cArr), vArr: Array.from(c.vArr), enabled: c.enabled,
  }));
  const next = fixture();
  vm.runInContext('cipherList = []', next);
  storedWorkspace(next, [], saved);
  restore(next);
  return next;
}
const snapshot = (context) => JSON.stringify(Array.from(list(context), (c) =>
  [c.cipherName, c.cipherCategory, c.H, c.S, c.L, Array.from(c.cArr), Array.from(c.vArr), c.enabled]));

test('no collision: a workspace saved before the release gains the shipped cipher', () => {
  const context = fixture();
  storedWorkspace(context, ['Vaxen'], []);
  restore(context);
  const vaxen = named(context, 'Vaxen');
  assert.equal(vaxen.length, 1);
  assert.deepEqual(Array.from(vaxen[0].vArr), Array.from(shipped(context, 'Vaxen')[6]));
  assert.equal(named(context, 'Vaxen (custom)').length, 0);
  assert.equal(list(context).length, 183);
});

test('identical collision: reconciled into the shipped cipher, keeping on/off and colour', () => {
  const context = fixture();
  const def = shipped(context, 'Unun');
  storedWorkspace(context, ['Unun'], [{
    name: 'Unun', category: 'My Imports', H: 123, S: 45, L: 67,
    cArr: Array.from(def[5]), vArr: Array.from(def[6]), enabled: true,
  }]);
  restore(context);
  const unun = named(context, 'Unun');
  assert.equal(unun.length, 1, 'one cipher, no duplicate');
  assert.equal(unun[0].cipherCategory, 'CCRU Extra', 'shipped filing');
  assert.equal(unun[0].enabled, true, 'member kept it switched on');
  assert.deepEqual([unun[0].H, unun[0].S, unun[0].L], [123, 45, 67], 'member colour kept');
  assert.equal(named(context, 'Unun (custom)').length, 0);
  assert.equal(list(context).filter((c) => c.cipherCategory === 'My Imports').length, 0);
});

test('differing collision (right values, wrong character order): kept exactly as custom, shipped added', () => {
  const context = fixture();
  const def = shipped(context, 'Vaxen');
  const wrongOrder = { // values transcribed against 0-9 then a-z instead of a-z then 0-9
    name: 'Vaxen', category: 'CCRU Extra', H: 11, S: 22, L: 33,
    cArr: ZERO9_AZ, vArr: Array.from(def[6]), enabled: true,
  };
  storedWorkspace(context, ['Vaxen'], [wrongOrder]);
  restore(context);
  const custom = named(context, 'Vaxen (custom)');
  assert.equal(custom.length, 1);
  assert.deepEqual(Array.from(custom[0].cArr), wrongOrder.cArr, 'characters exactly as the member had them');
  assert.deepEqual(Array.from(custom[0].vArr), wrongOrder.vArr);
  assert.deepEqual([custom[0].cipherCategory, custom[0].H, custom[0].S, custom[0].L, custom[0].enabled],
    ['CCRU Extra', 11, 22, 33, true]);
  const vaxen = named(context, 'Vaxen');
  assert.equal(vaxen.length, 1, 'the name now means the shipped cipher');
  assert.deepEqual(Array.from(vaxen[0].cArr), AZ_09);
  assert.equal(vaxen[0].calcGematria('z'), 1225);
  assert.notEqual(custom[0].calcGematria('z'), 1225, 'the member copy still computes its own way');
});

test('an already-occupied "(custom)" name moves the copy to the next free name', () => {
  const context = fixture();
  storedWorkspace(context, ['Nullinnix'], [
    { name: 'Nullinnix (custom)', category: 'Mine', H: 1, S: 1, L: 50, cArr: [97], vArr: [7], enabled: false },
    { name: 'Nullinnix', category: 'Mine', H: 2, S: 2, L: 50, cArr: ZERO9_AZ, vArr: ZERO9_AZ.map(() => 1), enabled: true },
  ]);
  restore(context);
  const first = named(context, 'Nullinnix (custom)');
  assert.equal(first.length, 1);
  assert.deepEqual(Array.from(first[0].vArr), [7], 'the existing "(custom)" cipher is untouched');
  const second = named(context, 'Nullinnix (custom 2)');
  assert.equal(second.length, 1);
  assert.equal(second[0].vArr[0], 1);
  assert.equal(named(context, 'Nullinnix').length, 1);
  assert.equal(named(context, 'Nullinnix')[0].vArr.reduce((a, b) => a + b, 0), 0, 'shipped Nullinnix');
});

test('three real-shaped collisions at once, then a second and third load change nothing', () => {
  const context = fixture();
  const vaxen = shipped(context, 'Vaxen'), unun = shipped(context, 'Unun'), still = shipped(context, 'Still Plex');
  storedWorkspace(context, ['Vaxen', 'Unun', 'Still Plex'], [
    { name: 'Vaxen', category: 'CCRU Extra', H: 240, S: 60, L: 65, cArr: ZERO9_AZ, vArr: Array.from(vaxen[6]), enabled: true },
    { name: 'Unun', category: 'CCRU Extra', H: 0, S: 55, L: 62, cArr: Array.from(unun[5]), vArr: Array.from(unun[6]), enabled: true },
    { name: 'Still Plex', category: 'CCRU Extra', H: 265, S: 45, L: 72, cArr: Array.from(still[5]),
      vArr: Array.from(still[6]).map((v, i) => (i === 15 ? 23 : v)), enabled: false },
  ]);
  restore(context);
  const once = snapshot(context);
  assert.deepEqual(
    Array.from(list(context).filter((c) => c.cipherCategory === 'CCRU Extra'), (c) => c.cipherName).sort(),
    ['Divisors of 1296', 'Divisors of 5184', 'Nullinnix', 'Still Cycle', 'Still Plex', 'Still Plex (custom)',
      'Unun', 'Vaxen', 'Vaxen (custom)'].sort());
  assert.equal(list(context).length, 185, '183 shipped plus two member copies');

  vm.runInContext('mergeBuiltinCiphers(); applyCipherOrdering()', context);
  assert.equal(snapshot(context), once, 'running the migration again in place is a no-op');

  const second = reload(context);
  assert.equal(snapshot(second), once, 'a second load from the saved result is a no-op');
  assert.equal(snapshot(reload(second)), once, 'and a third');
});

test('Edit Ciphers saving different values under a shipped name makes a custom copy', () => {
  const context = fixture();
  const fields = {};
  Object.assign(context, {
    document: { getElementById: (id) => fields[id] || null },
    resetColorControls() {}, initCalcCustCiph() {}, ignoreDiarciticsCustom: true, caseSensitiveCustom: false,
    rndCol: { H: [10], S: [50], L: [60] }, getRndIndex: (a) => a[0],
  });
  vm.runInContext('var cCat = []; cipherList.forEach(function (c) { if (cCat.indexOf(c.cipherCategory) == -1) cCat.push(c.cipherCategory) })', context);
  const source = read('calc/edit-ciphers.js');
  const start = source.indexOf('\nfunction addNewCipherAction(');
  vm.runInContext(source.slice(start, source.indexOf('\nfunction ', start + 1)), context);
  const submit = (name, alphabet, values) => {
    fields.custCipherNameInput = { value: name };
    fields.custCipherCatInput = { value: 'CCRU Extra' };
    fields.custCipherAlphabet = { value: alphabet };
    fields.custCipherGlobVals = { value: values };
    context.addNewCipherAction(false);
  };
  submit('Vaxen', 'ab', '1,2');
  assert.deepEqual(Array.from(named(context, 'Vaxen (custom)')[0].vArr), [1, 2]);
  assert.equal(named(context, 'Vaxen')[0].calcGematria('z'), 1225, 'shipped Vaxen untouched');

  // saving the shipped mapping itself stays the shipped cipher
  const def = shipped(context, 'Unun');
  submit('Unun', String.fromCharCode(...def[5]), Array.from(def[6]).join(','));
  assert.equal(named(context, 'Unun').length, 1);
  assert.equal(named(context, 'Unun (custom)').length, 0);
});

test('both cipher-file imports reconcile shipped names before the menu is built', () => {
  const source = read('calc/export-csv.js');
  const parses = [...source.matchAll(/cipherList = ciphersFromListBody\(file\)/g)].map((m) => m.index);
  assert.equal(parses.length, 2);
  for (const at of parses) {
    const reconcile = source.indexOf('reconcileCanonicalCiphers()', at);
    assert.ok(reconcile > at && reconcile < source.indexOf('initCalc(', at), 'reconciled before initCalc()');
  }
  // an imported list containing only a differing copy ends up with both
  const context = fixture();
  vm.runInContext(`
    cipherList = ciphersFromListBody('("Vaxen","CCRU Extra",1,50,50,[97],[5],true,true,false)')
    reconcileCanonicalCiphers()
  `, context);
  assert.deepEqual(Array.from(list(context), (c) => c.cipherName), ['Vaxen (custom)', 'Vaxen']);
});

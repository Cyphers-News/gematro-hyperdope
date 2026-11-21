// Cipher additions (specs/cipher-additions.md): ten new ciphers, the new
// "CCRU Extra" category, and the "Elizabethan" -> "Archaic" rename.
// Each new cipher is checked against the rule that defines it, generated
// independently here, so a mistyped value fails rather than being copied.
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

const get = (context, name) => {
  const found = vm.runInContext('cipherList', context).find((c) => c.cipherName === name);
  assert.ok(found, `${name} ships`);
  return found;
};
const codes = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const ALNUM = [...codes(48, 57), ...codes(97, 122)]; // 0-9 then a-z
const divisors = (n) => codes(1, n).filter((d) => n % d === 0);

test('the ten new ciphers each follow their defining rule', () => {
  const context = fixture();

  const futhark = get(context, 'Futhark Old');
  assert.equal(futhark.cipherCategory, 'Languages');
  assert.equal(String.fromCodePoint(...futhark.cArr), 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ');
  assert.deepEqual(Array.from(futhark.vArr), codes(1, 24));

  const nullinnix = get(context, 'Nullinnix');
  assert.deepEqual(Array.from(nullinnix.cArr), ALNUM);
  assert.equal(nullinnix.vArr.reduce((a, b) => a + b, 0), 0, 'the whole sequence sums to 0');

  const aq = get(context, 'Alphanumeric Qabbala');
  const reverse = get(context, 'Alphanumeric Reverse');
  const sumerian = get(context, 'Alphanumeric Sumerian');
  assert.deepEqual(Array.from(reverse.cArr), Array.from(aq.cArr));
  assert.deepEqual(Array.from(reverse.vArr), Array.from(aq.vArr).reverse());
  assert.deepEqual(Array.from(sumerian.cArr), Array.from(aq.cArr));
  assert.deepEqual(Array.from(sumerian.vArr), Array.from(aq.vArr).map((v) => v * 6));

  const d5184 = get(context, 'Divisors of 5184');
  assert.deepEqual(Array.from(d5184.cArr), ALNUM);
  assert.deepEqual(Array.from(d5184.vArr), [0, ...divisors(5184)]);
  const d1296 = get(context, 'Divisors of 1296');
  assert.deepEqual(Array.from(d1296.cArr), codes(97, 122));
  assert.deepEqual(Array.from(d1296.vArr), [0, ...divisors(1296)]);

  const vaxen = get(context, 'Vaxen');
  const unun = get(context, 'Unun');
  assert.deepEqual(Array.from(unun.cArr), Array.from(vaxen.cArr));
  const letters = vaxen.cArr.length - 10;
  Array.from(unun.vArr).forEach((v, i) => {
    const step = i < letters ? 20 + 2 * i : 2 * (i - letters);
    assert.equal(v - vaxen.vArr[i], step, `Unun - Vaxen at ${String.fromCharCode(vaxen.cArr[i])}`);
  });

  const cycle = get(context, 'Still Cycle');
  assert.equal(String.fromCharCode(...cycle.cArr), '1234567890qwertyuiopasdfghjklzxcvbnm');
  assert.deepEqual(Array.from(cycle.vArr).slice(0, 10), codes(0, 9));

  const plex = get(context, 'Still Plex');
  assert.deepEqual(Array.from(plex.cArr), ALNUM);

  for (const name of ['Futhark Old', 'Nullinnix', 'Still Plex', 'Still Cycle', 'Vaxen', 'Unun',
    'Divisors of 5184', 'Divisors of 1296', 'Alphanumeric Reverse', 'Alphanumeric Sumerian']) {
    const c = get(context, name);
    assert.equal(c.cArr.length, c.vArr.length, `${name}: one value per character`);
    assert.equal(new Set(c.cArr).size, c.cArr.length, `${name}: no repeated character`);
    assert.equal(c.enabled, false, `${name} ships switched off`);
  }
  assert.equal(nullinnix.calcGematria('0z'), -9 + 23, 'negative values add normally');
});

test('categories follow the agreed order, groups and in-category order', () => {
  const context = fixture();
  const list = vm.runInContext('cipherList', context);
  const order = [...new Set(list.map((c) => c.cipherCategory))];
  assert.deepEqual(order, [
    'Base-4', 'CCRU', 'CCRU Extra', 'Gematria', 'Reverse',
    'Alphanumeric', 'Archaic', 'Extra', 'Illuminati', 'Latin', 'Maths', 'Thelemic',
    'Alchemology', 'Cryptography', 'Experimental', 'Polygonal',
    'Languages', 'Hebrew', 'Greek',
  ]);
  assert.deepEqual(Array.from(list.filter((c) => c.cipherCategory === 'CCRU Extra'), (c) => c.cipherName), [
    'Divisors of 1296', 'Divisors of 5184', 'Nullinnix', 'Still Cycle', 'Still Plex', 'Unun', 'Vaxen',
  ]);
  assert.equal(list.filter((c) => c.cipherCategory === 'Alphanumeric')[0].cipherName, 'Archaic Alphanumeric',
    'the Archaic Alphanumeric pin still leads');

  const calc = read('calc/calc.js');
  assert.match(calc, /category === "Alphanumeric" \|\| category === "Alchemology" \|\| category === "Languages"/,
    'menu dividers sit ahead of the second, third and fourth groups');
  assert.match(calc, /var cipherCatSpecial = \{\s*"Archaic": \{/);
});

test('no visible category reads Elizabethan, and saved ones are mapped to Archaic', () => {
  const context = fixture();
  const shipped = vm.runInContext('cipherList', context);
  assert.equal(shipped.filter((c) => c.cipherCategory === 'Elizabethan').length, 0);
  assert.equal(shipped.filter((c) => c.cipherCategory === 'Archaic').length, 9);

  // A workspace saved before the rename: one untouched built-in, one built-in
  // the member edited, and one custom cipher, all filed under "Elizabethan".
  vm.runInContext(`
    var shippedOrdinal = cipherList.find(function (c) { return c.cipherName === "Archaic Ordinal" })
    var shippedKaye = cipherList.find(function (c) { return c.cipherName === "Bacon Kaye" })
    var editedValues = shippedKaye.vArr.slice(); editedValues[0] = 999
    cipherList = [
      new cipher(shippedOrdinal.cipherName, "Elizabethan", shippedOrdinal.H, shippedOrdinal.S, shippedOrdinal.L,
        shippedOrdinal.cArr.slice(), shippedOrdinal.vArr.slice(), true, true, false),
      new cipher(shippedKaye.cipherName, "Elizabethan", shippedKaye.H, shippedKaye.S, shippedKaye.L,
        shippedKaye.cArr.slice(), editedValues, true, true, false),
      new cipher("My Old Cipher", "Elizabethan", 10, 50, 50, [97, 98], [1, 2], true, true, false)
    ]
    mergeBuiltinCiphers()
    applyCipherOrdering()
  `, context);
  const restored = vm.runInContext('cipherList', context);
  assert.equal(restored.filter((c) => c.cipherCategory === 'Elizabethan').length, 0, 'no Elizabethan tab returns');
  assert.equal(restored.find((c) => c.cipherName === 'My Old Cipher').cipherCategory, 'Archaic');
  const kaye = restored.find((c) => c.cipherName === 'Bacon Kaye');
  assert.equal(kaye.cipherCategory, 'Archaic');
  assert.equal(kaye.vArr[0], 999, 'an edited cipher keeps its edit');
  assert.equal(restored.length, 184, 'every shipped cipher plus the custom one');
});

test('the quick guide describes the new category and ciphers', () => {
  const guide = read('calc/quick-guide.js');
  const intro = guide.slice(guide.indexOf('var cipherCategoryIntro = {'), guide.indexOf('var cipherInfoText = {'));
  assert.match(intro, /"Archaic": "/);
  assert.match(intro, /"CCRU Extra": "/);
  assert.doesNotMatch(intro, /"Elizabethan": "/);
  const info = guide.slice(guide.indexOf('var cipherInfoText = {'));
  for (const name of ['Futhark Old', 'Nullinnix', 'Still Plex', 'Still Cycle', 'Vaxen', 'Unun',
    'Divisors of 5184', 'Divisors of 1296', 'Alphanumeric Reverse', 'Alphanumeric Sumerian']) {
    assert.match(info, new RegExp(`"${name}": "`), `${name} has a description`);
  }
});

// Extracts one top-level function from a source file: from its declaration
// to the next top-level declaration (edit-ciphers.js has regex literals with
// quotes in them, which a brace matcher would misread as strings).
function functionSource(source, name) {
  const start = source.indexOf(`\nfunction ${name}(`);
  assert.notEqual(start, -1, `${name} exists`);
  const end = source.indexOf('\nfunction ', start + 1);
  return source.slice(start, end === -1 ? undefined : end);
}

function editCiphersFixture() {
  const context = fixture();
  const fields = {};
  Object.assign(context, {
    document: { getElementById: (id) => fields[id] || null },
    resetColorControls() {}, initCalcCustCiph() {}, ignoreDiarciticsCustom: true, caseSensitiveCustom: false,
    rndCol: { H: [10], S: [50], L: [60] }, getRndIndex: (a) => a[0],
  });
  vm.runInContext('var cCat = []; cipherList.forEach(function (c) { if (cCat.indexOf(c.cipherCategory) == -1) cCat.push(c.cipherCategory) })', context);
  vm.runInContext(functionSource(read('calc/edit-ciphers.js'), 'addNewCipherAction'), context, { filename: 'calc/edit-ciphers.js' });
  const submit = (name, category) => {
    fields.custCipherNameInput = { value: name };
    fields.custCipherCatInput = { value: category };
    fields.custCipherAlphabet = { value: 'ab' };
    fields.custCipherGlobVals = { value: '1,2' };
    context.addNewCipherAction(false);
  };
  return { context, submit };
}

test('Edit Ciphers files a cipher typed as Elizabethan under Archaic immediately', () => {
  const { context, submit } = editCiphersFixture();
  submit('My New Cipher', 'Elizabethan');
  let list = vm.runInContext('cipherList', context);
  const created = list.findIndex((c) => c.cipherName === 'My New Cipher');
  assert.equal(list[created].cipherCategory, 'Archaic');
  assert.equal(list[created - 1].cipherCategory, 'Archaic', 'placed with the other Archaic ciphers, not at the end');
  assert.equal(list.filter((c) => c.cipherCategory === 'Elizabethan').length, 0);

  // editing an existing cipher into "Elizabethan" behaves the same way
  submit('Nullinnix', 'Elizabethan');
  list = vm.runInContext('cipherList', context);
  assert.equal(list.find((c) => c.cipherName === 'Nullinnix').cipherCategory, 'Archaic');
  assert.equal(list.filter((c) => c.cipherCategory === 'Elizabethan').length, 0);

  // any other category name is left exactly as typed
  submit('Another Cipher', 'My Own Tab');
  assert.equal(vm.runInContext('cipherList', context).find((c) => c.cipherName === 'Another Cipher').cipherCategory, 'My Own Tab');
});

test('both cipher-file imports settle renamed categories before the menu is built', () => {
  const source = read('calc/export-csv.js');
  const parses = [...source.matchAll(/cipherList = ciphersFromListBody\(file\)/g)].map((m) => m.index);
  assert.equal(parses.length, 2, 'the ciphers.js and GEMATRO_DB import paths');
  for (const at of parses) {
    const rebuild = source.indexOf('initCalc(', at);
    const normalise = source.indexOf('normaliseCipherCategories()', at);
    assert.ok(normalise > at && normalise < rebuild, 'normalised after parsing and before initCalc()');
  }
  // and the normaliser itself maps the parsed list
  const context = fixture();
  vm.runInContext(`
    cipherList = ciphersFromListBody('("Old File Cipher","Elizabethan",1,50,50,[97],[1],true,true,false)')
    normaliseCipherCategories()
  `, context);
  assert.equal(vm.runInContext('cipherList[0].cipherCategory', context), 'Archaic');
});

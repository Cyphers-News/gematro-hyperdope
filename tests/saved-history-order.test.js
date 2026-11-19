// Saved history remains newest-first, with a deterministic order inside ties.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const featureSource = fs.readFileSync(path.join(root, 'auth', 'profile-features.js'), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

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

function searchFixture(rows) {
  const calls = [];
  let term = '';
  let max = Infinity;
  const orders = [];
  const query = {
    select(fields) { calls.push(['select', fields]); return this; },
    ilike(column, pattern) {
      calls.push(['ilike', column, pattern]);
      term = pattern.slice(1, -1).replace(/\\([%_\\])/g, '$1').toLowerCase();
      return this;
    },
    order(column, options) { calls.push(['order', column, options]); orders.push([column, options]); return this; },
    limit(value) { calls.push(['limit', value]); max = value; return this; },
    then(resolve, reject) {
      let data = rows.filter(row => term === '' || row.phrase.toLowerCase().includes(term));
      data = data.slice().sort((left, right) => {
        for (const [column, options] of orders) {
          if (left[column] === right[column]) continue;
          const cmp = left[column] < right[column] ? -1 : 1;
          return options.ascending ? cmp : -cmp;
        }
        return 0;
      }).slice(0, max);
      return Promise.resolve({ data, error: null }).then(resolve, reject);
    }
  };
  const client = {
    from(table) { calls.push(['from', table]); return query; }
  };
  const context = { authUser: { id: 'synthetic-user' }, getAuthClient: () => client };
  vm.createContext(context);
  vm.runInContext(functionSource(featureSource, 'entriesSearch'), context, { filename: 'auth/profile-features.js' });
  return { context, calls };
}

const cohort = [
  { id: 'z', phrase: 'older match', position: 0, created_at: '2026-11-18T12:00:00Z' },
  { id: 'c', phrase: 'third match', position: 2, created_at: '2026-11-19T12:00:00Z' },
  { id: 'b', phrase: 'second match', position: 1, created_at: '2026-11-19T12:00:00Z' },
  { id: 'a', phrase: 'first match', position: 1, created_at: '2026-11-19T12:00:00Z' },
  { id: 'q', phrase: 'not selected', position: 0, created_at: '2026-11-17T12:00:00Z' }
];

test('the production query declares the complete newest-first order and selects position', async () => {
  const f = searchFixture(cohort);
  const rows = await f.context.entriesSearch('', 200);

  assert.deepEqual(Array.from(rows, row => row.id), ['a', 'b', 'c', 'z', 'q']);
  assert.deepEqual(plain(f.calls), [
    ['from', 'history_entries'],
    ['select', 'id, phrase, position, created_at'],
    ['order', 'created_at', { ascending: false }],
    ['order', 'position', { ascending: true }],
    ['order', 'id', { ascending: true }],
    ['limit', 200]
  ]);
});

test('filtered search uses the same order and deleting a tie does not redeal survivors', async () => {
  const beforeFixture = searchFixture(cohort);
  const before = await beforeFixture.context.entriesSearch('match', 200);
  const afterFixture = searchFixture(cohort.filter(row => row.id !== 'b'));
  const after = await afterFixture.context.entriesSearch('match', 200);

  assert.deepEqual(Array.from(before, row => row.id), ['a', 'b', 'c', 'z']);
  assert.deepEqual(Array.from(after, row => row.id), ['a', 'c', 'z']);
  assert.deepEqual(
    plain(beforeFixture.calls.filter(call => call[0] === 'order')),
    plain(afterFixture.calls.filter(call => call[0] === 'order'))
  );
  assert.deepEqual(afterFixture.calls[2], ['ilike', 'phrase', '%match%']);
});

test('both served profile-feature consumers carry the refreshed cache token', () => {
  for (const page of ['index.html', 'profile.html']) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    assert.match(html, /auth\/profile-features\.js\?v=20261119a(?:"|&)/);
  }
});

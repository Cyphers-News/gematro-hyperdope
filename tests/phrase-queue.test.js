const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const migrationFile = 'supabase/migrations/20261111000000_phrase_nomination_quorum_and_batch.sql';
const migration = read(migrationFile);
const adminUi = read('auth/admin-ui.js');
const adminClient = read('auth/admin.js');
const adminCss = read('auth/admin.css');

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
    add: (name) => values.add(name),
    remove: (name) => values.delete(name),
    toggle(name, force) {
      if (force === undefined) force = !values.has(name);
      if (force) values.add(name); else values.delete(name);
      return force;
    },
    contains: (name) => values.has(name)
  };
}

function uiContext(nodes = {}) {
  const context = {
    console,
    Date,
    JSON,
    Math,
    Object,
    Array,
    Promise,
    setTimeout: () => 1,
    clearTimeout: () => {},
    authEsc: (value) => String(value ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
    document: {
      getElementById: (id) => nodes[id] || null,
      querySelector: () => null,
      querySelectorAll: () => []
    }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(adminUi, context, { filename: 'auth/admin-ui.js' });
  return context;
}

function adminClientContext(rpc) {
  const context = {
    console,
    Promise,
    document: {},
    $: () => ({ ready() {} }),
    authUser: { id: 'fixture-admin' },
    getAuthClient: () => ({ rpc })
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(adminClient, context, { filename: 'auth/admin.js' });
  return context;
}

function qualifies(reactions, owner) {
  const supporters = new Set(reactions.filter((r) => r.user !== owner).map((r) => r.user));
  const hasBook = reactions.some((r) => r.user !== owner && r.reaction === 'ccru');
  return supporters.size >= 3 || (supporters.size >= 2 && hasBook);
}

test('nomination quorum counts distinct non-author supporters', () => {
  const owner = 'author';
  assert.equal(qualifies([
    { user: 'a', reaction: 'heart' },
    { user: 'a', reaction: 'like' },
    { user: 'a', reaction: 'laugh' },
    { user: 'a', reaction: 'ccru' }
  ], owner), false, 'four reactions from one person are one supporter');
  assert.equal(qualifies([
    { user: owner, reaction: 'ccru' },
    { user: 'a', reaction: 'heart' },
    { user: 'b', reaction: 'like' }
  ], owner), false, 'the author cannot supply the book shortcut');
  assert.equal(qualifies([
    { user: 'a', reaction: 'heart' },
    { user: 'b', reaction: 'like' },
    { user: 'c', reaction: 'laugh' }
  ], owner), true, 'three ordinary supporters qualify');
  assert.equal(qualifies([
    { user: 'a', reaction: 'ccru' },
    { user: 'b', reaction: 'heart' }
  ], owner), true, 'two supporters qualify when either holds book');
});
test('migration serializes and evaluates quorum before durable insert', () => {
  const lock = migration.indexOf('pg_catalog.pg_advisory_xact_lock');
  const count = migration.indexOf('count(distinct r.user_id)');
  const insert = migration.indexOf('insert into public.phrase_db_queue');
  assert.ok(lock !== -1 && lock < count && count < insert);
  assert.match(migration, /r\.user_id <> owner_id/);
  assert.match(migration, /bool_or\(r\.reaction = 'ccru'\)/);
  assert.match(migration, /supporter_count >= 3[\s\S]*supporter_count >= 2 and has_ccru_support/);
  assert.match(migration, /on conflict \(submission_id\) do nothing/);
  assert.match(migration, /after insert on public\.phrase_reactions/);
  assert.doesNotMatch(migration.slice(lock, insert), /delete from public\.phrase_db_queue/i);
});

test('privileged functions are pinned and explicitly granted', () => {
  assert.match(migration, /create or replace function public\.phrase_reactions_enqueue\(\)[\s\S]*?security definer[\s\S]*?set search_path = ''/);
  assert.match(migration, /revoke all on function public\.phrase_reactions_enqueue\(\) from public, anon, authenticated/);
  assert.doesNotMatch(migration, /grant execute on function public\.phrase_reactions_enqueue/);
  assert.match(migration, /create or replace function public\.admin_phrase_decide_batch\(items jsonb\)[\s\S]*?security definer[\s\S]*?set search_path = ''/);
  assert.match(migration, /revoke all on function public\.admin_phrase_decide_batch\(jsonb\) from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.admin_phrase_decide_batch\(jsonb\) to authenticated/);
});

test('batch validation and pending locks precede every decision write', () => {
  const batch = migration.slice(migration.indexOf('create or replace function public.admin_phrase_decide_batch'));
  const validate = batch.indexOf("pg_catalog.char_length(item_text) > 500");
  const lock = batch.indexOf('for update');
  const decide = batch.indexOf('perform public.admin_phrase_decide');
  assert.ok(validate !== -1 && validate < lock && lock < decide);
  assert.match(batch, /item_count < 1 or item_count > 100/);
  assert.match(batch, /array_position\(target_ids, target_id\) is not null/);
  assert.match(batch, /q\.status = 'pending'[\s\S]*order by q\.id[\s\S]*for update/);
  assert.match(batch, /locked_count <> item_count/);
  assert.match(batch, /item_decision not in \('approved', 'rejected'\)/);
});

test('single and batch decisions share the nullable 1 to 500 character bound', () => {
  const single = migration.slice(
    migration.indexOf('create or replace function public.admin_phrase_decide('),
    migration.indexOf('create or replace function public.admin_phrase_decide_batch')
  );
  assert.match(single, /edited_text is not null[\s\S]*char_length\(edited_text\) < 1[\s\S]*char_length\(edited_text\) > 500/);
  const batch = migration.slice(migration.indexOf('create or replace function public.admin_phrase_decide_batch'));
  assert.match(batch, /item_text is not null[\s\S]*char_length\(item_text\) < 1[\s\S]*char_length\(item_text\) > 500/);
  assert.match(batch, /perform public\.admin_phrase_decide\(target_id, item_decision, item_text\)/);
});

test('admin client requests the ceiling and owns one batch rpc', () => {
  assert.match(functionSource(adminClient, 'adminPhraseQueue'), /lim:\s*limit \|\| 300/);
  assert.match(functionSource(adminClient, 'adminPhraseDecideBatch'), /admin_phrase_decide_batch/);
  assert.match(adminUi, /Showing the first 300 rows, the server ceiling/);
  assert.match(adminUi, /Export shown/);
});

test('admin rpc preserves database refusal versus transport uncertainty', async () => {
  const refusedContext = adminClientContext(() => Promise.resolve({ data: null, error: { message: 'stale row' } }));
  await assert.rejects(
    Promise.resolve(refusedContext.adminRpc('fixture', {})),
    (error) => error.adminTransactionRefused === true && error.adminOutcomeUncertain !== true
  );

  const uncertainContext = adminClientContext(() => Promise.reject(new Error('connection lost')));
  await assert.rejects(
    Promise.resolve(uncertainContext.adminRpc('fixture', {})),
    (error) => error.adminOutcomeUncertain === true && error.adminTransactionRefused !== true
  );
});

test('phrase queue restores its native checkbox after the global checkbox reset', () => {
  assert.match(adminCss, /\.adminPhraseCheckLabel input\[type="checkbox"\][^{]*\{[^}]*visibility:\s*visible/s);
});

test('single decisions reconcile locally instead of redrawing the panel', () => {
  const source = functionSource(adminUi, 'adminPhraseAct');
  assert.match(source, /adminPhraseSetBusy\(\[id\], true\)/);
  assert.match(source, /adminPhraseReconcile\(id, decision, text\)/);
  assert.match(source, /adminPhraseSetBusy\(\[id\], false\)/);
  assert.doesNotMatch(source, /adminRender\(/);
});

test('stale queue responses cannot replace the current row state', () => {
  const source = functionSource(adminUi, 'adminRenderPhraseQueue');
  const guard = source.indexOf('if (tok !== adminSeq) return');
  const rowWrite = source.indexOf('adminPhraseRows = rows.slice()');
  assert.ok(guard !== -1 && guard < rowWrite);
});

test('batch result accepts only the exact returned id and status set', () => {
  const ctx = uiContext();
  const payload = [
    { id: 'a', decision: 'approved', edited_text: 'Alpha' },
    { id: 'b', decision: 'approved', edited_text: 'Beta' }
  ];
  const exact = ctx.adminPhraseValidatedBatchResult([
    { queue_id: 'b', status: 'approved' },
    { queue_id: 'a', status: 'approved' }
  ], payload);
  assert.equal(JSON.stringify(exact), JSON.stringify([
    { id: 'b', decision: 'approved', edited_text: 'Beta' },
    { id: 'a', decision: 'approved', edited_text: 'Alpha' }
  ]));
  assert.equal(ctx.adminPhraseValidatedBatchResult([], payload), null, 'empty response fails');
  assert.equal(ctx.adminPhraseValidatedBatchResult([{ queue_id: 'a', status: 'approved' }], payload), null, 'partial response fails');
  assert.equal(ctx.adminPhraseValidatedBatchResult([
    { queue_id: 'a', status: 'approved' }, { queue_id: 'b', status: 'rejected' }
  ], payload), null, 'wrong status fails');
  assert.equal(ctx.adminPhraseValidatedBatchResult([
    { queue_id: 'a', status: 'approved' }, { queue_id: 'c', status: 'approved' }
  ], payload), null, 'extra or unknown id fails');
  assert.equal(ctx.adminPhraseValidatedBatchResult([
    { queue_id: 'a', status: 'approved' }, { queue_id: 'a', status: 'approved' }
  ], payload), null, 'duplicate id fails');
});

test('all-view reconciliation keeps the final text just submitted', () => {
  const row = { outerHTML: '' };
  const ctx = uiContext({ 'adminPhraseRow-a': row });
  ctx.adminPhraseRowsById = { a: { id: 'a', status: 'pending', phrase: 'alpha', contributor_name: 'member' } };
  ctx.adminPhraseSelected = { a: true };
  ctx.adminPhraseStatusFilter = 'all';
  ctx.adminPhraseHasSelectable = true;
  ctx.adminPhraseReconcile('a', 'approved', 'Exact Final Text');
  assert.equal(ctx.adminPhraseRowsById.a.final_text, 'Exact Final Text');
  assert.match(row.outerHTML, /value="Exact Final Text"/);
});

test('batch payload freezes selection and edited text across confirmation', async () => {
  const nodes = {
    'adminPhraseText-a': { value: 'Alpha', focus() {} },
    'adminPhraseText-b': { value: 'Beta', focus() {} }
  };
  const ctx = uiContext(nodes);
  ctx.adminPhraseRows = [{ id: 'a', status: 'pending' }, { id: 'b', status: 'pending' }];
  ctx.adminPhraseRowsById = { a: ctx.adminPhraseRows[0], b: ctx.adminPhraseRows[1] };
  ctx.adminPhraseSelected = { a: true, b: true };
  ctx.adminSeq = 7;

  const notices = [];
  let calls = 0;
  ctx.adminNotify = (message) => notices.push(message);
  ctx.adminPhraseSetBusy = () => {};
  ctx.adminPhraseSetBatchBusy = () => {};
  const reconciled = [];
  ctx.adminPhraseReconcile = (id, decision, text) => reconciled.push({ id, decision, text });
  ctx.adminPhraseFocusDecision = () => {};
  ctx.adminPhraseDecideBatch = (items) => {
    calls++;
    return Promise.resolve(items.map((item) => ({ queue_id: item.id, status: item.decision })));
  };

  const btn = { textContent: 'Approve selected', dataset: {}, classList: classList() };
  ctx.adminPhraseBatchAct(btn, 'approved');
  assert.equal(calls, 0, 'first activation only arms');
  nodes['adminPhraseText-a'].value = 'Changed';
  ctx.adminPhraseBatchAct(btn, 'approved');
  assert.equal(calls, 0, 'changed payload is not submitted');
  assert.ok(notices.some((m) => /changed/.test(m)));

  nodes['adminPhraseText-a'].value = 'Alpha';
  ctx.adminPhraseBatchAct(btn, 'approved');
  ctx.adminPhraseBatchAct(btn, 'approved');
  await Promise.resolve();
  assert.equal(calls, 1, 'unchanged second activation submits once');
  assert.deepEqual(reconciled, [
    { id: 'a', decision: 'approved', text: 'Alpha' },
    { id: 'b', decision: 'approved', text: 'Beta' }
  ]);
});

test('unexpected batch results preserve rows and require refresh', async () => {
  const nodes = {
    'adminPhraseText-a': { value: 'Alpha', focus() {} },
    adminPhraseBatchStatus: { textContent: '' },
    adminPhraseRefresh: { hidden: true },
    adminToast: { textContent: '', className: '' }
  };
  const ctx = uiContext(nodes);
  ctx.adminPhraseRows = [{ id: 'a', status: 'pending' }];
  ctx.adminPhraseRowsById = { a: ctx.adminPhraseRows[0] };
  ctx.adminPhraseSelected = { a: true };
  ctx.adminSeq = 4;
  let reconciled = 0;
  ctx.adminPhraseSetBusy = () => {};
  ctx.adminPhraseSetBatchBusy = () => {};
  ctx.adminPhraseReconcile = () => { reconciled++; };
  ctx.adminPhraseDecideBatch = () => Promise.resolve([]);
  const btn = { textContent: 'Approve selected', dataset: {}, classList: classList() };
  ctx.adminPhraseBatchAct(btn, 'approved');
  ctx.adminPhraseBatchAct(btn, 'approved');
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(reconciled, 0);
  assert.equal(nodes.adminPhraseRefresh.hidden, false);
  assert.match(nodes.adminPhraseBatchStatus.textContent, /did not confirm every selected decision/);
  assert.match(nodes.adminToast.textContent, /Outcome not confirmed/);
});

test('batch recovery distinguishes atomic refusal from uncertain transport', () => {
  const nodes = {
    adminPhraseBatchStatus: { textContent: '' },
    adminPhraseRefresh: { hidden: true },
    adminToast: { textContent: '', className: '' }
  };
  const ctx = uiContext(nodes);
  const refused = new Error('One or more queue entries are missing or no longer pending.');
  refused.adminTransactionRefused = true;
  ctx.adminPhraseShowBatchFailure(refused);
  assert.equal(nodes.adminPhraseRefresh.hidden, false);
  assert.match(nodes.adminPhraseBatchStatus.textContent, /^Nothing changed\./);
  assert.match(nodes.adminToast.textContent, /^Nothing changed\./);

  nodes.adminPhraseRefresh.hidden = true;
  ctx.adminPhraseShowBatchFailure(new Error('connection lost'));
  assert.equal(nodes.adminPhraseRefresh.hidden, false);
  assert.match(nodes.adminPhraseBatchStatus.textContent, /^Outcome not confirmed\./);
  assert.match(nodes.adminToast.textContent, /^Outcome not confirmed\./);
});

test('busy state restores each control to its own prior state', () => {
  const enabled = { disabled: false, dataset: {} };
  const disabled = { disabled: true, dataset: {} };
  const row = {
    classList: classList(),
    querySelectorAll: () => [enabled, disabled]
  };
  const ctx = uiContext({ 'adminPhraseRow-a': row });
  ctx.adminPhraseSetBusy(['a'], true);
  assert.equal(enabled.disabled, true);
  assert.equal(disabled.disabled, true);
  ctx.adminPhraseSetBusy(['a'], false);
  assert.equal(enabled.disabled, false);
  assert.equal(disabled.disabled, true);
});

test('member copy states the quorum and final human decision', () => {
  const profile = read('calc/profile-tab.js');
  assert.match(profile, /reactions from 3 different people/);
  assert.match(profile, /2 when one marks it 📖 CCRU/);
  assert.match(profile, /author\\'s own reactions do not count/);
  assert.match(profile, /admin makes the final decision/);
});

test('changed browser assets are served under their source hashes', () => {
  const pages = { 'admin.html': read('admin.html'), 'index.html': read('index.html') };
  const owners = {
    'auth/admin.css': ['admin.html'],
    'auth/admin-ui.js': ['admin.html'],
    'auth/admin.js': ['admin.html', 'index.html'],
    'calc/profile-tab.js': ['index.html']
  };
  Object.entries(owners).forEach(([file, pageNames]) => {
    const key = crypto.createHash('sha256').update(read(file)).digest('hex').slice(0, 16);
    pageNames.forEach((page) => {
      assert.match(pages[page], new RegExp(`${file.replace(/[./-]/g, '\\$&')}\\?v=${key}`));
    });
  });
});

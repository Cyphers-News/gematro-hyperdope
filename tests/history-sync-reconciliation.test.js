// Production history sync in isolated VMs. Network is blocked or intercepted.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const sourcePath = path.join(root, 'auth', 'history-sync.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const profileSource = fs.readFileSync(path.join(root, 'calc', 'profile-tab.js'), 'utf8');
const calcSource = fs.readFileSync(path.join(root, 'calc', 'calc.js'), 'utf8');
const exportSource = fs.readFileSync(path.join(root, 'calc', 'export.js'), 'utf8');
const guideSource = fs.readFileSync(path.join(root, 'calc', 'quick-guide.js'), 'utf8');
const authUiSource = fs.readFileSync(path.join(root, 'auth', 'auth-ui.js'), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));

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

function historyFixture({ history = [], fullHistory, reply = () => ({ data: null, error: null }) } = {}) {
  const calls = [], ready = [], authReady = [], intervals = [], events = {};
  const status = { textContent: '', className: '', classList: { toggle() {} } };
  let now = 10000;
  const blocked = () => { throw new Error('Network forbidden in history reconciliation fixture'); };
  const client = {
    auth: { onAuthStateChange() {} },
    rpc(name, args) {
      calls.push({ operation: 'rpc', name, args });
      return Promise.resolve().then(reply);
    },
    from(table) {
      calls.push({ operation: 'from', table });
      throw new Error('ordinary history save must not use a table mutation');
    }
  };
  const context = {
    console: { warn(...args) { calls.push({ operation: 'warning', args }); } },
    Date: class extends Date { static now() { return now; } },
    fetch: blocked, XMLHttpRequest: blocked, WebSocket: blocked,
    document: { getElementById() { return status; } },
    setInterval(fn) { intervals.push(fn); return intervals.length; },
    clearInterval() {}, setTimeout() {}, clearTimeout() {},
    authUser: { id: 'synthetic-user' }, getAuthClient: () => client,
    onAuthReady: fn => authReady.push(fn), sHistory: history.slice(),
    updateTables() {}, displayCalcNotification() {},
    $(target) { return { ready(fn) { ready.push(fn); }, on(event, fn) { (events[event] ||= []).push(fn); } }; }
  };
  if (fullHistory !== undefined) context.userHistory = fullHistory.slice();
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'auth/history-sync.js' });
  context.histSyncEnabled = true;
  context.histSyncLoaded = true;
  return {
    context, calls, status,
    advance(ms) { now += ms; },
    save() { return context.histSyncSave(); },
    tick() { context.histSyncTick(); },
    rpcCalls() { return calls.filter(call => call.operation === 'rpc'); }
  };
}

test('supported history saves through one identity-free reconciliation rpc', async () => {
  const f = historyFixture({ history: ['alpha', 'beta'] });
  assert.equal(await f.save(), true);
  assert.deepEqual(f.rpcCalls().map(call => [call.name, Object.keys(call.args)]), [
    ['history_entries_sync', ['phrases']]
  ]);
  assert.deepEqual(Array.from(f.rpcCalls()[0].args.phrases), ['alpha', 'beta']);
  assert.equal(f.calls.some(call => call.operation === 'from'), false);
});

test('a filtered view reconciles the canonical full history, not the subset', async () => {
  const f = historyFixture({ history: ['beta'], fullHistory: ['alpha', 'beta'] });
  assert.equal(await f.save(), true);
  assert.deepEqual(Array.from(f.rpcCalls()[0].args.phrases), ['alpha', 'beta']);
});

test('an explicit saved-entry delete reaches filtered full history before reconciliation', async () => {
  const f = historyFixture({
    history: ['delete me'],
    fullHistory: ['hidden by filter', 'delete me']
  });
  let deletedId = null;
  let renderPromise = null;
  let redraws = 0;
  f.context.entriesDelete = id => { deletedId = id; return Promise.resolve(true); };
  f.context.updateHistoryTable = () => { redraws += 1; };
  vm.runInContext(profileSource, f.context, { filename: 'calc/profile-tab.js' });
  f.context.renderProfileEntries = () => {
    renderPromise = f.context.histSyncFlush();
    return renderPromise;
  };

  f.context.profileDeleteEntry('synthetic-row', 'delete me');
  await settle();
  await renderPromise;

  assert.equal(deletedId, 'synthetic-row');
  assert.equal(redraws, 1);
  assert.deepEqual(Array.from(f.context.sHistory), []);
  assert.deepEqual(Array.from(f.context.userHistory), ['hidden by filter']);
  assert.deepEqual(Array.from(f.rpcCalls()[0].args.phrases), ['hidden by filter']);
});

function installHistoryClearFixture(f) {
  f.context.sVal = () => '';
  const phraseBox = { value: '' };
  const historyArea = { innerHTML: 'rendered history' };
  const status = f.context.document.getElementById('histSyncStatus');
  f.context.document.getElementById = id => {
    if (id === 'phraseBox') return phraseBox;
    if (id === 'HistoryTableArea') return historyArea;
    return status;
  };
  vm.runInContext(functionSource(calcSource, 'clearHistoryTable'), f.context, { filename: 'calc/calc.js' });
  vm.runInContext(functionSource(calcSource, 'phraseBoxKeypress'), f.context, { filename: 'calc/calc.js' });
  return { phraseBox, historyArea };
}

test('home remains text navigation and cannot clear visible or filtered history', () => {
  const f = historyFixture({
    history: ['matching phrase'],
    fullHistory: ['hidden by filter', 'matching phrase']
  });
  const ui = installHistoryClearFixture(f);

  f.context.phraseBoxKeypress(36);

  assert.deepEqual(Array.from(f.context.sHistory), ['matching phrase']);
  assert.deepEqual(Array.from(f.context.userHistory), ['hidden by filter', 'matching phrase']);
  assert.equal(ui.historyArea.innerHTML, 'rendered history');
});

test('explicit clear all while filtered destroys the canonical history before reconciliation', async () => {
  const f = historyFixture({
    history: ['matching phrase'],
    fullHistory: ['hidden by filter', 'matching phrase']
  });
  const ui = installHistoryClearFixture(f);

  f.context.clearHistoryTable();
  f.context.histSyncLastHash = f.context.histHash([]); // saved clear completed
  for (let i = 0; i < 4; i++) {
    f.advance(1200);
    f.tick();
    await settle();
  }

  assert.deepEqual(Array.from(f.context.sHistory), []);
  assert.deepEqual(Array.from(f.context.userHistory), []);
  assert.equal(ui.historyArea.innerHTML, '');
  assert.equal(f.rpcCalls().length, 0, 'the watcher must not resurrect hidden filtered history');
});

test('whole-table clear requires two deliberate activations', () => {
  const f = historyFixture({
    history: ['visible phrase'],
    fullHistory: ['hidden phrase', 'visible phrase']
  });
  const ui = installHistoryClearFixture(f);
  let attempts = 0;
  f.context.profileConfirmClick = () => ++attempts > 1;
  vm.runInContext(functionSource(calcSource, 'histClearAllBtnClick'), f.context, { filename: 'calc/calc.js' });

  f.context.histClearAllBtnClick({});
  assert.deepEqual(Array.from(f.context.sHistory), ['visible phrase']);
  assert.equal(ui.historyArea.innerHTML, 'rendered history');

  f.context.histClearAllBtnClick({});
  assert.deepEqual(Array.from(f.context.sHistory), []);
  assert.deepEqual(Array.from(f.context.userHistory), []);
  assert.equal(ui.historyArea.innerHTML, '');
});

test('every clear-history surface uses the guarded explicit path', () => {
  assert.doesNotMatch(calcSource, /phraseBoxKeypress\(36\)/);
  assert.match(functionSource(calcSource, 'createFindMatchesMenu'), /onclick="histClearAllBtnClick\(this\)"/);
  assert.match(exportSource, /label: "Clear History Table"[\s\S]*?confirm: "Clear\?"/);
  assert.match(functionSource(exportSource, 'runExportContextItem'), /clearHistoryTable\(\)/);
  assert.match(functionSource(authUiSource, 'authNavClearHistory'), /clearHistoryTable\(\)/);
  assert.doesNotMatch(guideSource, /Home<\/span> - clear the history table/);
});

test('the calculator serves the current profile-tab content key', () => {
  const key = crypto.createHash('sha256').update(profileSource).digest('hex').slice(0, 16);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, new RegExp('calc/profile-tab\\.js\\?v=' + key + '(?:"|&)'));
});

test('over-limit canonical history stays complete locally and sends no request', async () => {
  const full = Array.from({ length: 2001 }, (_, i) => `phrase ${i}`);
  const f = historyFixture({ history: ['phrase 2000'], fullHistory: full });
  assert.equal(await f.save(), false);
  assert.equal(f.rpcCalls().length, 0);
  assert.deepEqual(Array.from(f.context.userHistory), full);
  assert.deepEqual(Array.from(f.context.sHistory), ['phrase 2000']);
  assert.match(f.status.textContent, /too large/i);
  assert.match(f.status.textContent, /export/i);
});

test('one unchanged failed snapshot gets only the initial try and three delayed retries', async () => {
  let failing = true;
  const f = historyFixture({
    history: ['synthetic failure'],
    reply: () => failing
      ? ({ data: null, error: new Error('synthetic offline') })
      : ({ data: 2, error: null })
  });
  assert.equal(await f.save(), false);
  for (let i = 0; i < 20; i++) await f.save();
  assert.equal(f.rpcCalls().length, 1, 'the first backoff blocks eager callers');
  f.advance(5000); assert.equal(await f.save(), false);
  f.advance(30000); assert.equal(await f.save(), false);
  f.advance(120000); assert.equal(await f.save(), false);
  for (let i = 0; i < 20; i++) { f.advance(300000); await f.save(); }
  assert.equal(f.rpcCalls().length, 4, 'the unchanged snapshot reaches a terminal pause');
  assert.match(f.status.textContent, /paused/i);
  failing = false;
  f.context.sHistory.push('changed hash');
  assert.equal(await f.save(), true);
  assert.equal(f.rpcCalls().length, 5, 'a changed snapshot starts a fresh bounded sequence');
  assert.equal(f.context.histSyncLastHash, f.context.histHash(f.context.sHistory));
  assert.equal(f.context.histSyncRetryCount, 0, 'success resets the attempt budget');
  assert.equal(f.context.histSyncRetryHash, null);
});

test('a pending caller cannot leapfrog retry backoff after an in-flight failure', async () => {
  let release;
  const f = historyFixture({
    history: ['pending failure'],
    reply: () => new Promise(resolve => { release = resolve; })
  });
  const first = f.save();
  await settle();
  assert.equal(await f.save(), false);
  release({ data: null, error: new Error('synthetic offline') });
  assert.equal(await first, false);
  await settle();
  assert.equal(f.rpcCalls().length, 1);
});

test('vendored supabase client emits one short post with phrases only in the body', async () => {
  const requests = [];
  const wireFetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return new Response('2000', { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const context = {
    console, URL, Headers, Request, Response, WebSocket, AbortController,
    Blob, FormData, TextEncoder, TextDecoder, crypto: globalThis.crypto,
    setTimeout, clearTimeout, setInterval, clearInterval, wireFetch,
    document: { getElementById() { return null; } },
    authUser: { id: 'synthetic-user' },
    onAuthReady() {}, updateTables() {}, displayCalcNotification() {},
    sHistory: Array.from({ length: 2000 }, (_, i) => `synthetic phrase ${i} ${'x'.repeat(40)}`),
    $(target) { return { ready() {}, on() {} }; }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'lib', 'supabase.min.js'), 'utf8'), context, { filename: 'lib/supabase.min.js' });
  context.client = vm.runInContext(`supabase.createClient(
    'https://example.supabase.co',
    'synthetic-anon-key',
    {
      accessToken: async function () { return 'synthetic-access-token' },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: wireFetch }
    }
  )`, context);
  context.getAuthClient = () => context.client;
  vm.runInContext(source, context, { filename: 'auth/history-sync.js' });
  context.histSyncEnabled = true;
  context.histSyncLoaded = true;
  assert.equal(await context.histSyncSave(), true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.method, 'POST');
  const url = new URL(requests[0].url);
  assert.equal(url.pathname, '/rest/v1/rpc/history_entries_sync');
  assert.equal(url.search, '');
  assert.ok(requests[0].url.length < 200, 'phrase corpus must not inflate the URL');
  const body = JSON.parse(requests[0].options.body);
  assert.deepEqual(Object.keys(body), ['phrases']);
  assert.equal(body.phrases.length, 2000);
});

test('migration is least-privilege, caller-scoped, atomic reconciliation', () => {
  const migrationPath = path.join(root, 'supabase', 'migrations', '20261101000000_history_entries_sync.sql');
  assert.equal(fs.existsSync(migrationPath), true, 'history reconciliation migration must exist');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.match(sql, /history_entries_sync\s*\(phrases text\[\]\)/i);
  assert.doesNotMatch(sql, /history_entries_sync\s*\([^)]*user_id/i);
  assert.match(sql, /security invoker/i);
  assert.match(sql, /auth\.uid\(\)/i);
  assert.match(sql, /cardinality\(phrases\)\s*>\s*2000/i);
  assert.match(sql, /pg_advisory_xact_lock/i);
  assert.match(sql, /delete from public\.history_entries/i);
  assert.match(sql, /not exists/i);
  assert.match(sql, /on conflict \(user_id, phrase\) do update/i);
  assert.match(sql, /revoke all on function[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function[\s\S]*to authenticated/i);
});

test('every html history-sync reference uses the production content hash', () => {
  const hash = crypto.createHash('sha256').update(source).digest('hex').slice(0, 16);
  const consumers = fs.readdirSync(root).filter(name => name.endsWith('.html')).flatMap(name => {
    const html = fs.readFileSync(path.join(root, name), 'utf8');
    return Array.from(html.matchAll(/auth\/history-sync\.js\?v=([a-f0-9]+)/g), match => ({ name, key: match[1] }));
  });
  assert.ok(consumers.length > 0, 'at least one served consumer must be found');
  assert.deepEqual(consumers.map(consumer => consumer.key), consumers.map(() => hash));
});

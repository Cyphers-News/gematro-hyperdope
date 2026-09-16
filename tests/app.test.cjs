const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function worker() {
  const listeners = {};
  const stored = new Map();
  const deleted = [];
  const calls = [];
  const cache = {
    addAll: async urls => urls.forEach(url => stored.set(url, new Response(url))),
    match: async url => stored.get(url)?.clone()
  };
  const self = {
    location: { href: 'https://example.com/cyphers/sw.js' },
    CYPHERS_PRECACHE: { version: 'test', files: ['index.html', 'offline.html', 'calc/calc.js', 'db.txt'] },
    clients: { claim: async () => {} },
    addEventListener: (name, fn) => { listeners[name] = fn; }
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), {
    self, URL, Response, Set, importScripts() {},
    caches: { open: async () => cache, keys: async () => ['cyphers-shell-old', 'unrelated'], delete: async name => { deleted.push(name); } },
    fetch: async request => { calls.push(request.url); throw new Error('offline'); }
  });
  async function lifecycle(name) { let promise; listeners[name]({ waitUntil: value => { promise = value; } }); await promise; }
  async function request(url, options = {}) {
    let promise;
    listeners.fetch({ request: { url, method: 'GET', mode: 'cors', ...options }, respondWith: value => { promise = value; } });
    return promise ? (await promise).text() : null;
  }
  return { lifecycle, request, deleted, stored, calls };
}

test('calculator, query-versioned scripts and database work offline at a subpath', async () => {
  const w = worker(); await w.lifecycle('install');
  for (const [url, expected] of [
    ['https://example.com/cyphers/', 'index.html'],
    ['https://example.com/cyphers/index.html?code=single-use', 'index.html'],
    ['https://example.com/cyphers/calc/calc.js?v=old', 'calc/calc.js'],
    ['https://example.com/cyphers/db.txt', 'db.txt']
  ]) assert.equal(await w.request(url), 'https://example.com/cyphers/' + expected);
  assert.equal(w.calls.length, 0);
});
test('private APIs, external hosts and writes are never handled by the worker', async () => {
  const w = worker(); await w.lifecycle('install');
  assert.equal(await w.request('https://project.supabase.co/rest/v1/profiles'), null);
  assert.equal(await w.request('https://example.com/cyphers/api/account'), null);
  assert.equal(await w.request('https://example.com/cyphers/index.html', { method: 'POST' }), null);
});
test('account navigation uses an offline explanation without caching account pages', async () => {
  const w = worker(); await w.lifecycle('install');
  assert.equal(await w.request('https://example.com/cyphers/login.html', { mode: 'navigate' }), 'https://example.com/cyphers/offline.html');
  assert.equal(w.stored.has('https://example.com/cyphers/login.html'), false);
});
test('activation only clears old Cyphers caches', async () => {
  const w = worker(); await w.lifecycle('activate');
  assert.deepEqual(w.deleted, ['cyphers-shell-old']);
});
test('manifest icon dimensions match real PNG files', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
  assert.equal(manifest.name, 'Cyphers');
  for (const icon of manifest.icons) {
    const png = fs.readFileSync(path.join(root, icon.src));
    assert.equal(icon.sizes, `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`);
  }
});
test('precache includes only available public files, not account HTML or backend source', () => {
  const context = { self: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'app/precache.js'), 'utf8'), context);
  for (const file of context.self.CYPHERS_PRECACHE.files) {
    assert.ok(fs.existsSync(path.join(root, file)), file);
    assert.ok(!file.startsWith('supabase/'));
    if (file.endsWith('.html')) assert.ok(['index.html', 'offline.html'].includes(file));
  }
});
test('native callbacks accept only expected PKCE routes', async () => {
  const { parseAuthLink } = await import('../app/native-auth.mjs');
  assert.deepEqual(parseAuthLink('news.cyphers.app://auth/reset-password.html?code=abc'), { code: 'abc', page: 'reset-password.html' });
  for (const url of ['https://evil.example/?code=abc', 'news.cyphers.app://evil/index.html?code=abc', 'news.cyphers.app://auth/admin.html?code=abc', 'news.cyphers.app://auth/index.html#access_token=abc', 'news.cyphers.app://auth/index.html?code=abc#access_token=bad']) assert.equal(parseAuthLink(url), null, url);
});
test('existing web auth stays implicit; native auth uses PKCE without URL token detection', () => {
  for (const native of [false, true]) {
    let options;
    const context = { window: { CyphersNative: native ? {} : undefined }, document: { addEventListener() {} }, supabase: { createClient: (_url, _key, opts) => { options = opts; return {}; } }, authIsConfigured: () => true, SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'public', $: () => ({ ready() {} }) };
    vm.runInNewContext(fs.readFileSync(path.join(root, 'auth/auth.js'), 'utf8'), context);
    context.getAuthClient();
    assert.equal(options.auth.flowType, native ? 'pkce' : 'implicit');
    assert.equal(options.auth.detectSessionInUrl, !native);
  }
});

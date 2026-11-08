const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'calc', 'profile-tab.js'), 'utf8');
const settle = () => new Promise(resolve => setImmediate(resolve));

test('saved search never lets an older response eat newer typing', async () => {
  const requests = [];
  const paints = [];
  const timers = [];
  const search = { value: '' };

  const context = {
    document: {
      getElementById(id) {
        return id === 'profileSearch' ? search : null;
      }
    },
    entriesSearch(term) {
      let release;
      const promise = new Promise(resolve => { release = resolve; });
      requests.push({ term, release });
      return promise;
    },
    submissionsList() { return Promise.resolve([]); },
    authEsc(value) { return String(value); },
    setTimeout(fn) {
      const timer = { fn, cleared: false };
      timers.push(timer);
      return timer;
    },
    clearTimeout(timer) {
      if (timer) timer.cleared = true;
    },
    $() { return { ready() {}, on() {} }; }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'calc/profile-tab.js' });
  context.profileBody = html => { paints.push(html); };

  context.renderProfileEntries();
  await settle();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].term, '');

  search.value = 'make the machine';
  context.profileSearchDebounced();
  search.value = 'make the machine confess';
  context.profileSearchDebounced();

  requests[0].release([]);
  await settle();
  assert.equal(paints.length, 0, 'the opening response is stale as soon as typing changes');
  assert.equal(search.value, 'make the machine confess');

  const liveTimer = timers.find(timer => !timer.cleared);
  assert.ok(liveTimer, 'the latest search remains scheduled');
  liveTimer.fn();
  await settle();
  assert.equal(requests.length, 2);
  assert.equal(requests[1].term, 'make the machine confess');

  requests[1].release([]);
  await settle();
  assert.equal(paints.length, 1);
  assert.match(paints[0], /value="make the machine confess"/);
});

test('saved search debounce cannot repaint a different profile tab', async () => {
  const requests = [];
  const paints = [];
  const timers = [];
  const search = { value: 'make the machine confess' };
  let searchMounted = true;

  const context = {
    document: {
      getElementById(id) {
        return id === 'profileSearch' && searchMounted ? search : null;
      }
    },
    entriesSearch(term) {
      requests.push(term);
      return Promise.resolve([]);
    },
    submissionsList() { return Promise.resolve([]); },
    authEsc(value) { return String(value); },
    setTimeout(fn) {
      timers.push(fn);
      return fn;
    },
    clearTimeout() {},
    $() { return { ready() {}, on() {} }; }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'calc/profile-tab.js' });
  context.profileBody = (html, token) => { paints.push({ html, token }); };

  context.profileSearchDebounced();
  searchMounted = false;
  context.profileRenderSeq += 1;
  timers[0]();
  await settle();

  assert.deepEqual(requests, []);
  assert.deepEqual(paints, []);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'calc', 'profile-tab.js'), 'utf8');

test('send to calculator refreshes both phrase displays without committing history', () => {
  const summaryPhrases = [];
  const breakdownPhrases = [];
  const history = ['existing phrase'];
  let historyCommits = 0;
  let context;

  const phraseBox = {
    value: 'death trips',
    focus() {},
    select() {}
  };

  context = {
    document: {
      getElementById(id) {
        return id === 'phraseBox' ? phraseBox : null;
      }
    },
    breakCipher: 'Ordinal',
    sHistory: history,
    addPhraseToHistory() { historyCommits += 1; },
    updateEnabledCipherTable() { summaryPhrases.push(phraseBox.value); },
    updateWordBreakdown() { breakdownPhrases.push(phraseBox.value); },
    closeAllOpenedMenus() {},
    displayCalcNotification() {},
    setTimeout() {},
    clearTimeout() {},
    $() { return { ready() {}, on() {} }; }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'calc/profile-tab.js' });

  context.profileUsePhrase('times address space');

  assert.equal(phraseBox.value, 'times address space');
  assert.deepEqual(summaryPhrases, ['times address space']);
  assert.deepEqual(breakdownPhrases, ['times address space']);
  assert.deepEqual(history, ['existing phrase']);
  assert.equal(historyCommits, 0);
});

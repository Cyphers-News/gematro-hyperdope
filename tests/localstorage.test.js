const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'calc', 'localstorage.js'), 'utf8');

function loadLocalStorageModule() {
  const context = {
    window: {
      localStorage: {
        getItem(key) {
          if (key === 'userCalcSettings') return null;
          if (key === 'defCalcSettings') return null;
          return null;
        }
      }
    },
    applyCalcSettingsString() {
      return true;
    },
    displayCalcNotification() {},
    exportCiphersDB() { return ''; },
    document: {
      getElementById() {
        return null;
      }
    },
    console,
    setTimeout,
    clearTimeout,
    $: () => ({ removeClass() {}, addClass() {} }),
    userDBlive: []
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'calc/localstorage.js' });
  return context;
}

const context = loadLocalStorageModule();
assert.doesNotThrow(() => context.restoreCalcSettingsLocalStorage(true));
assert.strictEqual(context.restoreCalcSettingsLocalStorage(true), undefined);
console.log('localstorage restore handles missing defaults without throwing');

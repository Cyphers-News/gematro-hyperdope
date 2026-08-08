var fs = new ActiveXObject('Scripting.FileSystemObject');
var path = 'calc\\localstorage.js';
var file = fs.OpenTextFile(path, 1);
var source = file.ReadAll();
file.Close();

source = source.replace('function saveCalcSettingsLocalStorage(saveDef = false)', 'function saveCalcSettingsLocalStorage(saveDef)');
source = source.replace('function restoreCalcSettingsLocalStorage(silentMode = false)', 'function restoreCalcSettingsLocalStorage(silentMode)');
source = source.replace('function applyCalcSettingsString(file, silentMode = false)', 'function applyCalcSettingsString(file, silentMode)');

var context = {
  window: {
    localStorage: {
      getItem: function (key) {
        if (key === 'userCalcSettings') return null;
        if (key === 'defCalcSettings') return null;
        return null;
      },
      setItem: function () {},
      removeItem: function () {},
      clear: function () {}
    }
  },
  applyCalcSettingsString: function () { return true; },
  displayCalcNotification: function () {},
  exportCiphersDB: function () { return ''; },
  document: {
    getElementById: function () { return null; }
  },
  console: { warn: function () {} },
  $: function () {
    return {
      removeClass: function () {},
      addClass: function () {}
    };
  },
  userDBlive: []
};

var restoreCalcSettingsLocalStorage = (new Function(
  'window',
  'applyCalcSettingsString',
  'displayCalcNotification',
  'exportCiphersDB',
  'document',
  'console',
  '$',
  'userDBlive',
  source + '\nreturn restoreCalcSettingsLocalStorage;'
))(
  context.window,
  context.applyCalcSettingsString,
  context.displayCalcNotification,
  context.exportCiphersDB,
  context.document,
  context.console,
  context.$,
  context.userDBlive
);

try {
  restoreCalcSettingsLocalStorage(true);
  WScript.Echo('PASS');
} catch (err) {
  WScript.Echo('FAIL: ' + err.message);
  WScript.Quit(1);
}

import pathlib
import sys
import types

source = pathlib.Path('calc/localstorage.js').read_text(encoding='utf-8')

# Minimal browser-like globals for exercising restoreCalcSettingsLocalStorage.
window = types.SimpleNamespace()
window.localStorage = types.SimpleNamespace()
window.localStorage.getItem = lambda key: None
window.localStorage.setItem = lambda *args, **kwargs: None
window.localStorage.removeItem = lambda *args, **kwargs: None
window.localStorage.clear = lambda *args, **kwargs: None

context = {
    'window': window,
    'applyCalcSettingsString': lambda *args, **kwargs: True,
    'displayCalcNotification': lambda *args, **kwargs: None,
    'exportCiphersDB': lambda *args, **kwargs: '',
    'document': types.SimpleNamespace(getElementById=lambda *args, **kwargs: None),
    'console': types.SimpleNamespace(warn=lambda *args, **kwargs: None),
    '$': lambda *args, **kwargs: types.SimpleNamespace(removeClass=lambda *args, **kwargs: None, addClass=lambda *args, **kwargs: None),
    'userDBlive': [],
}

# Execute the module in a Python-like namespace. The original code uses browser globals,
# so this is sufficient to exercise the null-handling branch.
exec("""\n""" + source + "\n", context)

result = context['restoreCalcSettingsLocalStorage'](True)
assert result is None
print('localstorage restore handles missing defaults without throwing')

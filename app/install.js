(function () {
  'use strict';
  var native = !!(window.Capacitor && window.Capacitor.isNativePlatform());
  var deferredInstall = null;
  var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  var button = document.getElementById('installCyphers');
  var dialog = document.getElementById('installHelp');
  var status = document.getElementById('appConnectionStatus');

  function connectionStatus() {
    if (status) status.hidden = navigator.onLine;
  }
  connectionStatus();
  window.addEventListener('online', connectionStatus);
  window.addEventListener('offline', connectionStatus);
  if (button && !standalone && !native) button.hidden = false;
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferredInstall = event;
  });
  window.addEventListener('appinstalled', function () {
    deferredInstall = null;
    if (button) button.hidden = true;
  });
  if (button) button.addEventListener('click', async function () {
    if (deferredInstall) {
      var prompt = deferredInstall;
      deferredInstall = null;
      try { await prompt.prompt(); await prompt.userChoice; }
      catch (_) { if (dialog) dialog.showModal(); }
    } else if (dialog) dialog.showModal();
  });
  if (!native && 'serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(function () {
        var message = document.getElementById('offlineAvailability');
        if (message) message.textContent = 'Offline access is unavailable in this browser. You can still use Cyphers online.';
      });
    });
  }
})();

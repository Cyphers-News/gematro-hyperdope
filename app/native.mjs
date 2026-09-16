import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { parseAuthLink } from './native-auth.mjs';

if (Capacitor.isNativePlatform()) {
  window.CyphersNative = {
    async openAuth(url) {
      const target = new URL(url);
      const expected = new URL(window.SUPABASE_URL);
      if (target.protocol !== 'https:' || target.origin !== expected.origin || !target.pathname.startsWith('/auth/v1/')) throw new Error('Invalid sign-in URL');
      await Browser.open({ url: target.href });
    },
    async saveFile(name, dataUrl) {
      const url = new URL(dataUrl);
      if (url.protocol !== 'data:') throw new Error('Unsupported export format');
      const comma = dataUrl.indexOf(',');
      if (comma < 0) throw new Error('Invalid export');
      const header = dataUrl.slice(0, comma);
      const payload = dataUrl.slice(comma + 1);
      const bytes = /;base64$/i.test(header)
        ? Uint8Array.from(atob(payload), character => character.charCodeAt(0))
        : new TextEncoder().encode(decodeURIComponent(payload));
      const blob = new Blob([bytes]);
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const path = 'exports/' + name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
      const result = await Filesystem.writeFile({ path, data, directory: Directory.Cache, recursive: true });
      await Share.share({ title: 'Cyphers export', files: [result.uri] });
    }
  };
  const handled = new Set();
  async function receiveLink(raw) {
    const result = parseAuthLink(raw);
    if (!result || handled.has(raw)) return;
    if (result.code && sessionStorage.getItem('cyphers.native.lastCode') === result.code) return;
    handled.add(raw);
    if (result.code) sessionStorage.setItem('cyphers.native.lastCode', result.code);
    try {
      if (result.error) throw new Error('Sign-in was cancelled or declined.');
      const client = window.getAuthClient();
      if (!client) throw new Error('Sign-in is unavailable.');
      const exchange = await client.auth.exchangeCodeForSession(result.code);
      if (exchange.error) throw exchange.error;
      await Browser.close().catch(() => {});
      window.location.replace(result.page);
    } catch (_) {
      await Browser.close().catch(() => {});
      window.alert('This sign-in link could not be used. Please start sign-in or request a new password-reset link from this app.');
    }
  }
  document.addEventListener('DOMContentLoaded', async () => {
    await App.addListener('appUrlOpen', ({ url }) => receiveLink(url));
    const launch = await App.getLaunchUrl();
    if (launch?.url) await receiveLink(launch.url);
    await App.addListener('backButton', async ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else if (!window.location.pathname.endsWith('/index.html') && window.location.pathname !== '/') window.location.replace('index.html');
      else await App.minimizeApp();
    });
  });
}

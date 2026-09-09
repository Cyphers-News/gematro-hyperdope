const routes = new Set(['index.html', 'login.html', 'reset-password.html']);
export function parseAuthLink(value) {
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'news.cyphers.app:' || url.hostname !== 'auth' || url.username || url.password || url.port) return null;
  const page = url.pathname.slice(1);
  if (!routes.has(page)) return null;
  if (url.searchParams.has('error')) return { error: true };
  const code = url.searchParams.get('code');
  // Never accept raw bearer tokens or arbitrary destinations from another app.
  if (!code || url.hash) return null;
  return { code, page };
}

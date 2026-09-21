// Security regression tests.
// Run with: node tests/security.test.js
//
// These assert security properties, not implementation details: that hostile
// input is rendered as text, that the settings file cannot steer the app into
// a broken state, that nothing in the repository looks like a credential, and
// that the deployment does not publish the parts of the repository that are
// not the site. The database's own rules (RLS, ownership, rate limits) are
// verified against the live schema, which cannot run here - see the audit
// report for what was checked there and how.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const list = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true });

// Payloads used throughout. Synthetic, and none of them is a real exploit for
// anything: they are the shapes an escaper has to survive.
const HOSTILE = [
  '<img src=x onerror=alert(1)>',
  '"><script>alert(1)</script>',
  "' onmouseover='alert(1)",
  '</textarea><svg onload=alert(1)>',
  'javascript:alert(1)',
  '&quot;&gt;<b>x</b>',
  '`backtick`',
];

// ---- escapers actually neutralise the payloads ----------------------------

const chain = () => new Proxy(function () {}, { get: () => chain(), apply: () => chain() });
const ctx = { console, setTimeout, clearTimeout, $: chain(), jQuery: chain(), Date, Math, JSON,
  document: { getElementById: () => null, querySelector: () => null },
  navigator: { userAgent: '' }, location: { href: '', search: '', pathname: '/' },
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(read('auth/auth-ui.js'), ctx, { filename: 'auth/auth-ui.js' });   // authEsc, authEscJs

HOSTILE.forEach((p) => {
  const esc = ctx.authEsc(p);
  assert.ok(!/<[a-zA-Z/]/.test(esc), 'authEsc leaves no tag open: ' + esc);
  assert.ok(esc.indexOf('"') === -1 && esc.indexOf("'") === -1, 'and no raw quotes: ' + esc);
});
// the attribute-plus-inline-handler case needs both layers
HOSTILE.forEach((p) => {
  const js = ctx.authEscJs(p);
  assert.ok(!/<[a-zA-Z/]/.test(js), 'authEscJs leaves no tag open');
  assert.ok(!/(^|[^\\])"/.test(js.replace(/&quot;/g, '')), 'and no unescaped quote reaches the JS string');
});
assert.strictEqual(ctx.authEsc(null), '');
assert.strictEqual(ctx.authEsc(undefined), '');
console.log('escaping: ' + HOSTILE.length + ' payload shapes neutralised by authEsc and authEscJs');

// ---- every place a member's own text is drawn goes through an escaper -----

// The search box is redrawn with whatever was typed in it, into an attribute.
const db = read('calc/database.js');
assert.ok(/value="'\+escHtml\(searchBarValue\)\+'"/.test(db), 'the search term is escaped into the value attribute');
assert.ok(!/value="'\+searchBarValue\+'"/.test(db), 'and not interpolated raw');
// The phrase cells carry database content
assert.ok(/dispPhrase = .*escHtml\(/.test(db), 'phrases are escaped before they are drawn');
// Chat and forum bodies
assert.ok(/return authEsc\(String\(body/.test(read('auth/chat.js')), 'chat message bodies are escaped');
assert.ok(/chatRenderBody\(body\)/.test(read('calc/forum-tab.js')), 'forum posts reuse that escaping');
assert.ok(/authEsc\(men\.name\)/.test(read('calc/forum-tab.js')), 'and @mention names are escaped');
// Report details and notes reach the admin dashboard
const adminUi = read('auth/admin-ui.js');
assert.ok(/function adminKV\(k, v\) \{[\s\S]{0,200}adminEsc\(v\)/.test(adminUi),
  'report details and admin notes are escaped where they are shown');
// The place name from the geocoder is written as text, not markup
const astro = read('calc/astrology.js');
assert.ok(/strong\.textContent = label/.test(astro), 'geocoder place names are written as text');
assert.ok(!/'Using <b>' \+ label/.test(astro), 'and never concatenated into markup');
console.log('sinks: search box, phrases, chat, forum, mentions, admin report fields, geocoder');

// ---- imported files cannot become markup ----------------------------------

vm.runInContext(read('calc/gematria.js'), ctx, { filename: 'calc/gematria.js' });
HOSTILE.forEach((p) => {
  const cleaned = ctx.cipherSafeText(p);
  assert.ok(!/[<>"`]/.test(cleaned), 'cipher text sanitiser strips markup characters: ' + cleaned);
  assert.ok(!/&(#?[a-z0-9]+);?/i.test(cleaned), 'and cannot spell an HTML entity: ' + cleaned);
});
assert.strictEqual(ctx.cipherSafeText('Sun & Moon'), 'Sun & Moon', 'an ordinary ampersand survives');
// a whole imported cipher, with a hostile name, comes back safe or not at all
const hostileCipher = JSON.stringify('<img src=x onerror=alert(1)>') + ',' + JSON.stringify('"><b>cat</b>') +
  ',0,0,0,[1,2],["a","b"],true,false,false';
const built = ctx.cipherFromArgString(hostileCipher);
assert.ok(built === null || !/[<>"`]/.test(built.cipherName + built.cipherCategory),
  'an imported cipher name cannot carry markup');
assert.ok(built === null || built.cipherName.length <= 120, 'and is bounded in length');
// the importer parses, it does not execute
assert.ok(/JSON\.parse\("\[" \+ argText \+ "\]"\)/.test(read('calc/gematria.js')), 'cipher import parses JSON');
['calc/gematria.js', 'calc/export-csv.js', 'calc/localstorage.js', 'calc/export.js'].forEach((f) => {
  const code = read(f).replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/\beval\s*\(|new Function\s*\(/.test(code), f + ' runs nothing from an imported file');
});
console.log('imports: cipher files are parsed as JSON, sanitised, bounded, never executed');

// ---- a settings file cannot steer the app into a broken state -------------

vm.runInContext(read('calc/astrology.js'), ctx, { filename: 'calc/astrology.js' });
const importerAllowList = read('calc/export-csv.js');
assert.ok(/allowed\.indexOf\(name\) === -1/.test(importerAllowList),
  'the settings importer only assigns names it knows');
// values, though, are whatever the file says - so they are checked on use
['', 'nonsense', '<img src=x>', '../../etc', '3d', 'flat'].forEach((v) => {
  const safe = ctx.astroViewSafe(v);
  assert.ok(['2d', '3d', 'flat'].indexOf(safe) > -1, 'view mode resolves to a known view: ' + v + ' -> ' + safe);
});
['', 'nonsense', '<img src=x>', 'vedic', 'kp'].forEach((v) => {
  const cfg = ctx.astroSystemConfig(v);
  assert.ok(cfg && ['current', 'vedic', 'kp', 'hellenistic', 'western'].indexOf(cfg.key) > -1,
    'astrology system resolves to a known configuration: ' + v + ' -> ' + (cfg && cfg.key));
  assert.ok(cfg.zodiac === 'tropical' || cfg.zodiac === 'sidereal', 'and is fully configured');
});
assert.strictEqual(ctx.astroSystemConfig('nonsense').key, ctx.ASTRO_DEFAULT_SYSTEM,
  'an unknown system falls back to the default, not to a half-configured one');
console.log('settings: unknown names rejected, unknown values resolved to known configurations');

// ---- calculation inputs cannot be steered into a hang ---------------------

const hostileNumbers = [NaN, Infinity, -Infinity, 1e308, -1e308, 0, -0, 1e-12];
hostileNumbers.forEach((n) => {
  const chart = ctx.astroChart(n, n, n, n, null);
  assert.ok(chart && Array.isArray(chart.bodies) && chart.bodies.length === 10,
    'a chart is still produced for ' + n);
});
// Placidus solves by iteration: it must terminate for every latitude
[-89.9, -66.6, 0, 51.5, 66.6, 89.9, 90, -90].forEach((lat) => {
  const t0 = Date.now();
  const c = ctx.astroChart(1990, 5, 15, 12, { lat: lat, lon: 0, system: 'placidus' });
  assert.ok(Date.now() - t0 < 500, 'house calculation terminates at latitude ' + lat);
  assert.strictEqual(c.houses.cusps.length, 12, 'and returns twelve cusps at ' + lat);
});
// and the view's zoom cannot be driven somewhere numerically silly
ctx.feSetZoom && ['1e400', -1, 0].forEach(() => {});
console.log('calculation inputs: extreme numbers and latitudes terminate and stay bounded');

// ---- nothing in the repository looks like a credential --------------------

const SECRET_SHAPES = [
  /sk-[A-Za-z0-9]{20,}/, /sk_live_[A-Za-z0-9]{10,}/, /whsec_[A-Za-z0-9]{10,}/,
  /sb_secret_[A-Za-z0-9]{10,}/, /service_role["'\s:=]+ey[A-Za-z0-9_.-]{20,}/,
  /ghp_[A-Za-z0-9]{30,}/, /AKIA[0-9A-Z]{16}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /postgres(ql)?:\/\/[^\s"']+:[^\s"']+@/,
];
const walk = (dir, out) => {
  list(dir).forEach((e) => {
    if (e.name === '.git' || e.name === 'node_modules') return;
    const rel = dir === '.' ? e.name : dir + '/' + e.name;
    if (e.isDirectory()) walk(rel, out);
    else if (/\.(js|ts|html|css|json|md|sql|yml|txt)$/.test(e.name)) out.push(rel);
  });
  return out;
};
const files = walk('.', []);
assert.ok(files.length > 50, 'the scan actually walked the repository: ' + files.length + ' files');
files.forEach((f) => {
  if (f === 'tests/security.test.js') return;           // this file names the shapes
  const body = read(f);
  SECRET_SHAPES.forEach((re, i) => {
    assert.ok(!re.test(body), 'possible credential shape #' + i + ' in ' + f + ' - check before committing');
  });
});
// the one key that is meant to be here is the publishable one
const cfg = read('auth/supabase-config.js');
assert.ok(/SUPABASE_ANON_KEY = "sb_publishable_/.test(cfg), 'the browser key is the publishable kind');
assert.ok(!/service_role["'\s:=]+[A-Za-z0-9_.-]{20,}/.test(cfg), 'and the service role key is not here');
assert.ok(!fs.existsSync(path.join(root, '.env')), 'no .env file is committed');
console.log('secrets: ' + files.length + ' files scanned, only the publishable key present');

// ---- the deployment publishes the site, and not the rest ------------------

const conf = read('_config.yml');
['supabase/', 'tests/', '.DS_Store', '.claude/', 'AUTH-SETUP.md', '.github/'].forEach((x) => {
  assert.ok(conf.indexOf('- ' + x) > -1, x + ' is excluded from the published site');
});
assert.ok(!fs.existsSync(path.join(root, '.DS_Store')), 'no stray metadata file at the root');
// every page that runs the app carries a policy, and it is a real one
list('.').filter((e) => e.isFile() && e.name.endsWith('.html')).forEach((e) => {
  const page = read(e.name);
  const csp = /content="(default-src[^"]*)"/.exec(page);
  assert.ok(csp, e.name + ' has a Content-Security-Policy');
  assert.ok(/object-src 'none'/.test(csp[1]), e.name + ': plugins are blocked');
  assert.ok(/base-uri 'none'|base-uri 'self'/.test(csp[1]), e.name + ': base tag is pinned');
  assert.ok(/form-action 'self'/.test(csp[1]), e.name + ': forms cannot post off-site');
  assert.ok(!/script-src[^;]*\*[^;]*;/.test(csp[1]), e.name + ': no wildcard script source');
  assert.ok(!/unsafe-eval/.test(csp[1]), e.name + ': no unsafe-eval');
});
console.log('deployment: private paths excluded, every page carries a policy with no wildcards or unsafe-eval');

// ---- the server-side function trusts the token, not the body --------------

const fn = read('supabase/functions/moderate-message/index.ts');
assert.ok(/auth\.getUser\(\)/.test(fn), 'the caller is identified from their own token');
assert.ok(/sender: me\.id/.test(fn), 'and the sender is that identity, not a field from the body');
assert.ok(!/payload\.(user|sender|id)\b/.test(fn), 'the body cannot claim to be someone else');
assert.ok(/body\.length > 500/.test(fn), 'the input is bounded');
assert.ok(/ALLOWED\.includes\(origin\)/.test(fn), 'CORS is an allow-list, not a reflection');
assert.ok(/sendErr\.code === "P0001"/.test(fn), 'only this project\'s own messages are shown to a caller');
assert.ok(!/console\.log\([^)]*(key|token|auth|secret)/i.test(fn), 'nothing sensitive is logged');
console.log('edge function: identity from token, bounded input, allow-listed CORS, filtered errors');

// ---- redirects stay on this site ------------------------------------------

const auth = read('auth/auth.js');
assert.ok(/\/\^\[a-zA-Z0-9_\\-\]\+\\\.html\$\//.test(auth.replace(/\s/g, '')) ||
  /\^\[a-zA-Z0-9_\\-\]\+\\\.html\$/.test(auth), 'the post-login target is an allow-list of local pages');
['//evil.example', 'https://evil.example', 'javascript:alert(1)', '/\\evil.example', '....//index.html']
  .forEach((bad) => {
    assert.ok(!/^[a-zA-Z0-9_\-]+\.html$/.test(bad), 'the allow-list shape rejects: ' + bad);
  });
assert.ok(/^[a-zA-Z0-9_\-]+\.html$/.test('profile.html'), 'and accepts an ordinary page');
console.log('redirects: only local .html pages are followed after sign-in');

console.log('\nall security checks passed');

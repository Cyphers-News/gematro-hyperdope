// Master Decoder - rules, data layer and migration checks.
// Run with: node tests/master-decoder.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

function load(files, extra) {
  const context = Object.assign({ console, setTimeout, clearTimeout, setInterval, clearInterval }, extra || {});
  vm.createContext(context);
  files.forEach((f) => vm.runInContext(read(f), context, { filename: f }));
  return context;
}

// ---- the cipher rule ------------------------------------------------------

const ui = load(['calc/master-decoder.js']);

assert.strictEqual(ui.mdWordSum('World', 'ordinal'), 72);
assert.strictEqual(ui.mdWordSum('World', 'reduced'), 27);
assert.strictEqual(ui.mdLetterValue('A', 'ordinal'), 1);
assert.strictEqual(ui.mdLetterValue('z', 'ordinal'), 26);
assert.strictEqual(ui.mdLetterValue('I', 'reduced'), 9);
assert.strictEqual(ui.mdLetterValue('J', 'reduced'), 1);
assert.strictEqual(ui.mdLetterValue('R', 'reduced'), 9);
assert.strictEqual(ui.mdLetterValue('S', 'reduced'), 1);
assert.strictEqual(ui.mdLetterValue('Z', 'reduced'), 8);
assert.strictEqual(ui.mdLetterValue(' ', 'ordinal'), null);
assert.strictEqual(ui.mdWordSum('New York', 'ordinal'), ui.mdWordSum('NewYork', 'ordinal'));
console.log('cipher rule matches the game (World = 72 ordinal, 27 reduced)');

// Same rule the standalone game used, written independently, over every
// word the migration can serve - so the hover reveal and the server agree.
function gameSum(word, mode) {
  return word.toUpperCase().split('').reduce((sum, ch) => {
    if (!/[A-Z]/.test(ch)) return sum;
    const v = ch.charCodeAt(0) - 64;
    return sum + (mode === 'reduced' ? (v % 9 || 9) : v);
  }, 0);
}
const sql = read('supabase/migrations/20260918000000_master_decoder.sql');
const listMatch = /array\[([\s\S]*?)\]\s+as list/.exec(sql);
assert.ok(listMatch, 'word list found in the migration');
const words = listMatch[1].match(/'([^']+)'/g).map((w) => w.slice(1, -1));
assert.deepStrictEqual(words.slice(), ['World', 'New York', 'Magic', 'Coding', 'Love', 'Freedom', 'Journey',
  'Mystery', 'Harmony', 'Wisdom', 'Destiny', 'Balance', 'Fortune', 'Legacy', 'Horizon']);
words.forEach((w) => {
  assert.strictEqual(ui.mdWordSum(w, 'ordinal'), gameSum(w, 'ordinal'), w + ' ordinal');
  assert.strictEqual(ui.mdWordSum(w, 'reduced'), gameSum(w, 'reduced'), w + ' reduced');
});
console.log('all ' + words.length + ' server words agree with the original game rule in both ciphers');

// ---- labels and the green/red final score --------------------------------

assert.strictEqual(ui.mdPeriodLabel('2026-09'), 'September 2026');
assert.strictEqual(ui.mdPeriodLabel('2026-12'), 'December 2026');
assert.strictEqual(ui.mdPeriodLabel('nonsense'), '');
assert.strictEqual(ui.mdResetLabel('2026-10-01'), '1 October');

const board = (scores) => scores.map((s) => ({ best_score: s }));
assert.strictEqual(ui.mdQualifies(0, board([])), false, 'zero never places');
assert.strictEqual(ui.mdQualifies(1, board([])), true, 'empty board');
assert.strictEqual(ui.mdQualifies(1, board([9, 8, 7])), true, 'board not full');
const full = board([20, 19, 18, 17, 16, 15, 14, 13, 12, 11]);
assert.strictEqual(ui.mdQualifies(11, full), false, 'tie with tenth does not place');
assert.strictEqual(ui.mdQualifies(12, full), true, 'beats tenth');
console.log('period labels and top-ten check behave');

// ---- the logo: MASTER over DECODER, one element per letter ------------------

{
  const letters = ui.mdLogoLetters();
  assert.strictEqual(letters.map((l) => l.ch).join(''), 'MASTERDECODER');
  // the values come from the game's own reduced rule, not a table of their own
  letters.forEach((l) => assert.strictEqual(l.v, ui.mdLetterValue(l.ch, 'reduced'), l.ch));
  assert.strictEqual(letters.map((l) => l.v).join(''), '4112594536459');
  // every letter and every value it can reveal has a drawn glyph
  letters.forEach((l) => {
    assert.ok(ui.MD_LOGO_GLYPHS[l.ch], 'glyph for ' + l.ch);
    assert.ok(ui.MD_LOGO_GLYPHS[String(l.v)], 'glyph for ' + l.v);
  });
  // MASTER is small and centred over DECODER
  const small = letters.filter((l) => !l.big), big = letters.filter((l) => l.big);
  const mid = (ls, w) => (ls[0].x + ls[ls.length - 1].x + w) / 2;
  assert.ok(Math.abs(mid(small, 100 * ui.MD_LOGO_SMALL_SCALE) - mid(big, 100)) < 0.001, 'MASTER centred over DECODER');
  assert.ok(small.every((l) => l.y < big[0].y), 'MASTER above DECODER');
  const html = ui.mdLogoMarkup();
  assert.strictEqual((html.match(/class="mdLogoHit"/g) || []).length, 13, 'one interactive element per letter');
  assert.ok(!/<use\b/.test(html), 'no <use> clones - the stylesheet cannot reach inside them');
  assert.ok(!/<img|\.gif/i.test(html), 'no raster image');
  console.log('logo: 13 addressable letters, values from the game\'s reduced cipher, MASTER centred above DECODER');
}

// ---- rain: red during a round, then exactly as it was ----------------------

{
  const canv = { style: { filter: 'blur(1px)' } };
  const rain = load(['calc/master-decoder.js'], {
    document: { getElementById: (id) => (id === 'canv' ? canv : null) },
    coderainHue: 148, coderainSat: 0.2, coderainColorPicked: false
  });
  rain.mdRainOn();
  assert.ok(canv.style.filter.startsWith('blur(1px) ') && canv.style.filter.includes('hue-rotate(-50deg)'), 'red over the existing filter');
  rain.mdRainOn(); // idempotent while the round runs
  assert.strictEqual(canv.style.filter.split('sepia').length, 2, 'red applied once, not stacked');
  canv.style.filter = 'blur(1px)'; // the rain engine re-initialised mid-round
  rain.mdRainOn();
  assert.ok(canv.style.filter.includes('hue-rotate(-50deg)'), 'red re-applied after the engine reset it');
  rain.mdRainOff();
  assert.strictEqual(canv.style.filter, 'blur(1px)', 'previous filter restored exactly');
  rain.mdRainOff(); // closing the panel after the round is a no-op
  assert.strictEqual(canv.style.filter, 'blur(1px)');
  assert.strictEqual(rain.coderainHue, 148);
  assert.strictEqual(rain.coderainSat, 0.2);
  assert.strictEqual(rain.coderainColorPicked, false, 'saved rain settings never written');
  console.log('rain turns red for a round and is restored exactly; saved rain settings untouched');
}

// ---- data layer ------------------------------------------------------------

const calls = [];
function fakeClient(result) {
  return { rpc(name, args) { calls.push([name, args]); return Promise.resolve(result); } };
}

(async () => {
  // signed out: nothing is sent at all
  let data = load(['auth/master-decoder-data.js'], { authUser: null, getAuthClient: () => fakeClient({ data: null }) });
  await assert.rejects(data.mdStartRound('ordinal'), /Sign in to play Master Decoder/);
  assert.strictEqual(calls.length, 0, 'no request while signed out');

  // signed in: the RPC gets the cipher and nothing that identifies the player
  data = load(['auth/master-decoder-data.js'], {
    authUser: { id: 'u1' },
    getAuthClient: () => fakeClient({ data: [{ round_id: 'r1', period: '2026-09', countdown_ms: 5000, round_ms: 60000 }], error: null })
  });
  const r = await data.mdStartRound('reduced');
  assert.strictEqual(r.round_id, 'r1');
  // JSON: the args object was built inside the vm context, a different realm
  assert.strictEqual(JSON.stringify(calls[0]), JSON.stringify(['master_decoder_start', { p_cipher_mode: 'reduced' }]));

  await data.mdSendAnswer('r1', 42);
  assert.strictEqual(JSON.stringify(calls[1]), JSON.stringify(['master_decoder_answer', { p_round_id: 'r1', p_answer: 42 }]),
    'an answer carries the round and the number only - never a score or a user id');

  // error mapping
  const err = (m) => data.mdError({ message: m }).message;
  assert.match(err('Could not find the function public.master_decoder_start in the schema cache'), /not set up on this database yet/);
  assert.strictEqual(err('Too fast. Wait for the next word.'), 'Too fast. Wait for the next word.');
  data.authIsRawDbError = (m) => /violates/.test(m);
  assert.strictEqual(err('new row violates check constraint "x"'), 'Something went wrong — try again.');
  console.log('data layer sends no identity or score, and maps errors like the rest of the app');

  // ---- migration conventions ----------------------------------------------
  const grants = sql.match(/^grant\b[^;]*;/gim) || [];
  assert.strictEqual(grants.length, 5, 'one grant per client function');
  grants.forEach((g) => assert.ok(!/\banon\b|\bpublic\s*;/i.test(g), 'nothing is granted to anon: ' + g));
  assert.ok(!/create\s+(or\s+replace\s+)?view/i.test(sql), 'no views');
  assert.ok(!/\b(drop\s+table|truncate|delete\s+from)\b/i.test(sql), 'nothing destructive');
  assert.ok(/enable row level security/.test(sql), 'RLS enabled');
  const definers = sql.match(/security definer\s+set search_path = ''/g) || [];
  assert.strictEqual(definers.length, 5, 'every security definer function pins search_path');
  ['master_decoder_start(text)', 'master_decoder_word(uuid)', 'master_decoder_answer(uuid, integer)',
    'master_decoder_finish(uuid)', 'master_decoder_board(text, integer)'].forEach((fn) => {
    assert.ok(sql.includes('revoke all on function public.' + fn + ' from public, anon, authenticated'), fn + ' revoked');
    assert.ok(sql.includes('grant execute on function public.' + fn + ' to authenticated'), fn + ' granted');
  });
  assert.ok(/master_decoder_period\(now\(\)\)/.test(sql), 'the period is computed from the server clock');
  const others = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((f) => f.startsWith('20260918000000'));
  assert.deepStrictEqual(others, ['20260918000000_master_decoder.sql'], 'migration timestamp is unique');
  console.log('migration follows the project conventions (RLS, no anon, pinned search_path, additive)');

  // ---- every play re-checks the account, not only the start ----------------
  const fix = read('supabase/migrations/20260918010000_master_decoder_account_check.sql');
  const body = (src, name) => src.slice(src.indexOf('create or replace function public.' + name + '('),
    src.indexOf('$$;', src.indexOf('create or replace function public.' + name + '(')));
  assert.ok(/perform public\.account_check\(me\)/.test(body(sql, 'master_decoder_start')), 'start checks the account');
  ['master_decoder_word', 'master_decoder_answer'].forEach((fn) => {
    const b = body(fix, fn);
    assert.ok(/perform public\.account_check\(me\)/.test(b), fn + ' checks the account');
    // otherwise identical to the original function
    assert.strictEqual(b.replace(/\n  -- banned[^\n]*\n  -- even[^\n]*\n  perform public\.account_check\(me\);/, ''), body(sql, fn), fn + ' unchanged apart from the check');
  });
  (fix.match(/^grant\b[^;]*;/gim) || []).forEach((g) => assert.ok(!/\banon\b/i.test(g), 'no anon grant: ' + g));
  assert.ok(!/\b(drop|truncate|delete\s+from|alter\s+table)\b/i.test(fix), 'follow-up migration is not destructive');
  assert.ok(/master_decoder_board[\s\S]*public\.account_active\(s\.user_id\)/.test(sql), 'board leaves inactive accounts off');
  assert.ok(/where s\.period = v_period/.test(sql), 'board reads the current period only');
  console.log('account status is checked on start, first word and every answer; board shows active accounts, current month only');

  // ---- function grants: nothing for anon, members keep what they had ----------
  const grantsFix = read('supabase/migrations/20260918020000_function_grants_hardening.sql');
  const code = grantsFix.replace(/--[^\n]*/g, '');
  assert.ok(!/\bgrant\b[^;]*\banon\b/i.test(code), 'grants nothing to anon');
  assert.ok(!/\b(drop|truncate|delete\s+from|alter\s+table|create\s+policy)\b/i.test(code), 'touches no table, row or policy');
  assert.ok(/revoke execute on function %s from public, anon/.test(code), 'every function loses its PUBLIC and anon grant');
  assert.ok(/has_function_privilege\('authenticated'/.test(code) && /grant execute on function %s to authenticated/.test(code), 'members keep exactly what they could call');
  assert.ok(/d\.deptype = 'e'/.test(code), 'extension-owned functions are left alone');
  ['is_blocked(uuid, uuid)', 'are_friends(uuid, uuid)'].forEach((fn) =>
    assert.ok(code.includes('revoke execute on function public.' + fn + ' from public, anon, authenticated'), fn + ' closed'));
  assert.ok(/alter default privileges in schema public revoke execute on functions from anon/.test(code), 'future functions are not anon-callable by default');
  console.log('function grants migration: nothing callable signed out, members unchanged except two lookups, additive');
})().catch((e) => { console.error(e); process.exit(1); });

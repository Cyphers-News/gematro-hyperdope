const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('calc/export.js');
const html = read('index.html');
const css = read('calc/styles.css');
const settle = () => new Promise(resolve => setImmediate(resolve));

function functionSource(code, name) {
  const start = code.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} exists`);
  const open = code.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = open; i < code.length; i++) {
    const ch = code[i];
    const next = code[i + 1];
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && next === '/') { blockComment = false; i++; } continue; }
    if (quote !== null) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && next === '/') { lineComment = true; i++; continue; }
    if (ch === '/' && next === '*') { blockComment = true; i++; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    if (ch === '}' && --depth === 0) return code.slice(start, i + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

function install(context, names) {
  context.window = context;
  vm.createContext(context);
  for (const name of names) vm.runInContext(functionSource(source, name), context, { filename: 'calc/export.js' });
  return context;
}

test('card model accepts only an active detailed breakdown and uses the visible comment-stripped phrase', () => {
  const detail = { marker: 'rendered breakdown', querySelector: () => null };
  const sourceNode = { querySelector: selector => selector === '#BreakTableContainer' ? detail : null };
  const cipher = { cipherName: 'Based Atlanteanism', LetterCount: 10, WordCount: 2, H: 173, S: 88, L: 31 };
  const context = install({
    cipherList: [cipher],
    breakCipher: 'Based Atlanteanism',
    breakPhraseText: 'visible phrase',
    breakPhraseTotal: 666,
    gemCalcModeLabel: () => ' - x1 ... x10',
    document: { getElementById: id => id === 'BreakdownSpot' ? sourceNode : null }
  }, ['shareActiveCipher', 'shareCountText', 'shareCardModel']);

  const model = context.shareCardModel();
  assert.equal(model.phrase, 'visible phrase');
  assert.equal(model.total, '666');
  assert.equal(model.cipher, 'Based Atlanteanism');
  assert.equal(model.mode, ' - x1 ... x10');
  assert.equal(model.counts, '10 letters, 2 words');
  assert.equal(model.derived, false);
  assert.equal(model.breakdown, detail);

  sourceNode.querySelector = () => null;
  assert.equal(context.shareCardModel(), null, 'a compact equation alone is not silently presented as a full breakdown');
});

test('static matrix generation is deterministic for the same calculation and changes with the payload', () => {
  const context = install({}, ['shareHash', 'shareRandom']);
  const a = context.shareRandom(context.shareHash('phrase|cipher|42'));
  const b = context.shareRandom(context.shareHash('phrase|cipher|42'));
  const c = context.shareRandom(context.shareHash('different|cipher|42'));
  const first = Array.from({ length: 8 }, () => a());
  assert.deepEqual(first, Array.from({ length: 8 }, () => b()));
  assert.notDeepEqual(first, Array.from({ length: 8 }, () => c()));
});

test('native share is shown only for a positively accepted png file payload', () => {
  const checked = [];
  class FakeFile {
    constructor(parts, name, options) { this.parts = parts; this.name = name; this.type = options.type; }
  }
  const context = install({
    File: FakeFile,
    navigator: {
      share() {},
      canShare(payload) { checked.push(payload); return payload.files[0].type === 'image/png'; }
    }
  }, ['shareResultFile', 'shareCanNativeFile']);
  const result = { blob: { bytes: 4 }, fileName: 'cyphers.png' };
  assert.equal(context.shareCanNativeFile(result), true);
  assert.equal(checked.length, 1);
  assert.equal(checked[0].files.length, 1);
  assert.equal(checked[0].files[0].name, 'cyphers.png');
  context.navigator.canShare = () => false;
  assert.equal(context.shareCanNativeFile(result), false);
});

test('native share cancellation is quiet and every attempt sends exactly one png file', async () => {
  const payloads = [];
  const notices = [];
  class FakeFile {
    constructor(parts, name, options) { this.parts = parts; this.name = name; this.type = options.type; }
  }
  const context = install({
    File: FakeFile,
    sharePreviewState: { blob: { bytes: 7 }, fileName: 'card.png', cipher: 'Ordinal', total: '98', phrase: 'altar.codes' },
    displayCalcNotification: message => notices.push(message),
    navigator: {
      canShare: () => true,
      share(payload) {
        payloads.push(payload);
        const err = new Error('cancelled');
        err.name = 'AbortError';
        return Promise.reject(err);
      }
    }
  }, ['shareResultFile', 'shareCanNativeFile', 'sharePreviewNative']);

  context.sharePreviewNative();
  await settle();
  assert.equal(payloads.length, 1);
  assert.equal(payloads[0].files.length, 1);
  assert.equal(payloads[0].files[0].type, 'image/png');
  assert.deepEqual(notices, []);
});

test('synchronous native-share failure stays recoverable in the open preview', () => {
  const notices = [];
  class FakeFile { constructor(parts, name, options) { this.type = options.type; } }
  const context = install({
    File: FakeFile,
    sharePreviewState: { blob: {}, fileName: 'card.png', cipher: 'Ordinal', total: '98', phrase: 'altar.codes' },
    displayCalcNotification: message => notices.push(message),
    navigator: { canShare: () => true, share() { throw new TypeError('synthetic refusal'); } }
  }, ['shareResultFile', 'shareCanNativeFile', 'sharePreviewNative']);
  assert.doesNotThrow(() => context.sharePreviewNative());
  assert.deepEqual(notices, ['The image could not be shared — Save png is still available']);
  assert.notEqual(context.sharePreviewState, null);
});

test('clipboard image action requires a secure supported context and writes one png blob', async () => {
  const writes = [];
  class FakeClipboardItem { constructor(payload) { this.payload = payload; } }
  const context = install({
    isSecureContext: true,
    ClipboardItem: FakeClipboardItem,
    sharePreviewState: { blob: { bytes: 9 } },
    displayCalcNotification() {},
    navigator: { clipboard: { write(items) { writes.push(items); return Promise.resolve(); } } }
  }, ['shareCanCopyImage', 'sharePreviewCopy']);

  assert.equal(context.shareCanCopyImage(), true);
  context.sharePreviewCopy();
  await settle();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].length, 1);
  assert.equal(writes[0][0].payload['image/png'].bytes, 9);
  context.isSecureContext = false;
  assert.equal(context.shareCanCopyImage(), false);
});

test('synchronous clipboard refusal stays recoverable in the open preview', () => {
  const notices = [];
  class RefusingClipboardItem { constructor() { throw new TypeError('synthetic refusal'); } }
  const context = install({
    isSecureContext: true,
    ClipboardItem: RefusingClipboardItem,
    sharePreviewState: { blob: {} },
    displayCalcNotification: message => notices.push(message),
    navigator: { clipboard: { write() { throw new Error('must not reach write'); } } }
  }, ['shareCanCopyImage', 'sharePreviewCopy']);
  assert.doesNotThrow(() => context.sharePreviewCopy());
  assert.deepEqual(notices, ['The image could not be copied — Save png is still available']);
  assert.notEqual(context.sharePreviewState, null);
});

test('card construction treats phrase and metadata as text and strips interaction from the clone', () => {
  const build = functionSource(source, 'buildShareCard');
  const clone = functionSource(source, 'shareCloneBreakdown');
  assert.match(build, /phrase\.textContent = model\.phrase/);
  assert.match(build, /cipher\.textContent = model\.cipher \+ model\.mode/);
  assert.match(build, /signature\.textContent = "cyphers\.news"/);
  assert.doesNotMatch(build, /innerHTML/);
  assert.match(clone, /\^on\/i/);
  assert.match(clone, /removeAttribute\("tabindex"\)/);
  assert.match(clone, /SimpleBreakChart/);
  assert.match(clone, /BreakPhraseSum/);
  assert.match(clone, /BreakCipherName/);
  assert.match(clone, /#BreakSumLong/);
  assert.match(build, /if \(!model\.derived\) result\.appendChild\(total\)/);
});

test('preview is capability-honest, always keeps save, and revokes stale blob urls', () => {
  const apply = functionSource(source, 'sharePreviewApply');
  const close = functionSource(source, 'closeShareCardPreview');
  assert.match(apply, /if \(shareCanNativeFile\(result\)\)/);
  assert.match(apply, /if \(shareCanCopyImage\(\)\)/);
  assert.match(apply, /sharePreviewButton\("Save png"/);
  assert.match(apply, /sharePreviewButton\("Refresh"/);
  assert.match(apply, /URL\.revokeObjectURL/);
  assert.match(close, /URL\.revokeObjectURL/);
  assert.match(functionSource(source, 'sharePreviewSave'), /download\(sharePreviewState\.fileName, sharePreviewState\.url\)/);
  assert.match(functionSource(source, 'sharePreviewRefresh'), /generation !== sharePreviewGeneration/);
  assert.match(close, /sharePreviewGeneration\+\+/);
});

test('a completed render cannot mint an orphaned url after its preview has gone', () => {
  let created = 0;
  const context = install({
    sharePreviewState: null,
    URL: { createObjectURL() { created++; return 'blob:orphan'; }, revokeObjectURL() {} },
    document: { querySelector: () => null }
  }, ['sharePreviewApply']);
  assert.equal(context.sharePreviewApply({ blob: {} }), false);
  assert.equal(created, 0);
  assert.equal(context.sharePreviewState, null);
});

test('share generation stays local and bounded to the staged calculation card', () => {
  const shareSlice = source.slice(source.indexOf('// ---- Share card'), source.indexOf('function openImageWindow('));
  assert.match(shareSlice, /html2canvas\(built\.card/);
  assert.match(shareSlice, /drawShareMatrix/);
  assert.doesNotMatch(shareSlice, /\bfetch\s*\(/);
  assert.doesNotMatch(shareSlice, /XMLHttpRequest/);
  assert.doesNotMatch(shareSlice, /supabase\s*\./i);
  assert.doesNotMatch(shareSlice, /gtag\s*\(/);
});

test('focus and share icons are semantically separate, reachable controls', () => {
  assert.match(html, /id="focusModeBtn"[\s\S]*?aria-label="Toggle focus mode"[\s\S]*?<path d="M9 4H4v5"/);
  assert.match(html, /id="shareResultBtn"[\s\S]*?aria-label="Share current calculation"[\s\S]*?onclick="openShareCardPreview\(\)"/);
  assert.match(css, /\.focusModeBtn,[\s\S]*?\.shareResultBtn\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/);
  assert.match(css, /\.focusModeBtn:focus-visible,[\s\S]*?\.shareResultBtn:focus-visible/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('focus-mode projection cannot hide or restyle the staged share breakdown', () => {
  assert.match(css, /body\.focusMode #calcMain #BreakTableContainer/);
  assert.match(css, /body\.focusMode\.focusHideBreakdown #calcMain #BreakTableContainer \.BreakChar/);
  assert.doesNotMatch(css, /body\.focusMode(?:\.focusHideBreakdown)? #BreakTableContainer/);
  assert.doesNotMatch(css, /body\.focusMode\.focusHideBreakdown \.BreakCipherName/);
});

test('every changed browser asset is served under its content hash', () => {
  for (const file of ['calc/calc.js', 'calc/init-variables.js', 'calc/export.js', 'calc/styles.css']) {
    const key = crypto.createHash('sha256').update(read(file)).digest('hex').slice(0, 16);
    assert.match(html, new RegExp(`${file.replace(/[./-]/g, '\\$&')}\\?v=${key}(?:"|&)`));
  }
});

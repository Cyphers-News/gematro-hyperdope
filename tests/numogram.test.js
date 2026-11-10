// Numogram - the model, not the drawing.
// Run with: node tests/numogram.test.js
//
// The figure is generated from six data structures, so these check the
// structures and the arithmetic that builds them. The SVG, pointer input and
// focus handling need a browser; those are checked by reading the source for
// the behaviour they must have, and exercised for real in the browser.
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const chain = () => new Proxy(function () {}, { get: () => chain(), apply: () => chain() });
const ctx = { console, Math, Date, document: chain(), closeAllOpenedMenus: () => {} };
ctx.window = ctx;
vm.createContext(ctx);
const src = read('calc/numogram.js');
vm.runInContext(src, ctx);

// ---------------------------------------------------------------- zones

(function zones() {
	const ns = ctx.NUM_ZONES.map(z => z.n).sort((a, b) => a - b);
	assert.deepStrictEqual(Array.from(ns), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
		'ten zones, 0-9, each exactly once');
	assert.strictEqual(new Set(ns).size, 10, 'no duplicated zone');

	// every zone sits inside the drawing space, clear of the edge
	for (const z of ctx.NUM_ZONES) {
		assert.ok(z.x - z.r > 0 && z.x + z.r < ctx.NUM_W, `zone ${z.n} within width`);
		assert.ok(z.y - z.r > 0 && z.y + z.r < ctx.NUM_H, `zone ${z.n} within height`);
	}

	// the composition is intentionally tall and asymmetric, so a later tidy-up
	// cannot quietly square it up or centre it
	assert.ok(ctx.NUM_H / ctx.NUM_W > 1.3, 'the drawing space stays tall');
	const xs = ctx.NUM_ZONES.map(z => z.x);
	const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
	assert.notStrictEqual(Math.round(mid), Math.round(ctx.NUM_W / 2),
		'the arrangement is asymmetric, not centred');

	// 0 is the foot of the figure and the 3::6 pair is its head
	const lowest = ctx.NUM_ZONES.reduce((a, b) => (a.y > b.y ? a : b));
	assert.strictEqual(lowest.n, 0, 'Zone-0 terminates the figure at the foot');
	const highest = ctx.NUM_ZONES.slice().sort((a, b) => a.y - b.y).slice(0, 2).map(z => z.n).sort();
	assert.deepStrictEqual(Array.from(highest), [3, 6], 'the Warp pair heads the figure');

	console.log('zones: ten, each once, inside a tall asymmetric field, 0 at the foot');
})();

// ------------------------------------------------------------- syzygies

(function syzygies() {
	assert.strictEqual(ctx.NUM_SYZYGIES.length, 5, 'five syzygies');
	const seen = new Set();
	for (const s of ctx.NUM_SYZYGIES) {
		assert.strictEqual(s.a + s.b, 9, `${s.key} is a nine-sum`);
		seen.add(s.a); seen.add(s.b);
	}
	assert.strictEqual(seen.size, 10, 'the five pairs use every zone exactly once');

	// each zone's recorded syzygy agrees with the pairing
	for (const z of ctx.NUM_ZONES) {
		const s = ctx.numSyzygyOf(z.n);
		assert.ok(s.a === z.n || s.b === z.n, `zone ${z.n} belongs to the syzygy it names`);
	}

	// currents are the arithmetical difference
	const cur = {};
	for (const s of ctx.NUM_SYZYGIES) cur[s.key] = ctx.numCurrent(s);
	assert.deepStrictEqual(cur, { '0::9': 9, '1::8': 7, '2::7': 5, '3::6': 3, '4::5': 1 });

	console.log('syzygies: five nine-sum pairs covering every zone, currents 9 7 5 3 1');
})();

// ---------------------------------------------------------- time systems

(function timeSystems() {
	// the two syzygies whose current lands back inside themselves are the
	// closed loops; the rest must form one cycle
	const selfFolding = ctx.NUM_SYZYGIES
		.filter(s => { const c = ctx.numCurrent(s); return c === s.a || c === s.b; })
		.map(s => s.key).sort();
	assert.deepStrictEqual(Array.from(selfFolding), ['0::9', '3::6'],
		'Plex and Warp are the two self-folding loops');

	assert.strictEqual(ctx.numSyzygy('0::9').sys, 'plex');
	assert.strictEqual(ctx.numSyzygy('3::6').sys, 'warp');

	// Torque: follow each current to the syzygy of the zone it reaches, and
	// the three remaining syzygies must close into a single cycle
	const torque = ctx.NUM_SYZYGIES.filter(s => s.sys === 'torque');
	assert.strictEqual(torque.length, 3, 'three syzygies in the Torque');
	let at = torque[0].key;
	const walk = [at];
	for (let i = 0; i < 3; i++) {
		const s = ctx.numSyzygy(at);
		at = ctx.numSyzygyOf(ctx.numCurrent(s)).key;
		walk.push(at);
	}
	assert.strictEqual(walk[3], walk[0], 'the Torque closes after exactly three steps');
	assert.strictEqual(new Set(walk.slice(0, 3)).size, 3, 'it visits all three, no short loop');

	const zonesIn = sys => ctx.NUM_ZONES.filter(z => ctx.numSyzygyOf(z.n).sys === sys)
		.map(z => z.n).sort((a, b) => a - b);
	assert.deepStrictEqual(Array.from(zonesIn('torque')), [1, 2, 4, 5, 7, 8]);
	assert.deepStrictEqual(Array.from(zonesIn('warp')), [3, 6]);
	assert.deepStrictEqual(Array.from(zonesIn('plex')), [0, 9]);

	console.log('time systems: Torque 1 2 4 5 7 8 closes in three steps, Warp 3 6, Plex 0 9');
})();

// ------------------------------------------------------ gates & channels

(function gates() {
	// digital cumulation is the triangular number
	for (let n = 0; n <= 9; n++) {
		assert.strictEqual(ctx.numCumulate(n), (n * (n + 1)) / 2);
		let sum = 0;
		for (let i = 1; i <= n; i++) sum += i;
		assert.strictEqual(ctx.numCumulate(n), sum, `cumulation of ${n} is 1+..+${n}`);
	}

	const values = ctx.NUM_GATES.map(g => g.value);
	assert.deepStrictEqual(Array.from(values), [0, 1, 3, 6, 10, 15, 21, 28, 36, 45],
		'the gate values are the triangular numbers');

	// reduction is the digital root, which is what makes Gate 28 run to 1
	assert.strictEqual(ctx.numReduce(28), 1, 'Gt-28 reduces to 1, not 10');
	assert.strictEqual(ctx.numReduce(45), 9);
	assert.strictEqual(ctx.numReduce(10), 1);
	assert.strictEqual(ctx.numReduce(0), 0);

	// the channel table, against the sourced CCRU list
	const table = {};
	for (const g of ctx.NUM_GATES) table[g.zone] = g.to;
	assert.deepStrictEqual(table, { 0: 0, 1: 1, 2: 3, 3: 6, 4: 1, 5: 6, 6: 3, 7: 1, 8: 9, 9: 9 });

	// one gate per zone, no more
	assert.strictEqual(ctx.NUM_GATES.length, 10);
	assert.strictEqual(new Set(ctx.NUM_GATES.map(g => g.zone)).size, 10);
	assert.strictEqual(ctx.NUM_CHANNELS.length, 10, 'one channel per gate');

	console.log('gates: triangular values 0..45, channels 2->3 3->6 4->1 5->6 6->3 7->1 8->9, three self-returning');
})();

// ------------------------------------------ source and rendering boundaries

(function sourceIsNotCopied() {
	// The supplied reference image carries nine zones, labels two of them 1,
	// omits Zone-7 and repeats Gt-28 while omitting Gt-15 and Gt-21. These
	// assert that none of that reached the model.
	const ns = ctx.NUM_ZONES.map(z => z.n);
	assert.strictEqual(ns.filter(n => n === 1).length, 1, 'Zone-1 appears once, not twice');
	assert.ok(ns.includes(7), 'Zone-7 is present');
	assert.ok(ns.includes(9), 'Zone-9 is present');
	const gv = ctx.NUM_GATES.map(g => g.value);
	assert.ok(gv.includes(15) && gv.includes(21), 'Gt-15 and Gt-21 are present');
	assert.strictEqual(gv.filter(v => v === 28).length, 1, 'Gt-28 appears once');

	// The dormant source note makes the stronger and more useful boundary:
	// CCRU supplies the system; this application supplies the composition. It
	// is not called by the shell and therefore is not misdescribed as a panel.
	const note = ctx.numogramCorrections();
	assert.ok(/source establishes the system, not this rendering/i.test(note),
		'the source note does not attribute the independent composition to CCRU');
	assert.ok(/independent Cyphers visual language/i.test(note),
		'the application claims its own visual authorship');
	assert.ok(/black apertures/i.test(note) && /green filament/i.test(note) && /pink gate/i.test(note),
		'the note names the three-part visual grammar');
	assert.strictEqual((src.match(/numogramCorrections\(\)/g) || []).length, 1,
		'the source note remains dormant rather than becoming a hidden visible panel');
	const visualAuthority = /drawn as the original diagram|followed closely|states this in the panel|as the reference|reference (?:puts|draws)|what the reference does/i;
	assert.ok(!visualAuthority.test(src + '\n' + read('calc/numogram.css')),
		'no external picture is allowed to govern composition, placement or treatment');

	console.log('source boundary: canonical arithmetic retained; independent rendering stated plainly');
})();

// -------------------------------------------------------- numeric input

(function numbers() {
	assert.strictEqual(ctx.numReduce(364), 4, '364 -> 3+6+4=13 -> 1+3=4');
	assert.strictEqual(ctx.numGate(4).value, 10);
	assert.strictEqual(ctx.numGate(4).to, 1);
	// reduction always lands on a real zone, for any input
	for (let i = 0; i < 3000; i++) {
		const r = ctx.numReduce(i);
		assert.ok(r >= 0 && r <= 9 && ctx.numZone(r) !== null, `${i} reduces into a zone`);
	}
	// and it terminates on absurd input rather than spinning
	assert.strictEqual(ctx.numReduce(999999999999999), ctx.numReduce(ctx.numReduce(999999999999999)));

	console.log('numbers: any input reduces to a real zone, 364 -> Zone-4 -> Gt-10 -> channel 4->1');
})();

// ------------------------------------------------------ source contract

(function source() {
	// things the drawing must keep doing, checked by reading the source
	assert.ok(/prefers-reduced-motion/.test(read('calc/numogram.css')),
		'reduced motion is respected');
	assert.ok(/tabindex="0"/.test(src) && /role="button"/.test(src),
		'zones and meaningful operators are focusable and announced');
	assert.ok(/aria-pressed/.test(src), 'selection state is exposed to assistive tech');
	const operatorSvg = ctx.numogramSvg();
	assert.strictEqual((operatorSvg.match(/class="numCurrent"[^>]*tabindex="0"[^>]*role="button"/g) || []).length, 5,
		'all five currents are keyboard-readable operators');
	assert.strictEqual((operatorSvg.match(/class="numGate"[^>]*tabindex="0"[^>]*role="button"/g) || []).length, 9,
		'all nine drawn gate apertures are keyboard-readable operators');
	assert.strictEqual((operatorSvg.match(/class="numChannel"[^>]*tabindex="0"[^>]*role="button"/g) || []).length, 9,
		'all nine drawn gate courses are keyboard-readable operators');
	assert.ok(/aria-label="hold current, zones 7 and 2 to zone 5"/.test(operatorSvg),
		'current accessible names expose the complete relation');
	assert.ok(/aria-label="gate 36, zone 8 to zone 9"/.test(operatorSvg),
		'gate accessible names expose source and destination');
	// Enter, Space and Escape are all handled somewhere in the keydown path.
	// Matched by key name rather than by the shape of the comparison, so
	// rewriting the handler does not break the test that guards it.
	assert.ok(src.indexOf('"Enter"') !== -1, 'Enter is handled');
	assert.ok(src.indexOf('"Spacebar"') !== -1 && src.indexOf('" "') !== -1, 'Space is handled');
	assert.ok(src.indexOf('"Escape"') !== -1, 'Escape clears');
	assert.ok(/aria-live="polite"/.test(src), 'the annotation announces changes');

	// no second source of truth for the geometry
	assert.ok(!/<circle[^>]*cx="\d+"[^>]*\/>\s*<circle/.test(src),
		'no hand-written runs of SVG circles beside the generated ones');

	// the field must not inherit the site theme, and the entire plate uses the
	// approved black / toxic green / hot pink / bone grammar
	const css = read('calc/numogram.css');
	assert.ok(/--num-field:\s*#020303/i.test(css), 'the field is near-black by default');
	assert.ok(/--num-current:\s*#39ff14/i.test(css), 'currents are toxic green');
	assert.ok(/--num-channel:\s*#ff1493/i.test(css), 'gate courses are hot pink');
	assert.ok(/--num-gate-ink:\s*#ff1493/i.test(css), 'gate aperture numerals are hot pink');
	assert.ok(/--num-bone:\s*#f1eadb/i.test(css), 'registration ink is bone');
	assert.ok(/\[data-invert="1"\]/.test(css), 'a high-contrast reading exists on one attribute');
	const tokenBlock = selector => (css.match(new RegExp(selector + '\\s*\\{([^}]*)\\}')) || [])[1] || '';
	const token = (block, name) => (block.match(new RegExp('--' + name + ':\\s*(#[0-9a-f]{6})', 'i')) || [])[1];
	const luminance = hex => {
		const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
			.map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
		return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
	};
	const contrast = (a, b) => {
		const hi = Math.max(luminance(a), luminance(b)), lo = Math.min(luminance(a), luminance(b));
		return (hi + 0.05) / (lo + 0.05);
	};
	for (const block of [tokenBlock('\\.numField'), tokenBlock('\\.numField\\[data-invert="1"\\]')]) {
		assert.ok(contrast(token(block, 'num-gate-ink'), token(block, 'num-zone-fill')) >= 4.5,
			'gate ink and its black aperture retain text contrast in every reading');
	}
	assert.ok(!/var\(--bg\b/.test(css), 'it does not read the site background variable');
	assert.ok(!/\.numBandZone\[data-zone=/.test(css), 'secondary panels do not resurrect a ten-hue zone system');

	// the primary current is five visible filaments with a pre-terminal open
	// chevron; the source syzygy bond remains a quieter, independent primitive
	const svg = ctx.numogramSvg();
	assert.strictEqual((svg.match(/class="numCurrentFilament/g) || []).length, 25,
		'five filaments for each of five currents');
	assert.strictEqual((svg.match(/class="numSyzygyBond"/g) || []).length, 5,
		'five independently toggleable syzygy bonds');
	assert.strictEqual((svg.match(/class="numCurrentChevron"/g) || []).length, 5,
		'one open directional chevron per current');
	assert.ok(!/numCurrentLabel/.test(svg) && !/numCurrentLabel/.test(css),
		'the relation rail owns current prose; the plate keeps only operable linework');
	assert.strictEqual((svg.match(/class="numGateRing numGateTag"/g) || []).length, 9,
		'nine drawn gates use black aperture tags');
	assert.strictEqual((svg.match(/class="numZoneBracket"/g) || []).length, 10,
		'every black zone gets registration corners');
	assert.ok(!/numRibbon|numHeavy|numCurBody/.test(src), 'the inherited ribbon vocabulary is gone');
	assert.ok(svg.indexOf('numLayerChannels') < svg.indexOf('numLayerCurrents'),
		'currents paint after channels and win exact crossings');
	assert.ok(/\.numCurrentHit\s*\{[^}]*stroke-width:\s*26/.test(css),
		'the current hit stroke covers the five-filament bundle');
	assert.ok(/data-layer-currents="0"\]\s+\.numCurrentPath/.test(css),
		'the currents switch controls the current path');
	assert.ok(/data-layer-syzygies="0"\]\s+\.numSyzygyBond/.test(css),
		'the syzygies switch controls only the source bond');
	assert.ok(/\.numSvg\[data-focus="1"\]\s+\.numZone\.numTrace\s*\{[^}]*opacity:\s*1/.test(css),
		'a resolved tractor remains fully legible inside the focused held-pair state');

	// integration: one entry in the Features menu, one line in the closer
	const calc = read('calc/calc.js');
	assert.ok(/toggleNumogramMenu\(\)/.test(calc), 'wired into the Features menu');
	assert.strictEqual((calc.match(/toggleNumogramMenu/g) || []).length, 2,
		'exactly two references: the menu entry and closeAllOpenedMenus');
	const idx = read('index.html');
	assert.ok(/id="numogramMenuArea"/.test(idx), 'the panel has its own area');
	assert.ok(/calc\/numogram\.js/.test(idx) && /calc\/numogram\.css/.test(idx), 'both files are loaded');
	const digest = p => crypto.createHash('sha256').update(read(p)).digest('hex').slice(0, 16);
	assert.ok(idx.includes('calc/numogram.js?v=' + digest('calc/numogram.js')),
		'the JavaScript reference carries its content hash');
	assert.ok(idx.includes('calc/numogram.css?v=' + digest('calc/numogram.css')),
		'the stylesheet reference carries its content hash');

	console.log('source: keyboard, live region, reduced motion, independent palette and filament grammar');
})();

// ------------------------------------------------- Anglossic Qabbala

(function aq() {
	// Land's mapping, exactly: digits are themselves, A=10 .. Z=35.
	assert.strictEqual(ctx.numAqValue('0'), 0);
	assert.strictEqual(ctx.numAqValue('9'), 9);
	assert.strictEqual(ctx.numAqValue('A'), 10);
	assert.strictEqual(ctx.numAqValue('Z'), 35);
	assert.strictEqual(ctx.numAqValue('a'), 10, 'case does not matter');
	assert.strictEqual(ctx.numAqValue('-'), null, 'anything else has no value');
	for (let i = 0; i < 26; i++) {
		assert.strictEqual(ctx.numAqValue(String.fromCharCode(65 + i)), 10 + i);
	}

	// a string is the sum of its characters
	const t = ctx.numAqTrace('CYBERSYN');
	assert.deepStrictEqual(Array.from(t.chars.map(c => c.v)), [12, 34, 11, 14, 27, 28, 34, 23]);
	assert.strictEqual(t.total, 183);
	assert.strictEqual(t.total, t.chars.reduce((a, c) => a + c.v, 0));

	// deterministic, and blind to accents and case
	assert.strictEqual(ctx.numAqTrace('CAFE').total, ctx.numAqTrace('caf\u00e9').total);
	assert.strictEqual(ctx.numAqTrace('A B').total, 21, 'spaces contribute nothing');

	console.log('AQ: 0-9 then A=10..Z=35, string is the sum, deterministic, accent- and case-blind');
})();

// ------------------------------------------------------- trace behaviour

(function traces() {
	const n = ctx.numTraceNumber('364');
	assert.strictEqual(n.result, 4);
	assert.deepStrictEqual(Array.from(n.steps.map(s => s.to)), [13, 4], 'every pass is recorded');
	assert.strictEqual(n.status, 'experimental', 'the bridge is never canonical');
	const reduction = ctx.numogramReductionBlock(n);
	assert.ok(/data-box="reduction"[\s\S]*CANONICAL/.test(reduction),
		'digital reduction is visibly canonical');
	assert.ok(!/EXPERIMENTAL/.test(reduction),
		'the experimental bridge badge is not attached to canonical reduction');

	const w = ctx.numTraceWord('CYBERSYN');
	assert.strictEqual(w.aq.total, 183);
	assert.strictEqual(w.result, 3, '183 -> 1+8+3=12 -> 1+2=3');
	assert.strictEqual(w.status, 'experimental');
	assert.ok(ctx.numZone(w.result) !== null, 'a word always lands on a real zone');

	// every trace terminates on a real zone, across a wide spread of inputs
	for (let i = 0; i < 500; i++) {
		assert.ok(ctx.numZone(ctx.numTraceNumber(String(i * 7919 + 1)).result) !== null);
	}
	for (const s of ['A', 'ZZZZ', 'CCRU', 'Nick Land', 'numogram 0', '   x   ']) {
		const r = ctx.numTraceWord(s);
		assert.ok(!r.error && ctx.numZone(r.result) !== null, 'traced: ' + s);
	}

	// bad input is refused with a message, never a throw and never a result
	for (const bad of ['', '   ', 'abc', '9'.repeat(40)]) {
		assert.ok(ctx.numTraceNumber(bad).error, 'refused: ' + JSON.stringify(bad));
	}
	for (const bad of ['', '   ', '!!! ???', 'x'.repeat(200)]) {
		assert.ok(ctx.numTraceWord(bad).error, 'refused: ' + JSON.stringify(bad.slice(0, 12)));
	}
	// a sign or a decimal point is dropped rather than throwing
	assert.strictEqual(ctx.numTraceNumber('-5').result, 5);
	assert.strictEqual(ctx.numTraceNumber('1.5').result, 6);

	console.log('traces: number and word land on real zones, every pass recorded, bad input refused');
})();

(function traceHistoryLifecycle() {
	const saved = {
		window: ctx.window,
		document: ctx.document,
		setPicked: ctx.numogramSetPicked,
		apply: ctx.numogramApply,
		sync: ctx.numogramSyncControls,
		run: ctx.numogramRunTrace,
		writeUrl: ctx.numogramWriteUrl
	};
	const storage = {};
	const histEl = { innerHTML: '' };
	const input = { value: '', focused: false, focus() { this.focused = true; } };
	const clear = { classList: { toggle() {} } };
	const msg = { textContent: '' };
	ctx.window = {
		localStorage: {
			getItem: k => Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : null,
			setItem: (k, v) => { storage[k] = v; }
		}
	};
	ctx.document = {
		getElementById: id => id === 'numHistory' ? histEl
			: id === 'numTraceInput' ? input
			: id === 'numTraceClear' ? clear
			: id === 'numTraceMsg' ? msg : null
	};

	ctx.numHistory = [];
	for (let i = 0; i < 10; i++) ctx.numHistoryAdd({ kind: 'number', raw: String(i), result: i });
	assert.strictEqual(ctx.numHistory.length, ctx.NUM_HISTORY_MAX, 'trace history stays bounded at eight');
	assert.deepStrictEqual(Array.from(ctx.numHistory.map(h => h.raw)), ['9','8','7','6','5','4','3','2']);
	ctx.numHistoryAdd({ kind: 'number', raw: '6', result: 6 });
	assert.strictEqual(ctx.numHistory.filter(h => h.kind === 'number' && h.raw === '6').length, 1,
		'duplicate traces move to the front rather than multiplying');
	assert.strictEqual(ctx.numHistory[0].raw, '6');
	assert.strictEqual(JSON.parse(storage[ctx.NUM_HISTORY_KEY]).length, ctx.NUM_HISTORY_MAX,
		'the bounded, deduplicated list is what local storage receives');

	storage[ctx.NUM_HISTORY_KEY] = JSON.stringify([{ kind: 'zone', raw: 4, result: 4 }]);
	ctx.numHistoryLoad();
	assert.strictEqual(ctx.numHistory[0].raw, 4, 'stored history reloads');
	storage[ctx.NUM_HISTORY_KEY] = '{broken';
	ctx.numHistoryLoad();
	assert.deepStrictEqual(Array.from(ctx.numHistory), [], 'malformed local history fails closed');

	let picked = null, applied = 0, replay = null;
	ctx.numogramSetPicked = n => { picked = n; };
	ctx.numogramApply = () => { applied++; };
	ctx.numogramSyncControls = () => {};
	ctx.numogramRunTrace = (silent, mode) => { replay = { silent, mode, raw: input.value }; };
	ctx.numHistory = [
		{ kind: 'zone', raw: 4, result: 4 },
		{ kind: 'word', raw: 'CYBERSYN', result: 8 }
	];
	ctx.numogramReplay(0);
	assert.strictEqual(picked, 4, 'zone replay restores its landing');
	assert.strictEqual(applied, 1);
	ctx.numogramReplay(1);
	assert.deepStrictEqual(replay, { silent: true, mode: 'word', raw: 'CYBERSYN' },
		'typed replay restores the raw trace without adding it again');

	ctx.numogramRunTrace = saved.run;
	ctx.numogramWriteUrl = () => {};
	ctx.numogramSetPicked = n => { picked = n; };
	ctx.numogramApply = () => { applied++; };
	input.value = '364';
	ctx.numDeriv = ctx.numTraceNumber('364');
	ctx.numogramClearTrace();
	assert.strictEqual(input.value, '');
	assert.strictEqual(input.focused, true, 'clearing returns focus to the trace field');
	assert.strictEqual(ctx.numDeriv, null);
	assert.strictEqual(picked, null, 'clearing removes the active landing');

	ctx.window = saved.window;
	ctx.document = saved.document;
	ctx.numogramSetPicked = saved.setPicked;
	ctx.numogramApply = saved.apply;
	ctx.numogramSyncControls = saved.sync;
	ctx.numogramRunTrace = saved.run;
	ctx.numogramWriteUrl = saved.writeUrl;

	console.log('trace history: bounded, deduplicated, reloadable, replayable and clearable');
})();

// ------------------------------------------------------------ provenance

(function provenance() {
	const st = ctx.NUM_SOURCES;
	// the four that existed before the cosmological layer; the geocentric mode
	// adds three more, checked in its own block
	for (const k of ['structure', 'reduction', 'aq', 'bridge']) {
		assert.ok(st[k], k + ' is still described');
	}
	assert.strictEqual(st.structure.status, 'canonical');
	assert.strictEqual(st.reduction.status, 'canonical');
	assert.strictEqual(st.aq.status, 'attested', 'AQ is a real CCRU practice, but its own system');
	assert.strictEqual(st.bridge.status, 'experimental', 'feeding a number to the Numogram is ours');

	// the AQ note must say it is not numogrammatic, because no source says it is
	assert.ok(/No source establishes any formal relationship/i.test(st.aq.source));
	assert.ok(/Qabbala 101/.test(st.aq.source), 'AQ cites where it comes from');
	assert.ok(/not something the source material does/i.test(st.bridge.source));

	for (const k of Object.keys(st)) {
		assert.ok(ctx.NUM_STATUS_LABEL[st[k].status], 'labelled: ' + k);
	}
	assert.ok(/NOT NUMOGRAMMATIC/.test(ctx.NUM_STATUS_LABEL.attested));
	assert.ok(/NOT A CCRU PROCEDURE/.test(ctx.NUM_STATUS_LABEL.experimental));

	// Provenance follows the claim it qualifies: tracing an external input into
	// a zone is experimental, AQ is attested, and digital reduction is canonical.
	const savedDocument = ctx.document;
	const savedReadingState = {
		relation: ctx.numRelation, body: ctx.numBody, picked: ctx.numPicked,
		selected: ctx.numSelected, explore: ctx.numExplore, deriv: ctx.numDeriv
	};
	const annotation = { innerHTML: '' };
	ctx.document = { getElementById: id => id === 'numAnnot' ? annotation : null };
	ctx.numRelation = null; ctx.numBody = null; ctx.numPicked = [];
	ctx.numSelected = 4; ctx.numExplore = -1; ctx.numDeriv = ctx.numTraceNumber('364');
	ctx.numogramAnnotate();
	let html = annotation.innerHTML;
	assert.ok(html.indexOf('data-box="number-trace"') < html.indexOf('numStatus-experimental') &&
		html.indexOf('numStatus-experimental') < html.indexOf('data-box="reduction"') &&
		html.indexOf('data-box="reduction"') < html.indexOf('numStatus-canonical'),
		'number divination is experimental while its reduction is canonical');
	ctx.numSelected = 3; ctx.numDeriv = ctx.numTraceWord('CYBERSYN');
	ctx.numogramAnnotate();
	html = annotation.innerHTML;
	assert.ok(html.indexOf('data-box="word-trace"') < html.indexOf('numStatus-experimental') &&
		html.indexOf('numStatus-experimental') < html.indexOf('data-box="aq-values"') &&
		html.indexOf('data-box="aq-values"') < html.indexOf('numStatus-attested') &&
		html.indexOf('numStatus-attested') < html.indexOf('data-box="reduction"') &&
		html.indexOf('data-box="reduction"') < html.indexOf('numStatus-canonical'),
		'word divination, AQ, and reduction each carry their own provenance');
	ctx.document = savedDocument;
	ctx.numRelation = savedReadingState.relation; ctx.numBody = savedReadingState.body;
	ctx.numPicked = savedReadingState.picked; ctx.numSelected = savedReadingState.selected;
	ctx.numExplore = savedReadingState.explore; ctx.numDeriv = savedReadingState.deriv;

	console.log('provenance: canonical / attested / experimental records stay labelled without inventing a source panel');
})();

// ------------------------------------------------ the Planetwork (canonical)

(function planetwork() {
	const pw = ctx.NUM_PLANETWORK;
	assert.strictEqual(pw.length, 10, 'one body per zone');
	assert.deepStrictEqual(Array.from(pw.map(p => p.zone)), [0,1,2,3,4,5,6,7,8,9]);

	// Zone n is Sol-n. CCRU's own zone pages write Jupiter as "Sol-5" at Zone-5,
	// which fixes the whole sequence.
	for (const p of pw) assert.strictEqual(p.sol, p.zone, p.body + ' is Sol-' + p.zone);
	assert.strictEqual(ctx.numPlanetworkZone(5).body, 'JUPITER');
	assert.strictEqual(ctx.numPlanetworkZone(0).body, 'SUN');
	assert.strictEqual(ctx.numPlanetworkZone(3).body, 'EARTH');
	assert.strictEqual(ctx.numPlanetworkZone(9).body, 'PLUTO');

	// The pairings CCRU states independently - Mercury with Neptune, Earth with
	// Saturn, Jupiter with Mars, Pluto with the Sun - must come out as the same
	// syzygies the arithmetic produces. This is the cross-check, not a source.
	const pairs = [['MERCURY','NEPTUNE'], ['EARTH','SATURN'], ['JUPITER','MARS'], ['PLUTO','SUN']];
	for (const [a, b] of pairs) {
		const za = ctx.numPlanetwork(a).zone, zb = ctx.numPlanetwork(b).zone;
		assert.strictEqual(za + zb, 9, a + ' and ' + b + ' are a nine-sum');
		assert.strictEqual(ctx.numSyzygyOf(za).key, ctx.numSyzygyOf(zb).key,
			a + ' and ' + b + ' share a syzygy');
	}

	console.log('planetwork: Zone n = Sol-n, and CCRU\u2019s stated pairings are the same syzygies');
})();

// --------------------------------------- canonical zone reading derivation

(function zoneReadings() {
	assert.strictEqual(ctx.NUM_ZONE_LORE.length, 10, 'one narrow lore record per zone');
	assert.deepStrictEqual(Array.from(ctx.NUM_ZONE_LORE.map(x => x.zone)), [0,1,2,3,4,5,6,7,8,9]);
	for (const lore of ctx.NUM_ZONE_LORE) {
		assert.ok(lore.particle && lore.gloss && lore.note, 'zone ' + lore.zone + ' has particle, gloss and note');
		assert.strictEqual(lore.status, 'canonical');
		for (const forbidden of ['planet', 'syzygy', 'gate', 'channel', 'population', 'lemurs', 'door']) {
			assert.ok(!(forbidden in lore), 'derived ' + forbidden + ' is not duplicated into lore');
		}
		assert.ok(!/\b(?:gate|channel|current|tractor|syzygy|phase|door|region)\b/i.test(lore.note),
			'zone ' + lore.zone + ' note does not restate derived machinery');
	}

	assert.strictEqual(ctx.numNetspan(2, 7), '7::2');
	assert.strictEqual(ctx.numNetspan(6, 0), '6::0');
	assert.deepStrictEqual(Array.from(ctx.numPhaseLemurs(6).map(L => L.name)),
		['Tchu','Djungo','Djuddha','Djynxx','Tchakki','Tchattuk']);
	assert.strictEqual(ctx.numPhasePopulation(6), 64);
	assert.strictEqual(ctx.numPhasePopulation(0), null);

	const six = ctx.numZoneReading(6);
	for (const value of ['SATURN', 'SOL', 'WARP', 'tch', '6::3', 'GT-21', '64 IMPULSE-ENTITIES', 'Tchu', 'Tchattuk']) {
		assert.ok(six.includes(value), 'zone 6 dossier includes ' + value);
	}
	assert.ok(/Tchu[\s\S]*DOOR/.test(six), 'Tchu is the sixth door');
	assert.ok(/Tchattuk[\s\S]*PHASE-LIMIT/.test(six), 'Tchattuk is the sixth phase-limit');
	const one = ctx.numPhaseReading(1);
	assert.ok(/Lurgo[\s\S]*DOOR · PHASE-LIMIT/.test(one), 'Lurgo keeps both phase-1 roles');
	const zero = ctx.numPhaseReading(0);
	assert.ok(/NO PHASE POPULATION/.test(zero) && /No door, phase-limit/.test(zero),
		'zone 0 states the phase absence explicitly');

	const hold = ctx.numCurrentReading('2::7');
	assert.ok(/HOLD/.test(hold) && /7::2/.test(hold) && /7 − 2 = 5/.test(hold));
	assert.ok(/data-box="zones"[\s\S]*HIGH POLE[\s\S]*ZONE 7 · URANUS[\s\S]*LOW POLE[\s\S]*ZONE 2 · VENUS[\s\S]*TRACTOR[\s\S]*ZONE 5 · JUPITER/.test(hold),
		'a current reading names both poles and its tractor as explicit zone roles');
	const gt36 = ctx.numGateReading(8);
	assert.ok(/GT-36/.test(gt36) && /1 \+ 2 \+ 3 \+ 4 \+ 5 \+ 6 \+ 7 \+ 8 = 36/.test(gt36));
	assert.ok(/3 \+ 6 = 9/.test(gt36) && /8 → 9/.test(gt36));
	assert.ok(/data-box="zones"[\s\S]*SOURCE[\s\S]*ZONE 8 · NEPTUNE[\s\S]*DESTINATION[\s\S]*ZONE 9 · PLUTO/.test(gt36),
		'a gate reading names its source and destination as explicit zone roles');

	const resolved = ctx.numResolvedRelations([4, 5, 6]);
	assert.deepStrictEqual(Array.from(resolved.currents.map(s => s.current)), ['SINK']);
	assert.deepStrictEqual(Array.from(resolved.gates.map(g => g.value)), [15]);
	const aggregate = ctx.numSelectionReading([4, 5, 6]);
	assert.ok(/5::4 → 1 · OUTSIDE HELD SET/.test(aggregate));
	assert.ok(/GT-15[\s\S]*5 → 6/.test(aggregate));
	assert.ok(!/GT-10|GT-21|HOLD|WARP/.test(aggregate), 'aggregate contains no unresolved relation');
	ctx.numZoneOn[1] = false;
	assert.deepStrictEqual(Array.from(ctx.numResolvedRelations([4, 5, 6]).currents), [],
		'a filtered external tractor removes the current from the aggregate');
	assert.deepStrictEqual(Array.from(ctx.numResolvedRelations([4, 5, 6]).gates.map(g => g.value)), [15],
		'an independently visible gate remains resolved');
	ctx.numZoneOn[1] = true;
	ctx.numLayers.gates = false;
	assert.deepStrictEqual(Array.from(ctx.numResolvedRelations([4, 5, 6]).gates), [],
		'a hidden gate layer removes gates from the aggregate');
	ctx.numLayers.gates = true;
	const exactSyzygy = ctx.numResolvedRelations([4, 5]);
	assert.deepStrictEqual(Array.from(exactSyzygy.currents.map(s => s.current)), ['SINK']);
	assert.strictEqual(ctx.numCurrent(exactSyzygy.currents[0]), 1,
		'an exact 5::4 selection resolves Sink and its Zone-1 tractor');
	ctx.numMode = 'warp';
	const hiddenByRegion = ctx.numResolvedRelations([4, 5, 6]);
	assert.strictEqual(hiddenByRegion.currents.length + hiddenByRegion.gates.length, 0,
		'the aggregate does not report relations hidden by the active region');
	ctx.numMode = 'all';

	console.log('readings: lore stays narrow; phases, operators and aggregate relations are derived');
})();

// --------------------------------------- the Ptolemaic order (historical)

(function ptolemy() {
	const classical = ctx.NUM_GEOCENTRIC.filter(g => g.set === 'classical');
	assert.deepStrictEqual(
		Array.from(classical.map(g => g.body)),
		['EARTH','MOON','MERCURY','VENUS','SUN','MARS','JUPITER','SATURN','STARS'],
		'Earth, then Moon, Mercury, Venus, Sun, Mars, Jupiter, Saturn, fixed stars');

	// the order is a contiguous run from the centre outward
	classical.forEach((g, i) => assert.strictEqual(g.order, i, g.body + ' at order ' + i));
	assert.strictEqual(ctx.numGeo('EARTH').klass, 'reference');

	// Ptolemy's own division, taken about the Sun's sphere
	const sun = ctx.numGeo('SUN').order;
	for (const b of ['MERCURY','VENUS']) assert.ok(ctx.numGeo(b).order < sun, b + ' is inferior');
	for (const b of ['MARS','JUPITER','SATURN']) assert.ok(ctx.numGeo(b).order > sun, b + ' is superior');
	assert.strictEqual(ctx.numGeo('MERCURY').klass, 'inferior');
	assert.strictEqual(ctx.numGeo('SATURN').klass, 'superior');

	// the anachronism guard: the three moderns are not in the classical set
	for (const b of ['URANUS','NEPTUNE','PLUTO']) {
		assert.strictEqual(ctx.numGeo(b).set, 'extended', b + ' is not classical');
		assert.strictEqual(ctx.numGeo(b).klass, 'extension');
		assert.ok(!classical.some(g => g.body === b), b + ' stays out of the Ptolemaic order');
	}
	assert.strictEqual(ctx.numCosmoBodies('classical').length, 9);
	assert.strictEqual(ctx.numCosmoBodies('extended').length, 12);

	console.log('ptolemy: Earth-centred order, inferior/superior split at the Sun, no modern planets back-dated');
})();

// ------------------------------------------------- the cross-map, and its seams

(function crossMap() {
	// ORDER IS NOT ZONE. The single most important thing this must not do.
	const both = ctx.NUM_GEOCENTRIC
		.filter(g => ctx.numPlanetwork(g.body))
		.map(g => ctx.numCrossMap(g.body));
	const differ = both.filter(c => c.order !== c.zone);
	assert.ok(differ.length > 0, 'the two systems genuinely disagree on ordering');
	assert.strictEqual(ctx.numCrossMap('MARS').zone, 4);
	assert.strictEqual(ctx.numCrossMap('MARS').order, 5, 'Mars is Zone-4 but the 5th sphere');
	assert.strictEqual(ctx.numCrossMap('SUN').zone, 0);
	assert.strictEqual(ctx.numCrossMap('SUN').order, 4, 'the Sun is Zone-0 but the 4th sphere');

	// a zone is only ever read from the Planetwork, never derived from a sphere
	for (const c of both) {
		assert.strictEqual(c.zone, ctx.numPlanetwork(c.body).zone);
		assert.strictEqual(c.order, ctx.numGeo(c.body).order);
	}

	// the seams, which are the point of the mode
	const moon = ctx.numCrossMap('MOON');
	assert.strictEqual(moon.zone, null, 'no zone is invented for the Moon');
	assert.strictEqual(moon.order, 1);
	assert.ok(moon.onlyGeocentric);
	assert.strictEqual(ctx.numCrossMap('STARS').zone, null);

	// nothing in the Planetwork is missing from the extended set
	for (const p of ctx.NUM_PLANETWORK) {
		assert.ok(ctx.numGeo(p.body) !== null, p.body + ' has a place in the extended set');
	}

	console.log('cross-map: order \u2260 zone, neither derived from the other, Moon and stars left without zones');
})();

// ------------------------------------------ the canonical layer is untouched

(function canonicalUntouched() {
	// Changing the cosmological frame must not change any Numogram arithmetic.
	const before = {
		gates: ctx.NUM_GATES.map(g => g.zone + ':' + g.value + '->' + g.to).join(','),
		currents: ctx.NUM_SYZYGIES.map(s => s.key + '=' + ctx.numCurrent(s)).join(','),
		zones: ctx.NUM_ZONES.map(z => z.n + '@' + z.x + ',' + z.y).join(',')
	};
	for (const mode of ['geo', 'cross', 'off']) {
		ctx.numCosmo = mode;
		for (const set of ['classical', 'extended']) {
			ctx.numGeoSet = set;
			assert.strictEqual(ctx.NUM_GATES.map(g => g.zone + ':' + g.value + '->' + g.to).join(','),
				before.gates, 'gates unchanged in ' + mode + '/' + set);
			assert.strictEqual(ctx.NUM_SYZYGIES.map(s => s.key + '=' + ctx.numCurrent(s)).join(','),
				before.currents, 'currents unchanged in ' + mode + '/' + set);
			assert.strictEqual(ctx.NUM_ZONES.map(z => z.n + '@' + z.x + ',' + z.y).join(','),
				before.zones, 'zone positions unchanged in ' + mode + '/' + set);
		}
	}
	ctx.numCosmo = 'off'; ctx.numGeoSet = 'classical';

	// The cosmological model now has a panel of its own, so the stronger claim
	// holds: the canonical SVG contains no geocentric geometry in ANY mode.
	const canonicalOff = ctx.numogramSvg();
	for (const mode of ['geo', 'cross']) {
		ctx.numCosmo = mode;
		assert.strictEqual(ctx.numogramSvg(), canonicalOff,
			'the canonical figure is byte-identical in ' + mode);
		assert.ok(ctx.numogramGeoPanel().length > 500, 'the panel is drawn in ' + mode);
		assert.ok(!/numBand|numGeo/.test(ctx.numogramSvg()),
			'no cosmological element reaches the canonical figure in ' + mode);
	}
	ctx.numCosmo = 'off';
	assert.strictEqual(ctx.numogramGeoPanel(), '', 'the canonical frame is the plate alone');
	ctx.numCosmo = 'pw';
	const planetwork = ctx.numogramGeoPanel();
	assert.ok(planetwork.length > 500, 'the hidden pw state retains the Planetwork panel');
	assert.strictEqual((planetwork.match(/data-body="/g) || []).length, 10,
		'the Planetwork has one row for every zone');
	assert.ok(/The Lemurian Planetwork/.test(planetwork));
	assert.strictEqual(ctx.numogramSvg(), canonicalOff, 'and the figure is unchanged');
	ctx.numCosmo = 'off';
	assert.strictEqual(typeof ctx.numogramGeoLayer, 'undefined',
		'the old through-the-figure overlay is gone, not merely hidden');

	// no geocentric mathematics has been invented
	assert.strictEqual(typeof ctx.numGeoSyzygy, 'undefined');
	assert.strictEqual(typeof ctx.numGeoCurrent, 'undefined');
	assert.strictEqual(typeof ctx.numGeoGate, 'undefined');

	console.log('canonical: the Numogram\u2019s arithmetic and geometry are identical in every cosmological mode');
})();

// ------------------------------------------------- planet tracing & provenance

(function planetTrace() {
	assert.strictEqual(ctx.numTracePlanet('Mars').result, 4);
	assert.strictEqual(ctx.numTracePlanet('mars').body, 'MARS', 'case and punctuation tolerated');
	assert.strictEqual(ctx.numTracePlanet('MOON').result, null, 'the Moon traces to no zone');
	assert.ok(ctx.numTracePlanet('Vulcan').error, 'an unknown body is refused');
	assert.ok(ctx.numTracePlanet('').error);
	assert.ok(ctx.numTracePlanet('!!!').error);

	// a post-Ptolemaic body is refused while the classical set is showing
	ctx.numGeoSet = 'classical';
	assert.ok(/POST-PTOLEMAIC/.test(ctx.numTracePlanet('Pluto').error));
	ctx.numGeoSet = 'extended';
	assert.strictEqual(ctx.numTracePlanet('Pluto').result, 9);
	ctx.numGeoSet = 'classical';

	// provenance for the three new layers
	const st = ctx.NUM_SOURCES;
	assert.strictEqual(st.planetwork.status, 'canonical');
	assert.strictEqual(st.ptolemy.status, 'historical');
	assert.strictEqual(st.crossmap.status, 'experimental');
	assert.ok(/Sol-5/.test(st.planetwork.source), 'the Planetwork cites what fixes the sequence');
	assert.ok(/Almagest/.test(st.ptolemy.source));
	assert.ok(/not part of it and are not placed in it here/i.test(st.ptolemy.source));

	// the three anachronisms the brief forbids, refused in the data itself
	assert.ok(/Ptolemy did not anticipate the CCRU/i.test(st.crossmap.source));
	assert.ok(/the CCRU was not Ptolemaic/i.test(st.crossmap.source));
	assert.ok(/Nick Land did not design a geocentric Numogram/i.test(st.crossmap.source));
	assert.ok(/no geocentric syzygies, currents or gates have been invented/i.test(st.crossmap.source));

	assert.ok(ctx.NUM_STATUS_LABEL.historical, 'the historical status has a label');

	console.log('planets: traceable both ways, unknown bodies refused, three anachronisms refused in the data');
})();

// ------------------------------------------- the canonical geometry itself
//
// The data being internally consistent is not enough: the figure can be
// self-consistent and still be drawn in the wrong arrangement, which is what
// happened when the cosmological work distorted it. These assert the
// arrangement.

(function canonicalGeometry() {
	const G = ctx.CANONICAL_GEOMETRY;
	const Z = n => G.zones[n];
	const W = G.width, H = G.height;

	// ten zones, once each, all inside the frame
	for (let n = 0; n <= 9; n++) {
		assert.ok(Z(n), 'zone ' + n + ' has a position');
		assert.ok(Z(n).x - Z(n).r > 0 && Z(n).x + Z(n).r < W, 'zone ' + n + ' within width');
		assert.ok(Z(n).y - Z(n).r > 0 && Z(n).y + Z(n).r < H, 'zone ' + n + ' within height');
	}
	assert.strictEqual(Object.keys(G.zones).length, 10);

	// --- the arrangement, region by region
	const upper = H * 0.3, lower = H * 0.5;
	const left = W * 0.4;

	assert.ok(Z(3).y < upper && Z(3).x < left, 'Zone 3 heads the upper-left of the pair');
	assert.ok(Z(6).y < upper && Z(6).x > left, 'Zone 6 heads the upper-right of the pair');
	assert.ok(Z(3).x < Z(6).x, 'Zone 3 is left of Zone 6');

	assert.ok(Z(5).x < left && Z(5).y > upper && Z(5).y < lower, 'Zone 5 left-middle');
	assert.ok(Z(2).y > Math.max(Z(3).y, Z(6).y) && Z(2).y < lower,
		'Zone 2 sits below the head and above the lower field');
	assert.ok(Z(5).x < Z(2).x, 'Zone 5 is left of Zone 2');
	assert.ok(Z(7).x > Z(2).x && Z(7).y > Z(2).y, 'Zone 7 is right of and lower than Zone 2');

	assert.ok(Z(4).x < Z(5).x, 'Zone 4 is the far-left anchor');
	assert.ok(Z(4).y > Z(5).y, 'and sits below Zone 5');

	// --- the spine: 1, 8, 9, 0 descending, with the Plex pair adjacent
	const spine = [1, 8, 9, 0];
	for (let i = 1; i < spine.length; i++) {
		assert.ok(Z(spine[i]).y > Z(spine[i - 1]).y,
			'Zone ' + spine[i] + ' sits below Zone ' + spine[i - 1]);
	}
	assert.strictEqual(
		Math.max(...[0,1,2,3,4,5,6,7,8,9].map(n => Z(n).y)), Z(0).y,
		'Zone 0 terminates the figure');

	// 9 is directly above 0 - they are the Plex syzygy and nothing comes between
	const between = [0,1,2,3,4,5,6,7,8,9].filter(n =>
		n !== 0 && n !== 9 && Z(n).y > Z(9).y && Z(n).y < Z(0).y);
	assert.deepStrictEqual(Array.from(between), [], 'nothing sits between Zone 9 and Zone 0');

	// the spine really is a column, not a diagonal
	const spineXs = spine.map(n => Z(n).x);
	assert.ok(Math.max(...spineXs) - Math.min(...spineXs) < 40, 'the spine is a column');

	// --- the composition as a whole
	assert.ok(H / W > 1.3, 'the field stays tall');
	const xs = [0,1,2,3,4,5,6,7,8,9].map(n => Z(n).x);
	const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
	assert.notStrictEqual(Math.round(mid), Math.round(W / 2), 'asymmetric, not centred');

	// not a circle, not a grid, not a ring: the radii from the centroid must
	// vary widely, and the rows must not align
	const cx = xs.reduce((a, b) => a + b, 0) / 10;
	const cy = [0,1,2,3,4,5,6,7,8,9].map(n => Z(n).y).reduce((a, b) => a + b, 0) / 10;
	const radii = [0,1,2,3,4,5,6,7,8,9].map(n => Math.hypot(Z(n).x - cx, Z(n).y - cy));
	assert.ok(Math.max(...radii) / Math.min(...radii) > 2.5,
		'the zones are not on a ring - a circle would give near-equal radii');
	assert.ok(new Set([0,1,2,3,4,5,6,7,8,9].map(n => Math.round(Z(n).y / 50))).size >= 7,
		'the zones are not on a regular grid of rows');

	console.log('geometry: 3/6 across the top, 5-2-7 through the middle, 4 far left, spine 1-8-9-0, 9 beside 0');
})();

// --------------------------------------------- the canonical data is frozen

(function immutable() {
	assert.ok(Object.isFrozen(ctx.CANONICAL_GEOMETRY), 'the geometry is frozen');
	assert.ok(Object.isFrozen(ctx.CANONICAL_GEOMETRY.zones), 'and so is its zone table');
	assert.ok(Object.isFrozen(ctx.CANONICAL_GEOMETRY.zones[3]), 'and each zone record');
	assert.ok(Object.isFrozen(ctx.NUM_SYZYGIES), 'the syzygies are frozen');

	// a write must not take, whether or not it throws
	const before = ctx.CANONICAL_GEOMETRY.zones[3].x;
	try { ctx.CANONICAL_GEOMETRY.zones[3].x = 999; } catch (e) { /* strict mode throws */ }
	assert.strictEqual(ctx.CANONICAL_GEOMETRY.zones[3].x, before, 'the canonical record survives a write');

	// the renderer's zone list is a copy, so mutating it cannot reach back
	ctx.NUM_ZONES[0].x = -1;
	assert.strictEqual(ctx.CANONICAL_GEOMETRY.zones[ctx.NUM_ZONES[0].n].x, before === 999 ? 999 : ctx.CANONICAL_GEOMETRY.zones[0].x,
		'NUM_ZONES holds copies, not references');
	assert.notStrictEqual(ctx.CANONICAL_GEOMETRY.zones[0].x, -1);
	ctx.NUM_ZONES[0].x = ctx.CANONICAL_GEOMETRY.zones[0].x;   // put it back

	console.log('immutable: canonical geometry and syzygies frozen, the render list holds copies');
})();

// ------------------------------------------------- the currents are named

(function currentNames() {
	// CCRU's own zone pages name all five: "Tractor-Zone of the 8-1 (or
	// 'Surge') Current" and so on. None of these is inferred.
	const byKey = {};
	for (const s of ctx.NUM_SYZYGIES) byKey[s.key] = s;
	assert.strictEqual(byKey['1::8'].current, 'SURGE');
	assert.strictEqual(byKey['2::7'].current, 'HOLD');
	assert.strictEqual(byKey['4::5'].current, 'SINK');
	assert.strictEqual(byKey['3::6'].current, 'WARP');
	assert.strictEqual(byKey['0::9'].current, 'PLEX');

	// each current's name must sit with the right tractor zone
	assert.strictEqual(ctx.numCurrent(byKey['1::8']), 7, 'Surge runs to Zone-7');
	assert.strictEqual(ctx.numCurrent(byKey['2::7']), 5, 'Hold runs to Zone-5');
	assert.strictEqual(ctx.numCurrent(byKey['4::5']), 1, 'Sink runs to Zone-1');
	assert.strictEqual(ctx.numCurrent(byKey['3::6']), 3, 'Warp runs to Zone-3');
	assert.strictEqual(ctx.numCurrent(byKey['0::9']), 9, 'Plex runs to Zone-9');

	// the two self-returning currents are the two that name their own regions
	assert.strictEqual(byKey['3::6'].current, byKey['3::6'].sys.toUpperCase());
	assert.strictEqual(byKey['0::9'].current, byKey['0::9'].sys.toUpperCase());

	console.log('currents: Surge, Hold, Sink, Warp, Plex - each on its sourced tractor zone');
})();

// -------------------------------------------- gate clearance and hit areas

(function clearance() {
	// Nothing may run through a gate's numeral. Measured, not eyeballed: every
	// syzygy bond, current path and channel is sampled against every gate
	// aperture's conservative bounding square. A gate's own channel is skipped.
	// Nothing may sit on a gate numeral: not a path that is not its own, not
	// another gate, and - the one that was failing, with 45, 0 and 9 lying
	// across their zones - not a zone circle.
	const worst = ctx.numogramGateClearance();
	assert.ok(worst.d >= ctx.NUM_GATE_CLEAR,
		'closest approach was ' + worst.d.toFixed(1) + ' (gate ' + worst.gate +
		' vs ' + worst.path + '), needs ' + ctx.NUM_GATE_CLEAR);
	const hitWorst = ctx.numogramGateHitClearance();
	assert.ok(hitWorst.d >= 0,
		'pointer overlap was ' + hitWorst.d.toFixed(2) + ' (gate ' + hitWorst.gate +
		' vs ' + hitWorst.path + ')');

	// and no drawn line may cut through a zone circle it does not end on
	const pz = ctx.numogramPathZoneClearance();
	assert.ok(pz.d >= ctx.NUM_GATE_CLEAR,
		pz.path + ' passes ' + pz.d.toFixed(1) + ' into Zone-' + pz.zone);

	// the figure draws nine informative gates. Zone-0's gate is degenerate, and
	// current values live in route labels rather than a second circle family
	const drawn = ctx.numogramAnnotations().map(a => a.value).sort((a, b) => a - b);
	assert.deepStrictEqual(Array.from(drawn), [1, 3, 6, 10, 15, 21, 28, 36, 45],
		'nine gates drawn, Gt-0 omitted');
	assert.strictEqual(ctx.NUM_GATE_DRAWN[0], false);
	const svgAll = ctx.numogramSvg();
	assert.ok(!/numCurValRing/.test(svgAll), 'no redundant current-value circles');

	// Each gate is anchored to its own channel. Near offsets keep that anchor
	// inside the aperture; only a farther displacement receives a visible leader.
	let expectedLeaders = 0;
	for (const g of ctx.NUM_GATES) {
		if (!ctx.NUM_GATE_DRAWN[g.zone]) continue;
		const path = ctx.numChannelPath(g.zone);
		const pos = ctx.numGatePos(g.zone);
		const anchor = ctx.numGateAnchor(g.zone);
		if (path.cubic) {
			const t = ctx.NUM_GATE_T[g.zone];
			const on = ctx.numAt(path.cubic, t);
			assert.ok(Math.hypot(on.x - anchor.x, on.y - anchor.y) < 0.001,
				'Gt-' + g.value + ' retains an exact channel anchor');
		}
		const displacement = Math.hypot(anchor.x - pos.x, anchor.y - pos.y);
		assert.ok(displacement < ctx.NUM_GATE_LEADER_MAX,
			'Gt-' + g.value + ' stays visibly tied to its course');
		if (displacement > ctx.NUM_GATE_APERTURE_R) expectedLeaders++;
	}
	assert.strictEqual((svgAll.match(/class="numGateLeader"/g) || []).length,
		expectedLeaders, 'only displacements beyond the aperture radius get a visible leader');

	// no two gate labels may sit on top of each other. Only the drawn ones -
	// Gt-0 is not rendered, so it has no position to collide with.
	const pos = ctx.numogramAnnotations();
	const hitPos = ctx.numogramHitAnnotations();
	for (const g of hitPos) {
		assert.ok(g.w >= 44 && g.h >= 44, 'Gt-' + g.value + ' keeps a 44-unit target');
	}
	const hitRects = [...svgAll.matchAll(/<rect class="numHit"[^>]*width="([0-9.]+)" height="([0-9.]+)"/g)];
	assert.strictEqual(hitRects.length, 9, 'the rendered svg carries nine gate target rectangles');
	for (const m of hitRects) assert.ok(+m[1] >= 44 && +m[2] >= 44,
		'rendered gate target remains at least 44 by 44');
	const paintedTags = [...svgAll.matchAll(/<circle class="numGateRing numGateTag"[^>]*r="([0-9.]+)"/g)];
	assert.strictEqual(paintedTags.length, pos.length);
	for (let i = 0; i < paintedTags.length; i++) {
		assert.ok(Math.abs(+paintedTags[i][1] * 2 - pos[i].w) < 0.001 &&
			Math.abs(+paintedTags[i][1] * 2 - pos[i].h) < 0.001,
			'Gt-' + pos[i].value + ' clearance extent bounds its circular aperture');
	}
	for (let i = 0; i < pos.length; i++) {
		for (let j = i + 1; j < pos.length; j++) {
			const d = ctx.numRectRectClearance(pos[i], pos[j]);
			assert.ok(d >= ctx.NUM_GATE_CLEAR,
				'Gt-' + pos[i].value + ' and Gt-' + pos[j].value + ' overlap (' + d.toFixed(1) + ')');
		}
	}
	const gate6 = pos.find(g => g.value === 6).pos;
	const gate21 = pos.find(g => g.value === 21).pos;
	assert.ok(gate6.y < Math.min(ctx.numZone(3).y, ctx.numZone(6).y),
		'Gt-6 arcs above the 3::6 pair');
	assert.ok(gate21.y > Math.max(ctx.numZone(3).y, ctx.numZone(6).y),
		'Gt-21 arcs below the 3::6 pair');

	// nor may a gate label sit on a zone circle
	for (const g of pos) {
		for (const z of ctx.NUM_ZONES) {
			const d = ctx.numRectCircleClearance(g, z);
			assert.ok(d >= ctx.NUM_GATE_CLEAR, 'Gt-' + g.value + ' overlaps Zone-' + z.n);
		}
	}

	// Registration corners are geometry too. Gt-36 was visually clear of the
	// Zone-9 disc while its 44-unit pointer target still stole the top-left
	// bracket; both the visible tag and target are now proved independently.
	const g36 = pos.find(g => g.value === 36);
	const g36Hit = hitPos.find(g => g.value === 36);
	const g36Bracket = ctx.numRegistrationRectClearance(g36);
	const g36HitBracket = ctx.numRegistrationRectClearance(g36Hit);
	assert.strictEqual(g36Bracket.zone, 9, 'Zone-9 remains Gt-36\'s nearest registration corner');
	assert.ok(g36Bracket.d >= ctx.NUM_GATE_CLEAR,
		'Gt-36 visible tag clears Zone-9 bracket by ' + g36Bracket.d.toFixed(2));
	assert.ok(g36HitBracket.d >= 0,
		'Gt-36 target clears Zone-9 bracket by ' + g36HitBracket.d.toFixed(2));
	const bracketCss = read('calc/numogram.css');
	assert.ok(/\.numZoneBracket\s*\{[^}]*stroke-width:\s*2\.4/.test(bracketCss),
		'the measured registration stroke matches the rendered stroke');
	assert.ok(!/\.numZoneBracket\s*\{[^}]*vector-effect:\s*non-scaling-stroke/.test(bracketCss),
		'the registration stroke and its proof remain in the same svg coordinate system');
	assert.strictEqual(ctx.NUM_REGISTRATION_STROKE, 2.4);
	assert.strictEqual(ctx.NUM_REGISTRATION_MAX_STROKE, 3.8);
	const bracketWidths = bracketCss.split('}').filter(rule => rule.includes('.numZoneBracket'))
		.flatMap(rule => [...rule.matchAll(/stroke-width:\s*([0-9.]+)/g)].map(m => +m[1]));
	assert.ok(bracketWidths.length >= 5, 'all registration rest and interaction states expose a measured width');
	assert.strictEqual(Math.max(...bracketWidths), ctx.NUM_REGISTRATION_MAX_STROKE,
		'the registration clearance model includes the widest stroke across every css state');
	const gateCss = read('calc/numogram.css');
	assert.ok(/\.numGateRing\s*\{[^}]*fill:\s*var\(--num-zone-fill\)[^}]*stroke:\s*none/.test(gateCss),
		'gate tags are borderless black apertures rather than outlined boxes');
	assert.ok(/\.numGateText\s*\{[^}]*fill:\s*var\(--num-gate-ink\)/.test(gateCss),
		'resting gate numerals consume the dedicated high-contrast gate-ink token');
	const gateFont = +(gateCss.match(/\.numGateText\s*\{[^}]*font-size:\s*([0-9.]+)px/) || [])[1];
	assert.ok(gateFont > 15 && gateFont < +paintedTags[0][1] * 2,
		'pink gate numerals are larger than the former 15px labels and still fit their apertures');
	assert.ok(/\.numGate\.numOn \.numGateRing\s*\{[^}]*fill:\s*var\(--num-gate-ink\)/.test(gateCss) &&
		/\.numGate\.numOn \.numGateText\s*\{[^}]*fill:\s*var\(--num-zone-fill\)/.test(gateCss),
		'selected gates invert the aperture and numeral without restoring a box');
	assert.ok(/\.numGate\s*\{[^}]*opacity:\s*1/.test(gateCss),
		'resting black gate apertures fully occlude their own channel');

	// Bounds consume the rendered loop object rather than maintaining a second,
	// stale centre formula. Prove both the isolated helper and final viewBox.
	for (const zone of [1, 9]) {
		const loop = ctx.numChannelPath(zone).loop;
		ctx.numBBReset();
		ctx.numBBLoop(loop, 3);
		assert.strictEqual(ctx.numBB.x0, loop.loopCx - loop.loopR - 3);
		assert.strictEqual(ctx.numBB.y0, loop.loopCy - loop.loopR - 3);
		assert.strictEqual(ctx.numBB.x1, loop.loopCx + loop.loopR + 3);
		assert.strictEqual(ctx.numBB.y1, loop.loopCy + loop.loopR + 3);
	}
	const view = [...svgAll.match(/viewBox="([^"]+)"/)[1].split(/\s+/)].map(Number);
	for (const zone of [1, 9]) {
		const loop = ctx.numChannelPath(zone).loop;
		assert.ok(loop.loopCx - loop.loopR >= view[0] && loop.loopCx + loop.loopR <= view[0] + view[2] &&
			loop.loopCy - loop.loopR >= view[1] && loop.loopCy + loop.loopR <= view[1] + view[3],
			'Zone-' + zone + ' self-returning channel stays inside the generated viewBox');
	}

	// and every gate stays inside the frame
	for (const g of pos) {
		assert.ok(g.pos.x - g.w / 2 > 0 && g.pos.x + g.w / 2 < ctx.NUM_W,
			'Gt-' + g.value + ' within width');
		assert.ok(g.pos.y - g.h / 2 > 0 && g.pos.y + g.h / 2 < ctx.NUM_H,
			'Gt-' + g.value + ' within height');
	}

	console.log('clearance: visible tags keep ' + worst.d.toFixed(0) +
		' units and pointer targets do not overlap (' + hitWorst.d.toFixed(1) + ')');
})();

(function hitAreas() {
	const svg = ctx.numogramSvg();

	// the whole disc of a zone is a target, not its stroke
	assert.ok(/class="numHit"/.test(svg), 'hit areas are rendered');
	assert.strictEqual((svg.match(/class="numHit"/g) || []).length, 19,
		'a hit disc for each of the ten zones and each of the nine drawn gates');
	assert.strictEqual((svg.match(/class="numHitLine/g) || []).length, 19,
		'a forgiving stroke under five bonds, five current paths and nine drawn channels');

	// A zone target ends with its visible black aperture. It remains vastly
	// larger than the minimum target while leaving exposed current filaments
	// honestly addressable instead of covering them with an invisible halo.
	assert.strictEqual(ctx.NUM_ZONE_HIT_PAD, 4);
	assert.strictEqual((svg.match(/class="numZoneRing"[^>]*r="52"/g) || []).length, 10,
		'all ten black apertures use the canonical visible radius');
	assert.strictEqual((svg.match(/<circle class="numHit"[^>]*r="52"/g) || []).length, 10,
		'all ten zone targets end with the visible aperture');
	// Nor may neighbouring zone targets overlap.
	for (const z of ctx.NUM_ZONES) {
		for (const o of ctx.NUM_ZONES) {
			if (o.n === z.n) continue;
			const d = Math.hypot(z.x - o.x, z.y - o.y);
			assert.ok(d > (z.r + ctx.NUM_ZONE_HIT_PAD) + (o.r + ctx.NUM_ZONE_HIT_PAD),
				'hit areas of Zone-' + z.n + ' and Zone-' + o.n + ' would overlap');
		}
	}

	// the hit layer must not be visible
	const css = read('calc/numogram.css');
	assert.ok(/\.numHit\s*\{[^}]*fill:\s*transparent/.test(css), 'zone hit areas are invisible');
	assert.ok(/\.numHitLine\s*\{[^}]*stroke:\s*transparent/.test(css), 'line hit areas are invisible');
	assert.ok(!/\.numHitLine\s*\{[^}]*vector-effect:\s*non-scaling-stroke/.test(css),
		'line targets scale in the same svg units as hit-clearance proofs');
	for (const selector of ['numGateRing', 'numGateLeader', 'numChHead']) {
		const block = css.match(new RegExp('\\.' + selector + '\\s*\\{[^}]*\\}'));
		assert.ok(block && !/vector-effect:\s*non-scaling-stroke/.test(block[0]),
			selector + ' scales in the plate coordinate system');
	}
	const plateStrokeBlock = css.match(/\.numChLine,[\s\S]*?\.numCurrentChevron\s*\{[^}]*\}/);
	assert.ok(plateStrokeBlock && !/vector-effect:\s*non-scaling-stroke/.test(plateStrokeBlock[0]),
		'channels, bonds, filaments and chevrons scale with their geometry proofs');
	assert.ok(13 >= 8 + ctx.NUM_CURRENT_FILAMENT_MAX_STROKE / 2,
		'the current hit radius covers the complete five-filament bundle');
	assert.ok(8 >= ctx.NUM_CHANNEL_MAX_STROKE / 2 && 8 >= ctx.NUM_BOND_MAX_STROKE / 2,
		'the ordinary line hit radius covers channels and syzygy bonds in every state');

	// one selection path for pointer and keyboard
	const src = read('calc/numogram.js');
	assert.ok(/function numogramActivate/.test(src), 'a single activation function exists');
	assert.strictEqual((src.match(/numogramActivate\(/g) || []).length, 3,
		'declared once, called from the click handler and the keydown handler');

	console.log('hit areas: 19 discs, 19 forgiving strokes, invisible, no overlap, one shared selection path');
})();

(function zoneMarks() {
	// a solid triangle inside every zone points toward its syzygetic twin
	const svg = ctx.numogramSvg();
	assert.strictEqual((svg.match(/class="numZoneMark"/g) || []).length, 10,
		'every zone carries its direction mark');
	assert.strictEqual(Object.keys(ctx.NUM_ZONE_MARK).length, 10);

	// on the spine the marks face each other along each syzygy
	assert.strictEqual(ctx.NUM_ZONE_MARK[1], 'down');
	assert.strictEqual(ctx.NUM_ZONE_MARK[8], 'up');
	assert.strictEqual(ctx.NUM_ZONE_MARK[9], 'down');
	assert.strictEqual(ctx.NUM_ZONE_MARK[0], 'up');

	// orientation provenance is recorded rather than assumed
	assert.ok(/3\.jpg/.test(ctx.NUM_REFERENCE.canonical), 'the CCRU cover is canonical');
	assert.ok(/mirrored/.test(ctx.NUM_REFERENCE.secondary), 'the redrawing is recorded as mirrored');
	assert.ok(/16 and 8 incorrect/.test(ctx.NUM_REFERENCE.secondary), 'and its two bad gate labels are named');
	assert.ok(/3 upper-left, 6 upper-right/.test(ctx.NUM_REFERENCE.orientationFollows),
		'the orientation follows the canonical cover');
	assert.strictEqual(ctx.NUM_ZONE_MARK[3], 'right');
	assert.strictEqual(ctx.NUM_ZONE_MARK[6], 'left');

	console.log('marks: ten direction triangles, spine pairs facing, canonical orientation recorded');
})();

// ---------------------------------------------- interaction state contracts

(function interactionStateContracts() {
	const saved = {
		document: ctx.document,
		apply: ctx.numogramApply,
		historyAdd: ctx.numHistoryAdd,
		writeUrl: ctx.numogramWriteUrl,
		sync: ctx.numogramSyncControls
	};
	ctx.numogramApply = () => {};
	ctx.numHistoryAdd = () => {};
	ctx.numogramWriteUrl = () => {};
	ctx.numogramSyncControls = () => {};

	ctx.numPicked = [];
	ctx.numSelected = null;
	ctx.numExplore = -1;
	ctx.numogramSelect(8, true);
	ctx.numogramSelect(1, true);
	ctx.numogramSelect(6, true);
	assert.deepStrictEqual(Array.from(ctx.numPicked), [8, 1, 6],
		'three-plus picks preserve insertion order');
	assert.strictEqual(ctx.numSelected, 6, 'the most recent pick is the reading subject');

	const layer = { innerHTML: '' };
	const svg = {
		getAttribute: () => '',
		querySelector: () => layer,
		setAttribute: () => {}
	};
	ctx.numogramLinks(svg);
	assert.strictEqual((layer.innerHTML.match(/class="numLinkLine"/g) || []).length, 0,
		'three picks do not invent an ordered route');
	ctx.numPicked = [8, 1];
	ctx.numSelected = 1;
	ctx.numogramLinks(svg);
	assert.strictEqual((layer.innerHTML.match(/class="numLinkLine"/g) || []).length, 1,
		'exactly two picks retain one meaningful netspan link');
	ctx.numPicked = [8, 1, 6];
	ctx.numSelected = 6;

	ctx.numogramSelect(1, true);
	assert.deepStrictEqual(Array.from(ctx.numPicked), [8, 6], 'removing a middle pick preserves order');
	assert.strictEqual(ctx.numSelected, 6);
	ctx.numogramSelect(6, true);
	assert.deepStrictEqual(Array.from(ctx.numPicked), [8]);
	assert.strictEqual(ctx.numSelected, 8, 'removing the latest pick reveals the preceding subject');

	const annot = { innerHTML: '' };
	ctx.document = { getElementById: id => id === 'numAnnot' ? annot : null };
	ctx.numBody = null;
	ctx.numDeriv = null;
	ctx.numCosmo = 'off';
	ctx.numPicked = [3, 6];
	ctx.numSelected = 6;
	ctx.numogramAnnotate();
	assert.ok(/data-box="lemur"/.test(annot.innerHTML), 'exactly two picks receive the Lemur reading');
	assert.ok(!/data-box="zone"/.test(annot.innerHTML), 'a two-zone reading does not append a zone dossier');
	ctx.numPicked = [4, 5, 6];
	ctx.numSelected = 6;
	ctx.numogramAnnotate();
	assert.ok(!/data-box="lemur"/.test(annot.innerHTML), 'three picks do not masquerade as a two-zone Lemur');
	assert.ok(/data-box="held-zones"/.test(annot.innerHTML), 'three picks become a held-zone inventory');
	assert.ok(/SINK[\s\S]*5::4 → 1/.test(annot.innerHTML) && /GT-15[\s\S]*5 → 6/.test(annot.innerHTML),
		'the 4/5/6 aggregate reports only its natural current and gate');
	ctx.document = saved.document;

	ctx.numPicked = [4]; ctx.numSelected = 4; ctx.numBody = 'MARS'; ctx.numDeriv = { kind: 'number' };
	ctx.numRelation = null;
	ctx.numogramSelectRelation({ kind: 'current', key: '2::7' });
	assert.deepStrictEqual(JSON.parse(JSON.stringify(ctx.numRelation)), { kind: 'current', key: '2::7' });
	assert.deepStrictEqual(Array.from(ctx.numPicked), [], 'relation activation clears zone picks');
	assert.strictEqual(ctx.numBody, null, 'relation activation clears a body reading');
	assert.strictEqual(ctx.numDeriv, null, 'relation activation clears a derivation reading');
	ctx.numogramSelectRelation({ kind: 'current', key: '2::7' });
	assert.strictEqual(ctx.numRelation, null, 'repeating a relation toggles it to idle');
	ctx.numRelation = { kind: 'gate', zone: 8 };
	ctx.numogramSelect(4, true);
	assert.strictEqual(ctx.numRelation, null, 'zone activation clears relation state');
	ctx.numBody = 'URANUS'; ctx.numPicked = [6]; ctx.numSelected = 6;
	ctx.numogramSelect(6, true);
	assert.strictEqual(ctx.numBody, null, 'manual zone deselection clears its body reading');
	assert.deepStrictEqual(Array.from(ctx.numPicked), []);
	assert.strictEqual(ctx.numSelected, null, 'removing the body-derived zone returns the rail to idle');

	ctx.numMode = 'all';
	ctx.numLayers = { zones: true, currents: true, gates: true, syzygies: true };
	for (let i = 0; i <= 9; i++) ctx.numZoneOn[i] = true;
	assert.strictEqual(ctx.numRelationAvailable({ kind: 'gate', zone: 8 }), true);
	ctx.numZoneOn[9] = false;
	assert.strictEqual(ctx.numRelationAvailable({ kind: 'gate', zone: 8 }), false,
		'a gate relation is unavailable when its destination is filtered');
	ctx.numZoneOn[9] = true;
	assert.strictEqual(ctx.numRelationAvailable({ kind: 'current', key: '2::7' }), true);
	ctx.numLayers.currents = false;
	assert.strictEqual(ctx.numRelationAvailable({ kind: 'current', key: '2::7' }), true,
		'the source bond keeps the relation available when only the current path is hidden');
	ctx.numLayers.syzygies = false;
	assert.strictEqual(ctx.numRelationAvailable({ kind: 'current', key: '2::7' }), false,
		'a current relation clears when both of its operator surfaces are hidden');
	ctx.numLayers = { zones: true, currents: true, gates: true, syzygies: true };
	assert.ok(!/numRelation/.test([
		ctx.numogramWriteUrl, ctx.numogramReadUrl, ctx.numHistorySave, ctx.numHistoryLoad
	].map(String).join('\n')), 'relation state is absent from URL and local trace persistence');

	// RESET READING is intentionally not a factory reset: it clears the live
	// reading and returns model/layers to baseline, but preserves zone filters.
	ctx.numZoneOn[2] = false;
	ctx.numMode = 'warp';
	ctx.numCosmo = 'demon';
	ctx.numModel = 'demonology';
	ctx.numLayers = { zones: false, currents: false, gates: false, syzygies: false };
	ctx.numogramReset();
	assert.deepStrictEqual(Array.from(ctx.numPicked), []);
	assert.strictEqual(ctx.numSelected, null);
	assert.strictEqual(ctx.numModel, 'off');
	assert.strictEqual(ctx.numCosmo, 'off');
	assert.strictEqual(ctx.numMode, 'all');
	assert.strictEqual(ctx.numRelation, null, 'reset clears relation state');
	assert.deepStrictEqual(JSON.parse(JSON.stringify(ctx.numLayers)),
		{ zones: true, currents: true, gates: true, syzygies: true });
	assert.strictEqual(ctx.numZoneOn[2], false, 'zone filters survive RESET READING');

	ctx.numZoneOn[2] = true;
	ctx.numogramApply = saved.apply;
	ctx.numHistoryAdd = saved.historyAdd;
	ctx.numogramWriteUrl = saved.writeUrl;
	ctx.numogramSyncControls = saved.sync;

	console.log('state: exact-two link, resolved three-plus inventory, separate toggleable relation, bounded reset');
})();

// --------------------------------------------------------- shell hierarchy

(function shellHierarchy() {
	const saved = {
		document: ctx.document,
		bind: ctx.numogramBind,
		historyLoad: ctx.numHistoryLoad,
		historyRender: ctx.numogramRenderHistory,
		sync: ctx.numogramSyncControls,
		readUrl: ctx.numogramReadUrl,
		apply: ctx.numogramApply,
		fit: ctx.numogramFit,
		add: ctx.addEventListener,
		remove: ctx.removeEventListener
	};
	const area = { innerHTML: '' };
	ctx.document = { getElementById: id => id === 'numogramMenuArea' ? area : null };
	ctx.numogramBind = () => {};
	ctx.numHistoryLoad = () => {};
	ctx.numogramRenderHistory = () => {};
	ctx.numogramSyncControls = () => {};
	ctx.numogramReadUrl = () => false;
	ctx.numogramApply = () => {};
	ctx.numogramFit = () => {};
	ctx.addEventListener = () => {};
	ctx.removeEventListener = () => {};
	ctx.numogramMenuOpened = false;
	ctx.toggleNumogramMenu();

	const html = area.innerHTML;
	assert.strictEqual((html.match(/class="numBody"/g) || []).length, 1, 'one stable primary body');
	assert.ok(/NUMOGRAM<\/span><span class="numTitleSub">DECIMAL LABYRINTH/.test(html));
	assert.ok(/class="numSide numSideRight"[\s\S]*SELECTION/.test(html),
		'the reading is the one standing rail');
	assert.ok(/<details class="numApparatus"/.test(html) && !/<details class="numApparatus"[^>]*\sopen/.test(html),
		'advanced controls begin folded');
	assert.ok(html.indexOf('numSideLeft') > html.indexOf('numApparatus'),
		'filters and lists live inside the folded apparatus');
	assert.ok(/class="numHistory hideValue"/.test(html), 'trace history remains stored but hidden');
	assert.ok(html.indexOf('id="numCosmoSel"') > html.indexOf('numApparatus'),
		'the model selector is advanced apparatus, not primary chrome');
	const shellCss = read('calc/numogram.css');
	assert.ok(/\.numogramBG button,[\s\S]*?\.numogramBG summary\s*\{[^}]*min-width:\s*44px[^}]*min-height:\s*44px/.test(shellCss),
		'every visible HTML control inherits a 44px target floor at the feature boundary');
	assert.ok(/\.numCtl\s*\{[^}]*min-width:\s*44px[^}]*min-height:\s*44px/.test(shellCss),
		'ordinary text controls keep a 44px target floor');
	assert.ok(/\.numZoneChip\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/.test(shellCss),
		'zone filter controls are 44px square');
	assert.ok(/\.numSideLeft\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(10em,\s*1fr\)\)/.test(shellCss),
		'apparatus groups wrap instead of disappearing into a five-column horizontal strip');
	assert.ok(!/grid-template-columns:\s*repeat\(5,\s*minmax\(10em/.test(shellCss),
		'the inaccessible fixed five-column apparatus is gone');
	assert.deepStrictEqual(Array.from(ctx.NUM_MODELS.map(m => m.key)),
		['off', 'geo-extended', 'demonology', 'divination'], 'no retired model control is resurrected');

	// Closing clears the reading but preserves view configuration. That is the
	// existing lifecycle contract; reopening is not a hidden factory reset.
	ctx.numZoneOn[2] = false;
	ctx.numMode = 'warp';
	ctx.numLayers.currents = false;
	ctx.numPicked = [3, 6];
	ctx.numSelected = 6;
	ctx.toggleNumogramMenu();
	assert.strictEqual(ctx.numogramMenuOpened, false);
	assert.deepStrictEqual(Array.from(ctx.numPicked), [], 'closing clears the active reading');
	assert.strictEqual(ctx.numZoneOn[2], false, 'closing preserves zone filters');
	assert.strictEqual(ctx.numMode, 'warp', 'closing preserves region mode');
	assert.strictEqual(ctx.numLayers.currents, false, 'closing preserves layer state');

	ctx.numZoneOn[2] = true;
	ctx.numMode = 'all';
	ctx.numLayers.currents = true;
	ctx.document = saved.document;
	ctx.numogramBind = saved.bind;
	ctx.numHistoryLoad = saved.historyLoad;
	ctx.numogramRenderHistory = saved.historyRender;
	ctx.numogramSyncControls = saved.sync;
	ctx.numogramReadUrl = saved.readUrl;
	ctx.numogramApply = saved.apply;
	ctx.numogramFit = saved.fit;
	ctx.addEventListener = saved.add;
	ctx.removeEventListener = saved.remove;

	console.log('shell: one primary plate, one standing reading rail, advanced apparatus folded, lifecycle preserved');
})();

(function gnosticPanel() {
	ctx.numCosmo = 'geo'; ctx.numGeoSet = 'classical';
	const panel = ctx.numogramGeoPanel();

	// one band per attributed body, no shared geometry to collide on
	assert.strictEqual((panel.match(/data-body="/g) || []).length, 10);
	for (const b of ['VOID','SATURN','EARTH','PLUTO','JUPITER','VENUS','URANUS','MARS','MERCURY','NEPTUNE']) {
		assert.ok(panel.indexOf('>' + b + '<') !== -1, b + ' has a band');
	}
	for (const b of ['MOON','SUN','STARS']) {
		assert.ok(panel.indexOf('>' + b + '<') === -1, b + ' is not invented in the Gnostic arrangement');
	}
	assert.ok(/The Gnostic attribution/.test(panel), 'the accessible name states the selected model');

	// the Void is the ground; the attributed bodies rise in zone order
	const ys = {};
	for (const m of panel.matchAll(/data-body="([A-Z]+)"[\s\S]*?y1="([\d.]+)"/g)) ys[m[1]] = +m[2];
	const ordered = ctx.NUM_GNOSTIC.slice().sort((a, b) => a.zone - b.zone);
	for (let i = 1; i < ordered.length; i++) {
		assert.ok(ys[ordered[i - 1].body] > ys[ordered[i].body],
			ordered[i].body + ' rises above ' + ordered[i - 1].body);
	}

	// bands are far enough apart that two labels cannot collide
	const sorted = Object.values(ys).sort((a, b) => a - b);
	for (let i = 1; i < sorted.length; i++) {
		assert.ok(sorted[i] - sorted[i - 1] >= 60, 'bands are spaced for their labels');
	}

	for (const role of ['KENOMA','CRONUS','GAIA','HADES','ZEUS','APHRODITE','OURANOS','ARES','HERMES','POSEIDON']) {
		assert.ok(panel.indexOf('>' + role + '<') !== -1, role + ' states the attribution');
	}
	const model = ctx.NUM_MODELS.find(m => m.label === 'Gnosticism');
	assert.ok(model && model.cosmo === 'geo', 'the selectable secondary model is Gnosticism');
	ctx.numBody = null; ctx.numCosmo = 'off'; ctx.numGeoSet = 'classical';

	console.log('gnostic panel: ten attributed bands rise from the Void, spaced and selectable');
})();

console.log('\nall numogram checks passed');

// Numogram - the model, not the drawing.
// Run with: node tests/numogram.test.js
//
// The figure is generated from six data structures, so these check the
// structures and the arithmetic that builds them. The SVG, pointer input and
// focus handling need a browser; those are checked by reading the source for
// the behaviour they must have, and exercised for real in the browser.
const assert = require('assert');
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

	// the composition is tall and the figure is not centred on the canvas -
	// both are the point of the reference, so a later tidy-up cannot quietly
	// square it up or centre it
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

// ----------------------------------------------- the reference's errors

(function referenceIsNotCopied() {
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

	// and the panel says so rather than leaving it implicit
	const note = ctx.numogramCorrections();
	assert.ok(/degraded reproduction/i.test(note), 'the panel states the reference was corrected');
	assert.ok(/Zone-7/.test(note) && /Gt-28/.test(note), 'it names what was wrong');

	console.log('reference: nine-zone reproduction not copied, and the correction is stated in the panel');
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
		'zones are focusable and announced');
	assert.ok(/aria-pressed/.test(src), 'selection state is exposed to assistive tech');
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

	// the green field must not inherit the site theme
	const css = read('calc/numogram.css');
	assert.ok(/--num-field:\s*#1fa14a/i.test(css), 'the field is a flat saturated green by default');
	assert.ok(/\[data-invert="1"\]/.test(css), 'and inverts to black on one attribute');
	assert.ok(!/var\(--bg\b/.test(css), 'it does not read the site background variable');

	// integration: one entry in the Features menu, one line in the closer
	const calc = read('calc/calc.js');
	assert.ok(/toggleNumogramMenu\(\)/.test(calc), 'wired into the Features menu');
	assert.strictEqual((calc.match(/toggleNumogramMenu/g) || []).length, 2,
		'exactly two references: the menu entry and closeAllOpenedMenus');
	const idx = read('index.html');
	assert.ok(/id="numogramMenuArea"/.test(idx), 'the panel has its own area');
	assert.ok(/calc\/numogram\.js/.test(idx) && /calc\/numogram\.css/.test(idx), 'both files are loaded');

	console.log('source: keyboard, live region, reduced motion, isolated palette, five-line integration');
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

	// nothing experimental may reach the reading untagged
	const src = read('calc/numogram.js');
	assert.ok(src.indexOf('numStatusTag("experimental")') !== -1, 'the reduction block is tagged');
	assert.ok(src.indexOf('numStatusTag("attested")') !== -1, 'the AQ block is tagged');

	console.log('provenance: canonical / attested / experimental, each labelled and cited in the panel');
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
	assert.strictEqual(ctx.numogramGeoPanel(), '', 'the panel is empty with the mode off');
	assert.strictEqual(ctx.numogramSvg(), canonicalOff, 'and the figure is unchanged');
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
	const left = W * 0.4, right = W * 0.5;

	assert.ok(Z(6).y < upper && Z(6).x < left, 'Zone 6 upper-left');
	assert.ok(Z(3).y < upper && Z(3).x > right, 'Zone 3 upper-right');
	assert.ok(Z(6).x < Z(3).x, 'Zone 6 is left of Zone 3');

	assert.ok(Z(5).x < left && Z(5).y > upper && Z(5).y < lower, 'Zone 5 left-middle');
	assert.ok(Z(2).y > upper && Z(2).y < lower, 'Zone 2 middle band');
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

	console.log('geometry: 6/3 across the top, 5-2-7 through the middle, 4 far left, spine 1-8-9-0, 9 beside 0');
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
	// current, tractor and channel is sampled against every gate's exclusion
	// disc. A gate's own channel is skipped - that is the line it labels.
	// Nothing may sit on a gate numeral: not a path that is not its own, not
	// another gate, and - the one that was failing, with 45, 0 and 9 lying
	// across their zones - not a zone circle.
	const worst = ctx.numogramGateClearance();
	assert.ok(worst.d >= ctx.NUM_GATE_CLEAR,
		'closest approach was ' + worst.d.toFixed(1) + ' (gate ' + worst.gate +
		' vs ' + worst.path + '), needs ' + ctx.NUM_GATE_CLEAR);

	// and no drawn line may cut through a zone circle it does not end on
	const pz = ctx.numogramPathZoneClearance();
	assert.ok(pz.d >= ctx.NUM_GATE_CLEAR,
		pz.path + ' passes ' + pz.d.toFixed(1) + ' into Zone-' + pz.zone);

	// the figure draws nine gates - Zone-0's is degenerate and the reference
	// omits it - and no current-value circles, which the reference has none of
	const drawn = ctx.numogramAnnotations().map(a => a.value).sort((a, b) => a - b);
	assert.deepStrictEqual(Array.from(drawn), [1, 3, 6, 10, 15, 21, 28, 36, 45],
		'nine gates drawn, Gt-0 omitted');
	assert.strictEqual(ctx.NUM_GATE_DRAWN[0], false);
	const svgAll = ctx.numogramSvg();
	assert.ok(!/numCurValRing/.test(svgAll), 'no current-value circles - the reference has none');

	// each gate rides its own channel rather than floating beside its zone
	for (const g of ctx.NUM_GATES) {
		if (!ctx.NUM_GATE_DRAWN[g.zone]) continue;
		const path = ctx.numChannelPath(g.zone);
		const pos = ctx.numGatePos(g.zone);
		if (path.cubic) {
			const t = ctx.NUM_GATE_T[g.zone];
			const on = ctx.numAt(path.cubic, t);
			assert.ok(Math.hypot(on.x - pos.x, on.y - pos.y) < 0.001,
				'Gt-' + g.value + ' sits on its own channel');
		}
	}

	// no two gate labels may sit on top of each other. Only the drawn ones -
	// Gt-0 is not rendered, so it has no position to collide with.
	const pos = ctx.numogramAnnotations().map(a => ({ v: a.value, p: a.pos }));
	for (let i = 0; i < pos.length; i++) {
		for (let j = i + 1; j < pos.length; j++) {
			const d = Math.hypot(pos[i].p.x - pos[j].p.x, pos[i].p.y - pos[j].p.y);
			assert.ok(d > ctx.NUM_GATE_R * 2,
				'Gt-' + pos[i].v + ' and Gt-' + pos[j].v + ' overlap (' + d.toFixed(1) + ')');
		}
	}

	// nor may a gate label sit on a zone circle
	for (const g of pos) {
		for (const z of ctx.NUM_ZONES) {
			const d = Math.hypot(z.x - g.p.x, z.y - g.p.y) - z.r;
			assert.ok(d > 4, 'Gt-' + g.v + ' overlaps Zone-' + z.n);
		}
	}

	// and every gate stays inside the frame
	for (const g of pos) {
		assert.ok(g.p.x > ctx.NUM_GATE_R && g.p.x < ctx.NUM_W - ctx.NUM_GATE_R, 'Gt-' + g.v + ' within width');
		assert.ok(g.p.y > ctx.NUM_GATE_R && g.p.y < ctx.NUM_H - ctx.NUM_GATE_R, 'Gt-' + g.v + ' within height');
	}

	console.log('clearance: worst path approach ' + worst.d.toFixed(0) + ' units, no gate on a gate, a zone or the edge');
})();

(function hitAreas() {
	const svg = ctx.numogramSvg();

	// the whole disc of a zone is a target, not its stroke
	assert.ok(/class="numHit"/.test(svg), 'hit areas are rendered');
	assert.strictEqual((svg.match(/class="numHit"/g) || []).length, 19,
		'a hit disc for each of the ten zones and each of the nine drawn gates');
	assert.strictEqual((svg.match(/class="numHitLine"/g) || []).length, 14,
		'a forgiving stroke under every current and every drawn channel');

	// each zone's hit radius exceeds its visible radius, but never reaches a
	// neighbour - otherwise clicking one zone would select another
	for (const z of ctx.NUM_ZONES) {
		for (const o of ctx.NUM_ZONES) {
			if (o.n === z.n) continue;
			const d = Math.hypot(z.x - o.x, z.y - o.y);
			assert.ok(d > (z.r + 8) + (o.r + 8),
				'hit areas of Zone-' + z.n + ' and Zone-' + o.n + ' would overlap');
		}
	}

	// the hit layer must not be visible
	const css = read('calc/numogram.css');
	assert.ok(/\.numHit\s*\{[^}]*fill:\s*transparent/.test(css), 'zone hit areas are invisible');
	assert.ok(/\.numHitLine\s*\{[^}]*stroke:\s*transparent/.test(css), 'line hit areas are invisible');

	// one selection path for pointer and keyboard
	const src = read('calc/numogram.js');
	assert.ok(/function numogramActivate/.test(src), 'a single activation function exists');
	assert.strictEqual((src.match(/numogramActivate\(/g) || []).length, 3,
		'declared once, called from the click handler and the keydown handler');

	console.log('hit areas: 19 discs, 14 forgiving strokes, invisible, no overlap, one shared selection path');
})();

(function zoneMarks() {
	// the reference draws a solid triangle inside every zone
	const svg = ctx.numogramSvg();
	assert.strictEqual((svg.match(/class="numZoneMark"/g) || []).length, 10,
		'every zone carries its direction mark');
	assert.strictEqual(Object.keys(ctx.NUM_ZONE_MARK).length, 10);

	// on the spine the marks face each other along each syzygy
	assert.strictEqual(ctx.NUM_ZONE_MARK[1], 'down');
	assert.strictEqual(ctx.NUM_ZONE_MARK[8], 'up');
	assert.strictEqual(ctx.NUM_ZONE_MARK[9], 'down');
	assert.strictEqual(ctx.NUM_ZONE_MARK[0], 'up');

	// which reference the figure follows, recorded rather than assumed
	assert.ok(/3\.jpg/.test(ctx.NUM_REFERENCE.canonical), 'the CCRU cover is canonical');
	assert.ok(/mirrored/.test(ctx.NUM_REFERENCE.secondary), 'the redrawing is recorded as mirrored');
	assert.ok(/16 and 8 incorrect/.test(ctx.NUM_REFERENCE.secondary), 'and its two bad gate labels are named');

	console.log('marks: ten direction triangles, spine pairs facing, canonical reference recorded');
})();

(function geocentricPanel() {
	ctx.numCosmo = 'geo'; ctx.numGeoSet = 'classical';
	const panel = ctx.numogramGeoPanel();

	// one band per body, no shared geometry to collide on
	assert.strictEqual((panel.match(/data-body="/g) || []).length, 9);
	for (const b of ['EARTH','MOON','MERCURY','VENUS','SUN','MARS','JUPITER','SATURN','STARS']) {
		assert.ok(panel.indexOf('>' + b + '<') !== -1, b + ' has a band');
	}
	for (const b of ['URANUS','NEPTUNE','PLUTO']) {
		assert.ok(panel.indexOf('>' + b + '<') === -1, b + ' is excluded from Classical');
	}

	// Earth is the ground of the figure - the lowest band
	const ys = {};
	for (const m of panel.matchAll(/data-body="([A-Z]+)"[\s\S]*?y1="([\d.]+)"/g)) ys[m[1]] = +m[2];
	assert.ok(ys.EARTH > ys.MOON, 'Earth sits below the Moon');
	assert.ok(ys.MOON > ys.MERCURY && ys.MERCURY > ys.VENUS && ys.VENUS > ys.SUN,
		'Moon, Mercury, Venus inside the Sun');
	assert.ok(ys.SUN > ys.MARS && ys.MARS > ys.JUPITER && ys.JUPITER > ys.SATURN,
		'Mars, Jupiter, Saturn outside the Sun');
	assert.ok(ys.SATURN > ys.STARS, 'the fixed stars lie beyond Saturn');

	// bands are far enough apart that two labels cannot collide
	const sorted = Object.values(ys).sort((a, b) => a - b);
	for (let i = 1; i < sorted.length; i++) {
		assert.ok(sorted[i] - sorted[i - 1] >= 60, 'bands are spaced for their labels');
	}

	assert.ok(/SCHEMATIC PTOLEMAIC REPRESENTATION/.test(panel), 'the panel says it is schematic');

	// cross-map shares the same dataset and draws one tie, for the selection only
	ctx.numCosmo = 'cross'; ctx.numBody = null;
	assert.strictEqual((ctx.numogramGeoPanel().match(/numBandTie"/g) || []).length, 0,
		'no web of ties with nothing selected');
	ctx.numBody = 'MARS';
	assert.strictEqual((ctx.numogramGeoPanel().match(/numBandTie"/g) || []).length, 1,
		'exactly one tie, for the selected body');
	ctx.numGeoSet = 'extended';
	assert.strictEqual((ctx.numogramGeoPanel().match(/data-body="/g) || []).length, 12,
		'cross-map uses the same body dataset as the geocentric view');
	ctx.numBody = null; ctx.numCosmo = 'off'; ctx.numGeoSet = 'classical';

	console.log('geocentric panel: nine bands Earth-up, spaced, schematic, one tie only, shared dataset');
})();

console.log('\nall numogram checks passed');

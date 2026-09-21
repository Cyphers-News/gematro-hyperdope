// Astrology - systems, houses, the sidereal frame, moons and the canvas.
// Run with: node tests/astrology.test.js
//
// The engine is pure arithmetic, so it runs here. The canvas, pointer input
// and resize handling need a browser: those are checked by reading the source
// for the behaviour they must have, and exercised for real in the browser.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

// astrology.js wires a couple of handlers on load; give it enough of a page
const chain = () => new Proxy(function () {}, { get: () => chain(), apply: () => chain() });
const ctx = { console, setTimeout, clearTimeout, $: chain(), jQuery: chain(), document: chain(), Date, Math,
  getComputedStyle: () => ({ getPropertyValue: () => '' }), requestAnimationFrame: () => 0, cancelAnimationFrame: () => {} };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(read('calc/astrology.js'), ctx, { filename: 'calc/astrology.js' });

const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, what + ': ' + a + ' vs ' + b);
const BIRTH = [1990, 5, 15, 12];                       // 1990-05-15 12:00 UT
const LONDON = { lat: 51.5074, lon: -0.1278 };
const build = (key, loc) => ctx.astroBuildChart(BIRTH[0], BIRTH[1], BIRTH[2], BIRTH[3],
  loc === undefined ? LONDON : loc, ctx.astroSystemConfig(key));

// ---- the default, and the configuration it used to be ---------------------

// A fresh session opens on Vedic / Jyotish. The "current" configuration -
// what this tab did before the systems existed - is unchanged and still
// selectable; it is simply no longer the starting point.
assert.strictEqual(ctx.astroSystem, 'vedic', 'a fresh session starts on Vedic / Jyotish');
assert.strictEqual(ctx.ASTRO_DEFAULT_SYSTEM, 'vedic', 'named once, in one place');
const dflt = ctx.astroSystemConfig();
assert.strictEqual(dflt.key, 'vedic');
assert.strictEqual(dflt.zodiac, 'sidereal', 'the default is sidereal');
assert.strictEqual(dflt.ayanamsa, 'lahiri', 'on the Lahiri ayanamsa');
assert.strictEqual(dflt.houses, 'whole', 'with rashi (Whole Sign) houses');
assert.strictEqual(dflt.housesLabel, 'Whole Sign (rashi)');
assert.ok(dflt.extras.indexOf('nakshatra') > -1 && dflt.extras.indexOf('dasha') > -1,
  'nakshatras and the Vimshottari dasha come with it');
// the default is a configuration that really is read, not a label
const fresh = ctx.astroBuildChart(1990, 5, 15, 12, { lat: 51.5074, lon: -0.1278 }, ctx.astroSystemConfig());
assert.strictEqual(fresh.systemKey, 'vedic');
assert.strictEqual(fresh.zodiac, 'sidereal');
assert.strictEqual(fresh.ayanamsaName, 'lahiri');
assert.strictEqual(fresh.houses.system, 'whole');
assert.ok(fresh.extra.dasha && fresh.extra.dasha.length === 9, 'and the dasha is calculated');
assert.ok(fresh.bodies[1].nakshatra, 'and the nakshatras are there');

// a saved choice wins over the default: the only place that writes astroSystem after start-up is the dropdown
// handler, so nothing re-applies the default over a restored preference
const writes = read('calc/astrology.js').match(/^\s*astroSystem\s*=[^=][^\n]*/gm) || [];
assert.strictEqual(writes.length, 1, 'one writer only, found: ' + writes.join(' | '));
assert.ok(/astroSystem = astroSystemConfig\(key\)\.key/.test(writes[0]),
  'and it is astroSetSystem, reached from the dropdown');
assert.ok(/^var astroSystem = ASTRO_DEFAULT_SYSTEM/m.test(read('calc/astrology.js')),
  'the default is the initial value, nothing more');
assert.ok(/'astroSystem'\+' = '\+JSON\.stringify\(astroSystem\)/.test(read('calc/calc.js')),
  'and it is saved through the existing settings list');
assert.ok(/window\[name\] = value/.test(read('calc/export-csv.js')),
  'which the importer assigns back over the default on load');

// "current" is untouched: same configuration, still there, still unlocked
const cur = ctx.astroSystemConfig('current');
assert.strictEqual(ctx.astroSystems[0].key, 'current', 'and it is still the first option');
assert.strictEqual(cur.zodiac, 'tropical');
assert.strictEqual(cur.houses, 'whole');
assert.strictEqual(cur.housesLocked, false, 'the Whole Sign / Equal buttons still apply to it');

// the old call, exactly as every previous version made it
const legacy = ctx.astroChart(BIRTH[0], BIRTH[1], BIRTH[2], BIRTH[3], { lat: LONDON.lat, lon: LONDON.lon, system: 'whole' });
const now = build('current');
assert.strictEqual(now.houses.system, 'whole');
near(now.houses.asc, legacy.houses.asc, 1e-9, 'ascendant unchanged');
assert.deepStrictEqual(Array.from(now.houses.cusps), Array.from(legacy.houses.cusps), 'cusps unchanged');
Array.from(now.bodies).forEach((b, i) => {
  near(b.lon, legacy.bodies[i].lon, 1e-9, b.name + ' longitude unchanged');
  assert.strictEqual(b.house, legacy.bodies[i].house, b.name + ' house unchanged');
  assert.strictEqual(b.sign.name, legacy.bodies[i].sign.name);
});
assert.strictEqual(now.zodiac, 'tropical');
assert.strictEqual(now.ayanamsa, 0, 'no ayanamsa is applied to the default');
console.log('default: Vedic (sidereal, Lahiri, rashi houses); the Current configuration is unchanged and its numbers still match the previous implementation');

// known-good spot checks, so a change to the ephemeris itself would show up
const sun = now.bodies[0];
assert.strictEqual(sun.sign.name, 'Taurus');
near(sun.deg + sun.min / 60, 24.4, 0.2, 'Sun 24 Taurus on 1990-05-15');
assert.strictEqual(ctx.astroSignOf(0).sign.name, 'Aries');
assert.strictEqual(ctx.astroSignOf(359.99).sign.name, 'Pisces');
console.log('positions still agree with the ephemeris (Sun 24' + '°' + ' Taurus, 1990-05-15)');

// ---- five systems, five configurations -----------------------------------

const keys = Array.from(ctx.astroSystems).map((s) => s.key);
assert.deepStrictEqual(keys, ['current', 'vedic', 'kp', 'hellenistic', 'western']);
const charts = {};
keys.forEach((k) => { charts[k] = build(k); });

assert.strictEqual(charts.vedic.zodiac, 'sidereal');
assert.strictEqual(charts.kp.zodiac, 'sidereal');
assert.strictEqual(charts.hellenistic.zodiac, 'tropical');
assert.strictEqual(charts.western.zodiac, 'tropical');
assert.strictEqual(charts.vedic.houses.system, 'whole');
assert.strictEqual(charts.kp.houses.system, 'placidus');
assert.strictEqual(charts.hellenistic.houses.system, 'whole');
assert.strictEqual(charts.western.houses.system, 'placidus');
assert.strictEqual(charts.vedic.ayanamsaName, 'lahiri');
assert.strictEqual(charts.kp.ayanamsaName, 'kp');
assert.ok(charts.vedic.ayanamsa > 23 && charts.vedic.ayanamsa < 25, 'Lahiri near 23-24 deg in 1990');
near(charts.vedic.ayanamsa - charts.kp.ayanamsa, 5 / 60, 1e-9, 'KP is Lahiri less 5 arcminutes');

// the switch really moves the numbers, not the labels
// most bodies land in the previous sign once the ayanamsa is taken off; a
// few sit far enough into a sign to stay in it, so "some" is the honest test
const movedSign = Array.from(charts.vedic.bodies).filter((b, i) => b.sign.name !== charts.current.bodies[i].sign.name);
assert.ok(movedSign.length >= 5, 'sidereal moves most bodies into the previous sign, not just the label');
near(ctx.aRev(charts.current.bodies[0].lon - charts.vedic.bodies[0].lon), charts.vedic.ayanamsa, 1e-9, 'sidereal Sun is the tropical Sun less the ayanamsa');
assert.notDeepStrictEqual(Array.from(charts.western.houses.cusps), Array.from(charts.current.houses.cusps), 'Placidus is not Whole Sign');
assert.notDeepStrictEqual(Array.from(charts.kp.houses.cusps), Array.from(charts.vedic.houses.cusps), 'KP quadrants are not rashis');
console.log('five systems: zodiac, ayanamsa and houses all differ as configured');

// switching back restores exactly the original configuration
const backAgain = build('current');
assert.deepStrictEqual(Array.from(backAgain.houses.cusps), Array.from(legacy.houses.cusps));
assert.deepStrictEqual(Array.from(backAgain.bodies).map((b) => b.lon), Array.from(legacy.bodies).map((b) => b.lon));
console.log('switching back to Current restores the original configuration');

// ---- the sidereal frame is consistent all the way through -----------------

const v = charts.vedic;
assert.ok(Array.from(v.houses.cusps).every((c) => Math.abs(c % 30) < 1e-9), 'sidereal Whole Sign cusps sit on sign boundaries');
assert.strictEqual(v.houses.cusps[0], Math.floor(v.houses.asc / 30) * 30, 'house 1 is the sign holding the sidereal Ascendant');
Array.from(v.bodies).forEach((b) => {
  assert.strictEqual(b.house, ctx.astroHouseOf(b.lon, v.houses.cusps), b.name + ' house read from the sidereal cusps');
});
// the bug this replaced: tropical houses left on a sidereal chart
const movedHouse = Array.from(v.bodies).filter((b, i) => b.house !== charts.current.bodies[i].house);
assert.ok(movedHouse.length > 0, 'sidereal placements are re-read, not copied from the tropical chart');
// and the shared converter agrees with a chart built sidereal from the start
const converted = ctx.astroToSidereal(legacy, 'lahiri');
assert.deepStrictEqual(Array.from(converted.houses.cusps), Array.from(v.houses.cusps), 'astroToSidereal rebuilds the same cusps');
assert.deepStrictEqual(Array.from(converted.bodies).map((b) => b.house), Array.from(v.bodies).map((b) => b.house), 'and the same house numbers');
console.log('sidereal: Ascendant, cusps and house numbers all belong to the sidereal zodiac');

// ---- houses ---------------------------------------------------------------

const eq = ctx.astroChart(BIRTH[0], BIRTH[1], BIRTH[2], BIRTH[3], { lat: LONDON.lat, lon: LONDON.lon, system: 'equal' });
assert.ok(Array.from(eq.houses.cusps).every((c, i) => Math.abs(ctx.aRev(c - eq.houses.asc - i * 30)) < 1e-9), 'Equal houses run 30 deg from the Ascendant');

const pl = charts.western.houses;
assert.strictEqual(pl.cusps[0], charts.western.houses.asc, 'cusp 1 is the Ascendant');
assert.strictEqual(pl.cusps[9], charts.western.houses.mc, 'cusp 10 is the Midheaven');
for (let i = 0; i < 6; i++) {
  near(ctx.aRev(pl.cusps[i + 6] - pl.cusps[i]), 180, 1e-6, 'cusp ' + (i + 7) + ' opposes cusp ' + (i + 1));
}
let walked = 0;
for (let i = 0; i < 12; i++) {
  const span = ctx.aRev(pl.cusps[(i + 1) % 12] - pl.cusps[i]);
  assert.ok(span > 0 && span < 180, 'house ' + (i + 1) + ' has a sane span: ' + span);
  walked += span;
}
near(walked, 360, 1e-6, 'the twelve houses close the circle');
assert.ok(Array.from(pl.cusps).some((c, i) => Math.abs(ctx.aRev(c - pl.cusps[0] - i * 30)) > 1), 'Placidus houses are unequal');

// Placidus by its own definition: a cusp sits at its fraction of its own
// semi-arc from the meridian. Checked independently of the solver.
const ecl = pl.obliquity, lat = pl.latitude, ramc = pl.ramc;
[[10, 1 / 3, false], [11, 2 / 3, false], [1, 2 / 3, true], [2, 1 / 3, true]].forEach(([idx, frac, noct]) => {
  const lon = pl.cusps[idx];
  const dec = Math.asin(Math.sin(ecl * Math.PI / 180) * Math.sin(lon * Math.PI / 180)) * 180 / Math.PI;
  const ad = Math.asin(Math.tan(dec * Math.PI / 180) * Math.tan(lat * Math.PI / 180)) * 180 / Math.PI;
  const ra = ctx.aAtan2(Math.sin(lon * Math.PI / 180) * Math.cos(ecl * Math.PI / 180), Math.cos(lon * Math.PI / 180));
  const want = noct ? ctx.aRev(ramc + 180 - frac * (90 - ad)) : ctx.aRev(ramc + frac * (90 + ad));
  near(Math.abs(ctx.aRev(ra - want + 180) - 180), 0, 1e-6, 'cusp ' + (idx + 1) + ' divides its own semi-arc');
});
console.log('Placidus: cusps satisfy the semi-arc definition, oppose correctly and close the circle');

// circumpolar: said out loud, never passed off as Placidus
const polar = ctx.astroChart(1990, 12, 21, 12, { lat: 78, lon: 15, system: 'placidus' });
assert.strictEqual(polar.houses.system, 'porphyry');
assert.strictEqual(polar.houses.asked, 'placidus');
assert.strictEqual(polar.houses.undefinedHere, true);
assert.ok(/Placidus undefined/.test(ctx.astroSystemInfoText(ctx.astroSystemConfig('western'), polar)), 'the system line says so');
const ordinary = ctx.astroChart(1990, 5, 15, 12, { lat: 59.3, lon: 18.1, system: 'placidus' });
assert.strictEqual(ordinary.houses.system, 'placidus', 'a high but not circumpolar chart still gets Placidus');
console.log('circumpolar: falls back to Porphyry and says which system it is showing');

// ---- Vedic --------------------------------------------------------------

const moon = v.bodies[1];
assert.ok(moon.nakshatra, 'the Moon has a nakshatra');
assert.strictEqual(moon.nakshatra.name, ctx.astroNakshatras[Math.floor(moon.lon / (360 / 27))]);
assert.ok(moon.nakshatra.pada >= 1 && moon.nakshatra.pada <= 4);
assert.strictEqual(ctx.astroNakshatraOf(0).name, 'Ashwini');
assert.strictEqual(ctx.astroNakshatraOf(0).lord, 'Ketu');
assert.strictEqual(ctx.astroNakshatraOf(359.9).name, 'Revati');
assert.strictEqual(ctx.astroNakshatraOf(13.4).pada, 1, 'the second nakshatra starts a new set of padas');

const dasha = v.extra.dasha;
assert.strictEqual(dasha.length, 9, 'nine mahadashas listed');
assert.strictEqual(dasha[0].lord, moon.nakshatra.lord, 'the first is the Moon nakshatra lord');
assert.ok(dasha[0].years < Array.from(ctx.astroDashaLords).find((l) => l.name === dasha[0].lord).years + 1e-9, 'the first is the balance, not a whole period');
for (let i = 1; i < 9; i++) {
  assert.strictEqual(dasha[i].startD, dasha[i - 1].endD, 'periods run back to back');
  const full = Array.from(ctx.astroDashaLords).find((l) => l.name === dasha[i].lord).years;
  near(dasha[i].years, full, 1e-9, dasha[i].lord + ' runs its full length');
}
near(Array.from(ctx.astroDashaLords).reduce((s, l) => s + l.years, 0), 120, 1e-9, 'Vimshottari totals 120 years');
assert.strictEqual(ctx.astroDashaDate(1), '2000-01-01', 'day numbers convert back to calendar dates');
console.log('Vedic: nakshatra, pada and a Vimshottari sequence starting from the Moon');

// ---- KP ------------------------------------------------------------------

const kp = charts.kp;
assert.ok(Array.from(kp.bodies).every((b) => b.sublord), 'every body has a sub lord');
assert.strictEqual(kp.extra.cuspal.length, 12, 'twelve cuspal sub lords');
Array.from(kp.extra.cuspal).forEach((c, i) => {
  assert.strictEqual(c.sub, ctx.astroSubLordOf(kp.houses.cusps[i]).sub, 'cusp ' + (i + 1) + ' sub lord matches its degree');
});
// the sub-lord divisions are the Vimshottari proportions of one nakshatra
const span = 360 / 27;
let acc = 0;
Array.from(ctx.astroDashaLords).forEach((l) => {
  const mid = acc + span * l.years / 120 / 2;
  assert.strictEqual(ctx.astroSubLordOf(mid).sub, l.name, 'sub lord ' + l.name + ' holds its share of Ashwini');
  acc += span * l.years / 120;
});
near(acc, span, 1e-9, 'the sub lords fill exactly one nakshatra');
assert.notStrictEqual(kp.bodies[1].sublord, undefined);
assert.ok(ctx.astroSystemConfig('kp').extras.indexOf('sublord') > -1 && ctx.astroSystemConfig('vedic').extras.indexOf('sublord') === -1,
  'sub lords belong to KP, not to Vedic - KP is not a relabelled Vedic');
console.log('KP: star lord, sub lord and cuspal sub lords on Placidus cusps in the Krishnamurti frame');

// ---- Hellenistic ---------------------------------------------------------

const hel = charts.hellenistic;
assert.ok(hel.extra.sect, 'sect is calculated');
assert.strictEqual(hel.extra.sect.day, ctx.aRev(hel.bodies[0].lon - hel.houses.asc) >= 180, 'day when the Sun is above the horizon');
assert.strictEqual(hel.extra.sect.light, hel.extra.sect.day ? 'Sun' : 'Moon');
const lot = hel.extra.fortune;
const wantLot = hel.extra.sect.day
  ? ctx.aRev(hel.houses.asc + hel.bodies[1].lon - hel.bodies[0].lon)
  : ctx.aRev(hel.houses.asc + hel.bodies[0].lon - hel.bodies[1].lon);
near(lot.lon, wantLot, 1e-9, 'Lot of Fortune follows sect');
assert.strictEqual(hel.extra.rulerSet, 'traditional');
assert.deepStrictEqual(Array.from(ctx.astroTraditionalRulers).slice(7, 12), ['Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'],
  'Scorpio, Aquarius and Pisces keep their traditional rulers');
['Uranus', 'Neptune', 'Pluto'].forEach((p) => {
  assert.strictEqual(ctx.astroTraditionalRulers.indexOf(p), -1, p + ' is not a traditional ruler');
});
assert.strictEqual(charts.western.extra.rulerSet, 'modern');
assert.strictEqual(ctx.astroModernRulers[7], 'Pluto', 'the modern set does give Scorpio to Pluto');
console.log('Hellenistic: sect, Lot of Fortune and traditional rulers only (no outer planets)');

// ---- the moons -----------------------------------------------------------

const moons = Array.from(ctx.astroMoons);
assert.strictEqual(moons.length, 24, 'the supported set');
const byParent = {};
Array.from(moons).forEach((m) => { byParent[m.parent] = (byParent[m.parent] || 0) + 1; });
assert.deepStrictEqual(byParent, { earth: 1, mars: 2, jupiter: 5, saturn: 8, uranus: 5, neptune: 2, pluto: 1 });
assert.deepStrictEqual(Array.from(ctx.astroMoonsOf('jupiter')).map((m) => m.name), ['Amalthea', 'Io', 'Europa', 'Ganymede', 'Callisto']);
assert.deepStrictEqual(Array.from(ctx.astroMoonsOf('mars')).map((m) => m.name), ['Phobos', 'Deimos']);
assert.strictEqual(ctx.astroMoonsOf('venus').length, 0, 'Venus has no moons and is given none');
assert.strictEqual(ctx.astroMoonsOf('mercury').length, 0);
// each planet's moons are listed outwards, and Kepler's third law holds
Object.keys(byParent).forEach((p) => {
  const set = Array.from(ctx.astroMoonsOf(p));
  for (let i = 1; i < set.length; i++) {
    assert.ok(set[i].a > set[i - 1].a, p + ': ' + set[i].name + ' is outside ' + set[i - 1].name);
    assert.ok(set[i].period > set[i - 1].period, p + ': and takes longer to go round');
    const ratio = Math.pow(set[i].a / set[i - 1].a, 1.5) / (set[i].period / set[i - 1].period);
    near(ratio, 1, 0.06, p + ': ' + set[i].name + ' obeys the period-distance law');
  }
});
assert.strictEqual(moons.find((m) => m.name === 'Triton').retrograde, true, 'Triton goes round backwards');
assert.strictEqual(moons.find((m) => m.name === 'Moon').a, 384400);
// schematic motion: a full circle in exactly one period, at the right radius
const io = moons.find((m) => m.name === 'Io');
const p0 = ctx.astroMoonOffset(io, 0);
const pHalf = ctx.astroMoonOffset(io, io.period / 2);
const pFull = ctx.astroMoonOffset(io, io.period);
near(Math.sqrt(p0.x * p0.x + p0.y * p0.y) * 149597870.7, io.a, 1, 'Io sits at its own orbital radius');
near(pFull.x, p0.x, 1e-9, 'one period returns it to the start');
near(pHalf.x, -p0.x, 1e-9, 'half a period puts it opposite');
console.log('moons: 24 supported, real radii and periods, ordered outwards, schematic circular motion');

// ---- the camera and level of detail --------------------------------------

assert.strictEqual(ctx.astroTarget, 'sun', 'the camera starts on the system view');
assert.strictEqual(ctx.astroSelected, null);
assert.ok(ctx.astroZoomMax > 100, 'zoom reaches far enough for a moon system to separate');
// a target is a real point in space, not a label
ctx.astroLastChart = charts.current;
const jup = ctx.astroBodyPos('jupiter', charts.current.d);
const eur = ctx.astroBodyPos('Europa', charts.current.d);
const gap = Math.sqrt(Math.pow(jup.x - eur.x, 2) + Math.pow(jup.y - eur.y, 2));
near(gap * 149597870.7, 671034, 5, 'Europa is its own orbital radius from Jupiter');
near(Math.sqrt(jup.x * jup.x + jup.y * jup.y + jup.z * jup.z), 5.3, 0.3, 'Jupiter is about 5.3 AU out in 1990');
// the local factor is what keeps a moon orbit round rather than squashed
assert.ok(ctx.astroLocalFactor(5.2) > 0 && ctx.astroLocalFactor(5.2) < 1);
near(ctx.astroLocalFactor(1), 1, 1e-9, 'at 1 AU the local scale is the global one');
console.log('camera: targets are positions, and a moon target sits where the moon is drawn');

// ---- behaviour that needs a browser, checked in the source ---------------

const src = read('calc/astrology.js');
assert.ok(/pointerdown/.test(src) && /pointermove/.test(src) && /pointerup/.test(src), 'touch and mouse share pointer events');
assert.ok(/pinchFrom/.test(src), 'two fingers pinch to zoom');
assert.ok(/style\.touchAction = \(mode === "2d"\) \? "auto" : "none"/.test(src), 'the page still scrolls over the 2D wheel');
assert.ok(!/\$\(document\)\.on\("mousemove"/.test(src), 'no page-wide mouse handlers left');
assert.ok(/new ResizeObserver/.test(src), 'the canvas follows its own size');
assert.ok(/if \(cvs\.width !== bw\)/.test(src), 'and is only re-sized when it actually changed');
assert.ok(/prefers-reduced-motion/.test(src), 'reduced motion is respected');
assert.ok(/astroStopVisual/.test(src) && /cancelAnimationFrame/.test(src), 'closing the panel stops everything');
assert.ok(/document\.createTextNode\(label\)|strong\.textContent = label/.test(src), 'a place name is written as text');
assert.ok(!/out\.innerHTML = '<div class="astroGeoNote">Using <b>' \+ label/.test(src), 'and never as markup');
assert.ok(/px < 7/.test(src) && /showLabel: px >= 26/.test(src), 'moon visibility and labels are pixel tests');
console.log('source: pointer input, resize, reduced motion, cleanup, escaped place names, pixel-based LOD');

// ---- the settings entry ---------------------------------------------------

assert.ok(/'astroSystem'\+' = '\+JSON\.stringify\(astroSystem\)/.test(read('calc/calc.js')),
  'the chosen system rides along in the existing settings blob');
assert.ok(!/localStorage/.test(src), 'astrology.js adds no second persistence mechanism');
console.log('persistence: one entry in calcOptionsArr, no second settings system');

console.log('\nall astrology checks passed');

// Flat Earth / Zetetic view - the model's plane, the astronomy under it,
// and the three-way mode switch.
// Run with: node tests/flat-earth.test.js
//
// The split this file guards: every position is the existing modern
// calculation, and the model supplies only the layout. A test that let the
// model's figures leak into the astronomy would be the real failure here.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const chain = () => new Proxy(function () {}, { get: () => chain(), apply: () => chain() });
// No canvas here, so getElementById gives nothing back and the draw calls
// these tests trigger return early - the maths is what is under test.
const ctx = { console, setTimeout, clearTimeout, $: chain(), jQuery: chain(), Date, Math, JSON,
  document: { getElementById: () => null, querySelector: () => null },
  getComputedStyle: () => ({ getPropertyValue: () => '' }), requestAnimationFrame: () => 0, cancelAnimationFrame: () => {} };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(read('calc/astrology.js'), ctx, { filename: 'calc/astrology.js' });
vm.runInContext(read('calc/flat-earth.js'), ctx, { filename: 'calc/flat-earth.js' });

const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, what + ': ' + a + ' vs ' + b);
const D = (y, m, d, ut) => ctx.astroDayNumber(y, m, d, ut);

// ---- the mode switch ------------------------------------------------------

assert.strictEqual(ctx.astroViewMode, '2d', 'the existing view is still the default');
assert.notStrictEqual(ctx.astroViewMode, 'flat', 'Flat Earth is not the default');
const src = read('calc/astrology.js');
const flatSrcEarly = read('calc/flat-earth.js');
// the visible label is FE; the implementation behind it keeps its
// descriptive names, so the button and the renderer still line up
assert.ok(/astroViewFlat/.test(src), 'there is a third button');
const feBtn = /<input id="astroViewFlat"[^>]*>/.exec(src)[0];
assert.ok(/value="FE"/.test(feBtn), 'its label is exactly FE, found: ' + (/value="([^"]*)"/.exec(feBtn) || [])[1]);
assert.ok(!/value="Flat Earth"/.test(src), 'the old label is gone');
assert.ok(/astroSetView\(&quot;flat&quot;\)/.test(feBtn), 'and it still opens the flat view');
assert.ok(/aria-label="FE: Flat Earth \/ Zetetic historical geocentric map"/.test(feBtn),
  'with the full name still available to a screen reader');
assert.ok(/title="FE — Flat Earth \/ Zetetic Historical Geocentric Model"/.test(feBtn) || /title="FE/.test(feBtn),
  'and in its tooltip');
// the renderer, its internals and its attribution keep their descriptive names
assert.ok(/function drawAstroChartFlat/.test(flatSrcEarly), 'the renderer is still drawAstroChartFlat');
assert.ok(/Flat Earth \/ Zetetic — Historical Geocentric Model/.test(flatSrcEarly) ||
  /Flat Earth \/ Zetetic — Historical Geocentric Model/.test(src), 'the model is still named in full on the page');
assert.ok(/fePlanePoint|feSubPoint|FE_MODEL/.test(flatSrcEarly), 'internal names are unchanged');
assert.ok(/drawAstroChart2D/.test(src) && /drawAstroChart3D/.test(src) && /drawAstroChartFlat/.test(src),
  'all three renderers are dispatched, none replaced');
assert.ok(/astroViewMode === "flat" && typeof drawAstroChartFlat === "function"/.test(src),
  'the flat view is optional: the tab still works if its file is missing');
assert.ok(/'astroViewMode'\+' = '\+JSON\.stringify\(astroViewMode\)/.test(read('calc/calc.js')),
  'the chosen view rides along in the existing settings blob');
assert.ok(!/localStorage/.test(read('calc/flat-earth.js')), 'and there is no second persistence mechanism');
console.log('modes: 2D still the default, three renderers side by side, one settings mechanism');

// ---- the model's plane ----------------------------------------------------

const pole = ctx.fePlanePoint(90, 0);
near(pole.r, 0, 1e-12, 'the North Pole is the centre');
near(ctx.fePlanePoint(0, 0).r, 0.5, 1e-12, 'the equator is halfway out');
near(ctx.fePlanePoint(-90, 0).r, 1, 1e-12, 'the far south is the rim');
// distance from the centre is co-latitude, all the way round: the model's
// own construction, not a globe with an axis flattened
for (let lat = 90; lat >= -90; lat -= 10) {
  for (let lon = -180; lon < 180; lon += 45) {
    const p = ctx.fePlanePoint(lat, lon);
    near(Math.sqrt(p.x * p.x + p.y * p.y), (90 - lat) / 180, 1e-12, 'radius is co-latitude at ' + lat + ',' + lon);
  }
}
// a squashed globe would collapse opposite meridians onto each other; this
// keeps them a full turn apart
const east = ctx.fePlanePoint(0, 90), west = ctx.fePlanePoint(0, -90);
near(east.x, -west.x, 1e-12, 'east and west stay opposite');
near(ctx.fePlanePoint(0, 0).y, 0.5, 1e-12, 'the prime meridian runs down the page');
assert.ok(Math.abs(ctx.fePlanePoint(0, 0).x) < 1e-12);
// the rim is where the model stops
assert.ok(ctx.fePlanePoint(-120, 0).r <= 1.25, 'nothing is drawn far beyond the rim');
console.log('plane: pole at the centre, equator halfway, rim in the far south, meridians a full turn apart');

// ---- the astronomy underneath ---------------------------------------------

// The Sun's declination through the year: the seasons, from the existing engine
const decOf = (y, m, d, ut) => ctx.feEquatorialOf('sun', D(y, m, d, ut)).dec;
near(decOf(2026, 6, 21, 12), 23.4, 0.3, 'June solstice');
near(decOf(2026, 12, 21, 12), -23.4, 0.3, 'December solstice');
near(decOf(2026, 3, 20, 12), 0, 0.6, 'March equinox');
near(decOf(2026, 9, 22, 12), 0, 0.6, 'September equinox');

// The sub-solar point is where the Sun stands overhead: its latitude is the
// declination, and at noon UT its longitude is near Greenwich - off it by
// the equation of time, which is the honest check
const d0 = D(2026, 6, 21, 12);
const gmst = ctx.feGMST({ d: d0 }, 12);
const sunEq = ctx.feEquatorialOf('sun', d0);
const sub = ctx.feSubPoint(sunEq, gmst);
near(sub.lat, sunEq.dec, 1e-12, 'sub-point latitude is the declination');
assert.ok(Math.abs(sub.lon) < 4, 'at noon UT the Sun stands near the prime meridian, within the equation of time: ' + sub.lon);

// Altitude: at a body's own meridian it is 90 - latitude + declination
const alt = ctx.feAltAz(sunEq, gmst, 51.5, sub.lon).alt;
near(alt, 90 - 51.5 + sunEq.dec, 1e-6, 'altitude on the meridian');
// and the terminator really is the horizon
for (let t = 0; t < 360; t += 30) {
  const ha = ctx.aRev(gmst + t - sunEq.ra);
  const latT = Math.atan(-ctx.aCos(ha) / Math.tan(sunEq.dec * Math.PI / 180)) * 180 / Math.PI;
  near(ctx.feAltAz(sunEq, gmst, latT, t).alt, 0, 1e-6, 'the terminator is where the Sun rises and sets');
}
// the Moon's latitude is real, not assumed flat on the ecliptic
const moonEcl = ctx.feEclipticOf('moon', d0);
assert.ok(Math.abs(moonEcl.lat) <= 5.4, 'the Moon stays within its own inclination: ' + moonEcl.lat);
assert.ok(Math.abs(moonEcl.lat) > 0.01, 'and is not pinned to zero');
// planets get their latitude from the engine's own vectors
const venusEcl = ctx.feEclipticOf('venus', d0);
assert.ok(Math.abs(venusEcl.lat) < 9, 'Venus keeps to its own orbital inclination');
near(venusEcl.lon, ctx.astroLongitude('venus', d0), 0.02, 'and its longitude agrees with the engine');
console.log('astronomy: solstices, equinoxes, sub-points, altitudes and the terminator all check out');

// ---- the model is not allowed to touch the astronomy -----------------------

const flatSrc = read('calc/flat-earth.js');
assert.ok(/FE_MODEL/.test(flatSrc), 'the model states its own figures in one place');
assert.strictEqual(ctx.FE_MODEL.sunHeightMiles, 3000);
assert.strictEqual(ctx.feModelHeight('sun'), 3000);
assert.strictEqual(ctx.feModelHeight('mars'), null, 'the model fixes no height for the planets, and none is invented');
// the model's numbers appear nowhere in the position maths
const positionFns = ['feEclipticOf', 'feEquatorialOf', 'feSubPoint', 'feAltAz', 'feGMST'];
positionFns.forEach((fn) => {
  const body = new RegExp('function ' + fn + '\\s*\\([\\s\\S]*?\\n}', 'm').exec(flatSrc)[0];
  assert.ok(!/FE_MODEL|feModelHeight|3000/.test(body), fn + ' does not read the model\'s figures');
});
// and the astronomy engine itself was not bent to fit the model: the flat
// view appears in astrology.js only where views are chosen and drawn, never
// inside a calculation
['astroChart', 'astroBuildChart', 'astroLongitude', 'astroHelioPos', 'astroCusps', 'astroPlacidusCusp', 'astroCelestialObjects']
  .forEach((fn) => {
    const body = new RegExp('\\nfunction ' + fn + '\\s*\\([\\s\\S]*?\\n}', 'm').exec(src)[0].replace(/\/\/[^\n]*/g, '');
    assert.ok(!/\bfe[A-Z]|FE_MODEL|flat/i.test(body), fn + ' knows nothing about the flat view');
  });
const dispatch = /function drawAstroVisual[\s\S]*?\n}/.exec(src)[0];
assert.ok(/drawAstroChartFlat/.test(dispatch), 'the flat view is reached from the view switch, and only there');
assert.ok(/About this model/.test(flatSrc) && /not presented as a scientific model/.test(ctx.FE_MODEL.about),
  'the view says what it is');
assert.ok(/daylight: modern/.test(flatSrc), 'daylight is labelled as the modern calculation');
console.log('separation: model figures are labelled, never fed into a position, engine untouched');

// ---- the shared celestial objects -----------------------------------------

const chart = ctx.astroBuildChart(1990, 5, 15, 12, { lat: 51.5, lon: -0.12 }, ctx.astroSystemConfig('vedic'));
const objs = ctx.astroCelestialObjects(chart);
assert.strictEqual(objs.length, 10, 'Sun, Moon and eight planets');
assert.deepStrictEqual(Array.from(objs).map((o) => o.id),
  ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']);
assert.strictEqual(objs[0].type, 'star');
assert.strictEqual(objs[1].type, 'moon');
assert.strictEqual(objs[2].type, 'planet');
// the list carries the chart's own zodiac, so the flat map inherits the
// selected system rather than working one out for itself
Array.from(objs).forEach((o, i) => {
  assert.strictEqual(o.lon, chart.bodies[i].lon, o.name + ' longitude comes from the chart');
  assert.strictEqual(o.sign.name, chart.bodies[i].sign.name);
});
assert.ok(!/astroChart\(|astroBuildChart\(/.test(flatSrc), 'the flat view casts no chart of its own');
assert.ok(/astroCelestialObjects\(/.test(flatSrc), 'it reads the shared list instead');
// sidereal in, sidereal out: the ring is drawn from the chart's ayanamsa
assert.ok(/chart\.ayanamsa/.test(flatSrc), 'the zodiac ring follows the chart\'s zodiac');
const tropical = ctx.astroBuildChart(1990, 5, 15, 12, { lat: 51.5, lon: -0.12 }, ctx.astroSystemConfig('current'));
assert.notStrictEqual(ctx.astroCelestialObjects(tropical)[0].lon, objs[0].lon,
  'a different system really does hand the flat map different longitudes');
console.log('shared objects: one list, from the selected system, no second engine');

// ---- geography -------------------------------------------------------------

assert.ok(ctx.feOutlines.length >= 7, 'the continents are there');
const names = Array.from(ctx.feOutlines).map((o) => o.name);
['Africa', 'Eurasia', 'North America', 'South America', 'Australia'].forEach((n) => {
  assert.ok(names.indexOf(n) > -1, n + ' is on the map');
});
Array.from(ctx.feOutlines).forEach((land) => {
  assert.ok(land.pts.length >= 5, land.name + ' has a shape');
  Array.from(land.pts).forEach((p) => {
    assert.ok(p[0] >= -90 && p[0] <= 90, land.name + ': latitude in range');
    assert.ok(p[1] >= -180 && p[1] <= 180, land.name + ': longitude in range');
  });
  const first = land.pts[0], last = land.pts[land.pts.length - 1];
  if (land.closed) assert.deepStrictEqual(Array.from(first), Array.from(last), land.name + ' closes');
});
// a couple of spot checks that the outlines are the right way round
const capeTown = Array.from(ctx.feOutlines).find((o) => o.name === 'Africa').pts.find((p) => p[0] < -30);
assert.ok(capeTown[1] > 10 && capeTown[1] < 25, 'the southern tip of Africa is in the right longitudes');
assert.ok(Array.from(ctx.feOutlines).find((o) => o.name === 'Australia').pts.every((p) => p[0] < 0 && p[1] > 100),
  'Australia is south and east');
// stars: a short list, with plausible coordinates
assert.strictEqual(ctx.feStars.length, 16, 'a short star list, not a catalogue');
Array.from(ctx.feStars).forEach((s) => {
  assert.ok(s.ra >= 0 && s.ra < 360, s.name + ' right ascension');
  assert.ok(s.dec >= -90 && s.dec <= 90, s.name + ' declination');
});
near(Array.from(ctx.feStars).find((s) => s.name === 'Polaris').dec, 89.26, 0.05, 'Polaris sits by the pole');
near(Array.from(ctx.feStars).find((s) => s.name === 'Sirius').dec, -16.7, 0.1, 'Sirius is a southern star');
console.log('geography: continents in the right hemispheres, closed outlines, 16 named stars');

// ---- the view's own state --------------------------------------------------

assert.strictEqual(ctx.feZoom, 1);
assert.strictEqual(ctx.fePanX, 0);
assert.strictEqual(ctx.fePanY, 0);
ctx.feSetZoom(1e9);
assert.strictEqual(ctx.feZoom, ctx.feZoomMax, 'zoom is bounded, so the projection cannot go unstable');
ctx.feSetZoom(-5);
assert.strictEqual(ctx.feZoom, ctx.feZoomMin, 'and bounded below');
ctx.feSetZoom(1);
assert.ok(ctx.feZoomMax <= 100, 'and stays within a sane range');
// the flat view keeps its own pan and zoom, apart from the solar map's camera
assert.ok(/feZoom|fePanX/.test(flatSrc) && !/astroZoom\s*=/.test(flatSrc), 'it does not write the solar map\'s zoom');
assert.ok(!/astroAzimuth\s*[+-]?=/.test(flatSrc), 'and never rotates anything: a flat map has nothing to orbit');
assert.ok(/feAnimFrom/.test(flatSrc) && /astroReducedMotion\(\)/.test(flatSrc), 'focusing eases, and respects reduced motion');
assert.ok(/astroRaf = window\.requestAnimationFrame/.test(flatSrc), 'it reuses the one animation handle');
assert.ok((flatSrc.match(/requestAnimationFrame/g) || []).length <= 2, 'so there is no second render loop');
console.log('view state: own pan and zoom, bounded, eased, no rotation, no second loop');

// ---- interaction -----------------------------------------------------------

assert.ok(/function feTap/.test(flatSrc), 'taps are handled');
assert.ok(/astroViewMode === "flat"\) feTap/.test(src), 'and the shared pointer handler routes to them');
assert.ok(/fePanBy\(dx, dy/.test(src), 'a drag pans the flat map');
assert.ok(/if \(astroViewMode === "flat"\) feZoomBy\(f\)/.test(src), 'a pinch zooms it');
assert.ok(/mode === "2d"\) \? "auto" : "none"/.test(src), 'the page still scrolls over the wheel');
assert.ok(/touch \? 22 : 14/.test(flatSrc), 'a fingertip gets a bigger target than a mouse pointer');
assert.ok(/aria-label="Zoom out"/.test(flatSrc) && /aria-pressed/.test(flatSrc), 'the controls have accessible names');
assert.ok(/aria-expanded/.test(flatSrc), 'and the model note says whether it is open');
console.log('interaction: tap, pan, pinch, touch targets and accessible controls');

console.log('\nall flat earth checks passed');

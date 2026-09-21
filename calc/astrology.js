// ========================= Astrology =============================
//
// Geocentric ecliptic longitudes for the Sun, Moon and planets, from the
// classical orbital-element method (Paul Schlyter's formulation) including the
// standard perturbation terms for the Moon, Jupiter, Saturn and Uranus, plus
// the periodic series for Pluto.
//
// Accuracy: roughly 1-2 arcminutes for the Sun and Moon and a few arcminutes
// for the planets. Signs, degrees and aspects are far inside that margin.
// Pluto's series is only valid 1800-2100, which is flagged in the UI.

var astroMenuOpened = false
var astroLastChart = null // most recent chart, shared with the visualiser

var astroSigns = [
	{ name: "Aries",       glyph: "♈", el: "Fire"  },
	{ name: "Taurus",      glyph: "♉", el: "Earth" },
	{ name: "Gemini",      glyph: "♊", el: "Air"   },
	{ name: "Cancer",      glyph: "♋", el: "Water" },
	{ name: "Leo",         glyph: "♌", el: "Fire"  },
	{ name: "Virgo",       glyph: "♍", el: "Earth" },
	{ name: "Libra",       glyph: "♎", el: "Air"   },
	{ name: "Scorpio",     glyph: "♏", el: "Water" },
	{ name: "Sagittarius", glyph: "♐", el: "Fire"  },
	{ name: "Capricorn",   glyph: "♑", el: "Earth" },
	{ name: "Aquarius",    glyph: "♒", el: "Air"   },
	{ name: "Pisces",      glyph: "♓", el: "Water" }
]

var astroBodies = [
	{ key: "sun",     name: "Sun",     glyph: "☉" },
	{ key: "moon",    name: "Moon",    glyph: "☽" },
	{ key: "mercury", name: "Mercury", glyph: "☿" },
	{ key: "venus",   name: "Venus",   glyph: "♀" },
	{ key: "mars",    name: "Mars",    glyph: "♂" },
	{ key: "jupiter", name: "Jupiter", glyph: "♃" },
	{ key: "saturn",  name: "Saturn",  glyph: "♄" },
	{ key: "uranus",  name: "Uranus",  glyph: "♅" },
	{ key: "neptune", name: "Neptune", glyph: "♆" },
	{ key: "pluto",   name: "Pluto",   glyph: "♇" }
]

// aspect angle, name, glyph and orb in degrees
var astroAspects = [
	{ ang: 0,   name: "Conjunction", glyph: "☌", orb: 8 },
	{ ang: 60,  name: "Sextile",     glyph: "⚹", orb: 4 },
	{ ang: 90,  name: "Square",      glyph: "□", orb: 6 },
	{ ang: 120, name: "Trine",       glyph: "△", orb: 6 },
	{ ang: 180, name: "Opposition",  glyph: "☍", orb: 8 }
]

// ---- astrology systems ------------------------------------------------
//
// One configuration decides everything downstream: which zodiac the
// longitudes are measured in, which ayanamsa shifts them, which house system
// divides the sky, and which extra readings a tradition asks for. Nothing
// else in this file decides any of that for itself, so a system cannot end up
// half applied - sidereal planets in tropical houses, or a Whole Sign label
// over Placidus cusps.
//
// "current" is what this tab did before these systems existed - tropical
// longitudes, Whole Sign houses (or Equal, by the buttons that were already
// here). It is still here, unchanged, and still what the Whole Sign / Equal
// buttons apply to; it is no longer what a new session opens on.
//
// A session with nothing saved opens on Vedic / Jyotish: sidereal longitudes
// on the Lahiri ayanamsa, rashi (Whole Sign) houses, with nakshatras and the
// Vimshottari dasha. That is a real configuration, read by astroBuildChart
// like any other - the default names a system, it does not describe one.
//
// Anyone who has already chosen a system keeps it: the saved value arrives
// through calcOptionsArr (calc/calc.js) and importCalcOptions() assigns over
// this initial value, so it is only ever the starting point for somebody who
// has never chosen.

var ASTRO_DEFAULT_SYSTEM = "vedic"
var astroSystem = ASTRO_DEFAULT_SYSTEM // persisted through calcOptionsArr (calc/calc.js)

var astroSystems = [
	{
		// the key stays "current" - it is what saved preferences hold - while
		// the label just says what the configuration is
		key: "current", label: "Tropical · Whole Sign",
		zodiac: "tropical", ayanamsa: null,
		houses: "whole", housesLocked: false, // the Whole Sign / Equal buttons still apply
		extras: []
	},
	{
		key: "vedic", label: "Vedic / Jyotish",
		zodiac: "sidereal", ayanamsa: "lahiri",
		houses: "whole", housesLocked: true,   // rashi = whole sign
		housesLabel: "Whole Sign (rashi)",
		extras: ["nakshatra", "dasha"]
	},
	{
		key: "kp", label: "KP Astrology",
		zodiac: "sidereal", ayanamsa: "kp",
		houses: "placidus", housesLocked: true,
		extras: ["nakshatra", "sublord", "cuspal"]
	},
	{
		key: "hellenistic", label: "Hellenistic",
		zodiac: "tropical", ayanamsa: null,
		houses: "whole", housesLocked: true,
		extras: ["sect", "traditional", "fortune"]
	},
	{
		key: "western", label: "Western / Placidus",
		zodiac: "tropical", ayanamsa: null,
		houses: "placidus", housesLocked: true,
		extras: ["modern"]
	}
]

// An unknown key - a hand-edited or imported settings file, an older name -
// resolves to the default system rather than to whatever happens to be first
// in the list, and never to something half-configured.
function astroSystemConfig(key) {
	var want = key || astroSystem
	var i
	for (i = 0; i < astroSystems.length; i++) {
		if (astroSystems[i].key === want) return astroSystems[i]
	}
	for (i = 0; i < astroSystems.length; i++) {
		if (astroSystems[i].key === ASTRO_DEFAULT_SYSTEM) return astroSystems[i]
	}
	return astroSystems[0]
}

// The house system actually in force: the system's own, unless it leaves the
// choice open (only "current" does), where the Whole Sign / Equal buttons win.
function astroActiveHouseSystem(cfg) {
	var c = cfg || astroSystemConfig()
	return c.housesLocked ? c.houses : astroHouseSystem
}

function astroHouseLabel(sys) {
	if (sys === "placidus") return "Placidus"
	if (sys === "equal") return "Equal"
	if (sys === "porphyry") return "Porphyry"
	return "Whole Sign"
}

function astroHasExtra(name, cfg) {
	var c = cfg || astroSystemConfig()
	return c.extras.indexOf(name) > -1
}

// ---- maths helpers ----------------------------------------------------

var DEG = Math.PI / 180
function aSin(x) { return Math.sin(x * DEG) }
function aCos(x) { return Math.cos(x * DEG) }
function aRev(x) { return x - Math.floor(x / 360) * 360 } // normalise to 0-360
function aAtan2(y, x) { return aRev(Math.atan2(y, x) / DEG) }

// day number counted from 2000 Jan 0.0 TDT, with fractional UT hours
function astroDayNumber(y, m, D, ut) {
	var d = 367 * y
		- Math.floor(7 * (y + Math.floor((m + 9) / 12)) / 4)
		+ Math.floor(275 * m / 9) + D - 730530
	return d + ut / 24.0
}

// solve Kepler's equation, iterating for the eccentric orbits (Moon)
function astroEccentricAnomaly(M, e) {
	var E = M + (180 / Math.PI) * e * aSin(M) * (1 + e * aCos(M))
	if (e < 0.06) return E
	var E0, i = 0
	do {
		E0 = E
		E = E0 - (E0 - (180 / Math.PI) * e * aSin(E0) - M) / (1 - e * aCos(E0))
		i++
	} while (Math.abs(E - E0) > 0.0005 && i < 30)
	return E
}

// ---- element sets -----------------------------------------------------

function astroElements(body, d) {
	switch (body) {
		case "sun":     return { N: 0.0, i: 0.0, w: 282.9404 + 4.70935e-5 * d, a: 1.000000, e: 0.016709 - 1.151e-9 * d, M: 356.0470 + 0.9856002585 * d }
		case "moon":    return { N: 125.1228 - 0.0529538083 * d, i: 5.1454, w: 318.0634 + 0.1643573223 * d, a: 60.2666, e: 0.054900, M: 115.3654 + 13.0649929509 * d }
		case "mercury": return { N: 48.3313 + 3.24587e-5 * d, i: 7.0047 + 5.00e-8 * d, w: 29.1241 + 1.01444e-5 * d, a: 0.387098, e: 0.205635 + 5.59e-10 * d, M: 168.6562 + 4.0923344368 * d }
		case "venus":   return { N: 76.6799 + 2.46590e-5 * d, i: 3.3946 + 2.75e-8 * d, w: 54.8910 + 1.38374e-5 * d, a: 0.723330, e: 0.006773 - 1.302e-9 * d, M: 48.0052 + 1.6021302244 * d }
		case "mars":    return { N: 49.5574 + 2.11081e-5 * d, i: 1.8497 - 1.78e-8 * d, w: 286.5016 + 2.92961e-5 * d, a: 1.523688, e: 0.093405 + 2.516e-9 * d, M: 18.6021 + 0.5240207766 * d }
		case "jupiter": return { N: 100.4542 + 2.76854e-5 * d, i: 1.3030 - 1.557e-7 * d, w: 273.8777 + 1.64505e-5 * d, a: 5.20256, e: 0.048498 + 4.469e-9 * d, M: 19.8950 + 0.0830853001 * d }
		case "saturn":  return { N: 113.6634 + 2.38980e-5 * d, i: 2.4886 - 1.081e-7 * d, w: 339.3939 + 2.97661e-5 * d, a: 9.55475, e: 0.055546 - 9.499e-9 * d, M: 316.9670 + 0.0334442282 * d }
		case "uranus":  return { N: 74.0005 + 1.3978e-5 * d, i: 0.7733 + 1.9e-8 * d, w: 96.6612 + 3.0565e-5 * d, a: 19.18171 - 1.55e-8 * d, e: 0.047318 + 7.45e-9 * d, M: 142.5905 + 0.011725806 * d }
		case "neptune": return { N: 131.7806 + 3.0173e-5 * d, i: 1.7700 - 2.55e-7 * d, w: 272.8461 - 6.027e-6 * d, a: 30.05826 + 3.313e-8 * d, e: 0.008606 + 2.15e-9 * d, M: 260.2471 + 0.005995147 * d }
	}
	return null
}

// heliocentric rectangular ecliptic coordinates
function astroHelio(body, d) {
	var o = astroElements(body, d)
	var M = aRev(o.M)
	var E = astroEccentricAnomaly(M, o.e)
	var xv = o.a * (aCos(E) - o.e)
	var yv = o.a * Math.sqrt(1 - o.e * o.e) * aSin(E)
	var v = aAtan2(yv, xv)
	var r = Math.sqrt(xv * xv + yv * yv)
	var l = v + o.w
	return {
		x: r * (aCos(o.N) * aCos(l) - aSin(o.N) * aSin(l) * aCos(o.i)),
		y: r * (aSin(o.N) * aCos(l) + aCos(o.N) * aSin(l) * aCos(o.i)),
		z: r * (aSin(l) * aSin(o.i)),
		r: r, v: v, N: o.N, w: o.w, i: o.i, M: M
	}
}

function astroSunRect(d) {
	var o = astroElements("sun", d)
	var M = aRev(o.M)
	var E = astroEccentricAnomaly(M, o.e)
	var xv = aCos(E) - o.e
	var yv = Math.sqrt(1 - o.e * o.e) * aSin(E)
	var v = aAtan2(yv, xv)
	var r = Math.sqrt(xv * xv + yv * yv)
	var lon = aRev(v + o.w)
	return { x: r * aCos(lon), y: r * aSin(lon), r: r, lon: lon, M: M, w: o.w }
}

// geocentric ecliptic longitude of one body, degrees 0-360
function astroLongitude(body, d) {

	if (body === "sun") return astroSunRect(d).lon

	if (body === "moon") {
		var o = astroElements("moon", d)
		var Mm = aRev(o.M), Nm = aRev(o.N), wm = aRev(o.w)
		var E = astroEccentricAnomaly(Mm, o.e)
		var xv = o.a * (aCos(E) - o.e)
		var yv = o.a * Math.sqrt(1 - o.e * o.e) * aSin(E)
		var v = aAtan2(yv, xv)
		var r = Math.sqrt(xv * xv + yv * yv)
		var l = v + wm
		var xh = r * (aCos(Nm) * aCos(l) - aSin(Nm) * aSin(l) * aCos(o.i))
		var yh = r * (aSin(Nm) * aCos(l) + aCos(Nm) * aSin(l) * aCos(o.i))
		var lon = aAtan2(yh, xh)

		// perturbations: without these the Moon can be off by half a degree
		var sun = astroSunRect(d)
		var Ms = sun.M
		var Ls = aRev(Ms + sun.w)
		var Lm = aRev(Mm + wm + Nm)
		var Dm = aRev(Lm - Ls)          // mean elongation
		var F = aRev(Lm - Nm)           // argument of latitude

		lon += -1.274 * aSin(Mm - 2 * Dm)      // evection
		lon += +0.658 * aSin(2 * Dm)           // variation
		lon += -0.186 * aSin(Ms)               // yearly equation
		lon += -0.059 * aSin(2 * Mm - 2 * Dm)
		lon += -0.057 * aSin(Mm - 2 * Dm + Ms)
		lon += +0.053 * aSin(Mm + 2 * Dm)
		lon += +0.046 * aSin(2 * Dm - Ms)
		lon += +0.041 * aSin(Mm - Ms)
		lon += -0.035 * aSin(Dm)               // parallactic equation
		lon += -0.031 * aSin(Mm + Ms)
		lon += -0.015 * aSin(2 * F - 2 * Dm)
		lon += +0.011 * aSin(Mm - 4 * Dm)
		return aRev(lon)
	}

	if (body === "pluto") {
		// periodic series, heliocentric; only valid roughly 1800-2100
		var S = 50.03 + 0.033459652 * d
		var P = 238.95 + 0.003968789 * d
		var lonecl = 238.9508 + 0.00400703 * d
			- 19.799 * aSin(P) + 19.848 * aCos(P)
			+ 0.897 * aSin(2 * P) - 4.956 * aCos(2 * P)
			+ 0.610 * aSin(3 * P) + 1.211 * aCos(3 * P)
			- 0.341 * aSin(4 * P) - 0.190 * aCos(4 * P)
			+ 0.128 * aSin(5 * P) - 0.034 * aCos(5 * P)
			- 0.038 * aSin(6 * P) + 0.031 * aCos(6 * P)
			+ 0.020 * aSin(P - S) - 0.010 * aCos(P - S)
		var latecl = -3.9082
			- 5.453 * aSin(P) - 14.975 * aCos(P)
			+ 3.527 * aSin(2 * P) + 1.673 * aCos(2 * P)
			- 1.051 * aSin(3 * P) + 0.328 * aCos(3 * P)
			+ 0.179 * aSin(4 * P) - 0.292 * aCos(4 * P)
			+ 0.019 * aSin(5 * P) + 0.100 * aCos(5 * P)
			- 0.031 * aSin(6 * P) - 0.026 * aCos(6 * P)
			+ 0.011 * aCos(P - S)
		var rp = 40.72
			+ 6.68 * aSin(P) + 6.90 * aCos(P)
			- 1.18 * aSin(2 * P) - 0.03 * aCos(2 * P)
			+ 0.15 * aSin(3 * P) - 0.14 * aCos(3 * P)

		var xh = rp * aCos(lonecl) * aCos(latecl)
		var yh = rp * aSin(lonecl) * aCos(latecl)
		var s = astroSunRect(d)
		return aAtan2(yh + s.y, xh + s.x)
	}

	// remaining planets: heliocentric, then shifted to geocentric
	var p = astroHelio(body, d)
	var lonH = aAtan2(p.y, p.x)
	var latH = aAtan2(p.z, Math.sqrt(p.x * p.x + p.y * p.y))
	var rH = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z)

	// giant-planet perturbations
	if (body === "jupiter" || body === "saturn" || body === "uranus") {
		var Mj = aRev(astroElements("jupiter", d).M)
		var Msa = aRev(astroElements("saturn", d).M)
		var Mu = aRev(astroElements("uranus", d).M)
		if (body === "jupiter") {
			lonH += -0.332 * aSin(2 * Mj - 5 * Msa - 67.6)
			lonH += -0.056 * aSin(2 * Mj - 2 * Msa + 21)
			lonH += +0.042 * aSin(3 * Mj - 5 * Msa + 21)
			lonH += -0.036 * aSin(Mj - 2 * Msa)
			lonH += +0.022 * aCos(Mj - Msa)
			lonH += +0.023 * aSin(2 * Mj - 3 * Msa + 52)
			lonH += -0.016 * aSin(Mj - 5 * Msa - 69)
		} else if (body === "saturn") {
			lonH += +0.812 * aSin(2 * Mj - 5 * Msa - 67.6)
			lonH += -0.229 * aCos(2 * Mj - 4 * Msa - 2)
			lonH += +0.119 * aSin(Mj - 2 * Msa - 3)
			lonH += +0.046 * aSin(2 * Mj - 6 * Msa - 69)
			lonH += +0.014 * aSin(Mj - 3 * Msa + 32)
			latH += -0.020 * aCos(2 * Mj - 4 * Msa - 2)
			latH += +0.018 * aSin(2 * Mj - 6 * Msa - 49)
		} else {
			lonH += +0.040 * aSin(Msa - 2 * Mu + 6)
			lonH += +0.035 * aSin(Msa - 3 * Mu + 33)
			lonH += -0.015 * aSin(Mj - Mu + 20)
		}
	}

	var xh2 = rH * aCos(lonH) * aCos(latH)
	var yh2 = rH * aSin(lonH) * aCos(latH)
	var sun2 = astroSunRect(d)
	return aAtan2(yh2 + sun2.y, xh2 + sun2.x)
}

// ---- sidereal time, angles and houses ---------------------------------

// mean obliquity of the ecliptic
function astroObliquity(d) { return 23.4393 - 3.563e-7 * d }

// Local sidereal time in degrees. Derived from the Sun's mean longitude, which
// keeps it consistent with the element set used everywhere else here.
function astroLST(d, ut, lonEast) {
	var o = astroElements("sun", d)
	var Ls = aRev(o.M + o.w)      // Sun's mean longitude
	var GMST0 = aRev(Ls + 180)
	return aRev(GMST0 + ut * 15 + lonEast)
}

// ---- the sidereal zodiac ----------------------------------------------
//
// An ayanamsa is the gap between the tropical zodiac (measured from the
// equinox, which precesses) and a sidereal one (measured from a fixed
// star-based origin). Both models below are linear: an anchor value at J2000
// and the rate of precession. That is worth a few arcminutes over a century
// either side of 2000 and drifts further out beyond that - see the note the
// panel prints. It is not a substitute for a full precession model.

// Lahiri, the Indian standard: 23 deg 51' 11" at J2000, about 50.28" a year.
function astroAyanamsa(d) {
	return 23.8531 + (d / 365.25) * 0.0139659
}

// Krishnamurti, used by KP. Taken here as Lahiri less 5 arcminutes, the
// difference usually quoted between the two. The exact Krishnamurti constant
// is not reproduced, so a sub-lord boundary within about 5' of a planet may
// differ from KP software - the panel says so rather than implying otherwise.
var ASTRO_KP_OFFSET = 5 / 60
function astroAyanamsaKP(d) { return astroAyanamsa(d) - ASTRO_KP_OFFSET }

function astroAyanamsaFor(name, d) {
	if (name === "kp") return astroAyanamsaKP(d)
	if (name === "lahiri") return astroAyanamsa(d)
	return 0
}

function astroAyanamsaLabel(name) {
	if (name === "kp") return "Krishnamurti"
	if (name === "lahiri") return "Lahiri"
	return ""
}

// Moves a finished tropical chart into the sidereal zodiac, angles, cusps,
// house numbers and all. It used to take the ayanamsa off the longitudes and
// off the cusps and stop there, which left Whole Sign cusps sitting in the
// middle of signs and every planet still carrying its tropical house number.
// The cusps are now rebuilt from the sidereal Ascendant and the houses
// re-read from those, so the chart is sidereal all the way through.
function astroToSidereal(chart, ayanamsaName) {
	var name = ayanamsaName || "lahiri"
	var ayan = astroAyanamsaFor(name, chart.d)
	var out = {
		d: chart.d, ayanamsa: ayan, ayanamsaName: name, phase: chart.phase,
		plutoOutOfRange: chart.plutoOutOfRange, systemKey: chart.systemKey,
		bodies: [], aspects: chart.aspects, sidereal: true, zodiac: "sidereal",
		extra: chart.extra || {}
	}
	var i, b, lon, s
	for (i = 0; i < chart.bodies.length; i++) {
		b = chart.bodies[i]
		lon = aRev(b.lon - ayan)
		s = astroSignOf(lon)
		out.bodies.push({
			key: b.key, name: b.name, glyph: b.glyph, lon: lon, lonTropical: b.lon,
			sign: s.sign, signIdx: s.idx, deg: s.deg, min: s.min,
			retro: b.retro, speed: b.speed
		})
	}
	if (chart.houses) {
		var asc = aRev(chart.houses.asc - ayan)
		var mc = aRev(chart.houses.mc - ayan)
		var h = astroCusps(chart.houses.system, asc, mc, chart.houses.ramc,
			chart.houses.latitude, chart.houses.obliquity, ayan)
		out.houses = {
			asc: asc, mc: mc, cusps: h.cusps, system: h.system,
			asked: h.asked, undefinedHere: h.undefinedHere,
			ramc: chart.houses.ramc, obliquity: chart.houses.obliquity, latitude: chart.houses.latitude
		}
		out.ascSign = astroSignOf(asc)
		out.mcSign = astroSignOf(mc)
		for (i = 0; i < out.bodies.length; i++) {
			out.bodies[i].house = astroHouseOf(out.bodies[i].lon, out.houses.cusps)
		}
	}
	return out
}

// ---- angles and house cusps -------------------------------------------

// Ascendant and Midheaven in the tropical zodiac. RAMC is the right ascension
// of the MC, which equals local sidereal time.
function astroAngles(ramc, lat, ecl) {
	if (lat > 89.5) lat = 89.5      // tan(lat) diverges at the poles
	if (lat < -89.5) lat = -89.5
	return {
		mc: aAtan2(aSin(ramc), aCos(ramc) * aCos(ecl)),
		asc: aAtan2(aCos(ramc), -(aSin(ramc) * aCos(ecl) + Math.tan(lat * DEG) * aSin(ecl)))
	}
}

// the ecliptic longitude of the point on the ecliptic with this right ascension
function astroLonFromRA(ra, ecl) {
	return aAtan2(aSin(ra) / aCos(ecl), aCos(ra))
}

// One Placidus cusp. Placidus divides each degree's own day arc (or night
// arc) into three, so a cusp is the ecliptic point whose hour angle from the
// meridian is the given fraction of its own semi-arc. That is implicit - the
// semi-arc depends on the declination, which depends on the point - so it is
// solved by iteration from the equal-house guess.
//
// Returns null when the point never rises or sets at this latitude (the
// circumpolar case), where Placidus has no answer at all.
function astroPlacidusCusp(ramc, lat, ecl, offsetDeg, frac, nocturnal) {
	var ra = aRev(ramc + offsetDeg)
	var lon = astroLonFromRA(ra, ecl)
	for (var i = 0; i < 60; i++) {
		var dec = Math.asin(aSin(ecl) * aSin(lon)) / DEG
		var t = Math.tan(dec * DEG) * Math.tan(lat * DEG)
		if (!isFinite(t) || Math.abs(t) > 1) return null   // no rising: undefined here
		var ad = Math.asin(t) / DEG                        // ascensional difference
		var arc = nocturnal ? (90 - ad) : (90 + ad)        // semi-nocturnal / semi-diurnal
		var raNext = nocturnal ? aRev(ramc + 180 - frac * arc) : aRev(ramc + frac * arc)
		var move = Math.abs(aRev(raNext - ra + 180) - 180)
		ra = raNext
		lon = astroLonFromRA(ra, ecl)
		if (move < 1e-9) break
	}
	return lon
}

// Porphyry: the quadrants trisected in longitude. Defined at every latitude,
// which is why it is the fallback when Placidus is not - and it is named as
// itself in the UI rather than passed off as Placidus.
function astroPorphyryCusps(asc, mc) {
	var c = []
	var dayArc = aRev(asc - mc)                     // MC round to the Ascendant
	var nightArc = aRev(aRev(mc + 180) - asc)       // Ascendant round to the IC
	c[0] = aRev(asc)                                // 1st
	c[1] = aRev(asc + nightArc / 3)                 // 2nd
	c[2] = aRev(asc + 2 * nightArc / 3)             // 3rd
	c[3] = aRev(mc + 180)                           // 4th
	c[9] = aRev(mc)                                 // 10th
	c[10] = aRev(mc + dayArc / 3)                   // 11th
	c[11] = aRev(mc + 2 * dayArc / 3)               // 12th
	c[4] = aRev(c[10] + 180)                        // 5th opposes the 11th
	c[5] = aRev(c[11] + 180)
	c[6] = aRev(c[0] + 180)
	c[7] = aRev(c[1] + 180)
	c[8] = aRev(c[2] + 180)
	return c
}

// The twelve cusps for one house system, in whichever zodiac asc/mc are
// already expressed in. Sidereal callers pass sidereal angles and the
// ayanamsa, so quadrant cusps (which are derived from the equator, not the
// zodiac) are computed tropically and then shifted by the same amount as
// everything else. Nothing here mixes the two frames.
function astroCusps(system, asc, mc, ramc, lat, ecl, ayan) {
	var cusps = [], i
	var shift = ayan || 0

	if (system === "placidus") {
		var c11 = astroPlacidusCusp(ramc, lat, ecl, 30, 1 / 3, false)
		var c12 = astroPlacidusCusp(ramc, lat, ecl, 60, 2 / 3, false)
		var c2 = astroPlacidusCusp(ramc, lat, ecl, 120, 2 / 3, true)
		var c3 = astroPlacidusCusp(ramc, lat, ecl, 150, 1 / 3, true)
		if (c11 === null || c12 === null || c2 === null || c3 === null) {
			// circumpolar: say so, fall back to Porphyry, and keep the label
			return { cusps: astroPorphyryCusps(asc, mc), system: "porphyry", asked: "placidus", undefinedHere: true }
		}
		cusps[0] = asc
		cusps[1] = aRev(c2 - shift)
		cusps[2] = aRev(c3 - shift)
		cusps[3] = aRev(mc + 180)
		cusps[9] = mc
		cusps[10] = aRev(c11 - shift)
		cusps[11] = aRev(c12 - shift)
		cusps[4] = aRev(cusps[10] + 180)
		cusps[5] = aRev(cusps[11] + 180)
		cusps[6] = aRev(cusps[0] + 180)
		cusps[7] = aRev(cusps[1] + 180)
		cusps[8] = aRev(cusps[2] + 180)
		return { cusps: cusps, system: "placidus" }
	}

	if (system === "porphyry") {
		return { cusps: astroPorphyryCusps(asc, mc), system: "porphyry" }
	}

	if (system === "equal") {
		for (i = 0; i < 12; i++) cusps.push(aRev(asc + i * 30))
		return { cusps: cusps, system: "equal" }
	}

	// whole sign: house 1 is the whole sign holding the Ascendant
	var start = Math.floor(aRev(asc) / 30) * 30
	for (i = 0; i < 12; i++) cusps.push(aRev(start + i * 30))
	return { cusps: cusps, system: "whole" }
}

// Tropical angles and cusps in one call. Kept for callers that only ever
// wanted the old behaviour.
function astroHouses(ramc, lat, ecl, system) {
	var ang = astroAngles(ramc, lat, ecl)
	var h = astroCusps(system === "equal" ? "equal" : system, ang.asc, ang.mc, ramc, lat, ecl, 0)
	return {
		asc: ang.asc, mc: ang.mc, cusps: h.cusps, system: h.system,
		asked: h.asked, undefinedHere: h.undefinedHere
	}
}

function astroHouseOf(lon, cusps) {
	for (var i = 0; i < 12; i++) {
		var span = aRev(cusps[(i + 1) % 12] - cusps[i])
		if (span === 0) span = 360
		if (aRev(lon - cusps[i]) < span) return i + 1
	}
	return 1
}

// ---- chart assembly ---------------------------------------------------

function astroSignOf(lon) {
	var idx = Math.floor(aRev(lon) / 30)
	var within = aRev(lon) - idx * 30
	var deg = Math.floor(within)
	var min = Math.floor((within - deg) * 60)
	return { idx: idx, sign: astroSigns[idx], deg: deg, min: min, within: within }
}

function astroMoonPhase(sunLon, moonLon) {
	var elong = aRev(moonLon - sunLon)
	var illum = (1 - aCos(elong)) / 2 // 0 new, 1 full
	var name
	if (elong < 22.5 || elong >= 337.5) name = "New Moon"
	else if (elong < 67.5) name = "Waxing Crescent"
	else if (elong < 112.5) name = "First Quarter"
	else if (elong < 157.5) name = "Waxing Gibbous"
	else if (elong < 202.5) name = "Full Moon"
	else if (elong < 247.5) name = "Waning Gibbous"
	else if (elong < 292.5) name = "Last Quarter"
	else name = "Waning Crescent"
	return { name: name, elong: elong, illum: illum }
}

// ---- what each tradition adds -----------------------------------------
//
// Nakshatras, sub-lords and dashas are exact arithmetic on a sidereal
// longitude: no extra astronomy, so they are as accurate as the longitude
// and the ayanamsa they are built on. Sect, rulerships and the Lot of
// Fortune are likewise definitions rather than measurements.

// the 27 lunar mansions, 13 deg 20' each, from 0 deg sidereal Aries
var astroNakshatras = [
	"Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
	"Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
	"Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
	"Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
	"Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]

// Vimshottari order and lengths, 120 years in all. The same order and
// proportions divide a nakshatra into KP's sub-lords.
var astroDashaLords = [
	{ name: "Ketu", years: 7 }, { name: "Venus", years: 20 }, { name: "Sun", years: 6 },
	{ name: "Moon", years: 10 }, { name: "Mars", years: 7 }, { name: "Rahu", years: 18 },
	{ name: "Jupiter", years: 16 }, { name: "Saturn", years: 19 }, { name: "Mercury", years: 17 }
]

var ASTRO_NAK_SPAN = 360 / 27        // 13 deg 20'
var ASTRO_DASHA_TOTAL = 120

function astroNakshatraOf(lon) {
	var l = aRev(lon)
	var idx = Math.floor(l / ASTRO_NAK_SPAN)
	var within = l - idx * ASTRO_NAK_SPAN
	return {
		idx: idx,
		name: astroNakshatras[idx],
		lord: astroDashaLords[idx % 9].name,
		pada: Math.floor(within / (ASTRO_NAK_SPAN / 4)) + 1,
		within: within,
		fraction: within / ASTRO_NAK_SPAN          // how far through it
	}
}

// KP's sub-lord: the nakshatra is divided in the Vimshottari proportions,
// starting from its own lord. The sub-lord of a degree is the finest
// distinction KP works with.
function astroSubLordOf(lon) {
	var nak = astroNakshatraOf(lon)
	var start = nak.idx % 9
	var walked = 0
	for (var i = 0; i < 9; i++) {
		var lord = astroDashaLords[(start + i) % 9]
		var span = ASTRO_NAK_SPAN * lord.years / ASTRO_DASHA_TOTAL
		if (nak.within < walked + span || i === 8) {
			return { nakshatra: nak, star: nak.lord, sub: lord.name }
		}
		walked += span
	}
	return { nakshatra: nak, star: nak.lord, sub: nak.lord }
}

// day number back to a calendar date: day 1 is 2000 Jan 1, 00:00 UT
function astroDateFromDay(d) {
	return new Date(Date.UTC(1999, 11, 31) + d * 86400000)
}

function astroDashaDate(d) {
	var dt = astroDateFromDay(d)
	return dt.getUTCFullYear() + "-" + astroPad(dt.getUTCMonth() + 1) + "-" + astroPad(dt.getUTCDate())
}

// Vimshottari mahadashas from the Moon's nakshatra. The first period is
// however much of its lord's span the Moon had left at birth.
function astroVimshottari(moonLon, birthD, count) {
	var nak = astroNakshatraOf(moonLon)
	var startIdx = nak.idx % 9
	var first = astroDashaLords[startIdx]
	var remaining = first.years * (1 - nak.fraction)
	var out = []
	var at = birthD
	for (var i = 0; i < (count || 9); i++) {
		var lord = astroDashaLords[(startIdx + i) % 9]
		var years = (i === 0) ? remaining : lord.years
		var end = at + years * 365.25            // the conventional 365.25-day year
		out.push({ lord: lord.name, years: years, startD: at, endD: end, first: (i === 0) })
		at = end
	}
	return out
}

// Rulerships. The traditional set is the seven visible planets only - the
// outer three were not known and are not traditional rulers of anything.
var astroTraditionalRulers = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
	"Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"]
var astroModernRulers = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
	"Venus", "Pluto", "Jupiter", "Saturn", "Uranus", "Neptune"]

// A chart is diurnal when the Sun is above the horizon, which is the half of
// the wheel from the Descendant round to the Ascendant.
function astroSect(sunLon, asc) {
	var above = aRev(sunLon - asc) >= 180
	return {
		day: above,
		name: above ? "Day chart (diurnal)" : "Night chart (nocturnal)",
		light: above ? "Sun" : "Moon",
		benefic: above ? "Jupiter" : "Venus",
		malefic: above ? "Saturn" : "Mars"
	}
}

// Lot of Fortune, reckoned by sect as the Hellenistic authors do.
function astroLotOfFortune(asc, sunLon, moonLon, isDay) {
	return isDay ? aRev(asc + moonLon - sunLon) : aRev(asc + sunLon - moonLon)
}

// Full chart for a UTC moment. Pass loc to cast a birth chart:
//   { lat: degrees north, lon: degrees east,
//     system: "whole" | "equal" | "placidus" | "porphyry",
//     zodiac: "tropical" | "sidereal", ayanamsa: "lahiri" | "kp" }
//
// Everything downstream of the zodiac choice happens in that zodiac: the
// longitudes, the Ascendant, the cusps and the house each body falls in. A
// sidereal chart is not a tropical chart with the numbers moved afterwards.
function astroChart(y, m, D, ut, loc) {
	var d = astroDayNumber(y, m, D, ut)
	var step = 0.5 // half a day, enough to see direction of motion
	var sidereal = !!(loc && loc.zodiac === "sidereal")
	var ayan = sidereal ? astroAyanamsaFor(loc.ayanamsa || "lahiri", d) : 0
	var out = {
		d: d, bodies: [], aspects: [], plutoOutOfRange: (y < 1800 || y > 2100),
		zodiac: sidereal ? "sidereal" : "tropical",
		ayanamsa: sidereal ? ayan : 0,
		ayanamsaName: sidereal ? (loc.ayanamsa || "lahiri") : null,
		sidereal: sidereal
	}

	for (var i = 0; i < astroBodies.length; i++) {
		var b = astroBodies[i]
		var lonTrop = astroLongitude(b.key, d)
		var lon = aRev(lonTrop - ayan)          // the frame everything else uses
		var lonNext = astroLongitude(b.key, d + step)
		var motion = aRev(lonNext - lonTrop)
		if (motion > 180) motion -= 360 // signed daily motion
		var s = astroSignOf(lon)
		out.bodies.push({
			key: b.key, name: b.name, glyph: b.glyph,
			lon: lon, lonTropical: lonTrop,
			sign: s.sign, signIdx: s.idx, deg: s.deg, min: s.min,
			retro: (motion < 0), speed: motion / step
		})
	}

	out.phase = astroMoonPhase(out.bodies[0].lon, out.bodies[1].lon)

	// birth chart angles, only when a location was supplied
	if (loc && isFinite(loc.lat) && isFinite(loc.lon)) {
		var ecl = astroObliquity(d)
		var ramc = astroLST(d, ut, loc.lon)
		var ang = astroAngles(ramc, loc.lat, ecl)
		// the angles in this chart's own zodiac, before the cusps are built
		// from them - which is what keeps Whole Sign whole in either frame
		var asc = aRev(ang.asc - ayan)
		var mc = aRev(ang.mc - ayan)
		var h = astroCusps(loc.system || "whole", asc, mc, ramc, loc.lat, ecl, ayan)
		out.houses = {
			asc: asc, mc: mc, cusps: h.cusps, system: h.system,
			asked: h.asked, undefinedHere: h.undefinedHere,
			ramc: ramc, obliquity: ecl, latitude: loc.lat
		}
		out.ascSign = astroSignOf(asc)
		out.mcSign = astroSignOf(mc)
		for (var hb = 0; hb < out.bodies.length; hb++) {
			out.bodies[hb].house = astroHouseOf(out.bodies[hb].lon, out.houses.cusps)
		}
	}

	// aspect grid
	for (var a = 0; a < out.bodies.length; a++) {
		for (var b2 = a + 1; b2 < out.bodies.length; b2++) {
			var sep = Math.abs(aRev(out.bodies[a].lon - out.bodies[b2].lon))
			if (sep > 180) sep = 360 - sep
			for (var k = 0; k < astroAspects.length; k++) {
				var asp = astroAspects[k]
				var delta = Math.abs(sep - asp.ang)
				if (delta <= asp.orb) {
					out.aspects.push({
						a: out.bodies[a], b: out.bodies[b2],
						aspect: asp, orb: delta, exact: (delta < 1)
					})
					break
				}
			}
		}
	}
	out.aspects.sort(function (x, y2) { return x.orb - y2.orb })
	return out
}

// The chart for a selected system: the configuration decides the zodiac, the
// ayanamsa and the house system, and then adds whatever that tradition
// reads on top. This is the only place a system is turned into numbers.
function astroBuildChart(y, m, D, ut, loc, cfg) {
	var c = cfg || astroSystemConfig()
	var place = null
	if (loc && isFinite(loc.lat) && isFinite(loc.lon)) {
		place = {
			lat: loc.lat, lon: loc.lon,
			system: astroActiveHouseSystem(c),
			zodiac: c.zodiac, ayanamsa: c.ayanamsa
		}
	} else if (c.zodiac === "sidereal") {
		place = { zodiac: c.zodiac, ayanamsa: c.ayanamsa } // no angles, still sidereal
	}

	var chart = astroChart(y, m, D, ut, place)
	chart.systemKey = c.key
	chart.systemLabel = c.label
	chart.extra = {}

	var i, b
	if (astroHasExtra("nakshatra", c) || astroHasExtra("sublord", c)) {
		for (i = 0; i < chart.bodies.length; i++) {
			b = chart.bodies[i]
			b.nakshatra = astroNakshatraOf(b.lon)
			if (astroHasExtra("sublord", c)) b.sublord = astroSubLordOf(b.lon).sub
		}
	}

	if (astroHasExtra("dasha", c)) {
		var moon = chart.bodies[1]
		chart.extra.dasha = astroVimshottari(moon.lon, chart.d, 9)
		chart.extra.dashaFrom = moon.nakshatra
	}

	if (astroHasExtra("cuspal", c) && chart.houses) {
		chart.extra.cuspal = []
		for (i = 0; i < 12; i++) {
			var sl = astroSubLordOf(chart.houses.cusps[i])
			chart.extra.cuspal.push({
				house: i + 1, lon: chart.houses.cusps[i], sign: astroSignOf(chart.houses.cusps[i]),
				nakshatra: sl.nakshatra.name, star: sl.star, sub: sl.sub
			})
		}
	}

	if (astroHasExtra("sect", c) && chart.houses) {
		chart.extra.sect = astroSect(chart.bodies[0].lon, chart.houses.asc)
		if (astroHasExtra("fortune", c)) {
			var lot = astroLotOfFortune(chart.houses.asc, chart.bodies[0].lon, chart.bodies[1].lon, chart.extra.sect.day)
			chart.extra.fortune = {
				lon: lot, sign: astroSignOf(lot),
				house: astroHouseOf(lot, chart.houses.cusps)
			}
		}
	}

	if (astroHasExtra("traditional", c) || astroHasExtra("modern", c)) {
		var table = astroHasExtra("modern", c) ? astroModernRulers : astroTraditionalRulers
		chart.extra.rulerSet = astroHasExtra("modern", c) ? "modern" : "traditional"
		for (i = 0; i < chart.bodies.length; i++) {
			chart.bodies[i].ruler = table[chart.bodies[i].signIdx]
		}
		if (chart.houses) chart.extra.ascRuler = table[astroSignOf(chart.houses.asc).idx]
	}

	return chart
}

// The line printed under the dropdown. Built from the configuration and the
// chart it produced, so it cannot drift out of step with either.
function astroSystemInfoText(cfg, chart) {
	var c = cfg || astroSystemConfig()
	var parts = []
	if (c.zodiac === "sidereal") {
		var txt = "Sidereal · " + astroAyanamsaLabel(c.ayanamsa) + " ayanamsa"
		if (chart && chart.ayanamsa) {
			var a = astroSignOf(chart.ayanamsa)
			txt += " " + a.deg + "°" + astroPad(a.min) + "′"
		}
		parts.push(txt)
	} else {
		parts.push("Tropical")
	}
	var sys = astroActiveHouseSystem(c)
	var shown = (chart && chart.houses) ? chart.houses.system : sys
	var label = (c.housesLabel && shown === c.houses) ? c.housesLabel : astroHouseLabel(shown)
	if (chart && chart.houses && chart.houses.undefinedHere) {
		label = astroHouseLabel(shown) + " (Placidus undefined at this latitude)"
	}
	parts.push(label + " houses")
	return parts.join(" · ")
}

// ---- heliocentric positions (for the 3D view) -------------------------

// Bodies that actually orbit the Sun, in order outward. The Moon is drawn as a
// satellite of Earth rather than as its own orbit.
var astroOrbitBodies = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]

function astroPlutoHelio(d) {
	var S = 50.03 + 0.033459652 * d
	var P = 238.95 + 0.003968789 * d
	var lonecl = 238.9508 + 0.00400703 * d
		- 19.799 * aSin(P) + 19.848 * aCos(P)
		+ 0.897 * aSin(2 * P) - 4.956 * aCos(2 * P)
		+ 0.610 * aSin(3 * P) + 1.211 * aCos(3 * P)
		- 0.341 * aSin(4 * P) - 0.190 * aCos(4 * P)
		+ 0.128 * aSin(5 * P) - 0.034 * aCos(5 * P)
		- 0.038 * aSin(6 * P) + 0.031 * aCos(6 * P)
		+ 0.020 * aSin(P - S) - 0.010 * aCos(P - S)
	var latecl = -3.9082
		- 5.453 * aSin(P) - 14.975 * aCos(P)
		+ 3.527 * aSin(2 * P) + 1.673 * aCos(2 * P)
		- 1.051 * aSin(3 * P) + 0.328 * aCos(3 * P)
		+ 0.179 * aSin(4 * P) - 0.292 * aCos(4 * P)
		+ 0.019 * aSin(5 * P) + 0.100 * aCos(5 * P)
		- 0.031 * aSin(6 * P) - 0.026 * aCos(6 * P)
		+ 0.011 * aCos(P - S)
	var r = 40.72
		+ 6.68 * aSin(P) + 6.90 * aCos(P)
		- 1.18 * aSin(2 * P) - 0.03 * aCos(2 * P)
		+ 0.15 * aSin(3 * P) - 0.14 * aCos(3 * P)
	return {
		x: r * aCos(lonecl) * aCos(latecl),
		y: r * aSin(lonecl) * aCos(latecl),
		z: r * aSin(latecl)
	}
}

function astroHelioPos(body, d) {
	if (body === "earth") { // Earth sits opposite the Sun as seen from Earth
		var s = astroSunRect(d)
		return { x: -s.x, y: -s.y, z: 0 }
	}
	if (body === "pluto") return astroPlutoHelio(d)
	var p = astroHelio(body, d)
	return { x: p.x, y: p.y, z: p.z }
}

// Sample a full orbit by sweeping mean anomaly, keeping the other elements
// fixed. Good enough to draw the ellipse in the right plane and orientation.
function astroOrbitPath(body, d, steps) {
	var pts = [], i
	if (body === "pluto") { // no elements, sweep its own periodic argument
		for (i = 0; i <= steps; i++) {
			pts.push(astroPlutoHelio(d + (i / steps) * 90000)) // ~248 year period
		}
		return pts
	}
	var src = (body === "earth") ? "sun" : body
	var o = astroElements(src, d)
	for (i = 0; i <= steps; i++) {
		var M = (i / steps) * 360
		var E = astroEccentricAnomaly(M, o.e)
		var xv = o.a * (aCos(E) - o.e)
		var yv = o.a * Math.sqrt(1 - o.e * o.e) * aSin(E)
		var v = aAtan2(yv, xv)
		var r = Math.sqrt(xv * xv + yv * yv)
		var l = v + o.w
		var pt = {
			x: r * (aCos(o.N) * aCos(l) - aSin(o.N) * aSin(l) * aCos(o.i)),
			y: r * (aSin(o.N) * aCos(l) + aCos(o.N) * aSin(l) * aCos(o.i)),
			z: r * (aSin(l) * aSin(o.i))
		}
		if (body === "earth") { pt.x = -pt.x; pt.y = -pt.y; pt.z = 0 }
		pts.push(pt)
	}
	return pts
}

// ---- UI ---------------------------------------------------------------

// ---- chart visualiser -------------------------------------------------

var astroViewMode = "2d"      // "2d" wheel or "3d" solar system
var astroAzimuth = -35        // 3D camera, degrees
var astroElevation = 62
var astroZoom = 1        // 3D camera distance, 1 fits Pluto's orbit
var astroZoomMin = 0.45
var astroZoomMax = 2400  // close enough for a moon system to separate on screen

// The camera looks at one body: the Sun to begin with, a planet or a moon
// once one is picked. Everything is drawn relative to this point, so zooming
// and orbiting happen around whatever is selected rather than around the Sun.
var astroTarget = "sun"        // what the camera is centred on
var astroSelected = null       // what is highlighted and described, if anything
var astroCamFrom = null        // the target being eased away from, while a move runs
var astroCamT0 = 0
var astroCamDur = 0
var astroRaf = null
var astroHitItems = []         // what is on screen now, for clicks and taps
var astroResizeObs = null

function astroReducedMotion() {
	return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
}

// "2d" the wheel, "3d" the solar map, "flat" the zetetic map. Each keeps its
// own view state - the solar map its camera, the flat map its pan and zoom -
// so switching between them leaves both as they were, and leaves the chart,
// the birth data and the astrology system alone entirely.
// Both of this panel's settings ride in the shared settings blob, which can
// be exported to a file, sent to somebody and imported by them. The importer
// only checks that a name is one it knows, not what the value is, so a value
// arriving here can be anything at all. The system falls back safely on its
// own (astroSystemConfig returns a known configuration), and this does the
// same for the view: an unknown mode would otherwise be pasted into a jQuery
// selector and throw, taking the panel down with it.
function astroViewSafe(mode) {
	return (mode === "3d" || mode === "flat") ? mode : "2d"
}

function astroSetView(mode) {
	mode = astroViewSafe(mode)
	astroViewMode = mode
	$(".astroViewBtn").removeClass("astroViewOn").attr("aria-pressed", "false")
	$("#astroView" + (mode === "flat" ? "Flat" : mode.toUpperCase())).addClass("astroViewOn").attr("aria-pressed", "true")
	$("#astroDragHint").toggleClass("hideValue", mode !== "3d")
	$("#feHint").toggleClass("hideValue", mode !== "flat")
	$("#feControls").toggleClass("hideValue", mode !== "flat")
	if (mode !== "flat") { feAboutOpen = false; $("#feAbout").addClass("hideValue") }
	$("#astroSelInfo").toggleClass("hideValue", mode === "2d")
	var cvs = document.getElementById("astroCanvas")
	// the two interactive maps take the drag; over the wheel the page
	// scrolls as it does anywhere else
	if (cvs !== null) cvs.style.touchAction = (mode === "2d") ? "auto" : "none"
	if (cvs !== null) {
		cvs.setAttribute("aria-label", mode === "flat"
			? "Flat Earth / Zetetic map, a historical geocentric model. Drag to pan, pinch or scroll to zoom, tap an object to select it."
			: (mode === "3d" ? "Solar system map. Tap a planet to follow it." : "Birth chart wheel."))
	}
	if (typeof feSyncControls === "function") feSyncControls()
	astroRenderSelection()
	drawAstroVisual()
}

function astroSetZoom(z) {
	astroZoom = Math.max(astroZoomMin, Math.min(astroZoomMax, z))
	var lbl = document.getElementById("astroZoomLabel")
	if (lbl !== null) lbl.textContent = (astroZoom < 10 ? astroZoom.toFixed(2) : Math.round(astroZoom)) + "x"
	drawAstroVisual()
}

function astroZoomBy(factor) { astroSetZoom(astroZoom * factor) }

function astroResetView() {
	astroZoom = 1; astroAzimuth = -35; astroElevation = 62
	astroSelect(null)          // back to the system, centred on the Sun
	astroSetZoom(1)
}

// Wheel zoom needs a native, explicitly non-passive listener. Browsers treat
// wheel handlers registered through jQuery's delegation as passive, so
// preventDefault() is ignored there and the page scrolls behind the zoom.
function astroBindCanvasWheel() {
	var cvs = document.getElementById("astroCanvas")
	if (cvs === null || cvs.dataset.wheelBound === "1") return
	cvs.addEventListener("wheel", function (e) {
		if (astroViewMode === "2d") return
		e.preventDefault()
		e.stopPropagation()
		var f = (e.deltaY < 0) ? 1.12 : 1 / 1.12
		if (astroViewMode === "flat") feZoomBy(f)
		else astroSetZoom(astroZoom * f)
	}, { passive: false })
	cvs.dataset.wheelBound = "1"

	astroBindCanvasPointer(cvs)
	astroBindCanvasResize(cvs)
}

// ---- pointer input: mouse, pen and touch through one path --------------
//
// The canvas used to listen for mousedown only, while its CSS told the
// browser not to scroll over it - so on a phone the solar view could not be
// rotated, zoomed or scrolled past. Pointer events cover all three devices;
// two fingers pinch; a short press without movement is a tap, which selects.
function astroBindCanvasPointer(cvs) {
	if (cvs === null || cvs.dataset.pointerBound === "1") return
	var pts = {}           // live pointers by id
	var lastX = 0, lastY = 0, startX = 0, startY = 0, startT = 0, moved = 0
	var pinchFrom = 0

	function count() { return Object.keys(pts).length }
	function spread() {
		var ids = Object.keys(pts)
		if (ids.length < 2) return 0
		var a = pts[ids[0]], b = pts[ids[1]]
		return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y))
	}

	// what a drag means depends on the view: the solar map orbits, the flat
	// map pans. Neither is offered on the wheel, which is not interactive.
	function interactive() { return astroViewMode === "3d" || astroViewMode === "flat" }

	cvs.addEventListener("pointerdown", function (e) {
		if (!interactive()) return
		pts[e.pointerId] = { x: e.clientX, y: e.clientY }
		if (cvs.setPointerCapture) { try { cvs.setPointerCapture(e.pointerId) } catch (err) { /* older browser */ } }
		lastX = e.clientX; lastY = e.clientY
		startX = e.clientX; startY = e.clientY; startT = Date.now(); moved = 0
		if (count() === 2) pinchFrom = spread()
		e.preventDefault()
	})

	cvs.addEventListener("pointermove", function (e) {
		if (!interactive() || !pts[e.pointerId]) return
		pts[e.pointerId] = { x: e.clientX, y: e.clientY }
		if (count() >= 2) {
			var now = spread()
			if (pinchFrom > 0 && now > 0) {
				var f = now / pinchFrom
				if (astroViewMode === "flat") feZoomBy(f)
				else astroSetZoom(astroZoom * f)
				pinchFrom = now
			}
			moved += 10
			e.preventDefault()
			return
		}
		var dx = e.clientX - lastX, dy = e.clientY - lastY
		moved += Math.abs(dx) + Math.abs(dy)
		if (astroViewMode === "flat") {
			// a flat map pans; there is nothing to orbit
			fePanBy(dx, dy, feZoom * (Math.min(cvs.clientWidth, cvs.clientHeight) / 2 - 14))
		} else {
			astroAzimuth += dx * 0.5
			astroElevation = Math.max(2, Math.min(90, astroElevation + dy * 0.4))
			drawAstroVisual()
		}
		lastX = e.clientX; lastY = e.clientY
		e.preventDefault()
	})

	function release(e) {
		if (!pts[e.pointerId]) return
		delete pts[e.pointerId]
		if (count() < 2) pinchFrom = 0
		if (!interactive()) return
		// a tap, not a drag: pick whatever is under it
		if (moved < 8 && (Date.now() - startT) < 500 && count() === 0) {
			var r = cvs.getBoundingClientRect()
			if (astroViewMode === "flat") feTap(startX - r.left, startY - r.top)
			else astroCanvasTap(startX - r.left, startY - r.top)
		}
	}
	cvs.addEventListener("pointerup", release)
	cvs.addEventListener("pointercancel", release)
	cvs.dataset.pointerBound = "1"
}

// The canvas is sized in CSS (a percentage width), so its backing store has
// to follow its real size or the drawing is stretched and blurred. Watching
// the element covers a window resize, a phone turning and the panel changing
// width, and a redraw keeps the zoom, camera target, selection and system
// exactly as they were - it is the same state, drawn at the new size.
function astroBindCanvasResize(cvs) {
	if (cvs === null || typeof ResizeObserver === "undefined") return
	if (astroResizeObs !== null) astroResizeObs.disconnect()
	var pending = false
	astroResizeObs = new ResizeObserver(function () {
		if (pending) return
		pending = true
		window.requestAnimationFrame(function () { pending = false; drawAstroVisual() })
	})
	astroResizeObs.observe(cvs)
}

function astroStopVisual() {
	if (astroRaf !== null) { window.cancelAnimationFrame(astroRaf); astroRaf = null }
	if (astroResizeObs !== null) { astroResizeObs.disconnect(); astroResizeObs = null }
	astroHitItems = []
	astroCamFrom = null
	// the flat map's own leavings go too, if that file is loaded
	if (typeof feHit !== "undefined") { feHit = []; feAnimFrom = null }
}

function astroCanvasSetup() {
	var cvs = document.getElementById("astroCanvas")
	if (cvs === null) return null
	var dpr = window.devicePixelRatio || 1
	var cw = cvs.clientWidth || 520
	var ch = cvs.clientHeight || 460
	var bw = Math.max(1, Math.round(cw * dpr))
	var bh = Math.max(1, Math.round(ch * dpr))
	if (cvs.width !== bw) cvs.width = bw      // assigning always clears, so only when it changed
	if (cvs.height !== bh) cvs.height = bh
	var c = cvs.getContext("2d")
	c.setTransform(dpr, 0, 0, dpr, 0, 0)
	c.clearRect(0, 0, cw, ch)
	return { ctx: c, w: cw, h: ch }
}

function drawAstroVisual() {
	var s = astroCanvasSetup()
	if (s === null || astroLastChart === null) return
	if (astroViewMode === "3d") drawAstroChart3D(s.ctx, s.w, s.h, astroLastChart)
	else if (astroViewMode === "flat" && typeof drawAstroChartFlat === "function") {
		drawAstroChartFlat(s.ctx, s.w, s.h, astroLastChart)
		feSyncControls()
	}
	else drawAstroChart2D(s.ctx, s.w, s.h, astroLastChart)
}

function astroCssVar(name, fallback) {
	var v = getComputedStyle(document.documentElement).getPropertyValue(name)
	return (v && v.trim()) ? v.trim() : fallback
}

// The wheel is drawn the traditional way: Ascendant at the left, longitude
// increasing anticlockwise so house 1 falls below the horizon line.
function astroWheelAngle(lon, rotation) { return 180 + (lon - rotation) }

function astroPolar(cx, cy, r, angDeg) {
	return { x: cx + r * aCos(angDeg), y: cy - r * aSin(angDeg) }
}

function drawAstroChart2D(c, w, h, chart) {
	var cx = w / 2, cy = h / 2
	var R = Math.min(w, h) / 2 - 12
	var rSignOuter = R
	var rSignInner = R * 0.84
	var rHouse = R * 0.66
	var rPlanet = R * 0.74
	var rAspect = R * 0.62

	var rotation = chart.houses ? chart.houses.asc : 0
	var faint = astroCssVar("--border-dark-accent", "#3a3a3a")
	var line = astroCssVar("--separator-accent2", "#555")
	var text = astroCssVar("--font-white-2", "#d0d0d0")
	var dim = astroCssVar("--font-white-3", "#999")

	c.lineWidth = 1

	// zodiac ring
	c.strokeStyle = line
	;[rSignOuter, rSignInner, rHouse].forEach(function (r) {
		c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke()
	})

	for (var s = 0; s < 12; s++) {
		var a0 = astroWheelAngle(s * 30, rotation)
		var p0 = astroPolar(cx, cy, rSignInner, a0)
		var p1 = astroPolar(cx, cy, rSignOuter, a0)
		c.strokeStyle = line
		c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.stroke()

		var mid = astroWheelAngle(s * 30 + 15, rotation)
		var pm = astroPolar(cx, cy, (rSignInner + rSignOuter) / 2, mid)
		c.fillStyle = astroSignColor(s)
		c.font = "16px " + astroCssVar("--font-family", "sans-serif") + ", sans-serif"
		c.textAlign = "center"; c.textBaseline = "middle"
		c.fillText(astroSigns[s].glyph, pm.x, pm.y)
	}

	// house cusps
	if (chart.houses) {
		for (var hI = 0; hI < 12; hI++) {
			var ha = astroWheelAngle(chart.houses.cusps[hI], rotation)
			var q0 = astroPolar(cx, cy, rAspect, ha)
			var q1 = astroPolar(cx, cy, rSignInner, ha)
			var angular = (hI % 3 === 0)
			c.strokeStyle = angular ? line : faint
			c.lineWidth = angular ? 1.6 : 1
			c.beginPath(); c.moveTo(q0.x, q0.y); c.lineTo(q1.x, q1.y); c.stroke()

			var lm = astroWheelAngle(chart.houses.cusps[hI] + 15, rotation)
			var pl = astroPolar(cx, cy, (rAspect + rHouse) / 2, lm)
			c.fillStyle = dim
			c.font = "10px sans-serif"
			c.fillText(String(hI + 1), pl.x, pl.y)
		}
		c.lineWidth = 1

		// Ascendant marker
		var ap = astroPolar(cx, cy, rSignOuter, 180)
		c.strokeStyle = astroCssVar("--focus-outline", "#bbb")
		c.lineWidth = 2
		c.beginPath(); c.moveTo(cx - rAspect, cy); c.lineTo(ap.x - 2, ap.y); c.stroke()
		c.fillStyle = astroCssVar("--focus-outline", "#bbb")
		c.font = "10px sans-serif"; c.textAlign = "left"
		c.fillText("ASC", cx - rSignOuter + 2, cy - 8)
		c.lineWidth = 1
	}

	// aspect lines
	for (var k = 0; k < chart.aspects.length; k++) {
		var asp = chart.aspects[k]
		var pa = astroPolar(cx, cy, rAspect, astroWheelAngle(asp.a.lon, rotation))
		var pb = astroPolar(cx, cy, rAspect, astroWheelAngle(asp.b.lon, rotation))
		c.strokeStyle = astroAspectColor(asp.aspect.ang)
		c.globalAlpha = asp.exact ? 0.85 : 0.4
		c.beginPath(); c.moveTo(pa.x, pa.y); c.lineTo(pb.x, pb.y); c.stroke()
	}
	c.globalAlpha = 1

	// planets, nudged apart when they stack up
	var placed = []
	for (var i = 0; i < chart.bodies.length; i++) {
		var b = chart.bodies[i]
		var ang = astroWheelAngle(b.lon, rotation)
		var rr = rPlanet
		for (var t = 0; t < placed.length; t++) {
			if (Math.abs(aRev(placed[t].ang - ang + 180) - 180) < 7 && Math.abs(placed[t].r - rr) < 12) {
				rr -= 15; t = -1
			}
		}
		placed.push({ ang: ang, r: rr })

		var tick0 = astroPolar(cx, cy, rHouse, ang)
		var tick1 = astroPolar(cx, cy, rHouse + 6, ang)
		c.strokeStyle = astroSignColor(b.signIdx)
		c.beginPath(); c.moveTo(tick0.x, tick0.y); c.lineTo(tick1.x, tick1.y); c.stroke()

		var pp = astroPolar(cx, cy, rr, ang)
		c.fillStyle = b.retro ? astroCssVar("--font-white-3", "#aaa") : text
		c.font = "15px sans-serif"
		c.textAlign = "center"; c.textBaseline = "middle"
		c.fillText(b.glyph, pp.x, pp.y)
		if (b.retro) {
			c.font = "8px sans-serif"
			c.fillText("R", pp.x + 9, pp.y + 7)
		}
	}

	// centre readout
	c.fillStyle = dim
	c.font = "10px sans-serif"; c.textAlign = "center"
	c.fillText(chart.phase.name, cx, cy - 6)
	c.fillText((chart.phase.illum * 100).toFixed(0) + "%", cx, cy + 7)
}

function astroAspectColor(ang) {
	if (ang === 0) return "hsl(45 70% 60%)"
	if (ang === 60) return "hsl(190 60% 58%)"
	if (ang === 90) return "hsl(5 65% 58%)"
	if (ang === 120) return "hsl(140 50% 55%)"
	return "hsl(280 50% 62%)"
}

// ---- the moons ---------------------------------------------------------
//
// The supported set: the Moon, both of Mars', Jupiter's four Galilean moons
// and Amalthea, Saturn's eight largest, Uranus' five major moons, Neptune's
// Triton and Proteus, and Pluto's Charon. That is 23 of the several hundred
// known satellites - the ones large enough to matter at this scale - and not
// a claim to be the full catalogue.
//
// Names, parents, orbital radii (semi-major axis, km) and sidereal periods
// (days) are the published values. POSITIONS ARE NOT: a moon is placed by
// mean circular motion at its real period, which gives the right ordering,
// spacing and speed but not an ephemeris position. The panel says so, and
// nothing here pretends otherwise.
var ASTRO_AU_KM = 149597870.7

var astroMoons = [
	{ name: "Moon", parent: "earth", a: 384400, period: 27.3217 },
	{ name: "Phobos", parent: "mars", a: 9376, period: 0.31891 },
	{ name: "Deimos", parent: "mars", a: 23463, period: 1.26244 },
	{ name: "Amalthea", parent: "jupiter", a: 181400, period: 0.49818 },
	{ name: "Io", parent: "jupiter", a: 421700, period: 1.76914 },
	{ name: "Europa", parent: "jupiter", a: 671034, period: 3.55118 },
	{ name: "Ganymede", parent: "jupiter", a: 1070412, period: 7.15455 },
	{ name: "Callisto", parent: "jupiter", a: 1882709, period: 16.6890 },
	{ name: "Mimas", parent: "saturn", a: 185540, period: 0.94242 },
	{ name: "Enceladus", parent: "saturn", a: 238040, period: 1.37022 },
	{ name: "Tethys", parent: "saturn", a: 294670, period: 1.88780 },
	{ name: "Dione", parent: "saturn", a: 377420, period: 2.73692 },
	{ name: "Rhea", parent: "saturn", a: 527070, period: 4.51821 },
	{ name: "Titan", parent: "saturn", a: 1221870, period: 15.9454 },
	{ name: "Hyperion", parent: "saturn", a: 1481010, period: 21.2766 },
	{ name: "Iapetus", parent: "saturn", a: 3560820, period: 79.3215 },
	{ name: "Miranda", parent: "uranus", a: 129390, period: 1.41348 },
	{ name: "Ariel", parent: "uranus", a: 191020, period: 2.52038 },
	{ name: "Umbriel", parent: "uranus", a: 266000, period: 4.14418 },
	{ name: "Titania", parent: "uranus", a: 435910, period: 8.70587 },
	{ name: "Oberon", parent: "uranus", a: 583520, period: 13.4632 },
	{ name: "Proteus", parent: "neptune", a: 117647, period: 1.12231 },
	{ name: "Triton", parent: "neptune", a: 354759, period: 5.87685, retrograde: true },
	{ name: "Charon", parent: "pluto", a: 19591, period: 6.3872 }
]

function astroMoonsOf(planetKey) {
	var out = []
	for (var i = 0; i < astroMoons.length; i++) {
		if (astroMoons[i].parent === planetKey) out.push(astroMoons[i])
	}
	return out
}

// Schematic offset from the parent, in AU. Circular, in the ecliptic plane,
// advanced at the moon's real period - enough to show which moon is which
// and how the system is arranged, and no more than that.
function astroMoonOffset(moon, d) {
	var turns = d / moon.period * (moon.retrograde ? -1 : 1)
	var ang = aRev(turns * 360)
	var r = moon.a / ASTRO_AU_KM
	return { x: r * aCos(ang), y: r * aSin(ang), z: 0, r: r }
}

// Orthographic solar system. Distances are compressed with a power curve or
// Mercury would be a single pixel next to Pluto.
var ASTRO_COMPRESS_P = 0.42
function astroCompress(r) { return Math.pow(r, ASTRO_COMPRESS_P) }

// Rotation only: the camera's azimuth and elevation, no compression. Used
// for the short distances inside a moon system, where compressing from the
// Sun would squash the orbits sideways.
function astroRotate(p) {
	var az = astroAzimuth * DEG, el = astroElevation * DEG
	var x1 = p.x * Math.cos(az) - p.y * Math.sin(az)
	var y1 = p.x * Math.sin(az) + p.y * Math.cos(az)
	return {
		x: x1,
		y: y1 * Math.cos(el) - p.z * Math.sin(el),
		depth: y1 * Math.sin(el) + p.z * Math.cos(el)
	}
}

function astroProjectRaw(p) {
	var r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z)
	var k = (r === 0) ? 0 : astroCompress(r) / r
	return astroRotate({ x: p.x * k, y: p.y * k, z: p.z * k })
}

// Near a planet, the compression behaves like a plain scale factor; this is
// it, so a moon orbit keeps its shape instead of being flattened towards
// the Sun.
function astroLocalFactor(parentDist) {
	if (!(parentDist > 0)) return 1
	return Math.pow(parentDist, ASTRO_COMPRESS_P - 1)
}

// Everything is drawn relative to the camera's target, so the target stays
// in the middle of the canvas while the rest of the system turns and scales
// around it.
function astroProject(p, cx, cy, scale) {
	var c = astroCamCentreRaw()
	var q = astroProjectRaw(p)
	return { x: cx + (q.x - c.x) * scale, y: cy - (q.y - c.y) * scale, depth: q.depth }
}

// ---- one description of the sky, for any renderer ----------------------
//
// The wheel, the solar map and the flat map all draw the same bodies. This
// is that list, built once from the chart the selected astrology system
// produced, so none of them works out a position for itself. A renderer adds
// whatever it needs on top (the solar map wants heliocentric coordinates,
// the flat map wants the point on the ground each body stands over) but the
// identities, zodiac longitudes and signs all come from here.
function astroCelestialObjects(chart) {
	var out = []
	if (!chart) return out
	for (var i = 0; i < chart.bodies.length; i++) {
		var b = chart.bodies[i]
		out.push({
			id: b.key,
			name: b.name,
			type: (b.key === "sun") ? "star" : (b.key === "moon" ? "moon" : "planet"),
			glyph: b.glyph,
			lon: b.lon,                 // in the chart's own zodiac
			lonTropical: b.lonTropical, // what the sky measures, before any ayanamsa
			sign: b.sign,
			signIdx: b.signIdx,
			deg: b.deg,
			min: b.min,
			retro: b.retro,
			speed: b.speed,
			house: b.house,
			nakshatra: b.nakshatra,
			label: b.name + " " + b.deg + "° " + b.sign.name + (b.retro ? " Rx" : "")
		})
	}
	return out
}

// ---- the camera target -------------------------------------------------

// Where a target sits, in heliocentric AU. A moon is its parent plus its
// schematic offset, so focusing a moon really does move the camera to it.
function astroBodyPos(key, d) {
	if (key === "sun" || !key) return { x: 0, y: 0, z: 0 }
	if (astroOrbitBodies.indexOf(key) > -1) return astroHelioPos(key, d)
	for (var i = 0; i < astroMoons.length; i++) {
		if (astroMoons[i].name.toLowerCase() === String(key).toLowerCase()) {
			var p = astroHelioPos(astroMoons[i].parent, d)
			var off = astroMoonOffset(astroMoons[i], d)
			return { x: p.x + off.x, y: p.y + off.y, z: p.z + off.z }
		}
	}
	return { x: 0, y: 0, z: 0 }
}

// Where a target lands on the projected map, before the zoom scale is
// applied. A moon has to be placed the same way the drawing places it -
// against its parent, on the local scale - or the camera would centre on a
// point a little away from the moon the eye can see.
function astroRawOf(key, d) {
	if (!key || key === "sun") return astroProjectRaw({ x: 0, y: 0, z: 0 })
	for (var i = 0; i < astroMoons.length; i++) {
		var m = astroMoons[i]
		if (m.name.toLowerCase() !== String(key).toLowerCase()) continue
		var pp = astroHelioPos(m.parent, d)
		var raw = astroProjectRaw(pp)
		var dist = Math.sqrt(pp.x * pp.x + pp.y * pp.y + pp.z * pp.z)
		var rot = astroRotate(astroMoonOffset(m, d))
		var f = astroLocalFactor(dist)
		return { x: raw.x + rot.x * f, y: raw.y + rot.y * f, depth: raw.depth }
	}
	return astroProjectRaw(astroBodyPos(key, d))
}

// The point the camera is looking at right now, easing between the old
// target and the new one while a move is running. Both ends are recomputed
// every frame, so a move still works while the map is being turned.
function astroCamCentreRaw() {
	var d = astroLastChart ? astroLastChart.d : 0
	var to = astroRawOf(astroTarget, d)
	if (astroCamFrom === null || astroCamDur <= 0) return to
	var t = (Date.now() - astroCamT0) / astroCamDur
	if (t >= 1) { astroCamFrom = null; return to }
	var e = 1 - Math.pow(1 - t, 3)          // ease out, no overshoot
	var from = astroRawOf(astroCamFrom, d)
	return { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, depth: to.depth }
}

// Moves the camera without jumping. Reduced motion gets the same move with
// no animation at all rather than losing the feature.
function astroFocus(key) {
	var was = astroTarget
	astroTarget = key || "sun"
	if (astroReducedMotion() || was === astroTarget) {
		astroCamFrom = null; astroCamDur = 0; drawAstroVisual(); return
	}
	astroCamFrom = was          // the target we are leaving, eased from
	astroCamT0 = Date.now()
	astroCamDur = 420
	astroAnimate()
}

function astroAnimate() {
	if (astroRaf !== null) return
	var step = function () {
		astroRaf = null
		drawAstroVisual()
		if (astroCamFrom !== null) astroRaf = window.requestAnimationFrame(step)
	}
	astroRaf = window.requestAnimationFrame(step)
}

// Selecting is what a click does: highlight it, describe it, and look at it.
function astroSelect(key) {
	astroSelected = key || null
	astroFocus(key || "sun")
	astroRenderSelection()
}

function astroSelectionDetail(key) {
	if (!key) return ""
	var d = astroLastChart ? astroLastChart.d : 0
	var i
	for (i = 0; i < astroMoons.length; i++) {
		var m = astroMoons[i]
		if (m.name.toLowerCase() !== String(key).toLowerCase()) continue
		var parent = m.parent.charAt(0).toUpperCase() + m.parent.slice(1)
		return m.name + " — moon of " + parent + " · " +
			m.a.toLocaleString() + " km from it · orbit " + m.period.toFixed(2) + " days" +
			(m.retrograde ? " (retrograde)" : "") + " · position schematic"
	}
	if (key === "sun") return ""
	var name = key.charAt(0).toUpperCase() + key.slice(1)
	var pos = astroBodyPos(key, d)
	var dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z)
	var moons = astroMoonsOf(key)
	var txt = name + " · " + dist.toFixed(2) + " AU from the Sun"
	if (key !== "earth" && astroLastChart) {
		for (i = 0; i < astroLastChart.bodies.length; i++) {
			var b = astroLastChart.bodies[i]
			if (b.key === key) { txt += " · " + b.deg + "° " + b.sign.name + (b.retro ? " Rx" : ""); break }
		}
	}
	if (moons.length > 0) txt += " · " + moons.length + " moon" + (moons.length > 1 ? "s" : "") + " here, zoom in to see them"
	return txt
}

function astroRenderSelection() {
	var el = document.getElementById("astroSelInfo")
	if (el === null) return
	var flat = (astroViewMode === "flat")
	if (!astroSelected) {
		el.textContent = flat
			? "Nothing selected — tap the Sun, the Moon, a planet or a star."
			: "Nothing selected — tap a planet to follow it."
	} else {
		// each view describes what it can: the flat map knows where a body
		// stands overhead, the solar map knows how far out it is
		el.textContent = flat
			? (typeof feSelectionDetail === "function" ? feSelectionDetail(astroSelected) : "")
			: astroSelectionDetail(astroSelected)
	}
	el.classList.toggle("hideValue", astroViewMode === "2d")
}

// A click or tap on the canvas: the nearest thing actually drawn, within a
// forgiving radius (bigger for touch, where a fingertip is not a pixel).
// Only what is on screen at this zoom can be hit - a moon too small to be
// drawn is not secretly selectable.
function astroCanvasTap(x, y) {
	var best = null, bestD = 1e9
	for (var i = 0; i < astroHitItems.length; i++) {
		var it = astroHitItems[i]
		var dx = it.x - x, dy = it.y - y
		var dist = Math.sqrt(dx * dx + dy * dy)
		if (dist <= it.hit && dist < bestD) { best = it; bestD = dist }
	}
	if (best === null) { astroSelect(null); return }   // empty space: back to the system
	astroSelect(best.key)
}

function drawAstroChart3D(c, w, h, chart) {
	c.save()
	c.beginPath(); c.rect(0, 0, w, h); c.clip()
	var cx = w / 2, cy = h / 2
	var d = chart.d
	var scale = astroZoom * (Math.min(w, h) / 2 - 26) / astroCompress(41) // Pluto's orbit frames zoom 1

	// starfield backdrop, deterministic so it does not shimmer on redraw
	var seed = 7
	function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
	c.fillStyle = "rgba(255,255,255,0.30)"
	for (var st = 0; st < 90; st++) {
		var sx = rnd() * w, sy = rnd() * h, sr = rnd() * 1.1 + 0.2
		c.beginPath(); c.arc(sx, sy, sr, 0, Math.PI * 2); c.fill()
	}

	var faint = astroCssVar("--border-dark-accent", "#3a3a3a")
	var dim = astroCssVar("--font-white-3", "#999")

	// orbits
	for (var i = 0; i < astroOrbitBodies.length; i++) {
		var path = astroOrbitPath(astroOrbitBodies[i], d, 96)
		c.strokeStyle = faint
		c.globalAlpha = 0.75
		c.beginPath()
		for (var j = 0; j < path.length; j++) {
			var pp = astroProject(path[j], cx, cy, scale)
			if (j === 0) c.moveTo(pp.x, pp.y); else c.lineTo(pp.x, pp.y)
		}
		c.stroke()
	}
	c.globalAlpha = 1

	// Sun
	var sunP = astroProject({ x: 0, y: 0, z: 0 }, cx, cy, scale)
	var grad = c.createRadialGradient(sunP.x, sunP.y, 0, sunP.x, sunP.y, 11)
	grad.addColorStop(0, "hsla(50, 100%, 78%, 0.95)")
	grad.addColorStop(1, "hsla(45, 100%, 55%, 0)")
	c.fillStyle = grad
	c.beginPath(); c.arc(sunP.x, sunP.y, 11, 0, Math.PI * 2); c.fill()
	c.fillStyle = "hsl(48 100% 70%)"
	c.beginPath(); c.arc(sunP.x, sunP.y, 4, 0, Math.PI * 2); c.fill()

	// planets, painted back to front so nearer bodies sit on top
	var items = []
	astroHitItems = []
	var touch = (window.matchMedia && window.matchMedia("(pointer: coarse)").matches)
	var b, key

	for (b = 0; b < astroOrbitBodies.length; b++) {
		key = astroOrbitBodies[b]
		var pos = astroHelioPos(key, d)
		var pr = astroProject(pos, cx, cy, scale)
		var label = key.charAt(0).toUpperCase() + key.slice(1)
		var glyph = (key === "earth") ? "⊕" : (astroBodies.filter(function (x) { return x.key === key })[0] || { glyph: "•" }).glyph
		items.push({ p: pr, label: label, glyph: glyph, key: key, pos: pos, kind: "planet", r: 3.4 })

		// This planet's moons, shown once its system is wide enough on
		// screen to read: a pixel test, so it follows the zoom rather than
		// switching at some number somebody picked.
		var dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z)
		var localScale = scale * astroLocalFactor(dist)
		var moons = astroMoonsOf(key)
		for (var mi = 0; mi < moons.length; mi++) {
			var moon = moons[mi]
			var off = astroMoonOffset(moon, d)
			var px = off.r * localScale               // its orbit's radius on screen
			if (px < 7) continue                      // too tight to tell apart: leave it out
			var rot = astroRotate(off)
			var mp = {
				x: pr.x + rot.x * localScale,
				y: pr.y - rot.y * localScale,
				depth: pr.depth + rot.depth * localScale
			}
			if (mp.x < -40 || mp.x > w + 40 || mp.y < -40 || mp.y > h + 40) continue  // off screen
			items.push({
				p: mp, label: moon.name, glyph: "○", key: moon.name, kind: "moon",
				r: 2.2, orbitPx: px, parentP: pr, showLabel: px >= 26
			})
		}
	}

	items.sort(function (a, b2) { return a.p.depth - b2.p.depth })

	var sel = astroSelected ? String(astroSelected).toLowerCase() : null
	for (var n = 0; n < items.length; n++) {
		var it = items[n]
		var isSel = (sel !== null && String(it.key).toLowerCase() === sel)

		// the moon's orbit, drawn once it is worth seeing
		if (it.kind === "moon" && it.orbitPx >= 12) {
			c.strokeStyle = faint
			c.globalAlpha = 0.5
			c.beginPath()
			for (var s2 = 0; s2 <= 48; s2++) {
				var ang = (s2 / 48) * 360
				// rotation is linear, so this works directly in pixels
				var q = astroRotate({ x: it.orbitPx * aCos(ang), y: it.orbitPx * aSin(ang), z: 0 })
				var qx = it.parentP.x + q.x, qy = it.parentP.y - q.y
				if (s2 === 0) c.moveTo(qx, qy); else c.lineTo(qx, qy)
			}
			c.stroke()
			c.globalAlpha = 1
		}

		c.fillStyle = it.kind === "moon" ? "hsl(0 0% 78%)" : astroPlanetColor(it.key)
		c.beginPath(); c.arc(it.p.x, it.p.y, it.r, 0, Math.PI * 2); c.fill()

		if (isSel) { // a ring, not a redesign
			c.strokeStyle = astroCssVar("--focus-outline", "#ddd")
			c.lineWidth = 1.5
			c.beginPath(); c.arc(it.p.x, it.p.y, it.r + 5, 0, Math.PI * 2); c.stroke()
			c.lineWidth = 1
		}

		// planets keep their labels; a moon earns one as it gets closer
		if (it.kind === "planet" || it.showLabel || isSel) {
			c.fillStyle = isSel ? astroCssVar("--font-white-1", "#eee") : dim
			c.font = (it.kind === "moon" ? "10px " : "11px ") + "sans-serif"
			c.textAlign = "left"; c.textBaseline = "middle"
			c.fillText((it.kind === "moon" ? "" : it.glyph + " ") + it.label, it.p.x + 7, it.p.y)
		}

		astroHitItems.push({
			key: it.key, kind: it.kind, x: it.p.x, y: it.p.y,
			hit: (it.kind === "moon" ? (touch ? 16 : 11) : (touch ? 22 : 14))
		})
	}

	// the Sun is selectable too, so there is always a way back to the middle
	astroHitItems.push({ key: "sun", kind: "star", x: sunP.x, y: sunP.y, hit: touch ? 20 : 13 })

	c.fillStyle = dim
	c.font = "10px sans-serif"; c.textAlign = "left"
	var foot = "Heliocentric · distances compressed"
	if (astroTarget !== "sun") foot += " · centred on " + String(astroTarget).charAt(0).toUpperCase() + String(astroTarget).slice(1)
	c.fillText(foot, 8, h - 8)
	c.restore()
}

function astroPlanetColor(key) {
	switch (key) {
		case "mercury": return "hsl(30 20% 72%)"
		case "venus":   return "hsl(45 65% 74%)"
		case "earth":   return "hsl(205 70% 66%)"
		case "moon":    return "hsl(0 0% 80%)"
		case "mars":    return "hsl(12 65% 60%)"
		case "jupiter": return "hsl(28 45% 66%)"
		case "saturn":  return "hsl(48 40% 70%)"
		case "uranus":  return "hsl(180 45% 68%)"
		case "neptune": return "hsl(220 60% 66%)"
		case "pluto":   return "hsl(20 20% 62%)"
	}
	return "#ccc"
}

// Dragging to orbit, pinching to zoom and tapping to select are all bound on
// the canvas itself in astroBindCanvasPointer(), through pointer events. The
// old pair of document-wide mousemove/mouseup handlers has gone with them:
// they ran on every mouse move anywhere on the page, and never once looked at
// a touch.

// send a planet or sign name into the phrase box so it runs through the ciphers
function astroSendToPhraseBox(txt) {
	var box = document.getElementById("phraseBox")
	if (box === null) return
	box.value = txt
	updateEnabledCipherTable()
	updateWordBreakdown(breakCipher, false, false)
	box.focus()
}

function astroPad(n) { return (n < 10 ? "0" : "") + n }

var astroUseLocation = false // birth-chart mode
var astroHouseSystem = "whole"

// Panel inputs are remembered across open/close, otherwise reopening the tab
// would silently wipe a birth chart the user had typed in.
var astroInput = null

function astroDefaultInput() {
	var n = new Date()
	return {
		y: n.getUTCFullYear(), m: n.getUTCMonth() + 1, d: n.getUTCDate(),
		hh: n.getUTCHours(), mm: n.getUTCMinutes(),
		lat: 51.5074, lon: -0.1278, tz: 0
	}
}

// pull current field values into astroInput so a rebuild can restore them
function astroCaptureInputs() {
	var v = astroReadInputs()
	astroInput = v
	return v
}

function astroReadInputs() {
	var g = function (id, fb) {
		var el = document.getElementById(id)
		if (el === null || el.value === "") return fb
		var v = Number(el.value)
		return isNaN(v) ? fb : v
	}
	var fb = astroInput || astroDefaultInput()
	return {
		y: g("astroY", fb.y),
		m: g("astroM", fb.m),
		d: g("astroD", fb.d),
		hh: g("astroHH", fb.hh),
		mm: g("astroMM", fb.mm),
		lat: g("astroLat", fb.lat),
		lon: g("astroLon", fb.lon),
		tz: g("astroTZ", fb.tz)
	}
}

// ---- birthplace lookup ------------------------------------------------
//
// Typing an address is far friendlier than hunting for coordinates. Google's
// Geocoding API needs an API key and a billing account, so the default
// provider here is OpenStreetMap's Nominatim, which needs neither. Drop a key
// into astroGoogleKey to switch over; the rest of the flow is identical.

var astroGoogleKey = "" // set this to use Google Geocoding instead of OpenStreetMap
var astroGeoBusy = false

function astroGeoUrl(q) {
	if (astroGoogleKey) {
		return "https://maps.googleapis.com/maps/api/geocode/json?address=" +
			encodeURIComponent(q) + "&key=" + encodeURIComponent(astroGoogleKey)
	}
	return "https://nominatim.openstreetmap.org/search?format=json&limit=6&addressdetails=0&q=" +
		encodeURIComponent(q)
}

function astroGeoParse(data) {
	if (astroGoogleKey) {
		if (!data || !data.results) return []
		return data.results.map(function (r) {
			return { label: r.formatted_address, lat: r.geometry.location.lat, lon: r.geometry.location.lng }
		})
	}
	if (!Array.isArray(data)) return []
	return data.map(function (r) {
		return { label: r.display_name, lat: Number(r.lat), lon: Number(r.lon) }
	})
}

function astroGeoSearch() {
	var box = document.getElementById("astroPlace")
	var out = document.getElementById("astroGeoResults")
	if (box === null || out === null) return
	var q = box.value.trim()
	if (q === "") { out.innerHTML = ""; return }
	if (astroGeoBusy) return

	astroGeoBusy = true
	out.innerHTML = '<div class="astroGeoNote">Searching…</div>'

	fetch(astroGeoUrl(q), { headers: { "Accept": "application/json" } })
		.then(function (r) { return r.json() })
		.then(function (data) {
			astroGeoBusy = false
			var hits = astroGeoParse(data)
			if (hits.length === 0) {
				out.innerHTML = '<div class="astroGeoNote">No match. Try adding a country, or enter coordinates below.</div>'
				return
			}
			var o = '<div class="astroGeoList">'
			for (var i = 0; i < hits.length; i++) {
				var hEsc = authEsc(hits[i].label)
				o += '<div class="astroGeoHit" onclick="astroPickPlace('+hits[i].lat+','+hits[i].lon+',&quot;'+authEscJs(hits[i].label)+'&quot;)">'
				o += hEsc + '<span class="astroGeoCoords">' + hits[i].lat.toFixed(4) + ', ' + hits[i].lon.toFixed(4) + '</span>'
				o += '</div>'
			}
			o += '</div>'
			if (!astroGoogleKey) o += '<div class="astroGeoNote">Search by OpenStreetMap / Nominatim</div>'
			out.innerHTML = o
		})
		.catch(function () {
			astroGeoBusy = false
			out.innerHTML = '<div class="astroGeoNote astroWarn">Lookup failed. Check your connection, or enter coordinates below.</div>'
		})
}

function astroPickPlace(lat, lon, label) {
	document.getElementById("astroLat").value = lat.toFixed(4)
	document.getElementById("astroLon").value = lon.toFixed(4)

	// This is the place's mean solar time offset, worked out from its
	// longitude alone. It is NOT the zone the place kept: it knows nothing
	// about the country's time zone, and nothing about daylight saving on
	// that date. It is a starting point to correct, and says so.
	var guess = Math.round(lon / 15)
	document.getElementById("astroTZ").value = guess

	var out = document.getElementById("astroGeoResults")
	if (out !== null) {
		// The label comes from a geocoding service - somebody else's data.
		// It is written as text, never parsed as markup.
		var note = document.createElement("div")
		note.className = "astroGeoNote"
		note.appendChild(document.createTextNode("Using "))
		var strong = document.createElement("b")
		strong.textContent = label
		note.appendChild(strong)
		note.appendChild(document.createTextNode(
			". UTC offset set to " + (guess >= 0 ? "+" : "") + guess +
			", which is this longitude's mean solar time, not the time zone that was in use. " +
			"Set the offset the place actually kept on that date, including daylight saving."))
		out.innerHTML = ""
		out.appendChild(note)
	}
	updateAstroChart()
}

function astroToggleLocation() {
	astroUseLocation = !astroUseLocation
	$("#astroLocFields").toggleClass("hideValue", !astroUseLocation)
	updateAstroChart()
}

function astroSetHouseSystem(sys) {
	// Every system except "current" fixes its own houses; the buttons are
	// disabled there rather than left able to build a mixture the system
	// does not recognise (sidereal rashis cut into Placidus quadrants).
	if (astroSystemConfig().housesLocked) return
	astroHouseSystem = sys
	$(".astroHouseBtn").removeClass("astroViewOn")
	$(sys === "whole" ? "#astroHouseWhole" : "#astroHouseEqual").addClass("astroViewOn")
	updateAstroChart()
}

// The whole point of the dropdown: one value, and every calculation below it
// follows. Nothing here edits a label on its own.
function astroSetSystem(key) {
	astroSystem = astroSystemConfig(key).key
	astroSyncHouseButtons()
	updateAstroChart()
}

function astroSyncHouseButtons() {
	var cfg = astroSystemConfig()
	var locked = cfg.housesLocked
	var active = astroActiveHouseSystem(cfg)
	$(".astroHouseBtn").prop("disabled", locked).toggleClass("astroBtnLocked", locked).removeClass("astroViewOn")
	if (!locked) {
		$(active === "whole" ? "#astroHouseWhole" : "#astroHouseEqual").addClass("astroViewOn")
	}
	var note = document.getElementById("astroHouseNote")
	if (note !== null) {
		note.textContent = locked
			? (cfg.label + " always uses " +
				(cfg.housesLabel || astroHouseLabel(cfg.houses)) + " houses.")
			: ""
		note.classList.toggle("hideValue", !locked)
	}
}

function astroSetNow() {
	var n = new Date()
	document.getElementById("astroY").value = n.getUTCFullYear()
	document.getElementById("astroM").value = n.getUTCMonth() + 1
	document.getElementById("astroD").value = n.getUTCDate()
	document.getElementById("astroHH").value = n.getUTCHours()
	document.getElementById("astroMM").value = n.getUTCMinutes()
	updateAstroChart()
}

// Rich hover meanings for planets, signs and aspects here, in the calculator's
// own Astro panel - not just the membership Chart tab. Reuses pcTip and the
// meaning dictionaries from profile-chart.js rather than keeping a second
// copy: pcTip's own event handler is bound once, globally, on <body> for any
// [data-pctip] element, so an astrology.js cell only needs the attribute.
// Guarded in case profile-chart.js has not loaded (e.g. a future page that
// includes astrology.js on its own) - then this is just a no-op, not an error.
function astroTip(text) {
	return (typeof pcTip === "function") ? pcTip(text) : ''
}
function astroPlanetTip(key) {
	if (typeof pcPlanetMeaning === "undefined") return ''
	return astroTip(pcPlanetMeaning[key] || '')
}
function astroSignTip(name) {
	if (typeof pcSignMeaning === "undefined") return ''
	return astroTip(name + ' - ' + (pcSignMeaning[name] || ''))
}
function astroAspectTip(name) {
	if (typeof pcAspectMeaning === "undefined") return ''
	return astroTip(pcAspectMeaning[name] || '')
}

function updateAstroChart() {
	var spot = document.getElementById("astroResults")
	if (spot === null) return

	var v = astroCaptureInputs()
	// with a location the entered time is local, so shift it back to UT
	var ut = v.hh + v.mm / 60 - (astroUseLocation ? v.tz : 0)
	var cfg = astroSystemConfig()
	var loc = astroUseLocation ? { lat: v.lat, lon: v.lon } : null
	var chart = astroBuildChart(v.y, v.m, v.d, ut, loc, cfg)
	astroLastChart = chart // the visualiser draws from this

	// what is actually being calculated, written from the configuration
	var info = document.getElementById("astroSystemInfo")
	if (info !== null) info.textContent = astroSystemInfoText(cfg, chart)

	var o = ""

	if (chart.houses && chart.houses.undefinedHere) {
		o += '<div class="astroNote astroWarn">Placidus houses are undefined at latitude ' +
			Math.abs(chart.houses.latitude).toFixed(1) + '&deg; for this chart &mdash; the degrees involved never rise or set. ' +
			'Showing <b>Porphyry</b> cusps instead, which are defined everywhere. These are not Placidus cusps.</div>'
	}

	// angles
	if (chart.houses) {
		o += '<table class="astroTable astroAngles"><tbody>'
		o += '<tr class="astroHeadRow"><td>Angle</td><td>Position</td><td>Sign</td></tr>'
		o += '<tr><td class="astroBody" onclick="astroSendToPhraseBox(&quot;Ascendant&quot;)"'+astroTip("Ascendant - the sign rising on the eastern horizon at birth. How you meet the world.")+'>Ascendant</td>'
		o += '<td class="astroDeg">'+astroPad(chart.ascSign.deg)+'&deg; '+astroPad(chart.ascSign.min)+"'"+'</td>'
		o += '<td class="astroSign" style="color: '+astroSignColor(chart.ascSign.idx)+';" onclick="astroSendToPhraseBox(&quot;'+chart.ascSign.sign.name+'&quot;)"'+astroSignTip(chart.ascSign.sign.name)+'><span class="astroGlyph">'+chart.ascSign.sign.glyph+'</span>'+chart.ascSign.sign.name+'</td></tr>'
		o += '<tr><td class="astroBody" onclick="astroSendToPhraseBox(&quot;Midheaven&quot;)"'+astroTip("Midheaven - the highest point of the chart. Career, reputation, what you are known for.")+'>Midheaven</td>'
		o += '<td class="astroDeg">'+astroPad(chart.mcSign.deg)+'&deg; '+astroPad(chart.mcSign.min)+"'"+'</td>'
		o += '<td class="astroSign" style="color: '+astroSignColor(chart.mcSign.idx)+';" onclick="astroSendToPhraseBox(&quot;'+chart.mcSign.sign.name+'&quot;)"'+astroSignTip(chart.mcSign.sign.name)+'><span class="astroGlyph">'+chart.mcSign.sign.glyph+'</span>'+chart.mcSign.sign.name+'</td></tr>'
		o += '</tbody></table>'
	}

	// positions
	var showNak = astroHasExtra("nakshatra", cfg)
	var showSub = astroHasExtra("sublord", cfg)
	var showRuler = astroHasExtra("traditional", cfg) || astroHasExtra("modern", cfg)
	o += '<table class="astroTable"><tbody>'
	o += '<tr class="astroHeadRow"><td>Body</td><td>Position</td><td>Sign</td>'
	o += (chart.houses ? '<td>House</td>' : '<td>Element</td>')
	if (showNak) o += '<td>Nakshatra</td><td>Pada</td>'
	if (showSub) o += '<td>Sub</td>'
	if (showRuler) o += '<td>Ruler</td>'
	o += '<td>Motion</td></tr>'
	for (var i = 0; i < chart.bodies.length; i++) {
		var b = chart.bodies[i]
		var col = astroSignColor(b.signIdx)
		o += '<tr>'
		o += '<td class="astroBody" onclick="astroSendToPhraseBox(&quot;'+b.name+'&quot;)"'+astroPlanetTip(b.key)+'>'
		o += '<span class="astroGlyph">'+b.glyph+'</span>'+b.name+'</td>'
		o += '<td class="astroDeg">'+astroPad(b.deg)+'&deg; '+astroPad(b.min)+"'"+'</td>'
		o += '<td class="astroSign" style="color: '+col+';" onclick="astroSendToPhraseBox(&quot;'+b.sign.name+'&quot;)"'+astroSignTip(b.sign.name)+'>'
		o += '<span class="astroGlyph">'+b.sign.glyph+'</span>'+b.sign.name+'</td>'
		o += '<td class="astroEl">'+(chart.houses ? b.house : b.sign.el)+'</td>'
		if (showNak) {
			o += '<td class="astroNak" onclick="astroSendToPhraseBox(&quot;'+authEsc(b.nakshatra.name)+'&quot;)">'+authEsc(b.nakshatra.name)+'<span class="astroLord">'+authEsc(b.nakshatra.lord)+'</span></td>'
			o += '<td class="astroEl">'+b.nakshatra.pada+'</td>'
		}
		if (showSub) o += '<td class="astroEl">'+authEsc(b.sublord)+'</td>'
		if (showRuler) o += '<td class="astroEl">'+authEsc(b.ruler)+'</td>'
		o += '<td class="astroMotion">'+(b.retro ? '<span class="astroRetro">Rx</span>' : '&mdash;')+'</td>'
		o += '</tr>'
	}
	o += '</tbody></table>'

	// house cusps, where the system divides the sky unequally and the cusp
	// degrees are the reading rather than an implied 30 deg per house
	if (chart.houses && (chart.houses.system === "placidus" || chart.houses.system === "porphyry")) {
		o += '<div class="astroStep">House cusps<span class="astroStepNote">'+authEsc(astroHouseLabel(chart.houses.system))+'</span></div>'
		o += '<table class="astroTable"><tbody><tr class="astroHeadRow"><td>House</td><td>Cusp</td><td>Sign</td>'
		if (astroHasExtra("cuspal", cfg)) o += '<td>Star lord</td><td>Sub lord</td>'
		o += '</tr>'
		for (var hc = 0; hc < 12; hc++) {
			var cs = astroSignOf(chart.houses.cusps[hc])
			o += '<tr><td class="astroBody">'+(hc + 1)+'</td>'
			o += '<td class="astroDeg">'+astroPad(cs.deg)+'&deg; '+astroPad(cs.min)+"'"+'</td>'
			o += '<td class="astroSign" style="color: '+astroSignColor(cs.idx)+';"><span class="astroGlyph">'+cs.sign.glyph+'</span>'+cs.sign.name+'</td>'
			if (astroHasExtra("cuspal", cfg) && chart.extra.cuspal) {
				o += '<td class="astroEl">'+authEsc(chart.extra.cuspal[hc].star)+'</td>'
				o += '<td class="astroEl">'+authEsc(chart.extra.cuspal[hc].sub)+'</td>'
			}
			o += '</tr>'
		}
		o += '</tbody></table>'
	}

	// Hellenistic: sect decides which planets are working with the chart and
	// which against it, and the Lot of Fortune is reckoned from it
	if (chart.extra.sect) {
		o += '<div class="astroStep">Sect<span class="astroStepNote">traditional rulerships, seven visible planets</span></div>'
		o += '<table class="astroTable"><tbody>'
		o += '<tr><td class="astroBody">Chart</td><td class="astroEl">'+authEsc(chart.extra.sect.name)+'</td></tr>'
		o += '<tr><td class="astroBody">Sect light</td><td class="astroEl">'+authEsc(chart.extra.sect.light)+'</td></tr>'
		o += '<tr><td class="astroBody">Benefic of sect</td><td class="astroEl">'+authEsc(chart.extra.sect.benefic)+'</td></tr>'
		o += '<tr><td class="astroBody">Malefic of sect</td><td class="astroEl">'+authEsc(chart.extra.sect.malefic)+'</td></tr>'
		if (chart.extra.ascRuler) o += '<tr><td class="astroBody">Ruler of the Ascendant</td><td class="astroEl">'+authEsc(chart.extra.ascRuler)+'</td></tr>'
		if (chart.extra.fortune) {
			o += '<tr><td class="astroBody" onclick="astroSendToPhraseBox(&quot;Lot of Fortune&quot;)">Lot of Fortune</td>'
			o += '<td class="astroEl">'+astroPad(chart.extra.fortune.sign.deg)+'&deg; '+astroPad(chart.extra.fortune.sign.min)+"' "
			o += '<span style="color: '+astroSignColor(chart.extra.fortune.sign.idx)+';">'+chart.extra.fortune.sign.sign.name+'</span>'
			o += ' &middot; house '+chart.extra.fortune.house+'</td></tr>'
		}
		o += '</tbody></table>'
	}

	// Vedic: the Moon's nakshatra sets the dasha sequence running
	if (chart.extra.dasha) {
		o += '<div class="astroStep">Vimshottari dasha<span class="astroStepNote">from the Moon in '+authEsc(chart.extra.dashaFrom.name)+'</span></div>'
		o += '<table class="astroTable"><tbody><tr class="astroHeadRow"><td>Maha dasha</td><td>From</td><td>To</td><td>Years</td></tr>'
		for (var dz = 0; dz < chart.extra.dasha.length; dz++) {
			var dd = chart.extra.dasha[dz]
			o += '<tr'+(dd.first ? ' class="astroExact"' : '')+'><td class="astroBody" onclick="astroSendToPhraseBox(&quot;'+authEsc(dd.lord)+'&quot;)">'+authEsc(dd.lord)+'</td>'
			o += '<td class="astroDeg">'+astroDashaDate(dd.startD)+'</td>'
			o += '<td class="astroDeg">'+astroDashaDate(dd.endD)+'</td>'
			o += '<td class="astroEl">'+dd.years.toFixed(1)+'</td></tr>'
		}
		o += '</tbody></table>'
		o += '<div class="astroSubNote">Balance at birth is the part of the Moon’s nakshatra still to run; periods use the conventional 365.25-day year.</div>'
	}

	// moon phase
	o += '<div class="astroPhase">'
	o += '<span class="astroPhaseName" onclick="astroSendToPhraseBox(&quot;'+chart.phase.name+'&quot;)">'+chart.phase.name+'</span>'
	o += '<span class="astroPhaseNum">'+(chart.phase.illum * 100).toFixed(1)+'% illuminated</span>'
	// an exact new moon lands on 359.99..., which would print as "360.00"
	var elongDisp = (chart.phase.elong >= 359.995) ? 0 : chart.phase.elong
	o += '<span class="astroPhaseNum">'+elongDisp.toFixed(2)+'&deg; from Sun</span>'
	o += '</div>'

	// aspects
	o += '<div class="astroStep">Aspects</div>'
	if (chart.aspects.length === 0) {
		o += '<div class="astroNote">No aspects within orb at this moment.</div>'
	} else {
		o += '<table class="astroTable"><tbody>'
		o += '<tr class="astroHeadRow"><td>Between</td><td>Aspect</td><td>Orb</td></tr>'
		for (var k = 0; k < chart.aspects.length; k++) {
			var asp = chart.aspects[k]
			o += '<tr'+(asp.exact ? ' class="astroExact"' : '')+'>'
			o += '<td class="astroBody">'+asp.a.glyph+' '+asp.a.name+' &nbsp;'+asp.b.glyph+' '+asp.b.name+'</td>'
			o += '<td class="astroAspName" onclick="astroSendToPhraseBox(&quot;'+asp.aspect.name+'&quot;)"'+astroAspectTip(asp.aspect.name)+'>'
			o += '<span class="astroGlyph">'+asp.aspect.glyph+'</span>'+asp.aspect.name+'</td>'
			o += '<td class="astroDeg">'+asp.orb.toFixed(2)+'&deg;</td>'
			o += '</tr>'
		}
		o += '</tbody></table>'
	}

	if (chart.plutoOutOfRange) {
		o += '<div class="astroNote astroWarn">Pluto’s series is only accurate between 1800 and 2100; its position above is unreliable for this date.</div>'
	}

	// What these numbers can and cannot carry. Stated where the numbers are,
	// rather than left for the reader to assume.
	if (chart.sidereal) {
		o += '<div class="astroSubNote">Ayanamsa from a linear drift model (anchored at J2000), worth a few arcminutes near our own century and less further out.'
		if (chart.ayanamsaName === "kp") {
			o += ' The Krishnamurti value here is Lahiri less 5′, the usual quoted difference rather than the exact KP constant, so a sub-lord within about 5′ of a boundary may differ from KP software.'
		}
		o += '</div>'
	}

	spot.innerHTML = o
	drawAstroVisual() // keep the wheel/solar view in step with the tables
}

// tint each sign by element so the table scans quickly
function astroSignColor(idx) {
	var el = astroSigns[idx].el
	if (el === "Fire") return "hsl(10 70% 66%)"
	if (el === "Earth") return "hsl(95 45% 60%)"
	if (el === "Air") return "hsl(50 75% 66%)"
	return "hsl(205 70% 68%)" // Water
}

// Closes this panel and opens the profile menu straight to Chart - the
// membership area's own tab bar no longer carries a Chart button of its own.
function astroOpenMyCharts() {
	closeAllOpenedMenus()
	if (typeof toggleProfileMenu === "function") toggleProfileMenu()
	if (typeof profileSetTab === "function") profileSetTab("chart")
}

function toggleAstroMenu() {
	if (!astroMenuOpened) {
		closeAllOpenedMenus()
		astroMenuOpened = true

		var n = astroInput || astroDefaultInput()
		var o = '<div class="colorControlsBG astroBG">'
		o += '<input class="closeMenuBtn" type="button" value="&#215;" onclick="closeAllOpenedMenus()">'

		o += '<div class="astroIntro">Geocentric positions for any moment. Click any planet, sign or aspect name to send it to the phrase box and run it through your ciphers. Hover a planet, sign or aspect for what it means.</div>'

		// Saving a chart to your profile needs an account - the drawing,
		// printing and saved-chart list themselves live under the profile
		// menu's own Chart tab (renderProfileChart, calc/profile-chart.js),
		// unchanged. This is just the door to it from where people actually
		// build a chart, rather than a tab of its own in the membership row.
		if (typeof authUser !== "undefined" && authUser !== null) {
			o += '<button class="intBtn3 astroMyChartsBtn" onclick="astroOpenMyCharts()">&#128190; My Charts &mdash; Membership only</button>'
		}

		o += '<div class="astroStep">Date &amp; time<span class="astroStepNote">UTC unless a birth place is set below</span></div>'
		o += '<table class="astroInputTable"><tbody><tr>'
		o += '<td><span class="colLabelSmall">Year</span><input type="number" id="astroY" class="astroInput" value="'+n.y+'" oninput="updateAstroChart()"></td>'
		o += '<td><span class="colLabelSmall">Month</span><input type="number" min="1" max="12" id="astroM" class="astroInput" value="'+n.m+'" oninput="updateAstroChart()"></td>'
		o += '<td><span class="colLabelSmall">Day</span><input type="number" min="1" max="31" id="astroD" class="astroInput" value="'+n.d+'" oninput="updateAstroChart()"></td>'
		o += '<td><span class="colLabelSmall">Hour</span><input type="number" min="0" max="23" id="astroHH" class="astroInput" value="'+n.hh+'" oninput="updateAstroChart()"></td>'
		o += '<td><span class="colLabelSmall">Min</span><input type="number" min="0" max="59" id="astroMM" class="astroInput" value="'+n.mm+'" oninput="updateAstroChart()"></td>'
		o += '<td><input class="intBtn3" type="button" value="Now" style="width: auto; margin-left: 0.6em;" onclick="astroSetNow()"></td>'
		o += '</tr></tbody></table>'

		o += '<div class="astroStep">Birth place<span class="astroStepNote">optional &mdash; adds Ascendant, Midheaven and houses</span></div>'
		o += '<div class="optionElement"><label class="chkLabel ciphCheckboxLabel2">Use a birth location<input type="checkbox" id="chkbox_astroLoc" onclick="astroToggleLocation()"'+(astroUseLocation ? ' checked' : '')+'><span class="custChkBox"></span></label></div>'
		o += '<div id="astroLocFields"'+(astroUseLocation ? '' : ' class="hideValue"')+'>'
		o += '<table class="astroInputTable"><tbody><tr>'
		o += '<td><span class="colLabelSmall">Birthplace</span>'
		o += '<input type="text" id="astroPlace" class="astroInput astroPlaceInput" placeholder="e.g. Brooklyn, New York" '
		o += 'onkeydown="if(event.keyCode===13){event.preventDefault();astroGeoSearch();}"></td>'
		o += '<td><input class="intBtn3" type="button" value="Find" style="width: auto;" onclick="astroGeoSearch()"></td>'
		o += '</tr></tbody></table>'
		o += '<div id="astroGeoResults"></div>'
		o += '<table class="astroInputTable"><tbody><tr>'
		o += '<td><span class="colLabelSmall">Latitude</span><input type="number" step="0.0001" id="astroLat" class="astroInput" value='+n.lat+' oninput="updateAstroChart()" title="Degrees north, negative for south"></td>'
		o += '<td><span class="colLabelSmall">Longitude</span><input type="number" step="0.0001" id="astroLon" class="astroInput" value='+n.lon+' oninput="updateAstroChart()" title="Degrees east, negative for west"></td>'
		o += '<td><span class="colLabelSmall">UTC offset</span><input type="number" step="0.25" id="astroTZ" class="astroInput" value='+n.tz+' oninput="updateAstroChart()" title="Hours ahead of UTC at the birth time, e.g. -5 for New York in winter"></td>'
		o += '</tr></tbody></table>'
		o += '<div class="astroSubNote">With a location set, the time above is read as <b>local</b> time at that place. ' +
			'The UTC offset is <b>yours to set</b>: there is no time zone database here, so nothing knows which zone that place kept, ' +
			'or whether daylight saving was in force on that date. An offset out by an hour moves the Ascendant by roughly 15&deg;, ' +
			'which changes the houses and can change the rising sign.</div>'
		o += '<table class="astroInputTable"><tbody><tr>'
		o += '<td><span class="colLabelSmall">Houses</span></td>'
		o += '<td><input id="astroHouseWhole" class="intBtn3 astroHouseBtn'+(astroHouseSystem === "whole" ? " astroViewOn" : "")+'" type="button" value="Whole Sign" onclick="astroSetHouseSystem(&quot;whole&quot;)"></td>'
		o += '<td><input id="astroHouseEqual" class="intBtn3 astroHouseBtn'+(astroHouseSystem === "equal" ? " astroViewOn" : "")+'" type="button" value="Equal" onclick="astroSetHouseSystem(&quot;equal&quot;)"></td>'
		o += '</tr></tbody></table>'
		o += '<div id="astroHouseNote" class="astroSubNote hideValue"></div>'
		o += '</div>'

		// The system this whole panel is calculating in. One value, read by
		// astroBuildChart; the line under it is written from the same
		// configuration, so the label cannot disagree with the maths.
		o += '<div class="astroStep">Astrology system</div>'
		o += '<div class="astroSystemRow">'
		o += '<label class="colLabelSmall" for="astroSystem">System</label>'
		o += '<select id="astroSystem" class="astroInput astroSystemSelect" onchange="astroSetSystem(this.value)">'
		for (var sy = 0; sy < astroSystems.length; sy++) {
			o += '<option value="'+astroSystems[sy].key+'"'+(astroSystems[sy].key === astroSystem ? ' selected' : '')+'>'+authEsc(astroSystems[sy].label)+'</option>'
		}
		o += '</select>'
		o += '</div>'
		o += '<div id="astroSystemInfo" class="astroSystemInfo"></div>'

		o += '<div class="astroStep">Chart'
		o += '<span class="astroViewToggle" role="group" aria-label="Visualisation">'
		o += '<input id="astroView2D" class="intBtn3 astroViewBtn'+(astroViewMode === "2d" ? " astroViewOn" : "")+'" type="button" value="2D" title="Birth chart wheel" aria-pressed="'+(astroViewMode === "2d")+'" onclick="astroSetView(&quot;2d&quot;)">'
		o += '<input id="astroView3D" class="intBtn3 astroViewBtn'+(astroViewMode === "3d" ? " astroViewOn" : "")+'" type="button" value="3D" title="Solar system map" aria-pressed="'+(astroViewMode === "3d")+'" onclick="astroSetView(&quot;3d&quot;)">'
		o += '<input id="astroViewFlat" class="intBtn3 astroViewBtn'+(astroViewMode === "flat" ? " astroViewOn" : "")+'" type="button" value="FE" title="FE — Flat Earth / Zetetic Historical Geocentric Model" aria-label="FE: Flat Earth / Zetetic historical geocentric map" aria-pressed="'+(astroViewMode === "flat")+'" onclick="astroSetView(&quot;flat&quot;)">'
		o += '</span></div>'
		o += '<div class="astroCanvasWrap"><canvas id="astroCanvas" tabindex="0" role="img" aria-label="Solar system map. Tap a planet to follow it."></canvas></div>'
		o += '<div id="astroSelInfo" class="astroSelInfo hideValue"></div>'
		// the flat map's own controls and its standing note
		if (typeof feControlsHtml === "function") o += feControlsHtml()
		o += '<div id="feHint" class="astroSubNote hideValue"><b>Flat Earth / Zetetic &mdash; Historical Geocentric Model.</b> '
		o += 'A 19th-century cosmological model, drawn as a model: the North Pole at the centre, the Antarctic perimeter around the rim. '
		o += 'The Sun, Moon and planets are placed by the same modern geocentric calculations as the other two views, at the point each one stands overhead. '
		o += 'Drag to pan, scroll or pinch to zoom, tap an object to select it.</div>'
		o += '<div id="astroDragHint" class="astroSubNote hideValue">Drag to orbit, scroll or pinch to zoom, tap a planet to follow it. Moons appear as you zoom in; their positions are schematic, at the right spacing and speed but not ephemeris positions.'
		o += '<span class="astroZoomCtl">'
		o += '<input class="intBtn3 astroZoomBtn" type="button" value="&minus;" onclick="astroZoomBy(1/1.35)">'
		o += '<span id="astroZoomLabel">1.00x</span>'
		o += '<input class="intBtn3 astroZoomBtn" type="button" value="+" onclick="astroZoomBy(1.35)">'
		o += '<input class="intBtn3 astroZoomBtn astroZoomReset" type="button" value="Reset" onclick="astroResetView()">'
		o += '</span></div>'

		o += '<div class="astroStep">Positions</div>'
		o += '<div id="astroResults"></div>'

		o += '</div>'

		document.getElementById("astroMenuArea").innerHTML = o
		astroSyncHouseButtons()
		updateAstroChart()
		astroBindCanvasWheel()   // also binds pointer input and the size watcher
		astroRenderSelection()
		astroSetView(astroViewMode) // keep buttons, hint and canvas consistent
	} else {
		// nothing left running behind a closed panel: no animation frame, no
		// size observer, no stale hit targets
		astroStopVisual()
		document.getElementById("astroMenuArea").innerHTML = ""
		astroMenuOpened = false
	}
}

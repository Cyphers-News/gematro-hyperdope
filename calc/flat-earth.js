// ============ Flat Earth / Zetetic - historical geocentric map ============
//
// A third way of drawing the same sky, beside the 2D wheel and the solar
// map. It lays the world out the way 19th-century zetetic astronomy did -
// a plane with the North Pole at the centre and the Antarctic rim around
// the edge - and places the Sun, Moon and planets on it.
//
// WHAT THIS IS, AND IS NOT
//
// This is a historical cosmological model drawn as a model, in the way a
// Ptolemaic diagram is drawn. It is not offered as an account of the shape
// of the Earth, and nothing here argues for or against one. The panel says
// as much on screen, under "About this model".
//
// THE TWO LAYERS, KEPT APART ON PURPOSE
//
//   modern astronomy          astrology.js: geocentric ecliptic longitudes,
//   (measured)                sidereal time, obliquity - untouched by this
//        |                    file, which only reads them
//        v
//   observational facts       feEquatorialOf(): right ascension and
//   (derived, exact)          declination; feSubPoint(): the point on the
//        |                    ground each body stands directly over
//        v
//   the model's plane         fePlanePoint(): the zetetic construction -
//   (the model's own rule)    distance from the centre is co-latitude
//        |
//        v
//   the drawing               drawAstroChartFlat()
//
// Every position drawn here is the modern calculation. What the model
// supplies is the *layout* - how the ground is arranged and how far above
// it the lights are held to be. Where the model states a figure rather than
// measuring one (the Sun's height, its size) it is in FE_MODEL below, is
// labelled as the model's figure on screen, and is never fed back into the
// astronomy. Where the model and modern astronomy disagree - daylight is
// the clear case - the modern answer is drawn and named as the modern
// answer, rather than either being quietly bent to fit the other.

// ---- what the model itself asserts --------------------------------------
//
// Figures quoted by zetetic authors, kept here as the model's own numbers.
// They vary between authors and editions: Rowbotham's own estimates of the
// Sun's height changed between printings, and later writers commonly cite
// about 3,000 miles. They are used for labelling and for the schematic
// height scale, and for nothing else.
var FE_MODEL = {
	name: "Flat Earth / Zetetic — Historical Geocentric Model",
	sunHeightMiles: 3000,     // commonly cited zetetic figure; authors differ
	moonHeightMiles: 3000,
	sunDiameterMiles: 32,
	rimName: "Antarctic perimeter",
	about: "Flat Earth / Zetetic astronomy is a historical cosmological model associated with " +
		"19th-century writers including Samuel Rowbotham. This visualisation represents that model " +
		"as a historical and geometric visualisation; it is not presented as a scientific model of " +
		"Earth's physical shape. The positions of the Sun, Moon and planets shown here are the same " +
		"modern geocentric calculations used by the other two views, projected onto the model's plane. " +
		"Figures the model states rather than measures — the height of the Sun above the plane, its " +
		"size — are labelled as the model's own, and vary between zetetic authors. Daylight is drawn " +
		"from the modern calculation and labelled as such: the zetetic model instead treats daylight as " +
		"a limited circle of light, whose size the model does not fix."
}

// ---- geography ----------------------------------------------------------
//
// Simplified coastlines, a few dozen points each: enough to recognise a
// continent at this scale, and deliberately coarse. Latitude then longitude,
// in degrees. This is ordinary geographic data - it says nothing about the
// shape of the Earth, only which places border which oceans - and the
// projection that arranges it is the model's, below.
var feOutlines = [
	{ name: "Africa", closed: true, pts: [
		[35, -6], [37, 10], [33, 22], [31, 32], [12, 43], [2, 45], [-4, 40], [-15, 40],
		[-26, 33], [-34, 18], [-23, 14], [-6, 12], [0, 9], [4, 9], [6, 3], [5, -4],
		[10, -13], [15, -17], [21, -17], [28, -13], [33, -8], [35, -6] ] },
	{ name: "Eurasia", closed: true, pts: [
		[36, -6], [43, -9], [48, -5], [52, 4], [58, 8], [71, 26], [69, 33], [73, 80],
		[76, 105], [72, 130], [70, 160], [66, 180], [60, 170], [54, 140], [45, 135],
		[39, 122], [31, 122], [22, 114], [10, 106], [8, 100], [16, 97], [22, 90],
		[15, 80], [8, 77], [20, 72], [25, 67], [25, 57], [13, 45], [28, 34], [36, 36],
		[40, 26], [41, 15], [44, 9], [41, 3], [36, -6] ] },
	{ name: "North America", closed: true, pts: [
		[70, -160], [70, -133], [70, -95], [63, -78], [52, -56], [45, -67], [40, -74],
		[32, -80], [25, -81], [30, -89], [26, -97], [21, -97], [18, -88], [9, -80],
		[15, -93], [20, -105], [23, -110], [28, -114], [32, -117], [38, -123],
		[49, -125], [58, -158], [70, -160] ] },
	{ name: "South America", closed: true, pts: [
		[11, -74], [10, -62], [5, -52], [-2, -44], [-8, -35], [-23, -43], [-34, -54],
		[-42, -63], [-52, -69], [-55, -68], [-45, -74], [-33, -72], [-18, -70],
		[-6, -81], [2, -80], [8, -78], [11, -74] ] },
	{ name: "Australia", closed: true, pts: [
		[-11, 142], [-19, 147], [-28, 153], [-38, 145], [-35, 138], [-32, 116],
		[-22, 114], [-17, 123], [-12, 131], [-11, 142] ] },
	{ name: "Greenland", closed: true, pts: [
		[83, -32], [76, -20], [70, -22], [60, -43], [66, -53], [76, -68], [82, -45], [83, -32] ] },
	{ name: "Madagascar", closed: true, pts: [ [-12, 49], [-25, 47], [-25, 44], [-16, 44], [-12, 49] ] },
	{ name: "Japan", closed: true, pts: [ [45, 142], [35, 140], [33, 131], [37, 137], [45, 142] ] },
	{ name: "British Isles", closed: true, pts: [ [58, -5], [52, 1], [50, -5], [55, -6], [58, -5] ] }
]

// The named waters, placed by a point rather than an outline - they are
// labels on the map, not shapes.
var feOceans = [
	{ name: "Atlantic", lat: 5, lon: -25 },
	{ name: "Pacific", lat: 0, lon: -150 },
	{ name: "Indian", lat: -20, lon: 75 },
	{ name: "Arctic", lat: 84, lon: 0 }
]

// A short list of bright stars, right ascension and declination in degrees
// (J2000, to about a tenth of a degree). Sixteen of them: enough for the sky
// layer to read as a sky, and not a catalogue.
var feStars = [
	{ name: "Polaris", ra: 37.95, dec: 89.26 },
	{ name: "Sirius", ra: 101.29, dec: -16.72 },
	{ name: "Canopus", ra: 95.99, dec: -52.70 },
	{ name: "Arcturus", ra: 213.92, dec: 19.18 },
	{ name: "Vega", ra: 279.23, dec: 38.78 },
	{ name: "Capella", ra: 79.17, dec: 45.998 },
	{ name: "Rigel", ra: 78.63, dec: -8.20 },
	{ name: "Procyon", ra: 114.83, dec: 5.22 },
	{ name: "Betelgeuse", ra: 88.79, dec: 7.41 },
	{ name: "Achernar", ra: 24.43, dec: -57.24 },
	{ name: "Altair", ra: 297.70, dec: 8.87 },
	{ name: "Aldebaran", ra: 68.98, dec: 16.51 },
	{ name: "Antares", ra: 247.35, dec: -26.43 },
	{ name: "Spica", ra: 201.30, dec: -11.16 },
	{ name: "Deneb", ra: 310.36, dec: 45.28 },
	{ name: "Regulus", ra: 152.09, dec: 11.97 }
]

// =========================================================================
// 1. Modern astronomy, read from the existing engine
// =========================================================================

// Geocentric ecliptic longitude and latitude. The engine publishes
// longitudes; latitude comes from the same heliocentric vectors it already
// computes (the body's position seen from the Earth's), and for the Moon
// from the standard perturbation terms for its latitude. Nothing in
// astrology.js is changed to get this.
function feEclipticOf(key, d) {
	if (key === "sun") return { lon: astroLongitude("sun", d), lat: 0 }

	if (key === "moon") {
		var lon = astroLongitude("moon", d)
		var o = astroElements("moon", d)
		var Mm = aRev(o.M), Nm = aRev(o.N), wm = aRev(o.w)
		var sun = astroSunRect(d)
		var Ms = sun.M
		var Ls = aRev(Ms + sun.w)
		var Lm = aRev(Mm + wm + Nm)
		var Dm = aRev(Lm - Ls)
		var F = aRev(Lm - Nm)
		// mean latitude from the inclination, then the usual corrections
		var lat = 5.1454 * aSin(F)
		lat += -0.173 * aSin(F - 2 * Dm)
		lat += -0.055 * aSin(Mm - F - 2 * Dm)
		lat += -0.046 * aSin(Mm + F - 2 * Dm)
		lat += +0.033 * aSin(F + 2 * Dm)
		lat += +0.017 * aSin(2 * Mm + F)
		return { lon: lon, lat: lat }
	}

	// planets: where they are seen from the Earth, from the engine's own
	// heliocentric positions
	var p = astroHelioPos(key, d)
	var e = astroHelioPos("earth", d)
	var x = p.x - e.x, y = p.y - e.y, z = p.z - e.z
	var r = Math.sqrt(x * x + y * y + z * z)
	return { lon: aAtan2(y, x), lat: (r === 0) ? 0 : Math.asin(z / r) / DEG }
}

// Ecliptic to equatorial: right ascension and declination, degrees.
function feEquatorialOf(key, d) {
	var ec = feEclipticOf(key, d)
	var ecl = astroObliquity(d)
	var xe = aCos(ec.lat) * aCos(ec.lon)
	var ye = aCos(ec.lat) * aSin(ec.lon)
	var ze = aSin(ec.lat)
	var yq = ye * aCos(ecl) - ze * aSin(ecl)
	var zq = ye * aSin(ecl) + ze * aCos(ecl)
	return { ra: aAtan2(yq, xe), dec: Math.asin(zq) / DEG, eclLon: ec.lon, eclLat: ec.lat }
}

// The place on the ground the body stands directly over: its latitude is the
// declination, its longitude is the right ascension measured against the
// sidereal time. This is ordinary observational astronomy, true whatever
// shape the ground is, and it is what the model's plane is then asked to
// arrange.
function feSubPoint(eq, gmst) {
	var lon = aRev(eq.ra - gmst)
	if (lon > 180) lon -= 360
	return { lat: eq.dec, lon: lon }
}

// Greenwich sidereal time for the moment the chart was cast.
function feGMST(chart, ut) {
	return astroLST(chart.d, ut === undefined ? 0 : ut, 0)
}

// How high a body stands in the sky as seen from one place - the modern
// calculation, used for the readout and for daylight.
function feAltAz(eq, gmst, lat, lon) {
	var ha = aRev(gmst + lon - eq.ra)
	var sinAlt = aSin(lat) * aSin(eq.dec) + aCos(lat) * aCos(eq.dec) * aCos(ha)
	var alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / DEG
	var az = aAtan2(-aCos(eq.dec) * aSin(ha), aSin(eq.dec) - aSin(lat) * sinAlt)
	return { alt: alt, az: az, ha: ha }
}

// =========================================================================
// 2. The model's plane
// =========================================================================
//
// The zetetic map is a plane seen from above the North Pole. A place's
// distance from the centre is its co-latitude - the pole is the centre, the
// equator is halfway out, and the Antarctic is the rim all the way round.
// This is the model's own construction of the world, not the globe with an
// axis squashed: nowhere in this file is a 3D Earth flattened. Geographic
// coordinates go in, plane coordinates come out, and only here.
//
// Returned in model units: 0 at the centre, 1 at the rim.
function fePlanePoint(lat, lon) {
	var r = (90 - lat) / 180
	if (r < 0) r = 0
	if (r > 1.25) r = 1.25             // beyond the rim the model does not go
	var a = lon * DEG
	return { x: r * Math.sin(a), y: r * Math.cos(a), r: r }   // 0 deg meridian points down the page
}

// The model holds the lights to be small and close, a few thousand miles up.
// Used for the schematic height bar and the label, never for a position.
function feModelHeight(key) {
	if (key === "sun") return FE_MODEL.sunHeightMiles
	if (key === "moon") return FE_MODEL.moonHeightMiles
	return null                        // the model fixes no height for the planets
}

// =========================================================================
// 3. The view: its own pan and zoom, kept apart from the solar map's camera
// =========================================================================

var feZoom = 1
var feZoomMin = 0.6
var feZoomMax = 40                     // far short of anything that loses precision
var fePanX = 0, fePanY = 0             // in model units, the point at the centre of the canvas
var feShowPaths = false
var feShowStars = true
var feAboutOpen = false
var feAnimFrom = null, feAnimTo = null, feAnimT0 = 0, feAnimDur = 0
var feHit = []                         // what is on screen, for taps

function feReset() {
	feZoom = 1; fePanX = 0; fePanY = 0
	feAnimFrom = null
	astroSelected = null
	astroRenderSelection()
	drawAstroVisual()
}

function feSetZoom(z, focusX, focusY) {
	var next = Math.max(feZoomMin, Math.min(feZoomMax, z))
	if (next === feZoom) return
	feZoom = next
	drawAstroVisual()
}

function feZoomBy(f) { feSetZoom(feZoom * f) }

function fePanBy(dxPx, dyPx, scale) {
	fePanX -= dxPx / scale
	fePanY -= dyPx / scale
	drawAstroVisual()
}

// Centring on something: the flat map has no orbit to swing round, so
// focusing means bringing it to the middle and keeping it there while the
// view is zoomed. Same easing and the same respect for reduced motion as
// the solar map's camera.
function feFocusOn(x, y) {
	if (astroReducedMotion()) { fePanX = x; fePanY = y; drawAstroVisual(); return }
	feAnimFrom = { x: fePanX, y: fePanY }
	feAnimTo = { x: x, y: y }
	feAnimT0 = Date.now()
	feAnimDur = 380
	feAnimate()
}

function feAnimate() {
	if (astroRaf !== null) return
	var step = function () {
		astroRaf = null
		if (feAnimFrom !== null) {
			var t = (Date.now() - feAnimT0) / feAnimDur
			if (t >= 1) { fePanX = feAnimTo.x; fePanY = feAnimTo.y; feAnimFrom = null }
			else {
				var e = 1 - Math.pow(1 - t, 3)
				fePanX = feAnimFrom.x + (feAnimTo.x - feAnimFrom.x) * e
				fePanY = feAnimFrom.y + (feAnimTo.y - feAnimFrom.y) * e
			}
		}
		drawAstroVisual()
		if (feAnimFrom !== null) astroRaf = window.requestAnimationFrame(step)
	}
	astroRaf = window.requestAnimationFrame(step)
}

function feTogglePaths() {
	feShowPaths = !feShowPaths
	$("#feToggPaths").toggleClass("astroViewOn", feShowPaths)
	drawAstroVisual()
}

function feToggleStars() {
	feShowStars = !feShowStars
	$("#feToggStars").toggleClass("astroViewOn", feShowStars)
	drawAstroVisual()
}

function feToggleAbout() {
	feAboutOpen = !feAboutOpen
	var box = document.getElementById("feAbout")
	if (box === null) return
	box.classList.toggle("hideValue", !feAboutOpen)
	var btn = document.getElementById("feAboutBtn")
	if (btn !== null) btn.setAttribute("aria-expanded", feAboutOpen ? "true" : "false")
}

// A tap: the nearest thing drawn, or empty space to let go of the selection.
function feTap(x, y) {
	var best = null, bestD = 1e9
	for (var i = 0; i < feHit.length; i++) {
		var it = feHit[i]
		var dx = it.x - x, dy = it.y - y
		var dist = Math.sqrt(dx * dx + dy * dy)
		if (dist <= it.hit && dist < bestD) { best = it; bestD = dist }
	}
	if (best === null) {
		astroSelected = null
		astroRenderSelection()
		drawAstroVisual()
		return
	}
	astroSelected = best.key
	astroRenderSelection()
	feFocusOn(best.mx, best.my)
}

// What the line under the map says about the selected object here: its place
// in the zodiac from the chart, where it stands overhead, and - if a birth
// place is set - how high it is in that sky. Plus the model's own figure,
// marked as the model's.
function feSelectionDetail(key) {
	var chart = astroLastChart
	if (!chart || !key) return ""
	var objs = astroCelestialObjects(chart)
	var obj = null
	for (var i = 0; i < objs.length; i++) if (objs[i].id === key) obj = objs[i]
	if (obj === null) {
		for (var s = 0; s < feStars.length; s++) {
			if (feStars[s].name === key) {
				return feStars[s].name + " · star · RA " + feStars[s].ra.toFixed(1) +
					"°, dec " + feStars[s].dec.toFixed(1) + "° (J2000)"
			}
		}
		if (key === "birthplace") {
			var v = astroReadInputs()
			return "Birth place · " + v.lat.toFixed(2) + "°, " + v.lon.toFixed(2) + "°"
		}
		return ""
	}

	var ut = feChartUT()
	var gmst = feGMST(chart, ut)
	var eq = feEquatorialOf(obj.id, chart.d)
	var sub = feSubPoint(eq, gmst)
	var txt = obj.name + " · " + obj.deg + "° " + obj.sign.name + (obj.retro ? " Rx" : "")
	txt += " · overhead at " + sub.lat.toFixed(1) + "°, " + sub.lon.toFixed(1) + "°"
	if (astroUseLocation) {
		var v2 = astroReadInputs()
		var aa = feAltAz(eq, gmst, v2.lat, v2.lon)
		txt += " · " + (aa.alt >= 0 ? aa.alt.toFixed(0) + "° above the horizon" : Math.abs(aa.alt).toFixed(0) + "° below it") + " at your birth place"
	}
	var h = feModelHeight(obj.id)
	if (h !== null) txt += " · model height " + h.toLocaleString() + " miles"
	if (obj.id === "moon" && chart.phase) txt += " · " + chart.phase.name
	return txt
}

// The universal time the chart was cast for, so the sidereal time here
// matches the chart exactly rather than being worked out a second way.
function feChartUT() {
	var v = astroReadInputs()
	return v.hh + v.mm / 60 - (astroUseLocation ? v.tz : 0)
}

// =========================================================================
// 4. Drawing
// =========================================================================

function drawAstroChartFlat(c, w, h, chart) {
	c.save()
	c.beginPath(); c.rect(0, 0, w, h); c.clip()

	var cx = w / 2, cy = h / 2
	var scale = feZoom * (Math.min(w, h) / 2 - 14)     // model unit 1 = the rim
	var ut = feChartUT()
	var gmst = feGMST(chart, ut)
	feHit = []

	var faint = astroCssVar("--border-dark-accent", "#3a3a3a")
	var line = astroCssVar("--separator-accent2", "#555")
	var dim = astroCssVar("--font-white-3", "#999")
	var ink = astroCssVar("--font-white-2", "#d0d0d0")
	var touch = (window.matchMedia && window.matchMedia("(pointer: coarse)").matches)

	// model units -> canvas
	function toScreen(p) { return { x: cx + (p.x - fePanX) * scale, y: cy + (p.y - fePanY) * scale } }
	function geoScreen(lat, lon) { return toScreen(fePlanePoint(lat, lon)) }

	// ---- the plane itself -------------------------------------------
	var rim = toScreen({ x: 0, y: 0 })
	c.fillStyle = "hsla(210, 40%, 12%, 0.55)"          // the waters
	c.beginPath(); c.arc(rim.x, rim.y, scale, 0, Math.PI * 2); c.fill()

	// latitude rings, every 15 degrees, labelled sparsely
	c.strokeStyle = faint
	c.globalAlpha = 0.8
	for (var lat = 75; lat >= -75; lat -= 15) {
		var rr = ((90 - lat) / 180) * scale
		c.beginPath(); c.arc(rim.x, rim.y, rr, 0, Math.PI * 2); c.stroke()
	}
	// meridians every 30 degrees
	for (var lon = 0; lon < 360; lon += 30) {
		var a = geoScreen(90, lon), b = geoScreen(-90, lon)
		c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke()
	}
	c.globalAlpha = 1

	// equator, drawn a little stronger than the rest of the grid
	c.strokeStyle = line
	c.beginPath(); c.arc(rim.x, rim.y, scale / 2, 0, Math.PI * 2); c.stroke()

	// ---- daylight, from the modern calculation ----------------------
	// The terminator is where the Sun's altitude is zero. Exact, and named
	// on screen as the modern answer: the zetetic model treats daylight as
	// a limited circle of light instead, and does not fix its size.
	var sunEq = feEquatorialOf("sun", chart.d)
	if (Math.abs(sunEq.dec) > 0.05) {
		// The curve of sunrise and sunset. At the pole the Sun's altitude is
		// its declination, so that tells us which side of the curve is day.
		var poleLit = (sunEq.dec > 0)
		var terminator = function () {
			for (var t = 0; t <= 360; t += 2) {
				var ha = aRev(gmst + t - sunEq.ra)
				var latT = Math.atan(-aCos(ha) / Math.tan(sunEq.dec * DEG)) / DEG
				var pt = geoScreen(latT, t)
				if (t === 0) c.moveTo(pt.x, pt.y); else c.lineTo(pt.x, pt.y)
			}
			c.closePath()
		}
		var dayWash = "hsla(205, 75%, 55%, 0.17)"
		var nightWash = "hsla(225, 50%, 4%, 0.55)"
		c.save()
		c.beginPath(); c.arc(rim.x, rim.y, scale, 0, Math.PI * 2); c.clip()

		// inside the curve, and the rest of the plane: one is day, the other
		// night, and which is which depends on the season
		c.beginPath(); terminator()
		c.fillStyle = poleLit ? dayWash : nightWash
		c.fill()
		c.beginPath()
		c.arc(rim.x, rim.y, scale, 0, Math.PI * 2)
		terminator()
		c.fillStyle = poleLit ? nightWash : dayWash
		c.fill("evenodd")

		c.strokeStyle = "hsla(45, 70%, 70%, 0.35)"
		c.beginPath(); terminator(); c.stroke()
		c.restore()
	}

	// ---- coastlines --------------------------------------------------
	c.strokeStyle = "hsl(150 25% 45%)"
	c.lineWidth = 1
	c.globalAlpha = 0.9
	for (var g = 0; g < feOutlines.length; g++) {
		var land = feOutlines[g]
		c.beginPath()
		for (var i = 0; i < land.pts.length; i++) {
			var q = geoScreen(land.pts[i][0], land.pts[i][1])
			if (i === 0) c.moveTo(q.x, q.y); else c.lineTo(q.x, q.y)
		}
		if (land.closed) c.closePath()
		c.stroke()
		if (feZoom >= 1.6) {                       // names only once there is room
			var mid = geoScreen(land.pts[0][0], land.pts[0][1])
			c.fillStyle = dim
			c.font = "10px sans-serif"; c.textAlign = "left"; c.textBaseline = "middle"
			c.fillText(land.name, mid.x + 4, mid.y)
		}
	}
	c.globalAlpha = 1

	// the Antarctic perimeter: a ring at the edge, which is how the model
	// arranges the far south - not a continent at a pole
	c.strokeStyle = "hsl(200 20% 60%)"
	c.globalAlpha = 0.5
	c.beginPath(); c.arc(rim.x, rim.y, ((90 + 63) / 180) * scale, 0, Math.PI * 2); c.stroke()
	c.beginPath(); c.arc(rim.x, rim.y, ((90 + 78) / 180) * scale, 0, Math.PI * 2); c.stroke()
	c.globalAlpha = 1
	c.strokeStyle = astroCssVar("--separator-accent2", "#666")
	c.lineWidth = 1.6
	c.beginPath(); c.arc(rim.x, rim.y, scale, 0, Math.PI * 2); c.stroke()
	c.lineWidth = 1

	if (feZoom < 3) {
		c.fillStyle = dim
		c.font = "9px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"
		var rimLbl = toScreen({ x: 0, y: 1 })
		c.fillText(FE_MODEL.rimName, rimLbl.x, rimLbl.y - 8)
		if (feZoom >= 1.2) {
			for (var oc = 0; oc < feOceans.length; oc++) {
				var op = geoScreen(feOceans[oc].lat, feOceans[oc].lon)
				c.fillStyle = "hsl(205 30% 52%)"
				c.fillText(feOceans[oc].name, op.x, op.y)
			}
		}
	}

	// the centre
	var pole = geoScreen(90, 0)
	c.fillStyle = ink
	c.beginPath(); c.arc(pole.x, pole.y, 2, 0, Math.PI * 2); c.fill()
	c.font = "9px sans-serif"; c.textAlign = "left"; c.textBaseline = "middle"
	c.fillStyle = dim
	c.fillText("North Pole", pole.x + 5, pole.y - 6)

	// ---- the zodiac, in whichever zodiac the chart is cast in --------
	// Each sign is drawn where its own longitude currently stands overhead,
	// so the ring turns with the sky and belongs to the selected system.
	var ayan = chart.ayanamsa || 0
	c.font = "12px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"
	for (var s = 0; s < 12; s++) {
		var frameLon = s * 30 + 15                      // middle of the sign
		var eqS = feZodiacEquatorial(frameLon + ayan, chart.d)
		var subS = feSubPoint(eqS, gmst)
		var ang = subS.lon * DEG
		var rz = scale * 1.045
		var zx = rim.x + rz * Math.sin(ang), zy = rim.y + rz * Math.cos(ang)
		c.fillStyle = astroSignColor(s)
		c.globalAlpha = 0.85
		c.fillText(astroSigns[s].glyph, zx, zy)
		c.globalAlpha = 1
	}

	// ---- stars -------------------------------------------------------
	if (feShowStars) {
		for (var st = 0; st < feStars.length; st++) {
			var starSub = feSubPoint({ ra: feStars[st].ra, dec: feStars[st].dec }, gmst)
			var sp = geoScreen(starSub.lat, starSub.lon)
			if (sp.x < -20 || sp.x > w + 20 || sp.y < -20 || sp.y > h + 20) continue
			c.fillStyle = "rgba(255,255,255,0.55)"
			c.beginPath(); c.arc(sp.x, sp.y, 1.4, 0, Math.PI * 2); c.fill()
			if (feZoom >= 2.2) {
				c.fillStyle = "rgba(255,255,255,0.4)"
				c.font = "9px sans-serif"; c.textAlign = "left"; c.textBaseline = "middle"
				c.fillText(feStars[st].name, sp.x + 4, sp.y)
			}
			feHit.push({ key: feStars[st].name, kind: "star", x: sp.x, y: sp.y,
				mx: fePlanePoint(starSub.lat, starSub.lon).x, my: fePlanePoint(starSub.lat, starSub.lon).y,
				hit: touch ? 14 : 9 })
		}
	}

	// ---- the birth place ---------------------------------------------
	if (astroUseLocation) {
		var vb = astroReadInputs()
		var bp = geoScreen(vb.lat, vb.lon)
		var bpm = fePlanePoint(vb.lat, vb.lon)
		c.strokeStyle = astroCssVar("--focus-outline", "#ddd")
		c.beginPath(); c.arc(bp.x, bp.y, 4, 0, Math.PI * 2); c.stroke()
		c.beginPath(); c.moveTo(bp.x - 7, bp.y); c.lineTo(bp.x + 7, bp.y); c.stroke()
		c.beginPath(); c.moveTo(bp.x, bp.y - 7); c.lineTo(bp.x, bp.y + 7); c.stroke()
		c.fillStyle = ink
		c.font = "10px sans-serif"; c.textAlign = "left"; c.textBaseline = "middle"
		c.fillText("Birth place", bp.x + 9, bp.y + 9)
		feHit.push({ key: "birthplace", kind: "place", x: bp.x, y: bp.y, mx: bpm.x, my: bpm.y, hit: touch ? 18 : 12 })
	}

	// ---- the lights ---------------------------------------------------
	var objs = astroCelestialObjects(chart)
	var sel = astroSelected ? String(astroSelected).toLowerCase() : null

	// their tracks over the day, if asked for
	if (feShowPaths) {
		c.globalAlpha = 0.45
		for (var pi = 0; pi < objs.length; pi++) {
			if (feZoom < 1.2 && objs[pi].type === "planet") continue
			c.strokeStyle = astroPlanetColor(objs[pi].id) || dim
			c.beginPath()
			for (var hh = -12; hh <= 12; hh += 0.5) {
				var dd = chart.d + hh / 24
				var eqP = feEquatorialOf(objs[pi].id, dd)
				var subP = feSubPoint(eqP, astroLST(dd, ut + hh, 0))
				var pp = geoScreen(subP.lat, subP.lon)
				if (hh === -12) c.moveTo(pp.x, pp.y); else c.lineTo(pp.x, pp.y)
			}
			c.stroke()
		}
		c.globalAlpha = 1
	}

	for (var oi = 0; oi < objs.length; oi++) {
		var obj = objs[oi]
		var eqO = feEquatorialOf(obj.id, chart.d)
		var subO = feSubPoint(eqO, gmst)
		var plane = fePlanePoint(subO.lat, subO.lon)
		var scr = toScreen(plane)
		var isSel = (sel !== null && obj.id.toLowerCase() === sel)
		var big = (obj.id === "sun") ? 6 : (obj.id === "moon" ? 5 : 3.4)

		if (obj.id === "sun") {
			var grad = c.createRadialGradient(scr.x, scr.y, 0, scr.x, scr.y, 16)
			grad.addColorStop(0, "hsla(50, 100%, 80%, 0.95)")
			grad.addColorStop(1, "hsla(45, 100%, 55%, 0)")
			c.fillStyle = grad
			c.beginPath(); c.arc(scr.x, scr.y, 16, 0, Math.PI * 2); c.fill()
		}
		c.fillStyle = astroPlanetColor(obj.id) || "#ddd"
		if (obj.id === "sun") c.fillStyle = "hsl(48 100% 70%)"
		c.beginPath(); c.arc(scr.x, scr.y, big, 0, Math.PI * 2); c.fill()

		if (isSel) {
			c.strokeStyle = astroCssVar("--focus-outline", "#ddd")
			c.lineWidth = 1.5
			c.beginPath(); c.arc(scr.x, scr.y, big + 5, 0, Math.PI * 2); c.stroke()
			c.lineWidth = 1
		}

		// the Sun and Moon keep their names; a planet earns one as the view
		// closes in, so the wide view is not a field of labels
		if (obj.id === "sun" || obj.id === "moon" || isSel || feZoom >= 1.5) {
			c.fillStyle = isSel ? astroCssVar("--font-white-1", "#eee") : ink
			c.font = "11px sans-serif"; c.textAlign = "left"; c.textBaseline = "middle"
			c.fillText(obj.glyph + " " + obj.name, scr.x + 8, scr.y)
		}

		feHit.push({ key: obj.id, kind: obj.type, x: scr.x, y: scr.y, mx: plane.x, my: plane.y,
			hit: (touch ? 22 : 14) })
	}

	// ---- the footing --------------------------------------------------
	c.fillStyle = dim
	c.font = "10px sans-serif"; c.textAlign = "left"; c.textBaseline = "alphabetic"
	c.fillText("Historical zetetic model · positions from modern astronomy · daylight: modern", 8, h - 8)
	c.restore()
}

// The point of the sky at a given tropical longitude on the ecliptic, used
// for the zodiac ring. Takes a tropical longitude, because the sky is what
// it is; the caller adds the ayanamsa back on for a sidereal chart.
function feZodiacEquatorial(tropicalLon, d) {
	var ecl = astroObliquity(d)
	var lon = aRev(tropicalLon)
	var xe = aCos(lon), ye = aSin(lon) * aCos(ecl), ze = aSin(lon) * aSin(ecl)
	return { ra: aAtan2(ye, xe), dec: Math.asin(ze) / DEG }
}

// ---- the panel's own controls for this view ----------------------------

function feControlsHtml() {
	var o = '<div id="feControls" class="feControls hideValue">'
	o += '<button type="button" class="intBtn3 astroZoomBtn" onclick="feZoomBy(1/1.4)" aria-label="Zoom out">&minus;</button>'
	o += '<span id="feZoomLabel">1.0x</span>'
	o += '<button type="button" class="intBtn3 astroZoomBtn" onclick="feZoomBy(1.4)" aria-label="Zoom in">+</button>'
	o += '<button type="button" class="intBtn3 astroZoomBtn astroZoomReset" onclick="feReset()">Reset</button>'
	o += '<button type="button" id="feToggPaths" class="intBtn3 astroZoomBtn feWideBtn" onclick="feTogglePaths()" aria-pressed="false">Paths</button>'
	o += '<button type="button" id="feToggStars" class="intBtn3 astroZoomBtn feWideBtn astroViewOn" onclick="feToggleStars()" aria-pressed="true">Stars</button>'
	o += '<button type="button" id="feAboutBtn" class="intBtn3 astroZoomBtn feWideBtn" onclick="feToggleAbout()" aria-expanded="false" aria-controls="feAbout">About this model</button>'
	o += '</div>'
	o += '<div id="feAbout" class="feAbout hideValue">' + authEsc(FE_MODEL.about) + '</div>'
	return o
}

function feSyncControls() {
	var lbl = document.getElementById("feZoomLabel")
	if (lbl !== null) lbl.textContent = (feZoom < 10 ? feZoom.toFixed(1) : Math.round(feZoom)) + "x"
	$("#feToggPaths").attr("aria-pressed", feShowPaths ? "true" : "false").toggleClass("astroViewOn", feShowPaths)
	$("#feToggStars").attr("aria-pressed", feShowStars ? "true" : "false").toggleClass("astroViewOn", feShowStars)
}

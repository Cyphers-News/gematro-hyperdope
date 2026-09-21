// ===================== Numogram (Decimal Labyrinth) =====================
//
// The CCRU Numogram, drawn as the original diagram and made interactive.
//
// EVERYTHING IS GENERATED FROM THE DATA BELOW. The six structures - zones,
// syzygies, currents, gates, channels, timeSystems - are the only place a
// number or a position is written down. The SVG, the highlighting, the
// annotations and the arithmetic all read from them, so the picture cannot
// disagree with the model.
//
// ---- the model, and where it comes from -------------------------------
//
// Three rules from CCRU material define the whole figure:
//
//   "zones are grouped into five pairs (syzygies) by nine-sum twinning"
//   "the arithmetical difference of each syzygy defines a current
//    (or connection to a tractor zone)"
//   "each zone number when digitally cumulated defines the value of a gate,
//    whose reduction sets the course of a corresponding channel"
//
// Digital cumulation of n is 1+2+...+n, the triangular number n(n+1)/2, which
// is where the gate values 1, 3, 6, 10, 15, 21, 28, 36, 45 come from.
//
// "Reduction" is ambiguous in the sources between a single pass of digit
// summing and a repeated one (digital root). Gate 28 decides it: the sourced
// channel table runs 7 -> 1, which is the digital root (2+8=10, 1+0=1), not
// the single pass (10). numReduce() is therefore the digital root, and that
// one choice is the only place the ambiguity lands.
//
// Sources are community transcriptions of CCRU: Writings 1997-2003, not the
// book itself. The three rules above are quoted consistently across them; the
// gate/channel table was re-derived from the rules here and matched. Treat the
// structure as solid, the provenance as second-hand.
//
// ---- which reference image is canonical -------------------------------
//
// Two were supplied and they disagree, so one had to be chosen and the choice
// recorded.
//
//   3.jpg  The CCRU 1997-2003 cover: black figure on the green field. Its
//          gate labels read 1, 3, 6, 10, 15, 21, 28, 36, 45 - every one the
//          correct triangular number. CANONICAL.
//
//   4.webp A redrawing. It is horizontally MIRRORED relative to the cover,
//          and two of its gate labels are wrong: 16 where the cover has 15
//          (the cumulation of 5 is 15), and 8 where the cover has 3 (the
//          cumulation of 2 is 3). Not used for values.
//
// The arrangement here follows the written brief - Zone-6 upper-left, Zone-3
// upper-right - which matches 4.webp's orientation rather than the cover's.
// The cover has that pair the other way round. The brief has specified it
// twice and asked for it to be preserved, so it is preserved; the geometry is
// data-driven, so mirroring the figure later is x -> width - x and nothing
// else. Everything other than that one pair follows the cover.
var NUM_REFERENCE = Object.freeze({
	canonical: "3.jpg - CCRU 1997-2003 cover",
	secondary: "4.webp - redrawing, mirrored, gate labels 16 and 8 incorrect",
	orientationFollows: "written brief (6 upper-left, 3 upper-right)",
	orientationNote: "the cover shows 3 upper-left and 6 upper-right"
})

// ---- on the earlier reference image -----------------------------------
//
// The visual reference supplied for this build is a degraded reproduction: it
// carries nine zone circles rather than ten, labels two of them "1", omits
// Zone-7, and repeats the Gt-28 annotation while omitting Gt-15 and Gt-21.
// Its composition, line weights, circle treatment and annotation style are
// followed closely. Its content is not - the structure below comes from the
// rules above. numogramCorrections() states this in the panel rather than
// leaving it implicit.

// ------------------------------------------------------- provenance
//
// Every claim this feature displays carries one of three statuses, and the
// interface prints it. The distinction matters more than the feature does:
// none of the interpretive or experimental material is Nick Land's, and a
// reader must never have to guess which is which.
//
//   canonical    - follows from rules stated in CCRU material
//   attested     - a real practice of the CCRU circle, but its own system,
//                  with no stated relationship to the Numogram
//   experimental - this application's own operation. Nobody's doctrine.
var NUM_SOURCES = {
	structure: {
		status: "canonical",
		claim: "Ten zones, nine-sum syzygies, currents as arithmetical difference, " +
			"gates as digital cumulation, channels as the reduction of a gate.",
		source: "CCRU material (Decimal Labyrinth / Pandemonium Matrix), via community " +
			"transcriptions of CCRU: Writings 1997-2003. Rules quoted consistently across " +
			"sources; the gate and channel table was re-derived from those rules and matched."
	},
	reduction: {
		status: "canonical",
		claim: "Reduction is the digital root.",
		source: "Fixed by the sourced channel table: Gate 28 runs to Zone-1, which is " +
			"2+8=10, 1+0=1. A single pass would give 10. The sources do not state which " +
			"is meant, so this is the reading the table forces rather than a free choice."
	},
	aq: {
		status: "attested",
		claim: "Anglossic / Alphanumeric Qabbala: 0-9 take their own value, A=10 through " +
			"Z=35, and a string's value is the sum of its characters.",
		source: "Nick Land, 'Qabbala 101', Collapse I (2007); used across CCRU writings. " +
			"A genuine practice of that circle - but a separate system. No source " +
			"establishes any formal relationship between AQ and the Numogram."
	},
	planetwork: {
		status: "canonical",
		claim: "The Lemurian Planetwork: Zone n is Sol-n, the nth body outward from the " +
			"Sun, with the Sun itself at Zone-0 and Pluto at Zone-9.",
		source: "CCRU zone pages, which write Jupiter as 'Sol-5' at Zone-5 and give the " +
			"astrozygonomous pairings - Mercury with Neptune, Earth with Saturn, Jupiter " +
			"with Mars, Pluto with the Sun. Those pairings are the same 1::8, 3::6, 4::5 " +
			"and 0::9 the arithmetic already produces, which is an independent check."
	},
	ptolemy: {
		status: "historical",
		claim: "Earth at the centre, then Moon, Mercury, Venus, Sun, Mars, Jupiter, Saturn, " +
			"then the sphere of the fixed stars. Mercury and Venus are the inferior planets, " +
			"Mars, Jupiter and Saturn the superior, divided by the Sun's sphere. Retrograde " +
			"motion is accounted for by an epicycle riding a deferent.",
		source: "The Ptolemaic tradition, following the Almagest, with the ordering argued " +
			"from apparent speed rather than measured distance. Uranus, Neptune and Pluto " +
			"are not part of it and are not placed in it here - they appear only in the " +
			"extended set, as the post-Ptolemaic extension they are. The epicycle drawn " +
			"is schematic geometry: no radius, period or equant is claimed as Ptolemy's."
	},
	crossmap: {
		status: "experimental",
		claim: "Placing the Planetwork's bodies at their classical geocentric positions, " +
			"and striking the spheres from Zone-3 because the Planetwork puts Earth there.",
		source: "This application's own cross-mapping. Ptolemy did not anticipate the CCRU; " +
			"the CCRU was not Ptolemaic; Nick Land did not design a geocentric Numogram. " +
			"The Planetwork counts outward from the Sun, so its ordering is solar-centred - " +
			"that much is demonstrable from the Sol-n notation. What is NOT established is " +
			"any CCRU discussion of heliocentrism as such, and none is claimed here. " +
			"Changing the cosmological frame changes nothing about the Numogram's " +
			"arithmetic: no geocentric syzygies, currents or gates have been invented."
	},
	bridge: {
		status: "experimental",
		claim: "Reducing an arbitrary number - or an AQ total - to a zone, and reading " +
			"that zone's relationships.",
		source: "This application's own operation. Digital reduction is canonical inside " +
			"the Numogram, where it carries a gate to its channel. Applying it to a number " +
			"from outside the figure is not something the source material does."
	}
}

var NUM_STATUS_LABEL = {
	canonical: "CANONICAL",
	historical: "HISTORICAL \u00b7 PTOLEMAIC TRADITION",
	attested: "ATTESTED · NOT NUMOGRAMMATIC",
	experimental: "EXPERIMENTAL · NOT A CCRU PROCEDURE"
}

var numogramMenuOpened = false

// ---------------------------------------------------------------- geometry
//
// ===================== CANONICAL GEOMETRY ================================
//
// The one place a zone position is written down. Frozen: the cosmological
// layers read it and never write to it, so no overlay can push the canonical
// figure out of shape. That happened once - the geocentric work distorted the
// diagram - and freezing is what stops it happening again silently.
//
// The arrangement is the Numogram's own, and the thing that makes it legible
// is that EVERY SYZYGY PAIR IS ADJACENT. The five twinned pairs step down the
// figure as five close couples, each offset slightly from the last:
//
//        [3][6]                 Warp,  across the top
//                    [2]        Hold,  the right-hand couple
//                    [7]
//        [5]                    Sink,  the left-hand couple
//      [4]
//            [1]                Torque enters the spine
//            [8]
//            [9]                Plex
//            [0]                the figure terminates
//
// An earlier build had the pairs scattered across the field - 3 and 6 at
// opposite ends of the top, 2 adrift in the middle, 4 and 5 two hundred units
// apart. That destroyed the one relationship the figure exists to show, and it
// is what made the drawing read as a hunched vertical squiggle rather than as
// the Numogram. Positions below are on the canonical 21-unit-radius figure,
// scaled 2.3x so that a zone radius lands at 48 and the gate radius the rest
// of this file assumes (NUM_GATE_R = 23) stays in proportion.
//
// Radii are uniform. They were not before, and the variation was noise: no
// zone outranks another.
var CANONICAL_GEOMETRY = Object.freeze({
	width: 800,
	height: 1200,
	zones: Object.freeze({
		3: Object.freeze({ x: 273, y: 88,   r: 48 }),
		6: Object.freeze({ x: 384, y: 107,  r: 48 }),
		2: Object.freeze({ x: 588, y: 316,  r: 48 }),
		7: Object.freeze({ x: 607, y: 424,  r: 48 }),
		5: Object.freeze({ x: 218, y: 426,  r: 48 }),
		4: Object.freeze({ x: 158, y: 518,  r: 48 }),
		1: Object.freeze({ x: 402, y: 679,  r: 48 }),
		8: Object.freeze({ x: 402, y: 790,  r: 48 }),
		9: Object.freeze({ x: 402, y: 946,  r: 48 }),
		0: Object.freeze({ x: 402, y: 1057, r: 48 })
	})
})

var NUM_W = CANONICAL_GEOMETRY.width, NUM_H = CANONICAL_GEOMETRY.height

// The zone list the renderer walks, built from the geometry above and from the
// syzygy each zone belongs to. Positions are copied out, never referenced, so
// nothing downstream can reach back and mutate the canonical record.
var NUM_ZONES = (function () {
	var sy = { 0: "0::9", 9: "0::9", 1: "1::8", 8: "1::8", 2: "2::7", 7: "2::7",
	           3: "3::6", 6: "3::6", 4: "4::5", 5: "4::5" }
	var out = []
	for (var n = 0; n <= 9; n++) {
		var g = CANONICAL_GEOMETRY.zones[n]
		out.push({ n: n, x: g.x, y: g.y, r: g.r, sy: sy[n] })
	}
	return out
})()

// --------------------------------------------------------------- syzygies
//
// Nine-sum twinning. The current is the arithmetical difference, and it runs
// to the zone of that value - the tractor. Two of the five land back inside
// themselves (0::9 -> 9, and 3::6 -> 3); those are the two closed loops, Plex
// and Warp. The other three close into a single cycle, which is the Torque:
//
//     1::8 -current 7-> 2::7 -current 5-> 4::5 -current 1-> 1::8
//
// That the remainder closes exactly is the model checking itself; the test
// suite asserts it rather than trusting the comment.
// The current names are CCRU's own, taken from the zone pages, which state
// them as "Tractor-Zone of the 8-1 (or 'Surge') Current" and so on for each.
// All five are attested; none is inferred from the arithmetic.
var NUM_SYZYGIES = Object.freeze([
	Object.freeze({ key: "0::9", a: 0, b: 9, demon: "Uttunul", sys: "plex",   current: "PLEX"  }),
	Object.freeze({ key: "1::8", a: 1, b: 8, demon: "Murmur",  sys: "torque", current: "SURGE" }),
	Object.freeze({ key: "2::7", a: 2, b: 7, demon: "Oddubb",  sys: "torque", current: "HOLD"  }),
	Object.freeze({ key: "3::6", a: 3, b: 6, demon: "Djynxx",  sys: "warp",   current: "WARP"  }),
	Object.freeze({ key: "4::5", a: 4, b: 5, demon: "Katak",   sys: "torque", current: "SINK"  })
])

// ---- the Pandemonium, named ---------------------------------------------
//
// Forty-five Lemurs, one per pair of zones, taken from the Mesh entries in
// CCRU: Writings 1997-2003 (Mesh-00 to Mesh-44). Name, alias, title, demonic
// class and routes are CCRU's; none of it is derived here and none invented.
// `rt` holds the Numogram routes each entry gives, with CCRU's reading of them.
//
// The pair is stored low::high so it can be looked up from two zones in either
// order. CCRU writes them high::low in the Phase listings and low::high in some
// of the Mesh entries; both name the same Lemur.
var NUM_LEMURS = Object.freeze([
	Object.freeze({ m:0, a:0, b:1, name:'Lurgo', alias:'Legba', title:'(Terminal) Initiator', klass:'Amphidemon of Openings', rt:Object.freeze([Object.freeze({n:1,p:'1890',t:'Spinal-voyage (fate line), programming'})]) }),
	Object.freeze({ m:1, a:0, b:2, name:'Duoddod', alias:'', title:'Duplicitous Redoubler', klass:'Amphidemon of Abstract Addiction', rt:Object.freeze([Object.freeze({n:1,p:'271890',t:'Pineal-regression (rear vision)'}),Object.freeze({n:2,p:'27541890',t:'Datacomb searches, digital exactitude (every second counts)'})]) }),
	Object.freeze({ m:2, a:1, b:2, name:'Doogu', alias:'The Blob', title:'Original-Schism', klass:'Cyclic Chronodemon of Splitting-Waters', rt:Object.freeze([Object.freeze({n:1,p:'1872',t:'Mn. Primordial breath (pneumatic practices)'}),Object.freeze({n:2,p:'271',t:'Ambivalent capture, hooks (live-bait, traps, plot-twists)'}),Object.freeze({n:3,p:'27541',t:'Mj. Slow pull to stasis, protection from drowning'})]) }),
	Object.freeze({ m:3, a:0, b:3, name:'Ixix', alias:'Yix', title:'Abductor', klass:'Chaotic Xenodemon of Cosmic Indifference', rt:Object.freeze([Object.freeze({n:0,p:'?',t:'Occult terrestrial history (Who does the Earth think It Is?)'})]) }),
	Object.freeze({ m:4, a:1, b:3, name:'Ixigool', alias:'Djinn of the Magi', title:'Over-Ghoul', klass:'Amphidemon of Tridentity (Sphinx-time)', rt:Object.freeze([Object.freeze({n:1,p:'18723',t:'Unimpeded ascent (prophecy)'}),Object.freeze({n:2,p:'1872563',t:'Ultimate implications, (as above so below)'})]) }),
	Object.freeze({ m:5, a:2, b:3, name:'Ixidod', alias:'King Sid', title:'The Zombie-Maker', klass:'Amphidemon of Escape-velocity', rt:Object.freeze([Object.freeze({n:1,p:'23',t:'Crises through excess (micropause abuse)'}),Object.freeze({n:2,p:'27563',t:'Illusion of progress (out of the frying-pan into the fire)'})]) }),
	Object.freeze({ m:6, a:0, b:4, name:'Krako', alias:'Kru, Karak-oa', title:'The Croaking Curse', klass:'Amphidemon of Burning-Hail', rt:Object.freeze([Object.freeze({n:1,p:'41890',t:'Subsidence, heaviness of fatality'})]) }),
	Object.freeze({ m:7, a:1, b:4, name:'Sukugool', alias:'Old Skug', title:'The Sucking-Ghoul', klass:'Cyclic Chronodemon of deluge and implosion', rt:Object.freeze([Object.freeze({n:1,p:'187254',t:'Mn. Cycle of creation and destruction'}),Object.freeze({n:2,p:'41',t:'Mj. Submersion (gravedigging)'})]) }),
	Object.freeze({ m:8, a:2, b:4, name:'Skoodu', alias:'Li\'l Scud', title:'The Fashioner', klass:'Cyclic Chronodemon of Switch-Crazes', rt:Object.freeze([Object.freeze({n:1,p:'2754',t:'Mn. Historical time (eschatology)'}),Object.freeze({n:2,p:'41872',t:'Passage through the deep'}),Object.freeze({n:3,p:'451872',t:'Mj. Cyclic reconstitution and stability'})]) }),
	Object.freeze({ m:9, a:3, b:4, name:'Skarkix', alias:'Sharky, Scar-head', title:'Buzz-Cutter', klass:'Amphidemon of anti-evolution (eddies of the Delta)', rt:Object.freeze([Object.freeze({n:1,p:'418723',t:'Hermetic abbreviations (history of the magicians)'}),Object.freeze({n:2,p:'4518723',t:'Sacred seal of time (triadic reconfirmation of the cycle)'}),Object.freeze({n:3,p:'4563',t:'Apocalyptic rapture (jagged turbulence)'})]) }),
	Object.freeze({ m:10, a:0, b:5, name:'Tokhatto', alias:'Old Toker, Top Cat', title:'Decimal Camouflage', klass:'Amphidemon of Talismania', rt:Object.freeze([Object.freeze({n:1,p:'541890',t:'Number as destiny (digital convergence)'})]) }),
	Object.freeze({ m:11, a:1, b:5, name:'Tukkamu', alias:'', title:'Occulturation', klass:'Cyclic Chronodemon of Pathogenesis', rt:Object.freeze([Object.freeze({n:1,p:'18725',t:'Mn. Optimal maturation (medicine as diffuse healing)'}),Object.freeze({n:2,p:'541',t:'Mj. Rapid deterioration (putrefaction, catabolism)'})]) }),
	Object.freeze({ m:12, a:2, b:5, name:'Kuttadid', alias:'Kitty', title:'Ticking Machines', klass:'Cyclic Chronodemon of Precarious States', rt:Object.freeze([Object.freeze({n:1,p:'275',t:'Mn. Maintaining balance (calendric conservatism)'}),Object.freeze({n:2,p:'541872',t:'Mj. Exhaustive vigilance'})]) }),
	Object.freeze({ m:13, a:3, b:5, name:'Tikkitix', alias:'Tickler', title:'Clicking Menaces', klass:'Amphidemon of Vortical Delirium', rt:Object.freeze([Object.freeze({n:1,p:'5418723',t:'Swirl-patterns (tornadoes, wind-voices)'}),Object.freeze({n:2,p:'563',t:'Mysterious disappearances (things carried-away)'})]) }),
	Object.freeze({ m:14, a:4, b:5, name:'Katak', alias:'', title:'Desolator', klass:'Syzygetic Chronodemon of Cataclysmic Convergence', rt:Object.freeze([Object.freeze({n:0,p:'X',t:'Tail-chasing, rabid animals (nature red in tooth and claw)'}),Object.freeze({n:1,p:'418725',t:'Panic (slasher pulp and religious fervour)'})]) }),
	Object.freeze({ m:15, a:0, b:6, name:'Tchu', alias:'Tchanul', title:'Source of Subnothingness', klass:'Chaotic Xenodemon of Ultimate Outsideness (and unnamable things)', rt:Object.freeze([Object.freeze({n:0,p:'?',t:'Cosmic deletions and real impossibilities'})]) }),
	Object.freeze({ m:16, a:1, b:6, name:'Djungo', alias:'', title:'Infiltrator', klass:'Amphidemon of Subtle Involvements (and intricate puzzles)', rt:Object.freeze([Object.freeze({n:1,p:'187236',t:'Turbular fluids (maelstroms, chaotic incalculability)'}),Object.freeze({n:2,p:'187256',t:'Surreptitious invasions, inexplicable contaminations (fish falls)'})]) }),
	Object.freeze({ m:17, a:2, b:6, name:'Djuddha', alias:'Judd Dread', title:'Decentred Threat', klass:'Amphidemon of Artificial Turbulence (complex-dynamics simulations)', rt:Object.freeze([Object.freeze({n:1,p:'236',t:'Machine-vortex (seething skin)'}),Object.freeze({n:2,p:'256',t:'Storm peripheries (Wendigo legends)'})]) }),
	Object.freeze({ m:18, a:3, b:6, name:'Djynxx', alias:'Ching, The Jinn', title:'Child Stealer', klass:'Xenodemon of Time-Lapse', rt:Object.freeze([Object.freeze({n:0,p:'X',t:'Abstract cyclones, dust spirals (nomad war-machine)'})]) }),
	Object.freeze({ m:19, a:4, b:6, name:'Tchakki', alias:'Chuckles', title:'Bag of Tricks', klass:'Amphidemon of Combustion', rt:Object.freeze([Object.freeze({n:1,p:'4187236',t:'Quenching accidents (apprentice smiths)'}),Object.freeze({n:2,p:'45187236',t:'Mappings between incompatible time-systems (Herakleitean fire-cycle). [+1 sub- Rt]'}),Object.freeze({n:3,p:'456',t:'Conflagrations (shrieking deliria, spontaneous combustion)'})]) }),
	Object.freeze({ m:20, a:5, b:6, name:'Tchattuk', alias:'One Eyed Jack, Djatka', title:'Pseudo-Basis', klass:'Amphidemon of Unscreened Matrix', rt:Object.freeze([Object.freeze({n:1,p:'54187236',t:'Zero-gravity'}),Object.freeze({n:2,p:'56',t:'Cut-outs (UFO cover-ups, Nephilim)'})]) }),
	Object.freeze({ m:21, a:0, b:7, name:'Puppo', alias:'The Pup', title:'Break-Outs', klass:'Amphidemon of Larval Regression', rt:Object.freeze([Object.freeze({n:1,p:'71890',t:'Dissolving into slime (masked horrors)'}),Object.freeze({n:2,p:'72541890',t:'Chthonic swallowings'})]) }),
	Object.freeze({ m:22, a:1, b:7, name:'Bubbamu', alias:'Bubs', title:'After Babylon', klass:'Cyclic Chronodemon of Relapse', rt:Object.freeze([Object.freeze({n:1,p:'187',t:'Mn. Hypersea (marine life on land)'}),Object.freeze({n:2,p:'71',t:'Aquassassins (Black-Atlantis)'}),Object.freeze({n:3,p:'72541',t:'Mj. Seawalls (dry-time, taboo on menstruation)'})]) }),
	Object.freeze({ m:23, a:2, b:7, name:'Oddubb', alias:'Odba', title:'Broken Mirror', klass:'Syzygetic Chronodemon of Swamp-Labyrinths (and blind-doubles)', rt:Object.freeze([Object.freeze({n:0,p:'X',t:'Time loops, glamour and glosses'})]) }),
	Object.freeze({ m:24, a:3, b:7, name:'Pabbakis', alias:'Pabzix', title:'Dabbler', klass:'Amphidemon of Interference (and fakery)', rt:Object.freeze([Object.freeze({n:1,p:'723',t:'Batrachian mutations (and frog-plagues)'}),Object.freeze({n:2,p:'72563',t:'Cans of worms (vermophobic hysteria, propagation by division)'})]) }),
	Object.freeze({ m:25, a:4, b:7, name:'Ababbatok', alias:'Abracadabra', title:'Regenerator', klass:'Cyclic Chronodemon of Suspended Decay', rt:Object.freeze([Object.freeze({n:1,p:'4187',t:'Frankensteinian experimentation (reanimations, golems)'}),Object.freeze({n:2,p:'45187',t:'Mn. Purifications, amphibious cycles (and healing of wounds)'}),Object.freeze({n:3,p:'7254',t:'Mj. Sustenance (smoke visions)'})]) }),
	Object.freeze({ m:26, a:5, b:7, name:'Papatakoo', alias:'Pataku', title:'Upholder', klass:'Cyclic Chronodemon of Calendric Time', rt:Object.freeze([Object.freeze({n:1,p:'54187',t:'Mn. Ultimate success (perseverance, blood sacrifice)'}),Object.freeze({n:2,p:'725',t:'Mj. Rituals becoming nature'})]) }),
	Object.freeze({ m:27, a:6, b:7, name:'Bobobja', alias:'Bubbles, Beelzebub (Lord of the Flies', title:'). Heavy Atmosphere', klass:'Amphidemon of Teeming Pestilence', rt:Object.freeze([Object.freeze({n:1,p:'7236',t:'Strange lights in the swamp (dragonflies, ET frog-cults)'}),Object.freeze({n:2,p:'7256',t:'Swarmachines (lost harvests)'})]) }),
	Object.freeze({ m:28, a:0, b:8, name:'Minommo', alias:'', title:'Webmaker', klass:'Amphidemon of Submergance', rt:Object.freeze([Object.freeze({n:1,p:'890',t:'Shamanic voyage (dream sorcery and mitochondrial chatter)'})]) }),
	Object.freeze({ m:29, a:1, b:8, name:'Mur Mur', alias:'Murrumur, Mu(mu', title:'). Dream-Serpent', klass:'Syzygetic Chronodemon of the Deep Ones', rt:Object.freeze([Object.freeze({n:0,p:'X',t:'Oceanic sensation (gilled-unlife and spinal-regressions)'})]) }),
	Object.freeze({ m:30, a:2, b:8, name:'Nammamad', alias:'', title:'Mirroracle', klass:'Cyclic Chronodemon of Subterranean Commerce', rt:Object.freeze([Object.freeze({n:1,p:'2718',t:'Voodoo in cyberspace (cthulhoid traffic)'}),Object.freeze({n:2,p:'275418',t:'Mn. Completion as final collapse (heat-death, degenerative psychoses)'}),Object.freeze({n:3,p:'8172',t:'Mj. Emergences (and things washed-up on beaches)'})]) }),
	Object.freeze({ m:31, a:3, b:8, name:'Mummumix', alias:'Mix-Up', title:'The Mist-Crawler', klass:'Amphidemon of Insidious Fog (Nyarlathotep)', rt:Object.freeze([Object.freeze({n:1,p:'81723',t:'Ocean storms (and xenocommunication on the bacterial plane)'}),Object.freeze({n:2,p:'8172563',t:'Diseases from outer-space (oankali medicine)'})]) }),
	Object.freeze({ m:32, a:4, b:8, name:'Numko', alias:'Old Nuk', title:'Keeper of Old Terrors', klass:'Cyclic Chronodemon of Autochthony', rt:Object.freeze([Object.freeze({n:1,p:'418',t:'Necrospeleology (abysmal patience rewarded)'}),Object.freeze({n:2,p:'4518',t:'Mn. Subduction (and carnivorous fish)'}),Object.freeze({n:3,p:'817254',t:'Mj. Vulcanism (and bacterial intelligence)'})]) }),
	Object.freeze({ m:33, a:5, b:8, name:'Muntuk', alias:'Manta, Manitou', title:'Desert Swimmer', klass:'Cyclic Chronodemon of Arid Seabeds', rt:Object.freeze([Object.freeze({n:1,p:'5418',t:'Mn. Ancient rivers'}),Object.freeze({n:2,p:'81725',t:'Mj. Cloud-vaults and oppressive tension (protection during monsoon)'})]) }),
	Object.freeze({ m:34, a:6, b:8, name:'Mommoljo', alias:'Mama Jo', title:'Alien Mother', klass:'Amphidemon of Xenogenesis', rt:Object.freeze([Object.freeze({n:1,p:'817236',t:'Cosmobacterial exogermination'}),Object.freeze({n:2,p:'817256',t:'Extraterrestrial residues (including alien DNA segments)'})]) }),
	Object.freeze({ m:35, a:7, b:8, name:'Mombbo', alias:'', title:'Tentacle Face (Fishy-princess)', klass:'Cyclic Chronodemon of Hybridity', rt:Object.freeze([Object.freeze({n:1,p:'718',t:'Ophidian transmutation (palaeopythons)'}),Object.freeze({n:2,p:'725418',t:'Mn. Surreptitious colonization'}),Object.freeze({n:3,p:'817',t:'Mj. Surface-amnesia (old fishwives tales)'})]) }),
	Object.freeze({ m:36, a:0, b:9, name:'Uttunul', alias:'', title:'Seething Void', klass:'Xenodemon of Atonality', rt:Object.freeze([Object.freeze({n:0,p:'X',t:'Crossing the iron-ocean (plutonics)'})]) }),
	Object.freeze({ m:37, a:1, b:9, name:'Tutagool', alias:'Yettuk', title:'The Tattered Ghoul', klass:'Amphidemon of Punctuality', rt:Object.freeze([Object.freeze({n:1,p:'189',t:'The dark arts, rusting iron, tattooing (one-way ticket to Hell)'})]) }),
	Object.freeze({ m:38, a:2, b:9, name:'Unnunddo', alias:'The False Nun', title:'Double-Undoing', klass:'Amphidemon of Endless Uncasing (onion-skin horror)', rt:Object.freeze([Object.freeze({n:1,p:'27189',t:'Crypt-traffic (and centipede simulations)'}),Object.freeze({n:2,p:'2754189',t:'Communication-grids (telecom webs, shamanic metallism)'})]) }),
	Object.freeze({ m:39, a:3, b:9, name:'Ununuttix', alias:'Tick-Tock', title:'Particle Clocks', klass:'Chaotic Xenodemon of Absolute Coincidence', rt:Object.freeze([Object.freeze({n:0,p:'?',t:'Numerical connection through the absence of any link'})]) }),
	Object.freeze({ m:40, a:4, b:9, name:'Ununak', alias:'Nuke', title:'Blind Catastrophe', klass:'Amphidemon of Convulsions', rt:Object.freeze([Object.freeze({n:1,p:'4189',t:'Secrets of the blacksmiths'}),Object.freeze({n:2,p:'45189',t:'Subterranean impulses'})]) }),
	Object.freeze({ m:41, a:5, b:9, name:'Tukutu', alias:'Killer-Kate', title:'Cosmotraumatics', klass:'Amphidemon of Death-Strokes', rt:Object.freeze([Object.freeze({n:1,p:'54189',t:'Crash-signals (barkerian scarring)'})]) }),
	Object.freeze({ m:42, a:6, b:9, name:'Unnutchi', alias:'Outch, T\'ai Chi', title:'Tachyonic immobility (slow vortex)', klass:'Chaotic Xenodemon of Coiling Outsideness', rt:Object.freeze([Object.freeze({n:0,p:'?',t:'Asymmetric zygopoise (and cybernetic anomalies)'})]) }),
	Object.freeze({ m:43, a:7, b:9, name:'Nuttubab', alias:'Nut-Cracker', title:'Mimetic Anorganism', klass:'Amphidemon of Metaloid Unlife', rt:Object.freeze([Object.freeze({n:1,p:'7189',t:'Lunacies (iron in the blood)'}),Object.freeze({n:2,p:'7254189',t:'Dragon-lines (terrestrial electromagnetism)'})]) }),
	Object.freeze({ m:44, a:8, b:9, name:'Ummnu', alias:'Om, Omni, Amen, Omen', title:'Ultimate Inconsequence', klass:'Amphidemon of Earth-Screams', rt:Object.freeze([Object.freeze({n:0,p:'89',t:'Crust-friction (anorganic tension)'})]) })
])

function numLemur(a, b) {
	var lo = Math.min(a, b), hi = Math.max(a, b)
	for (var i = 0; i < NUM_LEMURS.length; i++) {
		if (NUM_LEMURS[i].a === lo && NUM_LEMURS[i].b === hi) return NUM_LEMURS[i]
	}
	return null
}

var NUM_TIME_SYSTEMS = [
	{ key: "torque", label: "TORQUE", syzygies: ["1::8", "2::7", "4::5"] },
	{ key: "warp",   label: "WARP",   syzygies: ["3::6"] },
	{ key: "plex",   label: "PLEX",   syzygies: ["0::9"] }
]

// ============ COSMOLOGY: three datasets, deliberately not merged ==========
//
// canonicalPlanetwork   what CCRU says
// historicalGeocentric  what Ptolemy says
// crossMap              what this application does with the two
//
// They are kept apart because merging them is exactly how an experiment turns
// into a false claim. Nothing below derives a zone from a geocentric position
// or a geocentric position from a zone: each body carries both, independently,
// and where one of them does not exist it is null rather than invented.

// ---- canonical: the Lemurian Planetwork ---------------------------------
//
// CCRU's own zone pages write Jupiter as "Sol-5" and place it at Zone-5, which
// fixes the whole sequence: Zone n is Sol-n, the nth body outward from the Sun,
// with the Sun itself at 0. The syzygetic pairings the zone pages give -
// Mercury with Neptune, Earth with Saturn, Jupiter with Mars, Pluto with the
// Sun - are the same 1::8, 3::6, 4::5 and 0::9 the arithmetic produces, which
// is a useful independent check on the model rather than a second source of it.
var NUM_PLANETWORK = [
	{ zone: 0, body: "SUN",     sol: 0 },
	{ zone: 1, body: "MERCURY", sol: 1 },
	{ zone: 2, body: "VENUS",   sol: 2 },
	{ zone: 3, body: "EARTH",   sol: 3 },
	{ zone: 4, body: "MARS",    sol: 4 },
	{ zone: 5, body: "JUPITER", sol: 5 },
	{ zone: 6, body: "SATURN",  sol: 6 },
	{ zone: 7, body: "URANUS",  sol: 7 },
	{ zone: 8, body: "NEPTUNE", sol: 8 },
	{ zone: 9, body: "PLUTO",   sol: 9 }
]

// ---- historical: the Ptolemaic order ------------------------------------
//
// Earth at the centre, then the seven wandering stars in the order the
// tradition gives them, then the sphere of the fixed stars. The ordering is
// Ptolemy's; the reasoning behind it - the Moon nearest because it eclipses
// everything and moves fastest, Saturn furthest because it moves slowest - is
// the classical argument from apparent speed, not from measured distance.
//
// "inferior" and "superior" are Ptolemy's own division, taken relative to the
// Sun's sphere: the two bodies that never stray far from the Sun sit below it,
// the three that can appear anywhere sit above.
//
// Uranus, Neptune and Pluto are NOT in this list. Ptolemy did not know of
// them, and back-dating them into his cosmos would be the exact anachronism
// this mode is supposed to avoid. They appear only in the extended set, marked
// as the post-Ptolemaic extension they are.
var NUM_GEOCENTRIC = [
	{ body: "EARTH",   order: 0, sphere: "CENTRE",   klass: "reference", set: "classical" },
	{ body: "MOON",    order: 1, sphere: "1st",      klass: "luminary",  set: "classical" },
	{ body: "MERCURY", order: 2, sphere: "2nd",      klass: "inferior",  set: "classical" },
	{ body: "VENUS",   order: 3, sphere: "3rd",      klass: "inferior",  set: "classical" },
	{ body: "SUN",     order: 4, sphere: "4th",      klass: "luminary",  set: "classical" },
	{ body: "MARS",    order: 5, sphere: "5th",      klass: "superior",  set: "classical" },
	{ body: "JUPITER", order: 6, sphere: "6th",      klass: "superior",  set: "classical" },
	{ body: "SATURN",  order: 7, sphere: "7th",      klass: "superior",  set: "classical" },
	{ body: "STARS",   order: 8, sphere: "8th",      klass: "fixed",     set: "classical" },
	{ body: "URANUS",  order: 9,  sphere: "beyond",  klass: "extension", set: "extended" },
	{ body: "NEPTUNE", order: 10, sphere: "beyond",  klass: "extension", set: "extended" },
	{ body: "PLUTO",   order: 11, sphere: "beyond",  klass: "extension", set: "extended" }
]

// ---- the Gnostic attribution --------------------------------------------
//
// A third arrangement, and not a variant of the other two: it is not counted
// outward from anything. Zero is the Void, and the nine bodies are placed by
// their Hellenic identity rather than by orbit - Kenoma at zero, Saturn as
// Cronus at one, Earth as Gaia at two, Pluto as Hades at three, and so on
// down. Kenoma rather than Chaos at the Void: the Gnostic term, not the
// Hesiodic one, since the rest of the arrangement is Gnostic.
//
// PROVENANCE. This is not CCRU, and it is not Ptolemy. It is an arrangement
// supplied for this build, and the Hellenic names beside each body are the
// ordinary mythological correspondences, given because they are the reasoning
// behind the order. It is tagged experimental wherever it is shown, and no
// arithmetic derives from it: it labels zones, it does not compute them.
//
// The Sun and the Moon are not in it. Neither is a station on this sequence,
// and nothing has been moved aside to find them one.
var NUM_GNOSTIC = Object.freeze([
	Object.freeze({ zone: 0, body: "VOID",    hellenic: "KENOMA" }),
	Object.freeze({ zone: 1, body: "SATURN",  hellenic: "CRONUS" }),
	Object.freeze({ zone: 2, body: "EARTH",   hellenic: "GAIA" }),
	Object.freeze({ zone: 3, body: "PLUTO",   hellenic: "HADES" }),
	Object.freeze({ zone: 4, body: "JUPITER", hellenic: "ZEUS" }),
	Object.freeze({ zone: 5, body: "VENUS",   hellenic: "APHRODITE" }),
	Object.freeze({ zone: 6, body: "URANUS",  hellenic: "OURANOS" }),
	Object.freeze({ zone: 7, body: "MARS",    hellenic: "ARES" }),
	Object.freeze({ zone: 8, body: "MERCURY", hellenic: "HERMES" }),
	Object.freeze({ zone: 9, body: "NEPTUNE", hellenic: "POSEIDON" })
])

function numGnostic(body) {
	for (var i = 0; i < NUM_GNOSTIC.length; i++) {
		if (NUM_GNOSTIC[i].body === body) return NUM_GNOSTIC[i]
	}
	return null
}

// The zone a body carries under whichever cosmology is showing.
function numZoneFor(body) {
	if (numCosmo === "geo" || numCosmo === "cross") {
		var gn = numGnostic(body)
		return gn ? gn.zone : null
	}
	var pw = numPlanetwork(body)
	return pw ? pw.zone : null
}

function numPlanetwork(body) {
	for (var i = 0; i < NUM_PLANETWORK.length; i++) if (NUM_PLANETWORK[i].body === body) return NUM_PLANETWORK[i]
	return null
}
function numPlanetworkZone(z) {
	for (var i = 0; i < NUM_PLANETWORK.length; i++) if (NUM_PLANETWORK[i].zone === z) return NUM_PLANETWORK[i]
	return null
}
function numGeo(body) {
	for (var i = 0; i < NUM_GEOCENTRIC.length; i++) if (NUM_GEOCENTRIC[i].body === body) return NUM_GEOCENTRIC[i]
	return null
}

// ---- the cross-map ------------------------------------------------------
//
// Joins the two by body name and by nothing else. Two facts fall out of that
// join and both are worth having in front of the reader rather than smoothed
// over:
//
//   the MOON has a place in the Ptolemaic cosmos and no zone in the
//   Planetwork, because the Planetwork counts outward from the Sun and the
//   Moon is not on that list;
//
//   URANUS, NEPTUNE and PLUTO have zones 7, 8 and 9 and no classical place
//   at all.
//
// Those are the seams where the two systems do not meet. They are the point.
function numCrossMap(body) {
	var pw = numPlanetwork(body), geo = numGeo(body)
	return {
		body: body,
		zone: pw ? pw.zone : null,          // never inferred from `order`
		sol: pw ? pw.sol : null,
		order: geo ? geo.order : null,      // never inferred from `zone`
		sphere: geo ? geo.sphere : null,
		klass: geo ? geo.klass : null,
		set: geo ? geo.set : null,
		onlyGeocentric: !!(geo && !pw),
		onlyPlanetwork: !!(pw && !geo)
	}
}

function numCosmoBodies(set) {
	var out = []
	for (var i = 0; i < NUM_GEOCENTRIC.length; i++) {
		var g = NUM_GEOCENTRIC[i]
		if (set === "classical" && g.set !== "classical") continue
		out.push(numCrossMap(g.body))
	}
	return out
}

// ------------------------------------------------------------- arithmetic

// Digital root: sum the digits, repeatedly, until one digit is left. This is
// the "reduction" that sets a channel's course.
function numReduce(n) {
	n = Math.abs(Math.floor(n))
	while (n > 9) {
		var s = 0
		while (n > 0) { s += n % 10; n = Math.floor(n / 10) }
		n = s
	}
	return n
}

// Digital cumulation: 1+2+...+n. The triangular number.
function numCumulate(n) { n = Math.abs(Math.floor(n)); return n * (n + 1) / 2 }

function numZone(n) {
	for (var i = 0; i < NUM_ZONES.length; i++) if (NUM_ZONES[i].n === n) return NUM_ZONES[i]
	return null
}

function numSyzygy(key) {
	for (var i = 0; i < NUM_SYZYGIES.length; i++) if (NUM_SYZYGIES[i].key === key) return NUM_SYZYGIES[i]
	return null
}

function numSyzygyOf(n) { var z = numZone(n); return z === null ? null : numSyzygy(z.sy) }

// The current of a syzygy, and the zone it runs to.
function numCurrent(sz) { return Math.abs(sz.b - sz.a) }

// --------------------------------------------------- gates and channels
//
// Built, not listed: one gate per zone, its value the cumulation of the zone
// number, its channel running to the reduction of that value.
var NUM_GATES = (function () {
	var out = []
	for (var i = 0; i < NUM_ZONES.length; i++) {
		var n = NUM_ZONES[i].n
		var v = numCumulate(n)
		out.push({ zone: n, value: v, to: numReduce(v) })
	}
	out.sort(function (a, b) { return a.zone - b.zone })
	return out
})()

function numGate(n) {
	for (var i = 0; i < NUM_GATES.length; i++) if (NUM_GATES[i].zone === n) return NUM_GATES[i]
	return null
}

// A channel is a gate seen as a path: zone -> reduction of its gate value.
var NUM_CHANNELS = NUM_GATES.map(function (g) {
	return { from: g.zone, to: g.to, gate: g.value, self: g.from === g.to }
})

// ------------------------------------------------- gate label placement
//
// The reference puts every gate circle ON its own channel, about half way
// along, drawn opaque so the line passes behind it. That is why nothing in the
// original ever collides: the gate is not a label parked near its zone, it is
// a bead on the thread it names.
//
// This used to pin each gate at an angle beside its zone, which is what put
// the 45, 0 and 9 marks across the zone circles. Riding the path removes the
// class of bug rather than tuning individual coordinates.
//
// Zone-0's gate is not drawn. Its cumulation is 0 and its channel runs 0 -> 0,
// which is degenerate; the reference omits it, and so does this.
// The small solid triangle inside each zone. One rule, no exceptions: it
// points at the zone's twin. Now that every pair is adjacent that is always
// the neighbour immediately beside or below it, so four of the five pairs read
// down-then-up along the figure and only 3::6 reads across.
//
// These were struck for the scattered layout and did not survive it: with 3
// moved to the left of 6, "3: left" pointed away from its twin rather than at
// it, and the same for 2, 7, 4 and 5.
var NUM_ZONE_MARK = {
	0: "up",   1: "down", 2: "down", 3: "right", 4: "up",
	5: "down", 6: "left", 7: "up",   8: "up",    9: "down"
}

function numMarkPath(z, dir) {
	var t = z.r * 0.30                       // half-width of the triangle
	var off = z.r * 0.52                     // how far off centre it sits
	var cx = z.x, cy = z.y
	if (dir === "up")    { cy -= off; return "M" + numR(cx) + " " + numR(cy - t) + "L" + numR(cx + t) + " " + numR(cy + t * 0.75) + "L" + numR(cx - t) + " " + numR(cy + t * 0.75) + "Z" }
	if (dir === "down")  { cy += off; return "M" + numR(cx) + " " + numR(cy + t) + "L" + numR(cx + t) + " " + numR(cy - t * 0.75) + "L" + numR(cx - t) + " " + numR(cy - t * 0.75) + "Z" }
	if (dir === "left")  { cx -= off; return "M" + numR(cx - t) + " " + numR(cy) + "L" + numR(cx + t * 0.75) + " " + numR(cy - t) + "L" + numR(cx + t * 0.75) + " " + numR(cy + t) + "Z" }
	cx += off;             return "M" + numR(cx + t) + " " + numR(cy) + "L" + numR(cx - t * 0.75) + " " + numR(cy - t) + "L" + numR(cx - t * 0.75) + " " + numR(cy + t) + "Z"
}

// Where the numeral sits, given the marker has taken one side.
function numNumeralOffset(z, dir) {
	var off = z.r * 0.40
	if (dir === "up") return { x: z.x, y: z.y + off }
	if (dir === "down") return { x: z.x, y: z.y - off }
	return { x: z.x, y: z.y }
}

var NUM_GATE_R = 23
var NUM_GATE_DRAWN = { 0: false, 1: true, 2: true, 3: true, 4: true,
                       5: true, 6: true, 7: true, 8: true, 9: true }

// How far along its channel each gate sits. Hand-set: the midpoint is right
// for most, but a couple read better pulled toward one end.
var NUM_GATE_T = { 1: 0.5, 2: 0.5, 3: 0.5, 4: 0.5, 5: 0.42, 6: 0.5, 7: 0.5, 8: 0.5, 9: 0.5 }

// The two self-returning channels, 1 -> 1 and 9 -> 9, leave their zone and come
// back to it. These are the directions they swing out in - Gt-1 above Zone-1,
// Gt-45 to the left of Zone-9, both as the reference has them.
// Gt-1 sits directly above Zone-1 and Gt-45 directly to the left of Zone-9,
// which is where the reference puts them - and both hold full clearance.
var NUM_LOOP_ANGLE = { gate1: 270, gate9: 180 }

// A point on a quadratic, by parameter.
function numAt(p, t) {
	var mt = 1 - t
	return { x: mt * mt * p.x0 + 2 * mt * t * p.cx + t * t * p.x3,
	         y: mt * mt * p.y0 + 2 * mt * t * p.cy + t * t * p.y3 }
}

// The path a zone's own channel takes - the line its gate rides.
function numChannelPath(n) {
	var g = numGate(n)
	var zf = numZone(n)
	if (g.to === n) return { loop: numLoop(zf, NUM_LOOP_ANGLE["gate" + n], 30) }
	var zt = numZone(g.to)
	return { cubic: numCubic(zf.x, zf.y, zf.r, zt.x, zt.y, zt.r, NUM_CHANNEL_BEND[n] || 0) }
}

function numGatePos(n) {
	var path = numChannelPath(n)
	if (path.loop) return { x: path.loop.lx, y: path.loop.ly }
	return numAt(path.cubic, NUM_GATE_T[n] !== undefined ? NUM_GATE_T[n] : 0.5)
}

// ------------------------------------------------------------ path maths
//
// Every connector is one cubic, bowed sideways by `bend`, trimmed to the rim
// of the circle at each end so nothing runs under a zone.

function numCubic(ax, ay, ar, bx, by, br, bend) {
	var dx = bx - ax, dy = by - ay
	var len = Math.sqrt(dx * dx + dy * dy) || 1
	var ux = dx / len, uy = dy / len
	var x0 = ax + ux * ar, y0 = ay + uy * ar          // leave the rim
	var x3 = bx - ux * br, y3 = by - uy * br          // stop at the rim
	var nx = -uy, ny = ux                             // sideways
	var mx = (x0 + x3) / 2, my = (y0 + y3) / 2
	var cx = mx + nx * bend, cy = my + ny * bend
	// one control point used twice: a quadratic in cubic clothing, which keeps
	// the curve's belly where `bend` says it is
	return { x0: x0, y0: y0, cx: cx, cy: cy, x3: x3, y3: y3,
	         d: "M" + numR(x0) + " " + numR(y0) + " Q" + numR(cx) + " " + numR(cy) + " " + numR(x3) + " " + numR(y3) }
}

function numR(v) { return Math.round(v * 10) / 10 }

// Arrowhead as its own path, so a class on the parent group restyles the line
// and its head together - an SVG marker would not inherit the highlight.
function numHead(p, size) {
	size = size || 13
	var ax = p.x3 - p.cx, ay = p.y3 - p.cy            // tangent at the end
	var l = Math.sqrt(ax * ax + ay * ay) || 1
	ax /= l; ay /= l
	var bx = -ay, by = ax
	var tipx = p.x3, tipy = p.y3
	var b1x = tipx - ax * size + bx * size * 0.42, b1y = tipy - ay * size + by * size * 0.42
	var b2x = tipx - ax * size - bx * size * 0.42, b2y = tipy - ay * size - by * size * 0.42
	return "M" + numR(tipx) + " " + numR(tipy) + "L" + numR(b1x) + " " + numR(b1y) +
	       "L" + numR(b2x) + " " + numR(b2y) + "Z"
}

// A tapered ribbon along the same curve, for the heavy currents. The reference
// draws these as broad forms that swell along their length rather than as
// thick strokes, so this builds an outline and fills it.
//
// The profile is the whole character of the thing: hairline at the tail,
// swelling to full width around three-quarters along, easing back at the head
// so the arrowhead sits on a stem rather than on a blunt end. A linear taper
// reads as a wedge, which is what the first attempt looked like.
function numRibbon(p, w0, w1) {
	var N = 40, up = [], dn = []
	for (var i = 0; i <= N; i++) {
		var t = i / N, mt = 1 - t
		var x = mt * mt * p.x0 + 2 * mt * t * p.cx + t * t * p.x3
		var y = mt * mt * p.y0 + 2 * mt * t * p.cy + t * t * p.y3
		var dx = 2 * mt * (p.cx - p.x0) + 2 * t * (p.x3 - p.cx)
		var dy = 2 * mt * (p.cy - p.y0) + 2 * t * (p.y3 - p.cy)
		var l = Math.sqrt(dx * dx + dy * dy) || 1
		var nx = -dy / l, ny = dx / l
		// swell peaking at t=0.78, never quite reaching zero at the head
		var swell = Math.pow(Math.sin(Math.min(t / 0.78, 1) * Math.PI / 2), 1.35)
		if (t > 0.78) swell = 1 - (t - 0.78) / 0.22 * 0.45
		var w = (w0 + (w1 - w0) * swell) / 2
		up.push(numR(x + nx * w) + " " + numR(y + ny * w))
		dn.unshift(numR(x - nx * w) + " " + numR(y - ny * w))
	}
	return "M" + up.join("L") + "L" + dn.join("L") + "Z"
}

// A self-loop: the little circle-and-back a zone makes when its channel or
// current returns to itself. Drawn off the zone's rim at the given angle.
// A self-returning channel: out from the rim, round, and back. The loop's
// centre sits a full radius plus the loop's own size clear of the zone, so the
// arc is tangent to the rim rather than cutting into the circle. It used to be
// placed at r + size*0.55, which put a third of the loop inside the zone.
function numLoop(z, angleDeg, size) {
	var a = angleDeg * Math.PI / 180
	var cx = z.x + Math.cos(a) * (z.r + size + 4)
	var cy = z.y + Math.sin(a) * (z.r + size + 4)
	var s = size
	var sx = cx - Math.sin(a) * s, sy = cy + Math.cos(a) * s
	var ex = cx + Math.sin(a) * s, ey = cy - Math.cos(a) * s
	return { d: "M" + numR(sx) + " " + numR(sy) +
	            " A" + s + " " + s + " 0 1 1 " + numR(ex) + " " + numR(ey),
	         x3: ex, y3: ey, cx: ex + Math.sin(a) * s * 0.6, cy: ey + Math.cos(a) * s * 0.6,
	         // the loop's own centre, pushed a little further out: where a label
	         // belongs, clear of both the loop and the zone it hangs off
	         // the gate rides the far point of its own loop
	         lx: z.x + Math.cos(a) * (z.r + size + 4),
	         ly: z.y + Math.sin(a) * (z.r + size + 4) }
}

// --------------------------------------------------------- bend per path
//
// Hand-set so the figure reads the way the reference does: long channels sweep
// wide around the empty field rather than cutting across the middle.
// Struck so the channels sweep round the field rather than cutting across the
// middle. 3->6 and 6->3 run between the same pair in opposite directions, so
// they are bowed opposite ways and do not lie on top of each other.
// 3 -> 6 arcs over the top and 6 -> 3 dips under, so Gt-6 and Gt-21 sit on
// opposite sides of that pair, as the reference has them. The 8 -> 9 run is
// short - 41 units of clear span between two big circles - so it bows well out
// or its gate cannot clear either zone.
// A gate rides the midpoint of its own channel, so a channel with nowhere to
// go puts its gate nowhere to be seen. Gt-21 rides 6 -> 3, and once 3 and 6
// became adjacent that run was a sixteen-unit stub: at bend 40 the midpoint
// landed 11 units INSIDE Zone-6's rim, with the gate's own radius of 23 on top
// of that, so the 21 was simply behind the circle. Gt-6 on 3 -> 6 was the same
// problem one notch less bad.
//
// Both now bow hard and in opposite directions, which is what the reference
// does with this pair: the two runs between the same twins arc out either side
// rather than lying on top of each other. A bend of 150 puts the midpoint some
// 75 units off the straight line, clearing both rims with room to spare.
var NUM_CHANNEL_BEND = { 0: 0, 1: 0, 2: -60, 3: 150, 4: 70, 5: -60, 6: -150, 7: 80, 8: 120, 9: 0 }

// The bond between a syzygy's two zones. They sit adjacent now, with about
// fourteen units of clear span between their rims, so this is a stub and it
// runs straight: the old values here were bows of 120-130 units, struck when
// the twins were two hundred apart, and at this spacing they threw the bond
// into a loop the width of the zone it started from.
var NUM_CURRENT_BEND = { "0::9": 0, "1::8": 0, "2::7": 0, "3::6": 0, "4::5": 0 }

// The tractor line: a thin arrow off the belly of the current, running to the
// zone the current's value names. For 0::9 and 3::6 that zone is one of the
// pair itself, so it returns as a loop instead - those are the two closed
// systems, Plex and Warp.
// The broad form itself, from the bond to the zone the current's value names.
// The three open ones bow away from the spine so they sweep through the empty
// field instead of cutting across the zones between; the two closed ones bow
// hard, because a short run needs a big bend to curl at all.
var NUM_TRACTOR_BEND = { "0::9": 90, "1::8": 80, "2::7": -95, "3::6": 90, "4::5": 55 }

// ============ THE GEOCENTRIC MODEL, IN ITS OWN PANEL =====================
//
// This used to be drawn straight through the Numogram: concentric spheres
// struck from Zone-3, with ties crossing the whole figure. It was unreadable,
// and worse, it made the canonical diagram look like it had been redesigned.
//
// It now has its own composition beside the Numogram. Radial bands rather than
// concentric rings: each body gets a band of its own, so two labels can never
// land on the same circle, and the Ptolemaic order reads top to bottom without
// anything to untangle. Earth is the ground of the figure, at the foot, and
// the spheres rise from it in order.
//
// The canonical Numogram is untouched by any of this. It renders exactly as it
// does with the cosmology off.

var NUM_BAND_W = 420, NUM_BAND_H = 980
var NUM_BAND_TOP = 70, NUM_BAND_GAP = 96

// Bottom-up: Earth sits on the floor of the panel and the spheres rise.
function numBandY(order, n) {
	return NUM_BAND_H - NUM_BAND_TOP - order * NUM_BAND_GAP
}

// The rows the panel shows, and the order it shows them in. Two orderings of
// the same bodies, which is the whole point of having both: the Planetwork
// counts outward from the Sun, the Ptolemaic order outward from the Earth, and
// laying one over the other is what makes the disagreement visible.
//
// The panel used to appear only under a geocentric model. It shows in both now
// - the Planetwork attributions are what tie a planet to a zone at all, so
// hiding them under the canonical diagram hid the very thing that connects the
// two halves of the feature.
function numCosmoRows() {
	var out = [], i, c
	if (numCosmo === "geo" || numCosmo === "cross") {
		// zone order, top to bottom: the Void is the ground of this one, and
		// the nine bodies rise from it. No sphere numbers - this arrangement
		// does not count outward from anything.
		for (i = 0; i < NUM_GNOSTIC.length; i++) {
			var gn = NUM_GNOSTIC[i]
			out.push({ body: gn.body, zone: gn.zone, step: gn.zone,
			           role: gn.hellenic, ground: gn.zone === 0 })
		}
		return out
	}

	// canonical: Zone n is Sol-n, the nth body outward from the Sun, Sun at 0.
	// The Sol-n label is not carried into the row: it restates the zone number
	// that is already sitting next to it in its own colour, so all it did was
	// give the eye a second number to discount.
	for (i = 0; i < NUM_PLANETWORK.length; i++) {
		var pw = NUM_PLANETWORK[i]
		out.push({ body: pw.body, zone: pw.zone, step: pw.zone,
		           role: "", ground: pw.zone === 0 })
	}
	return out
}

// ---- the Pandemonium, all forty-five -------------------------------------
//
// Forty-five is not a chosen number. It is every unordered pair of the ten
// zones - C(10,2) = 45 - and it is the same forty-five that Gate-45 names,
// because the cumulation of 9 is 0+1+...+9 = 45. So the deck is generated
// rather than typed: every pair the figure can make, with the arithmetic each
// one produces.
//
// Five of them sum to nine. Those five are the syzygies, and they are the ones
// that carry names here: Uttunul, Murmur, Oddubb, Djynxx, Katak. The other
// forty are listed by their pair. CCRU names its Lemurs and this application
// does not have that list; inventing forty names would be inventing the very
// thing someone came to this panel to look up, so they are left unnamed and
// the reason is printed at the head of the deck.
var numDeckGroup = "phase"      // phase | sum | diff

function numPandemoniumPairs() {
	var out = []
	for (var a = 0; a <= 9; a++) {
		for (var b = a + 1; b <= 9; b++) {
			var sz = (a + b === 9) ? numSyzygy(a + "::" + b) : null
			out.push({
				a: a, b: b,
				sum: a + b, diff: b - a, root: numReduce(a + b),
				phase: b,                       // CCRU groups by the higher zone
				syzygy: sz,
				lemur: numLemur(a, b)
			})
		}
	}
	return out
}

function numogramSetDeckGroup(g) {
	numDeckGroup = g
	var panel = document.getElementById("numPanelGeo")
	if (panel !== null) {
		panel.innerHTML = numogramDemonPanel()
		panel.setAttribute("data-cosmo-key", "")   // force a rebuild on the next apply
	}
}

// One Lemur. Every one of the forty-five is named now, so every card carries
// the same fields - there is no longer a "plain" entry standing in for a name
// this build did not have.
function numDeckEntry(p) {
	var on = (numPicked.indexOf(p.a) !== -1 && numPicked.indexOf(p.b) !== -1)
	var sys = p.syzygy ? p.syzygy.sys : "none"
	var L = p.lemur
	var o = '<button class="numCard' + (p.syzygy ? " numCardNamed" : "") + (on ? " numCardOn" : "") +
		'" type="button" data-sys="' + sys + '" ' +
		'onclick="numogramHoldPair(' + p.a + ',' + p.b + ')">'

	o += '<div class="numCardTop">' +
		'<span class="numCardPair">' + numZoneTag(p.a) + '<i>::</i>' + numZoneTag(p.b) + '</span>' +
		'<span class="numCardMesh">M#' + (L.m < 10 ? "0" + L.m : L.m) + '</span>' +
		'</div>'

	o += '<div class="numCardName">' + L.name + '</div>'
	if (L.alias) o += '<div class="numCardAlias">' + L.alias + '</div>'
	if (L.title) o += '<div class="numCardEpithet">' + L.title + '</div>'
	if (L.klass) o += '<div class="numCardClass">' + L.klass + '</div>'
	if (p.syzygy) {
		o += '<div class="numCardRegion" data-region="' + sys + '">' +
		     p.syzygy.current + ' &middot; ' + sys.toUpperCase() + '</div>'
	}
	o += '</button>'
	return o
}

// ---- Divination: two names, and the motion between them ------------------
//
// Each name is reduced through Anglossic Qabbala to a zone, exactly as a word
// trace is. The pair of zones that falls out is a Lemur - one of the
// forty-five - and the motion between them is read off the figure: whether
// they are syzygetic twins, what current or channel runs between them, and
// what the difference of the two zones names.
//
// Nothing here is a new rule. It is the word trace run twice and the pair
// looked up, so the arithmetic is the same arithmetic used everywhere else.
var numDivA = "", numDivB = ""

function numogramSetDivine(which, v) {
	if (which === "a") numDivA = v; else numDivB = v
}

function numogramDivine() {
	var a = document.getElementById("numDivA"), b = document.getElementById("numDivB")
	numDivA = a ? a.value : numDivA
	numDivB = b ? b.value : numDivB
	var panel = document.getElementById("numPanelGeo")
	var ra = numTraceWord(numDivA), rb = numTraceWord(numDivB)
	if (!ra.error && !rb.error) {
		numDeriv = null
		numBody = null
		numPicked = (ra.result === rb.result) ? [ra.result] : [ra.result, rb.result]
		numSelected = rb.result
	}
	if (panel !== null) {
		panel.innerHTML = numogramDivinePanel()
		panel.setAttribute("data-cosmo-key", "")
	}
	numogramApply()
}

function numDivSide(label, id, value, res) {
	var o = '<div class="numDivSide">'
	o += '<label class="numDivLabel" for="' + id + '">' + label + '</label>'
	o += '<input class="numNumberInput numDivInput" id="' + id + '" type="text" ' +
	     'autocomplete="off" spellcheck="false" maxlength="64" placeholder="name" ' +
	     'value="' + authEscNum(value) + '" onkeydown="if(event.key===&quot;Enter&quot;){event.preventDefault();numogramDivine()}">'
	if (res && !res.error) {
		o += '<div class="numDivOut">' + res.aq.total + ' &#8594; ' +
		     '<span class="numTag" data-zone="' + res.result + '">' + res.result + '</span></div>'
	} else if (res && res.error) {
		o += '<div class="numDivErr">' + res.error + '</div>'
	}
	o += '</div>'
	return o
}

function numogramDivinePanel() {
	var ra = numDivA ? numTraceWord(numDivA) : null
	var rb = numDivB ? numTraceWord(numDivB) : null

	var o = '<div class="numDeck numDivine">'
	o += '<div class="numDeckHead"><div class="numDeckCount">DIVINATION</div>'
	o += '<div class="numDeckNote">Two names, reduced. The pair they land on is a Lemur.</div></div>'

	o += '<div class="numDivPair">'
	o += numDivSide("YOU", "numDivA", numDivA, ra)
	o += numDivSide("THEM", "numDivB", numDivB, rb)
	o += '</div>'
	o += '<div class="numCtlRow"><button class="numCtl numCtlPlain" type="button" onclick="numogramDivine()">READ</button></div>'

	if (ra && rb && !ra.error && !rb.error) {
		var x = ra.result, y = rb.result
		o += '<div class="numDivResult">'
		if (x === y) {
			o += '<div class="numDivHead">SAME ZONE</div>'
			o += '<div class="numDivBody">Both names reduce to zone ' + x +
			     '. There is no span between them and so no Lemur - they occupy the ' +
			     'same station rather than a passage between two.</div>'
		} else {
			var L = numLemur(x, y)
			var lo = Math.min(x, y), hi = Math.max(x, y)
			var sz = (lo + hi === 9) ? numSyzygy(lo + "::" + hi) : null
			o += '<div class="numDivHead">' + L.name + (L.alias ? ' <i>(' + L.alias + ')</i>' : '') + '</div>'
			if (L.title) o += '<div class="numDivEpithet">' + L.title + '</div>'
			o += '<dl class="numCardFacts">'
			o += '<dt>Span</dt><dd>' + numZoneTag(lo) + ' :: ' + numZoneTag(hi) + '</dd>'
			o += '<dt>Mesh</dt><dd>M#' + (L.m < 10 ? "0" + L.m : L.m) + '</dd>'
			o += '<dt>Sum</dt><dd>' + lo + ' + ' + hi + ' = ' + (lo + hi) + '</dd>'
			o += '<dt>Motion</dt><dd>' + (hi - lo) + ' &#8594; ' + numZoneTag(numReduce(hi - lo)) + '</dd>'
			o += '</dl>'
			if (sz) {
				o += '<div class="numDivBody">Syzygetic: the two names are twins, summing to nine. ' +
				     'The ' + sz.current + ' current carries this pair.</div>'
			} else {
				o += '<div class="numDivBody">Not a syzygy - these two do not sum to nine, so no ' +
				     'current runs directly between them.</div>'
			}
			if (L.klass) o += '<div class="numDivBody">' + L.klass + '.</div>'
			if (L.rt.length) {
				o += '<div class="numDivRoutes">'
				for (var i = 0; i < L.rt.length; i++) {
					o += '<div class="numRt"><span class="numRtPath">' + L.rt[i].p + '</span>' +
					     '<span class="numRtText">' + L.rt[i].t + '</span></div>'
				}
				o += '</div>'
			}
		}
		o += '</div>'
	}

	o += '</div>'
	return o
}

function numogramDemonPanel() {
	var pairs = numPandemoniumPairs()
	var o = '<div class="numDeck">'

	o += '<div class="numDeckHead">'
	o += '<div class="numDeckCount">45 LEMURS</div>'
	o += '<div class="numDeckNote">CCRU: Writings 1997&ndash;2003</div>'
	o += '<div class="numDeckTabs" role="group" aria-label="Group the deck by">'
	var tabs = [["phase", "PHASE"], ["sum", "SUM"], ["diff", "DIFF"]]
	for (var t = 0; t < tabs.length; t++) {
		o += '<button class="numCtl' + (numDeckGroup === tabs[t][0] ? " numCtlOn" : "") +
		     '" type="button" onclick="numogramSetDeckGroup(&quot;' + tabs[t][0] + '&quot;)">' +
		     tabs[t][1] + '</button>'
	}
	o += '</div></div>'

	var keyOf = function (p) {
		return numDeckGroup === "sum" ? p.sum : numDeckGroup === "diff" ? p.diff : p.phase
	}
	var keys = [], seen = {}
	for (var i = 0; i < pairs.length; i++) {
		var k = keyOf(pairs[i])
		if (!seen[k]) { seen[k] = true; keys.push(k) }
	}
	keys.sort(function (x, y) { return x - y })

	for (var g = 0; g < keys.length; g++) {
		var key = keys[g], inGroup = []
		for (var j = 0; j < pairs.length; j++) if (keyOf(pairs[j]) === key) inGroup.push(pairs[j])
		var isKey = (numDeckGroup === "sum" && key === 9)
		var label = numDeckGroup === "sum" ? "SUM " + key
			: numDeckGroup === "diff" ? "DIFF " + key
			: "PHASE-" + key
		o += '<div class="numDeckSeg' + (isKey ? " numDeckSegKey" : "") + '">'
		o += '<div class="numDeckSegHead">' +
			'<span class="numDeckSegName">' + label + '</span>' +
			'<span class="numDeckSegCount">' + inGroup.length + '</span>' +
			(isKey ? '<span class="numDeckSegTag">SYZYGIES</span>' : '') +
			'</div>'
		for (var m = 0; m < inGroup.length; m++) o += numDeckEntry(inGroup[m])
		o += '</div>'
	}

	o += '</div>'
	return o
}

// A card holds both of its zones, which is what draws the link between them.
function numogramHoldPair(a, b) {
	var both = (numPicked.indexOf(a) !== -1 && numPicked.indexOf(b) !== -1)
	numDeriv = null
	numBody = null
	if (both) { numPicked = []; numSelected = null }
	else { numPicked = [a, b]; numSelected = b }
	numogramApply()
}

function numogramGeoPanel() {
	if (numCosmo === "demon") return numogramDemonPanel()
	if (numCosmo === "divine") return numogramDivinePanel()
	var bodies = numCosmoRows()
	var n = bodies.length
	if (n === 0) return ""
	var h = NUM_BAND_TOP * 2 + (n - 1) * NUM_BAND_GAP
	var bandY = function (step) { return h - NUM_BAND_TOP - step * NUM_BAND_GAP }

	var geoMode = (numCosmo === "geo" || numCosmo === "cross")
	var o = '<svg class="numGeoSvg" id="numGeoSvg" viewBox="0 0 ' + NUM_BAND_W + ' ' + numR(h) + '" '
	o += 'role="img" aria-label="' + (geoMode
		? "The geocentric order, Earth at the centre and the spheres rising outward."
		: "The Lemurian Planetwork, the Sun at zero and the zones counting outward.") + '" '
	o += 'preserveAspectRatio="xMidYMid meet">'

	var x0 = 40, x1 = NUM_BAND_W - 40, zx = 262

	for (var i = 0; i < n; i++) {
		var b = bodies[i]
		var y = bandY(b.step)
		var sel = (numBody === b.body)

		var g = '<g class="numBand' + (sel ? " numOn" : "") + (b.ground ? " numBandEarth" : "") +
			'" data-body="' + b.body + '"' +
			(b.zone === null ? ' data-nozone="1"' : ' data-zone="' + b.zone + '"') +
			' tabindex="0" role="button" aria-label="' + b.body + ', ' + b.role +
			(b.zone === null ? ", no Planetwork zone" : ", Planetwork zone " + b.zone) + '">'

		// A rule under the row, not a track through it. The old band was a
		// full-width line with a knob sitting at its midpoint, which read as a
		// slider - a control with something to drag - when it is a table row.
		g += '<line class="numBandRule" x1="' + x0 + '" y1="' + numR(y + 9) + '" x2="' + x1 + '" y2="' + numR(y + 9) + '"/>'

		g += '<text class="numBandName" x="' + x0 + '" y="' + numR(y) + '">' + b.body + '</text>'

		// The zone, stated on every row. Without it there was no way to see
		// which body carries Zone 0, and no way to tell a correct highlight
		// from a wrong one.
		if (b.zone === null) {
			g += '<text class="numBandNoZone" x="' + zx + '" y="' + numR(y) + '">NO ZONE</text>'
		} else {
			g += '<circle class="numBandZone" data-zone="' + b.zone + '" cx="' + zx + '" cy="' + numR(y - 5) + '" r="15"/>'
			g += '<text class="numBandZoneText" data-zone="' + b.zone + '" x="' + zx + '" y="' + numR(y - 5) + '">' + b.zone + '</text>'
		}

		g += '<text class="numBandRole" x="' + x1 + '" y="' + numR(y) + '">' + b.role + '</text>'

		g += '<rect class="numHit" x="' + x0 + '" y="' + numR(y - 34) + '" width="' + (x1 - x0) + '" height="68"/>'
		g += '</g>'
		o += g
	}

	// The note that used to sit here said the zones were the Planetwork's.
	// Under the geocentric model they are not any more - it counts from the
	// Earth and has its own - so the note would now be wrong, and the zone
	// chips say it better anyway.
	o += '</svg>'
	return o
}

// ------------------------------------------------- measuring the drawing// ------------------------------------------------- measuring the drawing
//
// The viewBox used to be the nominal 800x1200 the positions were authored in,
// which left the figure sitting right of centre with dead field down one side.
// Everything drawn now reports its extent, and the viewBox is that extent plus
// one even margin - so the diagram is framed evenly however the geometry moves,
// and none of the panel's height is spent on empty canvas.

// ------------------------------------------------- gate label clearance
//
// The small gate numbers are only legible if nothing runs through them. Rather
// than eyeballing it, the routing is measured: every current, channel and
// tractor path is sampled and checked against every gate's exclusion disc.
// The test suite fails if anything crosses the line.
//
// The paths are authored by hand through the bend tables - no automatic
// routing - so when this reports a collision the fix is a bend, not a solver.

// The margin every numeral must keep from anything that is not its own line.
// Ten rather than something larger because the 8 - 9 run is intrinsically
// tight: 41 units of clear span between two big circles, and it is tight in
// the reference too. The measured worst case is 11.
var NUM_GATE_CLEAR = 10

function numSamplePath(p, n) {
	var out = []
	for (var i = 0; i <= n; i++) {
		var t = i / n, mt = 1 - t
		out.push({
			x: mt * mt * p.x0 + 2 * mt * t * p.cx + t * t * p.x3,
			y: mt * mt * p.y0 + 2 * mt * t * p.cy + t * t * p.y3
		})
	}
	return out
}

// Every path the figure draws, sampled, with what drew it.
function numogramPathSamples() {
	var out = [], i, sz, za, zb, zt, p, ch, zf, zt2
	for (i = 0; i < NUM_SYZYGIES.length; i++) {
		sz = NUM_SYZYGIES[i]
		za = numZone(sz.a); zb = numZone(sz.b); zt = numZone(numCurrent(sz))
		p = numCubic(za.x, za.y, za.r, zb.x, zb.y, zb.r, NUM_CURRENT_BEND[sz.key] || 0)
		out.push({ id: "current-" + sz.key, pts: numSamplePath(p, 48), ends: [sz.a, sz.b] })
		if (!(numCurrent(sz) === sz.a || numCurrent(sz) === sz.b)) {
			var bx = 0.25 * p.x0 + 0.5 * p.cx + 0.25 * p.x3
			var by = 0.25 * p.y0 + 0.5 * p.cy + 0.25 * p.y3
			var tp = numCubic(bx, by, 0, zt.x, zt.y, zt.r, NUM_TRACTOR_BEND[sz.key] || 0)
			// a tractor line starts on its current's belly and ends on the tractor
			// zone's rim - that zone is not named in the id, which is what made
			// the clearance check report a false collision there
			out.push({ id: "tractor-" + sz.key, pts: numSamplePath(tp, 48), ends: [numCurrent(sz)] })
		}
	}
	for (i = 0; i < NUM_CHANNELS.length; i++) {
		ch = NUM_CHANNELS[i]
		if (ch.from === ch.to) continue          // a loop stays beside its own zone
		zf = numZone(ch.from); zt2 = numZone(ch.to)
		p = numCubic(zf.x, zf.y, zf.r, zt2.x, zt2.y, zt2.r, NUM_CHANNEL_BEND[ch.from] || 0)
		out.push({ id: "channel-" + ch.from + "-" + ch.to, pts: numSamplePath(p, 48), ends: [ch.from, ch.to] })
	}
	return out
}

// Every annotated circle the figure actually draws: the nine gates. There are
// no current-value circles - the reference has none - and Zone-0's gate is not
// drawn. Each gate rides its own channel, so the check that matters is that no
// gate sits on a zone, on another gate, or on a path that is not its own.
function numogramAnnotations() {
	var out = []
	for (var i = 0; i < NUM_GATES.length; i++) {
		var z = NUM_GATES[i].zone
		if (!NUM_GATE_DRAWN[z]) continue
		out.push({ kind: "gate", zone: z, value: NUM_GATES[i].value,
		           pos: numGatePos(z), r: NUM_GATE_R })
	}
	return out
}

// The closest approach of anything to any gate numeral: paths, zone circles
// and the other gates. A gate's own channel is skipped - it rides that line by
// design, and is drawn opaque over it, exactly as the reference does.
function numogramGateClearance() {
	var paths = numogramPathSamples()
	var ann = numogramAnnotations()
	var worst = { d: 1e9, gate: null, path: null }
	var i, k, a, b
	for (a = 0; a < ann.length; a++) {
		var it = ann[a], gp = it.pos
		for (i = 0; i < paths.length; i++) {
			if (paths[i].id.indexOf("channel-" + it.zone + "-") === 0) continue
			for (k = 0; k < paths[i].pts.length; k++) {
				var dx = paths[i].pts[k].x - gp.x, dy = paths[i].pts[k].y - gp.y
				var d = Math.sqrt(dx * dx + dy * dy)
				if (d < worst.d) worst = { d: d, gate: it.value, path: paths[i].id }
			}
		}
		for (b = 0; b < ann.length; b++) {
			if (b === a) continue
			var od = Math.sqrt(Math.pow(ann[b].pos.x - gp.x, 2) + Math.pow(ann[b].pos.y - gp.y, 2)) - it.r - ann[b].r
			if (od < worst.d) worst = { d: od, gate: it.value, path: "gate-" + ann[b].value }
		}
		// and it must clear every zone circle - this is the one that was failing,
		// with 45, 0 and 9 sitting across their own zones
		for (i = 0; i < NUM_ZONES.length; i++) {
			var zd = Math.sqrt(Math.pow(NUM_ZONES[i].x - gp.x, 2) + Math.pow(NUM_ZONES[i].y - gp.y, 2)) - NUM_ZONES[i].r - it.r
			if (zd < worst.d) worst = { d: zd, gate: it.value, path: "zone-" + NUM_ZONES[i].n }
		}
	}
	return worst
}

// No drawn line may cut through a zone circle either. Paths are trimmed to the
// rim at each end, so an intrusion means a bend is carrying the curve back
// across a circle it already left.
function numogramPathZoneClearance() {
	var paths = numogramPathSamples()
	var worst = { d: 1e9, path: null, zone: null }
	for (var i = 0; i < paths.length; i++) {
		for (var z = 0; z < NUM_ZONES.length; z++) {
			var zz = NUM_ZONES[z]
			// the ends of a path legitimately touch the zones it joins
			var ends = paths[i].ends.indexOf(zz.n) !== -1
			for (var k = 0; k < paths[i].pts.length; k++) {
				if (ends && (k < 6 || k > paths[i].pts.length - 7)) continue
				var d = Math.sqrt(Math.pow(paths[i].pts[k].x - zz.x, 2) + Math.pow(paths[i].pts[k].y - zz.y, 2)) - zz.r
				if (d < worst.d) worst = { d: d, path: paths[i].id, zone: zz.n }
			}
		}
	}
	return worst
}

var numBB = null

function numBBReset() { numBB = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 } }

function numBBPt(x, y, pad) {
	if (!isFinite(x) || !isFinite(y)) return
	pad = pad || 0
	if (x - pad < numBB.x0) numBB.x0 = x - pad
	if (y - pad < numBB.y0) numBB.y0 = y - pad
	if (x + pad > numBB.x1) numBB.x1 = x + pad
	if (y + pad > numBB.y1) numBB.y1 = y + pad
}

// Sampled, not taken from the control point: a quadratic's control point sits
// well outside the curve, and using it would put slack on one side only -
// which is the very thing being fixed.
function numBBPath(p, pad) {
	for (var i = 0; i <= 8; i++) {
		var t = i / 8, mt = 1 - t
		numBBPt(mt * mt * p.x0 + 2 * mt * t * p.cx + t * t * p.x3,
		        mt * mt * p.y0 + 2 * mt * t * p.cy + t * t * p.y3, pad)
	}
}

// A loop is a circle of radius `size` centred off the zone's rim.
function numBBLoop(z, angleDeg, size, pad) {
	var a = angleDeg * Math.PI / 180
	numBBPt(z.x + Math.cos(a) * (z.r + size * 0.55),
	        z.y + Math.sin(a) * (z.r + size * 0.55), size + (pad || 0))
}

// ------------------------------------------- Anglossic Qabbala (attested)
//
// Land's mapping, unchanged: digits are themselves, A=10 ... Z=35, and a
// string is the sum of its characters. Deterministic - the same input always
// gives the same total, and nothing here is generated or guessed.
//
// What this does NOT do is claim AQ has anything to do with the Numogram.
// It computes an AQ total, and then - separately, and labelled as this
// application's own step - reduces that total to a zone.
function numAqValue(ch) {
	var c = ch.toUpperCase()
	if (c >= "0" && c <= "9") return c.charCodeAt(0) - 48
	if (c >= "A" && c <= "Z") return c.charCodeAt(0) - 55      // 'A' -> 10
	return null
}

// Strips accents so that CAFE and CAFÉ agree, which is a decision this
// application makes - AQ is defined over the 36 unaccented literals only.
function numAqNormalise(word) {
	var out = word
	if (typeof out.normalize === "function") {
		out = out.normalize("NFD").replace(/[̀-ͯ]/g, "")
	}
	return out.toUpperCase()
}

function numAqTrace(word) {
	var norm = numAqNormalise(word)
	var chars = [], total = 0, dropped = 0
	for (var i = 0; i < norm.length; i++) {
		var v = numAqValue(norm.charAt(i))
		if (v === null) { if (norm.charAt(i).trim() !== "") dropped++; continue }
		chars.push({ ch: norm.charAt(i), v: v })
		total += v
	}
	return { word: norm, chars: chars, total: total, dropped: dropped }
}

// ------------------------------------------------------------- rendering

function numogramSvg() {
	numBBReset()
	var o = ''

	// -- currents, under everything.
	//
	// Each one links the two zones of its syzygy, and carries a thin tractor
	// arrow off its belly to the zone its value names, with that value set in
	// a small circle - the 1, 3, 5, 7, 9 annotations. The Torque's three are
	// the broad forms; Warp and Plex are drawn fine, since both are closed.
	o += '<g class="numLayer numLayerCurrents">'
	for (var s = 0; s < NUM_SYZYGIES.length; s++) {
		var sz = NUM_SYZYGIES[s]
		var cur = numCurrent(sz)
		var za = numZone(sz.a), zb = numZone(sz.b), zt = numZone(cur)
		var closed = (cur === sz.a || cur === sz.b)
		var heavy = (sz.sys === "torque")
		var g = '<g class="numCurrent' + (heavy ? ' numHeavy' : '') + '" data-syzygy="' + sz.key +
			'" data-sys="' + sz.sys + '" data-current="' + cur + '">'

		// Two marks, not one. The bond is the short link between the twins -
		// they sit adjacent, so it is barely longer than the gap between their
		// rims. The current proper is the broad form that leaves that bond and
		// runs to the zone its value names, which is the shape the figure is
		// actually made of: 2::7 reaching left to 5, 1::8 up to 7, 4::5 down
		// to 1. Drawing the ribbon along the bond instead - which is what this
		// used to do - left the tractor unmarked and the figure inert.
		var p = numCubic(za.x, za.y, za.r, zb.x, zb.y, zb.r, NUM_CURRENT_BEND[sz.key] || 0)
		numBBPath(p, 4)
		// a forgiving invisible stroke under the visible one
		g += '<path class="numHitLine" d="' + p.d + '"/>'
		g += '<path class="numCurLine" d="' + p.d + '"/>'

		// From the middle of the bond out to the tractor. Starting at the
		// midpoint rather than at either twin is what makes the form read as
		// belonging to the pair rather than to one of them.
		//
		// Plex and Warp are the closed ones: their value names a zone of their
		// own pair, so there is no midpoint-to-elsewhere run to draw. They bow
		// from the far twin round into the near one instead, which is the
		// short curled form the reference gives them. Trimming from a midpoint
		// would have overshot here - the twins are only some fourteen units of
		// clear span apart - and a reversed path is what that produces.
		var tr
		if (closed) {
			var other = numZone(cur === sz.a ? sz.b : sz.a)
			tr = numCubic(other.x, other.y, other.r * 0.3, zt.x, zt.y, zt.r * 0.92,
			              NUM_TRACTOR_BEND[sz.key] || 0)
		} else {
			var mx = (za.x + zb.x) / 2, my = (za.y + zb.y) / 2
			tr = numCubic(mx, my, za.r * 0.72, zt.x, zt.y, zt.r, NUM_TRACTOR_BEND[sz.key] || 0)
		}
		numBBPath(tr, heavy ? 26 : 20)
		g += '<path class="numHitLine" d="' + tr.d + '"/>'
		g += '<path class="numCurBody" d="' + numRibbon(tr, 3, heavy ? 30 : 22) + '"/>'
		g += '<path class="numCurHead" d="' + numHead(tr, heavy ? 17 : 14) + '"/>'

		// The reference labels no current, and draws a closed one as a plain link
		// between its pair with the head at the tractor end - not as a loop. The
		// value circles this used to place are not in the original at all, and
		// they were the other half of the overlap problem.

		g += '</g>'
		o += g
	}
	o += '</g>'

	// -- channels, each one a gate's course
	o += '<g class="numLayer numLayerChannels">'
	for (var c = 0; c < NUM_CHANNELS.length; c++) {
		var ch = NUM_CHANNELS[c]
		var zf = numZone(ch.from), zt2 = numZone(ch.to)
		var gg = '<g class="numChannel" data-from="' + ch.from + '" data-to="' + ch.to +
			'" data-gate="' + ch.gate + '" data-sys="' + numSyzygyOf(ch.from).sys + '">'
		if (ch.from === ch.to) {
			if (!NUM_GATE_DRAWN[ch.from]) continue     // 0 -> 0 is not drawn either
			var lp2 = numLoop(zf, NUM_LOOP_ANGLE["gate" + ch.from], 30)
			numBBLoop(zf, NUM_LOOP_ANGLE["gate" + ch.from], 30, 3)
			gg += '<path class="numHitLine" d="' + lp2.d + '"/>'
			gg += '<path class="numChLine" d="' + lp2.d + '"/>'
			gg += '<path class="numChHead" d="' + numHead(lp2, 11) + '"/>'
		} else {
			var p2 = numCubic(zf.x, zf.y, zf.r, zt2.x, zt2.y, zt2.r, NUM_CHANNEL_BEND[ch.from] || 0)
			numBBPath(p2, 4)
			gg += '<path class="numHitLine" d="' + p2.d + '"/>'
			gg += '<path class="numChLine" d="' + p2.d + '"/>'
			gg += '<path class="numChHead" d="' + numHead(p2, 12) + '"/>'
		}
		gg += '</g>'
		o += gg
	}
	o += '</g>'

	// -- gates: the small annotated circles
	o += '<g class="numLayer numLayerGates">'
	for (var gi = 0; gi < NUM_GATES.length; gi++) {
		var ga = NUM_GATES[gi]
		if (!NUM_GATE_DRAWN[ga.zone]) continue     // Gt-0 is degenerate; the reference omits it
		var gp = numGatePos(ga.zone)
		numBBPt(gp.x, gp.y, NUM_GATE_R)
		o += '<g class="numGate" data-zone="' + ga.zone + '" data-gate="' + ga.value +
			'" data-sys="' + numSyzygyOf(ga.zone).sys + '">'
		o += '<circle class="numGateRing" cx="' + numR(gp.x) + '" cy="' + numR(gp.y) + '" r="' + NUM_GATE_R + '"/>'
		o += '<text class="numGateText" x="' + numR(gp.x) + '" y="' + numR(gp.y) + '">' + ga.value + '</text>'
		o += '<circle class="numHit" cx="' + numR(gp.x) + '" cy="' + numR(gp.y) + '" r="' + (NUM_GATE_R + 7) + '"/>'
		o += '</g>'
	}
	o += '</g>'

	// Nothing cosmological is drawn here any more: the geocentric model has its
	// own panel, so the canonical viewBox is the canonical viewBox in every mode.

	// -- the link between picked zones. Empty until two are held; filled by
	// numogramLinks() rather than at build time, because it is the only part
	// of the figure that depends on the selection rather than on the model.
	// Above the channels so the arc reads over them, below the zones so it
	// runs behind the discs it joins.
	o += '<g class="numLayer numLayerLink" id="numLinkLayer"></g>'

	// -- zones, on top, the only focusable things in the figure
	o += '<g class="numLayer numLayerZones">'
	for (var z2 = 0; z2 < NUM_ZONES.length; z2++) {
		var zz = NUM_ZONES[z2], sz2 = numSyzygy(zz.sy)
		numBBPt(zz.x, zz.y, zz.r + 3)
		var twin = (sz2.a === zz.n) ? sz2.b : sz2.a
		var dir = NUM_ZONE_MARK[zz.n]
		var np = numNumeralOffset(zz, dir)
		o += '<g class="numZone" id="numZone' + zz.n + '" data-zone="' + zz.n + '" data-sys="' + sz2.sys + '" ' +
			'tabindex="0" role="button" aria-pressed="false" ' +
			'aria-label="Zone ' + zz.n + ', syzygy ' + zz.n + ' with ' + twin + ', ' + sz2.sys + '">'
		o += '<circle class="numZoneRing" cx="' + zz.x + '" cy="' + zz.y + '" r="' + zz.r + '"/>'
		o += '<path class="numZoneMark" d="' + numMarkPath(zz, dir) + '"/>'
		o += '<text class="numZoneText" x="' + numR(np.x) + '" y="' + numR(np.y) + '" style="font-size:' + Math.round(zz.r * 0.82) + 'px">' + zz.n + '</text>'
		// The whole disc is the target, not the stroke. Transparent and drawn
		// last so it sits over the ring, the mark and the numeral; a little
		// wider than the ring for touch, but never wide enough to reach a
		// neighbour - the closest pair are 130 apart and the radii are under 55.
		o += '<circle class="numHit" cx="' + zz.x + '" cy="' + zz.y + '" r="' + (zz.r + 8) + '"/>'
		o += '</g>'
	}
	o += '</g>'

	// one even margin on every side
	var m = 18
	var vx = numR(numBB.x0 - m), vy = numR(numBB.y0 - m)
	var vw = numR(numBB.x1 - numBB.x0 + m * 2), vh = numR(numBB.y1 - numBB.y0 + m * 2)

	var head = '<svg class="numSvg" id="numSvg" viewBox="' + vx + ' ' + vy + ' ' + vw + ' ' + vh + '" '
	head += 'role="img" aria-label="The CCRU Numogram: ten zones, five syzygies, their currents, gates and channels." '
	head += 'preserveAspectRatio="xMidYMid meet">'
	return head + o + '</svg>'
}

// ------------------------------------------------------------ annotation
//
// Typography, not a panel. Four short lines in the diagram's own hand.

// One place for every piece of interaction state. Everything visible is
// derived from these by numogramApply(), so a state cannot survive a reset by
// hiding in the DOM.
var numSelected = null          // zone number, or null
var numMode = "all"             // all | torque | warp | plex
var numExplore = -1             // -1 off, else 0..3 along ZONE/SYZYGY/CURRENT/GATE
var numLayers = { zones: true, currents: true, gates: true, syzygies: true }

// How the current selection was arrived at. null when a zone was simply
// clicked; otherwise the whole derivation, so the reading can show its work.
var numDeriv = null             // {kind:"number"|"word", ...}
var numInputMode = "auto"       // auto | number | word | planet
// The five things the selector offers. "off" is the canonical Numogram and is
// the default: opening the feature shows the diagram and nothing else.
// Two. The selector used to carry five, and three of them did not earn a slot:
// Planetwork is a labelling of the canonical zones rather than a second
// geometry, Cross-map the same pairing read from the other side, and the
// Classical scope only differs from Extended by withholding three bodies.
// Every one of those readings is still reachable - selecting a body gives its
// Planetwork zone and the cross-map warning in the same breath - so nothing
// was lost by taking them off a control that is meant to answer one question.
//
// The cosmo and set fields behind them are untouched, so the readings that
// depend on "pw" and "cross" keep working.
var NUM_MODELS = Object.freeze([
	Object.freeze({ key: "off",          label: "Numogram",              cosmo: "off", set: null }),
	Object.freeze({ key: "geo-extended", label: "Gnosticism",           cosmo: "geo", set: "extended" }),
	Object.freeze({ key: "demonology",   label: "Pandemonium",           cosmo: "demon", set: null }),
	Object.freeze({ key: "divination",   label: "Divination",            cosmo: "divine", set: null })
])

// Which zones are drawn. All ten by default; switching one off removes it and
// every current, channel and gate that touches it, so a pair can be read on
// its own without the rest of the traffic crossing it.
var numZoneOn = { 0: true, 1: true, 2: true, 3: true, 4: true,
                  5: true, 6: true, 7: true, 8: true, 9: true }

// A layer's row in the LAYERS panel: a bar in the colour that layer is drawn
// in, its name, and its state. The bar is what makes the panel readable as a
// key to the figure rather than as four more buttons.
function numLayerRow(key, label) {
	var on = numLayers[key]
	return '<button class="numLayerRow" type="button" data-layer="' + key + '" ' +
	       'aria-pressed="' + (on ? "true" : "false") + '" ' +
	       'onclick="numogramToggleLayer(&quot;' + key + '&quot;)">' +
	       '<span class="numLayerBar" data-bar="' + key + '"></span>' +
	       '<span class="numLayerName">' + label + '</span>' +
	       '<span class="numLayerState">' + (on ? "ON" : "OFF") + '</span></button>'
}

// A region's row, built like a layer's so the two panels read as one family:
// a bar in the colour that region is lit in, its name, and its state. The bar
// matters more here than in LAYERS - "torque", "warp" and "plex" name nothing
// you can see in the figure until you have been told which parts they are.
function numRegionRow(key, label) {
	var on = (numMode === key)
	return '<button class="numLayerRow numRegionRow" type="button" data-mode="' + key + '" ' +
	       'aria-pressed="' + (on ? "true" : "false") + '" ' +
	       'onclick="numogramSetMode(&quot;' + key + '&quot;)">' +
	       '<span class="numLayerBar" data-region="' + key + '"></span>' +
	       '<span class="numLayerName">' + label + '</span>' +
	       '<span class="numLayerState">' + (on ? "ON" : "") + '</span></button>'
}

function numogramToggleZone(n) {
	numZoneOn[n] = !numZoneOn[n]
	// Never leave the figure empty: the last one standing cannot be switched
	// off, or there is nothing to switch back on from.
	var any = false
	for (var k = 0; k <= 9; k++) if (numZoneOn[k]) any = true
	if (!any) numZoneOn[n] = true
	// a hidden zone cannot stay picked, or the reading describes something
	// that is no longer on screen. Only that zone drops out - the rest of the
	// selection is still on screen and still worth keeping.
	var keep = []
	for (var pi = 0; pi < numPicked.length; pi++) if (numZoneOn[numPicked[pi]]) keep.push(numPicked[pi])
	numPicked = keep
	numSelected = numPicked.length ? numPicked[numPicked.length - 1] : null
	numogramSyncControls()
	numogramApply()
}

function numogramAllZones() {
	for (var k = 0; k <= 9; k++) numZoneOn[k] = true
	numogramSyncControls()
	numogramApply()
}

// ------------------------------------------------------------- sections
//
// The side column had grown to eight stacked boxes, every one of them open,
// and a selection added six more - the reading alone is BODY, GEOCENTRIC,
// PLANETWORK, ZONE, SYZYGY, ARITHMETIC and STRUCTURES. That is a wall, and
// nothing in it can be found. Each group folds now, and what is open by
// default is what someone came here to touch: the three sets of switches.
// The reading is one click away and says what it is holding while shut.
var numSections = {
	zones: true, layers: true, regions: true, currents: false, gates: false,
	cosmology: true, trace: true, reading: true, recent: false
}

// ---- the two lookup panels ----------------------------------------------
//
// Not controls: a listing of what the figure currently holds, in the colours
// it holds it in. Every zone number is set in that zone's own hue, so a row
// here and a circle over there are the same colour, and the list can be read
// against the drawing without counting.
function numZoneTag(n) {
	return '<span class="numTag" data-zone="' + n + '">' + n + '</span>'
}

function numogramCurrentList() {
	var o = '<div class="numList">'
	for (var i = 0; i < NUM_SYZYGIES.length; i++) {
		var sz = NUM_SYZYGIES[i]
		var cur = numCurrent(sz)
		o += '<button class="numListRow" type="button" data-sys="' + sz.sys + '" ' +
		     'onclick="numogramSelect(' + sz.a + ')">' +
		     '<span class="numListName numListCurrent">' + sz.current + '</span>' +
		     '<span class="numListPair">' + numZoneTag(sz.a) + '<i>::</i>' + numZoneTag(sz.b) + '</span>' +
		     '<span class="numListTo"><i>&#8594;</i>' + numZoneTag(cur) + '</span>' +
		     '</button>'
	}
	o += '</div>'
	return o
}

function numogramGateList() {
	var o = '<div class="numList">'
	for (var i = 0; i < NUM_GATES.length; i++) {
		var g = NUM_GATES[i]
		if (!NUM_GATE_DRAWN[g.zone]) continue     // Gt-0 is degenerate and undrawn
		var pad = g.value < 10 ? "0" + g.value : String(g.value)
		o += '<button class="numListRow" type="button" data-sys="' + numSyzygyOf(g.zone).sys + '" ' +
		     'onclick="numogramSelect(' + g.zone + ')">' +
		     '<span class="numListName numListGate">Gt-' + pad + '</span>' +
		     '<span class="numListPair">' + numZoneTag(g.zone) + '<i>&#8594;</i>' + numZoneTag(g.to) + '</span>' +
		     '<span class="numListTo"><i>' + g.value + '</i></span>' +
		     '</button>'
	}
	o += '</div>'
	return o
}

function numogramToggleSection(key) {
	numSections[key] = !numSections[key]
	var el = document.querySelector('[data-section="' + key + '"]')
	if (el !== null) {
		el.classList.toggle("numSectionShut", !numSections[key])
		var hd = el.querySelector(".numSectionHead")
		if (hd !== null) hd.setAttribute("aria-expanded", numSections[key] ? "true" : "false")
	}
}

// label, the rows it holds, and a note that only shows while it is folded
function numSection(key, label, body) {
	var open = numSections[key]
	return '<div class="numGroupBox' + (open ? "" : " numSectionShut") + '" data-section="' + key + '">' +
	       '<button class="numSectionHead" type="button" aria-expanded="' + (open ? "true" : "false") + '" ' +
	       'onclick="numogramToggleSection(&quot;' + key + '&quot;)">' +
	       '<span class="numSectionCaret" aria-hidden="true"></span>' +
	       '<span class="numGroupLabel">' + label + '</span>' +
	       '<span class="numSectionNote" id="numSecNote_' + key + '"></span>' +
	       '</button>' +
	       '<div class="numSectionBody">' + body + '</div></div>'
}

// What a folded section says it is holding, so nothing is lost behind a caret.
function numogramSectionNotes() {
	var n = { layers: "", regions: "", zones: "", reading: "", recent: "",
	          currents: "5", gates: "9", cosmology: "", trace: "" }

	n.cosmology = (numCosmo === "off") ? "NUMOGRAM" : "GEOCENTRIC"
	n.trace = numInputMode.toUpperCase()

	var off = []
	for (var k in numLayers) if (numLayers.hasOwnProperty(k) && !numLayers[k]) off.push(k)
	n.layers = off.length === 0 ? "ALL" : (4 - off.length) + "/4"

	n.regions = numMode === "all" ? "ALL" : numMode.toUpperCase()

	var zoff = 0
	for (var z = 0; z <= 9; z++) if (!numZoneOn[z]) zoff++
	n.zones = zoff === 0 ? "ALL" : (10 - zoff) + "/10"

	if (numPicked.length > 1) n.reading = numPicked.join("·")
	else if (numBody !== null) n.reading = numBody
	else if (numSelected !== null) n.reading = "ZONE " + numSelected
	else n.reading = "—"

	n.recent = numHistory.length === 0 ? "—" : String(numHistory.length)

	for (var key in n) {
		if (!n.hasOwnProperty(key)) continue
		var el = document.getElementById("numSecNote_" + key)
		if (el !== null) el.textContent = n[key]
	}
}

var numModel = "off"            // the selector's own value
var numCosmo = "off"            // off | pw | geo | cross - off is the canonical diagram
var numGeoSet = "extended"      // the only scope the selector now offers
var numBody = null              // the selected celestial body, by name
var numHistory = []
var NUM_HISTORY_MAX = 8
var NUM_HISTORY_KEY = "numogramTraces"

var NUM_EXPLORE_STEPS = ["ZONE", "SYZYGY", "CURRENT", "GATE"]

// The reading. Context-sensitive: it shows what is actually being traced and
// nothing else, and every block that is not plain Numogram structure carries
// its provenance. Values come from the model; none of this is templated prose.

function numRow(k, v) {
	return '<div class="numAnnotRow"><span>' + k + '</span><span>' + v + '</span></div>'
}

// A container, not a card: one hairline rule, a small label and the values.
// No radius, no fill, no shadow - it reads as a section of a research sheet.
// data-box carries the label as a slug so the stylesheet can give each kind of
// block its own colour. The reading was a single column of one green, which
// made a zone, its arithmetic and its provenance all look like the same thing.
function numGroup(label, body, cls) {
	var slug = String(label).toLowerCase().replace(/[^a-z0-9]+/g, "-")
	return '<section class="numBox' + (cls ? " " + cls : "") + '" data-box="' + slug + '">' +
		'<h4 class="numBoxLabel">' + label + '</h4>' + body + '</section>'
}

function numStatusTag(status) {
	return '<div class="numStatus numStatus-' + status + '">' + NUM_STATUS_LABEL[status] + '</div>'
}

// The structures a zone sits in - shared by every kind of trace, because every
// trace ends at a zone.
// A Lemur, read out in full: its Mesh number, names, title, demonic class and
// every route CCRU gives it. All of it is quoted, none of it derived.
function numLemurReading(x, y) {
	var L = numLemur(x, y)
	if (L === null) return ""
	var lo = Math.min(x, y), hi = Math.max(x, y)
	var sz = (lo + hi === 9) ? numSyzygy(lo + "::" + hi) : null

	var head = '<div class="numAnnotBig">' + L.name + '</div>'
	if (L.alias) head += '<div class="numAnnotLine numAnnotName">' + L.alias + '</div>'
	if (L.title) head += '<div class="numAnnotLine numAnnotFoot">' + L.title + '</div>'
	var o = numGroup("LEMUR", head)

	var facts = numRow("MESH", "M#" + (L.m < 10 ? "0" + L.m : L.m)) +
		numRow("SPAN", lo + " :: " + hi)
	if (L.klass) facts += numRow("CLASS", L.klass)
	if (sz) facts += numRow("CURRENT", sz.current)
	o += numGroup("PANDEMONIUM", facts)
	o += numStatusTag("canonical")

	if (L.rt.length) {
		var rts = ""
		for (var i = 0; i < L.rt.length; i++) {
			rts += '<div class="numRt"><span class="numRtPath">' + L.rt[i].p + '</span>' +
			       '<span class="numRtText">' + L.rt[i].t + '</span></div>'
		}
		o += numGroup("ROUTES", rts)
	}
	return o
}

function numZoneReading(n) {
	var sz = numSyzygyOf(n), twin = (sz.a === n) ? sz.b : sz.a
	var cur = numCurrent(sz), g = numGate(n)
	var hi = Math.max(n, twin), lo = Math.min(n, twin)
	var o = ""
	o += numGroup("ZONE", '<div class="numAnnotBig numTag" data-zone="' + n + '">' + n + '</div>')
	o += numGroup("SYZYGY",
		'<div class="numAnnotLine">' + numZoneTag(n) + ' : ' + numZoneTag(twin) + '</div>' +
		'<div class="numAnnotLine numAnnotName">' + sz.demon + '</div>' +
		'<div class="numAnnotLine numAnnotFoot">' + sz.sys.toUpperCase() + '</div>')
	o += numGroup("ARITHMETIC",
		'<div class="numAnnotLine">' + numZoneTag(n) + " + " + numZoneTag(twin) + " = " + (n + twin) + '</div>' +
		'<div class="numAnnotLine">' + numZoneTag(hi) + " − " + numZoneTag(lo) + " = " + numZoneTag(cur) + '</div>')
	o += numGroup("STRUCTURES",
		numRow("CURRENT", sz.current + " · " + cur + " → ZONE " + cur) +
		numRow("GATE", String(g.value)) +
		numRow("CHANNEL", n + " → " + g.to))

	// The reverse direction, so the map is navigable both ways: the zone back
	// out to the body the Planetwork gives it, and - only while a cosmological
	// layer is on - that body's classical place.
	var pw = numPlanetworkZone(n)
	if (pw !== null) {
		var pbody = numRow("PLANET", pw.body) + numRow("SOL", String(pw.sol))
		if (numCosmo !== "off") {
			var pg = numGeo(pw.body)
			pbody += numRow("GEOCENTRIC", pg ? (pg.sphere + " SPHERE") : "NO CLASSICAL PLACE")
		}
		o += numGroup("CCRU PLANETWORK", pbody)
	}
	return o
}

// A celestial body's reading: its place in each system, kept apart, plus the
// Numogram relationships that follow from its zone - where it has one.
function numBodyReading(name) {
	var geoMode = (numCosmo === "geo" || numCosmo === "cross")
	var zone = numZoneFor(name)
	var o = ""
	o += numGroup("BODY", '<div class="numAnnotBig">' + name + '</div>')

	if (geoMode) {
		// The Gnostic arrangement. It carries no sphere, no order and no
		// class: nothing here is counted outward from a centre, so the
		// Ptolemaic reading that used to sit in this slot would have been
		// describing a different model entirely.
		var gn = numGnostic(name)
		if (gn === null) {
			o += numGroup("GNOSTIC", '<div class="numAnnotLine numAnnotIdle">NOT IN THIS ARRANGEMENT</div>')
			return o
		}
		o += numGroup("GNOSTIC",
			numRow("ZONE", String(gn.zone)) +
			numRow("HELLENIC", gn.hellenic))
		o += numStatusTag("experimental")

		var pw = numPlanetwork(name)
		if (pw !== null && pw.zone !== gn.zone) {
			o += '<div class="numAnnotLine numAnnotFoot">The Planetwork puts this body at zone ' +
				pw.zone + '. The two arrangements are ordered on different principles.</div>'
		}
		o += numZoneReading(gn.zone)
		return o
	}

	var c = numCrossMap(name)
	if (c.order !== null) {
		o += numGroup("GEOCENTRIC",
			numRow(c.order === 0 ? "ROLE" : "SPHERE",
				c.order === 0 ? "OBSERVATIONAL CENTRE" : (c.sphere + " FROM EARTH")) +
			numRow("ORDER", String(c.order)) +
			numRow("CLASS", c.klass.toUpperCase()))
		o += numStatusTag(c.set === "extended" ? "experimental" : "historical")
	}

	if (zone === null) {
		o += numGroup("CCRU PLANETWORK",
			'<div class="numAnnotLine numAnnotIdle">NO ZONE</div>' +
			'<div class="numAnnotLine numAnnotFoot">The Planetwork counts outward from the Sun. ' +
			'This body is not a station on it, so it has no zone.</div>')
		return o
	}

	o += numGroup("CCRU PLANETWORK", numRow("ZONE", String(zone)) + numRow("SOL", String(c.sol)))
	o += numStatusTag("canonical")
	o += numZoneReading(zone)
	return o
}

function numogramAnnotate() {
	var el = document.getElementById("numAnnot")
	if (el === null) return

	// A body is a selection in its own right, and it is checked before the
	// zone is: the Moon and the fixed stars have a place in the Ptolemaic
	// cosmos and no zone in the Planetwork, so their reading has to survive
	// numSelected being null. That absence is the finding, not an empty state.
	if (numBody !== null) {
		el.innerHTML = numBodyReading(numBody)
		return
	}

	// Two zones held: that pair IS a Lemur, and under Pandemonium it is what
	// the reading is for. It leads, and the zone reading follows it.
	if (numPicked.length === 2) {
		el.innerHTML = numLemurReading(numPicked[0], numPicked[1]) + numZoneReading(numSelected)
		return
	}

	// Nothing picked: say what this section will hold rather than showing an
	// empty box. Two lines, and they go the moment anything is selected.
	if (numSelected === null) {
		el.innerHTML = '<div class="numAnnotLine numAnnotIdle">Pick a zone, or trace a number.</div>' +
			'<div class="numAnnotLine numAnnotIdle">Pick a second to link them.</div>'
		return
	}

	var o = ""

	if (numDeriv !== null && numDeriv.kind === "planet") {
		o += numGroup("PLANET TRACE", '<div class="numAnnotBig">' + authEscNum(numDeriv.raw) + '</div>')
	}

	if (numDeriv !== null && numDeriv.kind === "word") {
		var aq = numDeriv.aq
		o += numGroup("WORD TRACE", '<div class="numAnnotBig">' + authEscNum(numDeriv.raw) + '</div>')
		o += numStatusTag("attested")
		var cv = ""
		for (var i = 0; i < aq.chars.length; i++) {
			cv += '<span class="numChar">' + aq.chars[i].ch + '<b>' + aq.chars[i].v + '</b></span>'
		}
		o += numGroup("AQ VALUES", '<div class="numAnnotLine numAnnotFoot">Anglossic Qabbala, summed.</div>' +
			'<div class="numChars">' + cv + '</div>' +
			'<div class="numAnnotLine">TOTAL ' + aq.total + '</div>' +
			(aq.dropped ? '<div class="numAnnotLine numAnnotFoot">' + aq.dropped + ' CHARACTER' +
				(aq.dropped > 1 ? "S" : "") + ' OUTSIDE 0-9 A-Z IGNORED</div>' : ""))
		o += numogramReductionBlock(numDeriv)
	} else if (numDeriv !== null && numDeriv.kind === "number") {
		o += numGroup("NUMBER TRACE", '<div class="numAnnotBig">' + authEscNum(numDeriv.raw) + '</div>')
		o += numogramReductionBlock(numDeriv)
	}

	o += numZoneReading(numSelected)

	if (numExplore >= 0) {
		o += '<div class="numAnnotExp">TRACING ' + NUM_EXPLORE_STEPS[numExplore] +
			" · " + (numExplore + 1) + "/" + NUM_EXPLORE_STEPS.length + '</div>'
	}
	el.innerHTML = o
}

// The arithmetic, and what it was for.
//
// This used to print the sums and stop: "1 + 3 + 7 = 11", "1 + 1 = 2",
// "RESULT 2", and nothing saying what a result is or why anyone wanted one.
// Someone who did not already know the procedure learned nothing from it. The
// method line says what is being done, the landing line says what the answer
// means, and both are in plain words rather than in the diagram's shorthand.
function numogramReductionBlock(d) {
	var body = '<div class="numAnnotLine numAnnotFoot">Sum the digits. Repeat.</div>'
	for (var i = 0; i < d.steps.length; i++) {
		body += '<div class="numAnnotLine">' + d.steps[i].from + " = " + d.steps[i].to + '</div>'
	}
	if (!d.steps.length) body += '<div class="numAnnotLine numAnnotFoot">Single digit already.</div>'
	body += '<div class="numAnnotLine numAnnotHead">&#8594; ZONE ' + d.result + '</div>'
	return numGroup("REDUCTION", body) + numStatusTag("experimental")
}

// --------------------------------------------------------- highlighting
//
// One function owns every visual state, so nothing can be left lit. Classes
// only - no inline style, so the stylesheet keeps control of the look.

function numogramApply() {
	// the overlay is part of the drawing, so a change of cosmology redraws it
	var geoPanel = document.getElementById("numPanelGeo")
	// the deck marks the card whose pair is held, so the held set is part of
	// what decides whether the panel needs redrawing
	var want = numCosmo + "|" + numGeoSet + "|" + (numBody || "") +
		(numCosmo === "demon" ? "|" + numPicked.join(",") : "")
	if (geoPanel !== null && geoPanel.getAttribute("data-cosmo-key") !== want) {
		geoPanel.setAttribute("data-cosmo-key", want)
		geoPanel.innerHTML = numogramGeoPanel()
		// shown under both cosmologies now - the canonical one gets the
		// Planetwork attributions, the geocentric one the Ptolemaic spheres
		geoPanel.style.display = ""
		numogramBindGeo()
	}

	// The field carries the current cosmology, so the stylesheet can give one
	// of them a different shape. Divination needs it: two fields and a reading
	// of the pair do not fit the narrow slot the planet lineup sits in.
	var fieldEl = document.getElementById("numField")
	if (fieldEl !== null) fieldEl.setAttribute("data-cosmo", numCosmo)

	var svg = document.getElementById("numSvg")
	if (svg === null) return

	svg.setAttribute("data-mode", numMode)
	svg.setAttribute("data-layer-zones", numLayers.zones ? "1" : "0")
	svg.setAttribute("data-layer-currents", numLayers.currents ? "1" : "0")
	svg.setAttribute("data-layer-gates", numLayers.gates ? "1" : "0")
	svg.setAttribute("data-layer-syzygies", numLayers.syzygies ? "1" : "0")

	var all = svg.querySelectorAll(".numZone, .numGate, .numChannel, .numCurrent")
	for (var i = 0; i < all.length; i++) {
		all[i].classList.remove("numOn", "numTwin", "numTrace")
	}

	// The zone filter. A connector is only drawn when both of the zones it
	// touches are on - a channel running to a zone that is not there would
	// otherwise end in empty space, which reads as a drawing error rather
	// than as a filter.
	var zEls = svg.querySelectorAll(".numZone")
	for (var zi = 0; zi < zEls.length; zi++) {
		zEls[zi].classList.toggle("numHidden", !numZoneOn[+zEls[zi].getAttribute("data-zone")])
	}
	var chEls = svg.querySelectorAll(".numChannel")
	for (var ci = 0; ci < chEls.length; ci++) {
		var cf = +chEls[ci].getAttribute("data-from"), ct = +chEls[ci].getAttribute("data-to")
		chEls[ci].classList.toggle("numHidden", !(numZoneOn[cf] && numZoneOn[ct]))
	}
	var gEls = svg.querySelectorAll(".numGate")
	for (var gj = 0; gj < gEls.length; gj++) {
		var gz = +gEls[gj].getAttribute("data-zone")
		var gch = svg.querySelector('.numChannel[data-from="' + gz + '"]')
		gEls[gj].classList.toggle("numHidden",
			!numZoneOn[gz] || (gch !== null && gch.classList.contains("numHidden")))
	}
	var cuEls = svg.querySelectorAll(".numCurrent")
	for (var ui = 0; ui < cuEls.length; ui++) {
		var usz = numSyzygy(cuEls[ui].getAttribute("data-syzygy"))
		var utr = +cuEls[ui].getAttribute("data-current")
		cuEls[ui].classList.toggle("numHidden",
			!(numZoneOn[usz.a] && numZoneOn[usz.b] && numZoneOn[utr]))
	}
	for (var z = 0; z < NUM_ZONES.length; z++) {
		var el = document.getElementById("numZone" + NUM_ZONES[z].n)
		if (el !== null) el.setAttribute("aria-pressed", "false")
	}
	// the folded sections report their own state, and a zone click reaches
	// here without going through numogramSyncControls()
	numogramSectionNotes()
	numogramLinks(svg)

	if (numSelected === null) { numogramAnnotate(); return }

	var n = numSelected, sz = numSyzygyOf(n), twin = (sz.a === n) ? sz.b : sz.a
	var cur = numCurrent(sz), g = numGate(n)

	var sel = document.getElementById("numZone" + n)
	if (sel !== null) { sel.classList.add("numOn"); sel.setAttribute("aria-pressed", "true") }
	var tw = document.getElementById("numZone" + twin)
	if (tw !== null) tw.classList.add("numTwin")
	// the tractor the current runs to, and the zone the channel lands in
	var tr = document.getElementById("numZone" + cur)
	if (tr !== null) tr.classList.add("numTrace")
	var lands = document.getElementById("numZone" + g.to)
	if (lands !== null) lands.classList.add("numTrace")

	// With a trace running, only the link being traced is lit; without one,
	// the whole relationship is. Either way nothing is hidden.
	var wantCurrent = (numExplore < 0 || numExplore >= 2)
	var wantGate = (numExplore < 0 || numExplore === 3)
	var curEl = svg.querySelector('.numCurrent[data-syzygy="' + sz.key + '"]')
	if (curEl !== null && wantCurrent) curEl.classList.add("numOn")
	var chEl = svg.querySelector('.numChannel[data-from="' + n + '"]')
	if (chEl !== null && wantGate) chEl.classList.add("numOn")
	var gEl = svg.querySelector('.numGate[data-zone="' + n + '"]')
	if (gEl !== null && wantGate) gEl.classList.add("numOn")
	if (numExplore === 0 && tw !== null) tw.classList.remove("numTwin")

	numogramAnnotate()
}

// Zones accumulate. Clicking one adds it to the picked set and clicking it
// again takes it out, so two zones can be held side by side and the link
// between them read directly off the figure - which is the question the
// diagram exists to answer and could not be asked of it before, when a second
// click simply replaced the first.
//
// numSelected stays as it was: the most recent pick, and the zone the reading
// describes. Everything downstream of it is untouched.
var numPicked = []

function numogramSelect(n, keepDeriv) {
	var at = numPicked.indexOf(n)
	if (at === -1) numPicked.push(n)
	else numPicked.splice(at, 1)

	numSelected = numPicked.length ? numPicked[numPicked.length - 1] : null
	if (!keepDeriv) numDeriv = null               // a hand-picked zone is its own reading
	if (numSelected === null) numExplore = -1
	else if (numExplore >= 0) numExplore = 0      // a new zone restarts the trace
	if (at === -1 && numSelected !== null && !keepDeriv) {
		numHistoryAdd({ kind: "zone", raw: numSelected, result: numSelected })
		numogramWriteUrl()
	}
	numogramApply()
}

// Everything that sets a single zone from outside the figure - a trace, a
// body, a replay - speaks through this, so the picked set never drifts out of
// step with numSelected.
function numogramSetPicked(n) {
	numPicked = (n === null || n === undefined) ? [] : [n]
	numSelected = numPicked.length ? numPicked[0] : null
}

// The arc between held zones, and the dimming that lets it be seen.
//
// One picked zone puts the figure into focus: everything not picked drops
// back, so the zone and its own traffic stand out of the field. A second pick
// draws the link - a lit arc from each zone to the next, with a travelling
// pulse on it so the join reads as live rather than as one more line in a
// figure already full of them.
//
// The arc is struck between rims with the same numCubic the rest of the
// drawing uses, so it sits on the figure's own geometry rather than floating
// over it in a different idiom.
function numogramLinks(svg) {
	var layer = svg.getAttribute ? svg.querySelector("#numLinkLayer") : null
	if (layer === null) return

	svg.setAttribute("data-focus", numPicked.length ? "1" : "0")
	for (var p = 0; p < 10; p++) {
		var pe = document.getElementById("numZone" + p)
		if (pe !== null) pe.classList.toggle("numPick", numPicked.indexOf(p) !== -1)
	}

	if (numPicked.length < 2) { layer.innerHTML = ""; return }

	var o = ""
	for (var i = 0; i < numPicked.length - 1; i++) {
		var za = numZone(numPicked[i]), zb = numZone(numPicked[i + 1])
		if (za === null || zb === null) continue
		// bowed a little, and alternately, so three or more picks do not stack
		// their arcs on one line
		var bend = (i % 2 === 0 ? 1 : -1) * 54
		var lp = numCubic(za.x, za.y, za.r, zb.x, zb.y, zb.r, bend)
		o += '<path class="numLinkGlow" d="' + lp.d + '"/>'
		o += '<path class="numLinkLine" d="' + lp.d + '"/>'
		o += '<path class="numLinkPulse" d="' + lp.d + '"/>'
	}
	layer.innerHTML = o
}

// ZONE -> SYZYGY -> CURRENT -> GATE, followed on the diagram itself. No wizard,
// no separate view: the same figure, with one link of the chain emphasised at
// a time and the rest of it still visible.
function numogramSelectBody(name) {
	var off = (numBody === name)
	numBody = off ? null : name
	// Clicking a lit body puts it out, and takes its zone with it. It used to
	// clear numBody and leave the zone selected, so the row went dark while
	// the circle it had lit stayed lit - which reads as the click not working.
	if (off) {
		numDeriv = null
		numogramSetPicked(null)
		numogramApply()
		return
	}
	if (numBody !== null) {
		numDeriv = null
		numogramSetPicked(numZoneFor(numBody))   // null for the Moon
	}
	numogramApply()
}

function numogramSetModel(key) {
	var m = null
	for (var i = 0; i < NUM_MODELS.length; i++) if (NUM_MODELS[i].key === key) m = NUM_MODELS[i]
	if (m === null) return
	numModel = m.key
	numCosmo = m.cosmo
	if (m.set !== null) numGeoSet = m.set
	// The body selection survives a change of cosmology now: both panels list
	// the same bodies, so switching between them to compare where one puts a
	// planet against where the other does is the point, and dropping the
	// selection at the moment of comparison defeated it. Only a body the new
	// panel does not list is cleared.
	if (numBody !== null) {
		var rows = numCosmoRows(), still = false
		for (var r = 0; r < rows.length; r++) if (rows[r].body === numBody) still = true
		if (!still) numBody = null
	}
	numogramSyncControls()
	numogramApply()
	numogramFit()
}

function numogramSetGeoSet(g) {
	numGeoSet = g
	numModel = (numCosmo === "geo") ? ("geo-" + g) : numModel
	if (numBody !== null && numGeoSet === "classical") {
		var c = numCrossMap(numBody)
		if (c.set === "extended") numBody = null
	}
	numogramSyncControls()
	numogramApply()
	numogramFit()
}

function numogramExplore() {
	if (numSelected === null) return
	numExplore = (numExplore + 1) % NUM_EXPLORE_STEPS.length
	numogramSyncControls()
	numogramApply()
}

function numogramReset() {
	numogramSetPicked(null)
	numMode = "all"
	numExplore = -1
	numDeriv = null
	numBody = null
	numCosmo = "off"                 // the pure Numogram is always one click away
	numModel = "off"
	// Both of these were resetting to a value the panel no longer offers:
	// the Classical scope came off the cosmology selector, and the trace
	// defaults to working out what was typed rather than being told.
	numGeoSet = "extended"
	numInputMode = "auto"
	numLayers = { zones: true, currents: true, gates: true, syzygies: true }
	var inp = document.getElementById("numTraceInput")
	if (inp !== null) inp.value = ""
	var msg = document.getElementById("numTraceMsg")
	if (msg !== null) msg.textContent = ""
	numogramWriteUrl()
	numogramSyncControls()
	numogramApply()
}

function numogramSetMode(m) { numMode = m; numogramSyncControls(); numogramApply() }

function numogramToggleLayer(k) { numLayers[k] = !numLayers[k]; numogramSyncControls(); numogramApply() }

function numogramSyncControls() {
	var b = document.querySelectorAll(".numCtl[data-mode]")
	for (var i = 0; i < b.length; i++) {
		b[i].classList.toggle("numCtlOn", b[i].getAttribute("data-mode") === numMode)
		b[i].setAttribute("aria-pressed", b[i].getAttribute("data-mode") === numMode ? "true" : "false")
	}

	// REGIONS rows carry their own state text, like the LAYERS rows do
	var rr = document.querySelectorAll(".numRegionRow")
	for (var ri = 0; ri < rr.length; ri++) {
		var ron = rr[ri].getAttribute("data-mode") === numMode
		rr[ri].classList.toggle("numLayerOff", !ron)
		rr[ri].setAttribute("aria-pressed", ron ? "true" : "false")
		var rs = rr[ri].querySelector(".numLayerState")
		if (rs !== null) rs.textContent = ron ? "ON" : ""
	}
	// EXPLORE's button is gone, so there is nothing here to keep in step with
	// numExplore. The state and numogramExplore() remain - a URL carrying an
	// explore step still replays - but nothing in the panel starts one.
	var sel = document.getElementById("numCosmoSel")
	if (sel !== null && sel.value !== numModel) sel.value = numModel

	// LAYERS rows carry their own state text, so they are rewritten rather
	// than just re-classed.
	// [data-layer], not just .numLayerRow: the REGIONS rows share that class
	// to share its styling, and without the attribute filter this loop looked
	// up numLayers["torque"], found undefined, and marked every region row OFF
	// - which also pulled .numLayerOff's grey bar over their colours.
	var lr = document.querySelectorAll(".numLayerRow[data-layer]")
	for (var li = 0; li < lr.length; li++) {
		var lon = numLayers[lr[li].getAttribute("data-layer")]
		lr[li].classList.toggle("numLayerOff", !lon)
		lr[li].setAttribute("aria-pressed", lon ? "true" : "false")
		var st = lr[li].querySelector(".numLayerState")
		if (st !== null) st.textContent = lon ? "ON" : "OFF"
	}

	var zc = document.querySelectorAll(".numZoneChip")
	for (var zj = 0; zj < zc.length; zj++) {
		var zon = numZoneOn[+zc[zj].getAttribute("data-zonechip")]
		zc[zj].classList.toggle("numZoneChipOff", !zon)
		zc[zj].setAttribute("aria-pressed", zon ? "true" : "false")
	}

	numogramSectionNotes()

	// The per-cosmology explanation that used to sit here is gone: it was a
	// paragraph of provenance in the middle of the controls. The same ground -
	// the Ptolemaic ordering, the schematic geometry, the Planetwork's zone-to-
	// Sol labelling - is covered by the ptolemy, crossmap and planetwork entries
	// in SOURCES & METHOD at the foot of the panel, where the rest of the
	// provenance lives.
	var im = document.querySelectorAll(".numCtl[data-input]")
	for (var k = 0; k < im.length; k++) {
		var on2 = im[k].getAttribute("data-input") === numInputMode
		im[k].classList.toggle("numCtlOn", on2)
		im[k].setAttribute("aria-pressed", on2 ? "true" : "false")
	}
	var l = document.querySelectorAll(".numCtl[data-layer]")
	for (var j = 0; j < l.length; j++) {
		var on = numLayers[l[j].getAttribute("data-layer")]
		l[j].classList.toggle("numCtlOn", on)
		l[j].setAttribute("aria-pressed", on ? "true" : "false")
	}
}

// ------------------------------------------------------------- tracing
//
// Both traces end the same way - a zone, and that zone's relationships - but
// they arrive there differently, and each step is kept so the reading can show
// the whole chain rather than just the answer.

// The reduction, recorded one pass at a time.
function numReduceSteps(digits) {
	var steps = [], cur = String(digits)
	while (cur.length > 1) {
		var t = 0
		for (var i = 0; i < cur.length; i++) t += +cur.charAt(i)
		steps.push({ from: cur.split("").join(" + "), to: t })
		cur = String(t)
	}
	return { steps: steps, result: +cur }
}

function numTraceNumber(raw) {
	var digits = String(raw).replace(/[^0-9]/g, "")
	if (digits === "") return { error: "ENTER DIGITS" }
	if (digits.length > 18) return { error: "TOO LONG — 18 DIGITS MAXIMUM" }
	digits = digits.replace(/^0+(?=[0-9])/, "")
	var r = numReduceSteps(digits)
	return { kind: "number", raw: digits, steps: r.steps, result: r.result, status: "experimental" }
}

// A body name, matched against the two datasets. It resolves to whichever of
// them knows the name - and says so when only one of them does.
function numTracePlanet(raw) {
	var name = String(raw).trim().toUpperCase().replace(/[^A-Z]/g, "")
	if (name === "") return { error: "ENTER A BODY NAME" }
	var c = numCrossMap(name)
	if (c.order === null && c.zone === null) {
		return { error: "NOT IN EITHER SYSTEM" }
	}
	if (c.set === "extended" && numGeoSet === "classical") {
		return { error: name + " IS POST-PTOLEMAIC — SWITCH TO EXTENDED" }
	}
	return { kind: "planet", raw: name, body: name, result: c.zone, status: "experimental" }
}

function numTraceWord(raw) {
	var word = String(raw).trim().replace(/\s+/g, " ")
	if (word === "") return { error: "ENTER A WORD" }
	if (word.length > 64) return { error: "TOO LONG — 64 CHARACTERS MAXIMUM" }
	var aq = numAqTrace(word)
	if (aq.chars.length === 0) return { error: "NO ALPHANUMERIC CHARACTERS" }
	var r = numReduceSteps(aq.total)
	return { kind: "word", raw: word, aq: aq, steps: r.steps, result: r.result, status: "experimental" }
}

// ------------------------------------------------------------ history
//
// Eight entries, kept locally, so a reading can be returned to. Deliberately
// not a dashboard: a short list of what was traced, nothing more.
function numHistoryLoad() {
	try {
		var raw = window.localStorage.getItem(NUM_HISTORY_KEY)
		numHistory = raw ? JSON.parse(raw) : []
		if (!Array.isArray(numHistory)) numHistory = []
	} catch (e) { numHistory = [] }
}

function numHistorySave() {
	try { window.localStorage.setItem(NUM_HISTORY_KEY, JSON.stringify(numHistory)) } catch (e) {}
}

function numHistoryAdd(entry) {
	numHistory = numHistory.filter(function (h) { return !(h.kind === entry.kind && h.raw === entry.raw) })
	numHistory.unshift(entry)
	if (numHistory.length > NUM_HISTORY_MAX) numHistory.length = NUM_HISTORY_MAX
	numHistorySave()
	numogramRenderHistory()
}

function numogramRenderHistory() {
	var el = document.getElementById("numHistory")
	if (el === null) return
	if (!numHistory.length) { el.innerHTML = ""; return }
	// the section header says RECENT now, so this no longer repeats it
	var o = ''
	for (var i = 0; i < numHistory.length; i++) {
		var h = numHistory[i]
		var label = h.kind === "zone" ? ("ZONE " + h.raw)
			: (authEscNum(h.raw) + " → " + h.result)
		o += '<button class="numHistBtn" type="button" data-i="' + i + '">' + label + '</button>'
	}
	el.innerHTML = o
}

// The panel writes a phrase someone typed, so it is escaped on the way in.
function authEscNum(v) {
	return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function numogramReplay(i) {
	var h = numHistory[i]
	if (!h) return
	if (h.kind === "zone") { numDeriv = null; numogramSetPicked(h.raw); numogramApply(); return }
	var inp = document.getElementById("numTraceInput")
	if (inp !== null) inp.value = h.raw
	numogramSyncControls()
	numogramRunTrace(true, h.kind)
}

// ------------------------------------------------------- numerical input
//
// Reduction and cumulation are both canonical operations, so a number maps
// into the figure without inventing anything. Nothing here extends the system;
// it applies it. There is no authoritative CCRU procedure for turning words
// into zones, so there is no text input.

// Kept for a saved workspace that still names a mode; nothing in the panel
// calls it, because there is no mode control any more.
function numogramSetInputMode(m) {
	numInputMode = m
	var inp = document.getElementById("numTraceInput")
	if (inp !== null) {
		inp.value = ""
		inp.setAttribute("inputmode", m === "number" ? "numeric" : "text")
		inp.setAttribute("aria-label", m === "number"
			? "Enter a number to trace into the Numogram"
			: "Enter a word to trace into the Numogram")
	}
	var out = document.getElementById("numTraceMsg")
	if (out !== null) out.textContent = ""
	numogramSyncControls()
}

// Work out what was typed instead of making someone declare it first.
//
// Three readings, in order of how sure we can be:
//
//   digits only            a number, and nothing else it could be
//   a body's name          a planet - checked before the word reading,
//                          because "MARS" is a valid word too and the
//                          planet reading is the more specific answer
//   anything else          a word, through Anglossic Qabbala
//
// AUTO is the default. The three explicit modes are still there for when the
// guess is not the one wanted - typing MARS and meaning the word, say.
function numTraceAuto(raw) {
	var t = String(raw).trim()
	if (/^[0-9]+$/.test(t)) return numTraceNumber(t)

	var up = t.toUpperCase()
	for (var i = 0; i < NUM_GEOCENTRIC.length; i++) {
		if (NUM_GEOCENTRIC[i].body === up) return numTracePlanet(t)
	}
	for (var j = 0; j < NUM_PLANETWORK.length; j++) {
		if (NUM_PLANETWORK[j].body === up) return numTracePlanet(t)
	}
	return numTraceWord(t)
}

// `mode` is only passed by a replay or a shared link, which already know what
// kind of thing they are re-running. Typing into the field never passes one:
// there is no mode to pick any more, so the field always works it out. Taking
// it as an argument rather than through numInputMode is what keeps it that
// way - a replayed word trace used to leave the mode stuck on "word", and
// everything typed after it was read as a word.
function numogramTraceTyped() {
	var inp = document.getElementById("numTraceInput")
	var x = document.getElementById("numTraceClear")
	if (inp === null || x === null) return
	x.classList.toggle("hideValue", inp.value === "")
}

function numogramClearTrace() {
	var inp = document.getElementById("numTraceInput")
	if (inp !== null) { inp.value = ""; inp.focus() }
	numDeriv = null
	numogramSetPicked(null)
	var msg = document.getElementById("numTraceMsg")
	if (msg !== null) msg.textContent = ""
	numogramTraceTyped()
	numogramWriteUrl()
	numogramApply()
}

function numogramRunTrace(silent, mode) {
	var inp = document.getElementById("numTraceInput")
	var msg = document.getElementById("numTraceMsg")
	if (inp === null) return
	var raw = inp.value

	if (raw.trim() === "") {          // empty is a clear, not an error
		numDeriv = null
		if (msg !== null) msg.textContent = ""
		numogramSetPicked(null)
		numogramApply()
		return
	}

	var m = mode || "auto"
	var d = (m === "planet") ? numTracePlanet(raw)
		: (m === "word") ? numTraceWord(raw)
		: (m === "number") ? numTraceNumber(raw)
		: numTraceAuto(raw)
	if (d.error) {
		if (msg !== null) msg.textContent = d.error
		return
	}
	if (msg !== null) msg.textContent = ""

	numDeriv = d
	if (d.kind === "planet") {
		// a planet trace IS a body selection; the reading is the body's
		numBody = d.body
		if (numCosmo === "off") numCosmo = "cross"    // it has nowhere to show otherwise
		numogramSyncControls()
	} else {
		numBody = null
	}
	numogramSetPicked(d.result)
	numExplore = -1
	if (!silent) numHistoryAdd({ kind: d.kind, raw: d.raw, result: d.result })
	numogramWriteUrl()
	numogramApply()
}

// ------------------------------------------------------- shareable state
//
// The trace goes in the query string so a particular reading can be linked to.
// Nothing here is private: it is a zone number, a number, or a word somebody
// typed in order to share it.
function numogramWriteUrl() {
	if (!window.history || !window.history.replaceState) return
	try {
		var u = new URL(window.location.href)
		u.searchParams.delete("zone"); u.searchParams.delete("number"); u.searchParams.delete("word")
		if (numDeriv !== null && numDeriv.kind === "number") u.searchParams.set("number", numDeriv.raw)
		else if (numDeriv !== null && numDeriv.kind === "word") u.searchParams.set("word", numDeriv.raw)
		else if (numSelected !== null) u.searchParams.set("zone", String(numSelected))
		window.history.replaceState(null, "", u.toString())
	} catch (e) {}
}

// Opening on a link lands in that state rather than the default view.
function numogramReadUrl() {
	try {
		var q = new URL(window.location.href).searchParams
		var w = q.get("word"), n = q.get("number"), z = q.get("zone")
		var inp = document.getElementById("numTraceInput")
		if (w !== null && w !== "") {
			if (inp !== null) inp.value = w.slice(0, 64)
			numogramRunTrace(true, "word")
			return true
		}
		if (n !== null && n !== "") {
			if (inp !== null) inp.value = n.slice(0, 18)
			numogramRunTrace(true, "number")
			return true
		}
		if (z !== null && /^[0-9]$/.test(z)) {
			numogramSetPicked(+z)
			numDeriv = null
			numogramApply()
			return true
		}
	} catch (e) {}
	return false
}

// ------------------------------------------------------------- the panel

function numogramCorrections() {
	var o = '<div class="numNote">'
	o += '<b>On the reference.</b> The image this was drawn from is a degraded reproduction of the Numogram: '
	o += 'it carries nine zone circles rather than ten, labels two of them 1, omits Zone-7, and repeats the '
	o += 'Gt-28 annotation while omitting Gt-15 and Gt-21. Its composition and line work are followed here. '
	o += 'Its content is not &mdash; the ten zones, five syzygies, currents, gates and channels are generated from the '
	o += 'CCRU rules (nine-sum twinning, arithmetical difference, digital cumulation and reduction), so every number '
	o += 'on the figure is derived rather than placed.'
	o += '</div>'
	return o
}

function toggleNumogramMenu() {
	if (!numogramMenuOpened) {
		closeAllOpenedMenus()
		numogramMenuOpened = true

		var o = '<div class="colorControlsBG numogramBG">'
		o += '<input class="closeMenuBtn" type="button" value="&#215;" onclick="closeAllOpenedMenus()">'

		// the green field. Everything inside it is the artefact; nothing of the
		// site's chrome reaches in.
		o += '<div class="numField" id="numField" data-invert="0">'

		// The title bar carries the two controls that set up a reading -
		// which cosmology, and what to trace - at the same level as the name.
		// They were a column of their own on the right; up here they are on
		// one line, and the figure gets the width back.
		o += '<div class="numTitle">'
		o += '<span class="numTitleMain">NUMOGRAM</span><span class="numTitleSub">CCRU</span>'

		o += '<div class="numTitleCtl numTitleCosmo">'
		o += '<span class="numTitleLabel">COSMOLOGY</span>'
		o += '<select class="numSelect numSelectPrimary" id="numCosmoSel" onchange="numogramSetModel(this.value)" aria-label="Cosmology">'
		for (var mi = 0; mi < NUM_MODELS.length; mi++) {
			o += '<option value="' + NUM_MODELS[mi].key + '">' + NUM_MODELS[mi].label + '</option>'
		}
		o += '</select></div>'

		o += '<div class="numTitleCtl numTitleTrace">'
		o += '<span class="numTitleLabel">TRACE</span>'
		// inputmode text, not numeric: AUTO takes words and planet names too,
		// and a phone that opens the number pad for it is telling the user
		// this field only accepts digits.
		o += '<span class="numTraceField">'
		o += '<input class="numNumberInput" id="numTraceInput" type="text" inputmode="text" '
		o += 'autocomplete="off" spellcheck="false" maxlength="64" placeholder="number or word" '
		o += 'aria-label="Number, word or planet to trace into the Numogram" '
		o += 'onkeydown="numogramInputKey(event)" oninput="numogramTraceTyped()">'
		// A clear, sitting in the field's own corner rather than taking a slot
		// on the row. Hidden until there is something to clear.
		o += '<button class="numTraceClear hideValue" id="numTraceClear" type="button" ' +
		     'aria-label="Clear the trace" title="Clear" onclick="numogramClearTrace()">&#215;</button>'
		o += '</span>'
		o += '<button class="numCtl numCtlPlain" type="button" onclick="numogramRunTrace()">GO</button>'
		o += '<span class="numTraceMsg" id="numTraceMsg" role="status" aria-live="polite"></span>'
		o += '</div>'

		o += '</div>'

		// Off-screen, but still written to and replayed from.
		o += '<div class="numHistory hideValue" id="numHistory"></div>'

		o += '<div class="numBody">'
		// ---- left column: what is on the figure -------------------------
		//
		// Zones, layers and regions decide what is drawn; currents and gates
		// list what has been drawn, in the colours it was drawn in. They sit
		// on the near side of the diagram because they are read against it -
		// the right-hand column is for asking questions, this one is for
		// setting up the view and for looking things up in it.
		o += '<div class="numSide numSideLeft">'

		var zn = '<div class="numZoneFilter" role="group" aria-label="Zones shown">'
		for (var zf = 0; zf <= 9; zf++) {
			zn += '<button class="numZoneChip" type="button" data-zonechip="' + zf + '" ' +
			      'aria-pressed="true" aria-label="Zone ' + zf + '" ' +
			      'onclick="numogramToggleZone(' + zf + ')">' + zf + '</button>'
		}
		zn += '</div>'
		zn += '<div class="numCtlRow"><button class="numCtl numCtlPlain" type="button" onclick="numogramAllZones()">ALL ZONES</button></div>'
		o += numSection("zones", "ZONES", zn)

		// REGIONS above LAYERS: it narrows the figure to one time system, which
		// is a coarser cut than turning a layer off, and the coarser control
		// belongs first.
		var reg = numRegionRow("torque", "Torque") + numRegionRow("warp", "Warp") +
		          numRegionRow("plex", "Plex") + numRegionRow("all", "All")
		o += numSection("regions", "REGIONS", reg)

		var lay = numLayerRow("zones", "Zones") + numLayerRow("currents", "Currents") +
		          numLayerRow("gates", "Gates") + numLayerRow("syzygies", "Syzygies")
		o += numSection("layers", "LAYERS", lay)

		o += numSection("currents", "CURRENTS", numogramCurrentList())
		o += numSection("gates", "GATES", numogramGateList())

		o += '</div>' // .numSideLeft


		o += '<div class="numStage" id="numStage">'
		o += '<div class="numPanel numPanelMain">' + numogramSvg() + '</div>'
		o += '<div class="numPanel numPanelGeo" id="numPanelGeo"></div>'
		o += '</div>'

		// ---- right column: what you ask of it ---------------------------
		// ---- right column: act on it, then read it ---------------------
		//
		// Two actions and the reading under them. EXPLORE is gone: it walked
		// ZONE -> SYZYGY -> CURRENT -> GATE one step per click, which the
		// reading now lays out in full the moment a zone is picked.
		o += '<div class="numSide numSideRight">'
		o += '<div class="numCtlRow numActionRow">'
		o += '<button class="numCtl numCtlPlain" type="button" onclick="numogramReset()">RESET</button>'
		o += '<button class="numCtl numCtlPlain" type="button" onclick="numogramInvert()">INVERT</button>'
		o += '</div>'
		o += numSection("reading", "READING", '<div class="numAnnot" id="numAnnot" aria-live="polite"></div>')
		o += '</div>' // .numSideRight

		o += '</div>' // .numBody
		o += '</div>' // .numBody

		// One credit line, folded. This used to unfold into nine provenance
		// blocks - a status badge, a claim and a source for every part of the
		// model - which ran off the bottom of the panel and buried the only
		// thing that actually needs saying.
		o += '<details class="numDetails"><summary>SOURCES</summary>'
		o += '<div class="numDetailsBody">'
		o += '<div class="numCredit"><i>CCRU: Writings 1997&ndash;2003</i></div>'
		o += '</div></details>'

		o += '</div>' // .numField

		o += '</div>'

		document.getElementById("numogramMenuArea").innerHTML = o
		numogramBind()
		numHistoryLoad()
		numogramRenderHistory()
		numogramSyncControls()
		if (!numogramReadUrl()) numogramApply()    // a linked trace opens in that state
		numogramFit()
		window.addEventListener("resize", numogramFitSoon)
	} else {
		// nothing left running behind a closed panel
		window.removeEventListener("resize", numogramFitSoon)
		if (numFitTimer !== null) { clearTimeout(numFitTimer); numFitTimer = null }
		document.getElementById("numogramMenuArea").innerHTML = ""
		numogramMenuOpened = false
		numogramSetPicked(null)
		numExplore = -1
		numDeriv = null
	}
}

// The panel sits inside the calculator's own scrolling column, so a vh unit
// over-states what is free. This measures it: the diagram is given whatever is
// left after the head, the controls, the information and the note, and it is
// the diagram that flexes rather than the page that grows.
function numogramFit() {
	var f = document.getElementById("numField")
	if (f === null) return
	var host = document.getElementById("calcMain") || document.documentElement
	var area = document.getElementById("numogramMenuArea")
	var note = document.querySelector(".numNote")

	f.style.height = ""            // measure against the natural layout
	var top = area.getBoundingClientRect().top - host.getBoundingClientRect().top
	// Everything in the panel that is NOT the field - the wrapper's padding,
	// the folded sources section, margins - measured rather than guessed at.
	// It used to subtract a fixed allowance for a standing note that has since
	// moved inside the sources section, so the figure was being given several
	// hundred pixels less than it had.
	var chrome = Math.max(0, area.offsetHeight - f.offsetHeight)
	var avail = host.clientHeight - top - chrome - 14

	// A floor, so a very short window scrolls a little rather than crushing the
	// figure into illegibility; a ceiling, so a tall one does not blow it up.
	f.style.height = Math.round(Math.max(380, Math.min(avail, 1020))) + "px"

	// And the width follows from the height. The drawing is about 0.59 as wide
	// as it is tall, so on a wide monitor a full-width field is mostly dead
	// green with the figure adrift in the middle of it. Measuring the stage
	// after the height is applied gives exactly the width the diagram wants,
	// plus the column of text beside it.
	var svg = document.getElementById("numSvg")
	var stage = document.querySelector(".numStage")
	// Two columns now, one either side. This used to take the first .numSide
	// it found and count it once, so the field was sized as though the left
	// column were not there at all - which is what pushed the contents past
	// the edge of the panel.
	var sideL = document.querySelector(".numSideLeft")
	var sideR = document.querySelector(".numSideRight")
	var body = document.querySelector(".numBody")
	if (svg === null || stage === null) return

	f.style.width = ""
	var vb = svg.viewBox.baseVal
	if (!vb || !vb.height) return

	// Narrow screens stack into one column, and constraining the height there
	// only makes the field scroll inside itself - which hides the controls and
	// the reading, the two things that must stay visible. The panel grows to
	// its content instead and the page scrolls, which is the normal behaviour
	// of every other panel on the site. The no-scrolling requirement is a
	// desktop one; what must never need scrolling is the diagram itself, and
	// it does not - it is sized to the viewport by the stylesheet.
	// The narrow layout is a flex column now, not a block, and testing only for
	// block meant the field kept the fixed height meant for the side-by-side
	// arrangement - so on a phone the bottom of the panel was cut off.
	var bs = getComputedStyle(body)
	var stacked = (bs.display === "block") ||
		(bs.display === "flex" && bs.flexDirection === "column")
	if (stacked) { f.style.height = ""; f.style.width = ""; return }

	var geoPanel = document.getElementById("numPanelGeo")
	var geoW = (geoPanel !== null && geoPanel.offsetWidth) ? geoPanel.offsetWidth + 22 : 0
	var drawW = stage.clientHeight * (vb.width / vb.height) + geoW
	var cs = getComputedStyle(f)
	var pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
	var gap = parseFloat(getComputedStyle(body).columnGap) || 0
	// Set as a width, not a max-width: the panel around it is sized to fit its
	// content, so giving the field a real width makes that frame hug it evenly
	// instead of stretching the full width of the page with the artwork
	// floating in the middle of it.
	var sides = (sideL ? sideL.offsetWidth : 0) + (sideR ? sideR.offsetWidth : 0)
	var gaps = gap * ((sideL ? 1 : 0) + (sideR ? 1 : 0))
	var want = Math.round(drawW + sides + gaps + pad)

	// Never wider than the room there is. On a narrow window the columns are
	// already at their minimum, so asking for more than the host can give only
	// pushes the panel off the side of the page.
	var room = (host.clientWidth || want) - 24
	f.style.width = Math.min(want, room) + "px"
}

var numFitTimer = null
function numogramFitSoon() {
	if (numFitTimer !== null) clearTimeout(numFitTimer)
	numFitTimer = setTimeout(function () { numFitTimer = null; numogramFit() }, 120)
}

// Enter traces, Escape clears the field and the reading.
function numogramInputKey(e) {
	if (e.key === "Enter") { e.preventDefault(); numogramRunTrace(); return }
	if (e.key === "Escape" || e.key === "Esc") {
		e.preventDefault()
		e.target.value = ""
		numDeriv = null
		numogramSetPicked(null)
		var msg = document.getElementById("numTraceMsg")
		if (msg !== null) msg.textContent = ""
		numogramWriteUrl()
		numogramApply()
	}
}

function numogramInvert() {
	var f = document.getElementById("numField")
	if (f === null) return
	f.setAttribute("data-invert", f.getAttribute("data-invert") === "1" ? "0" : "1")
}

// Delegated, so the handlers survive the panel being rebuilt and there is one
// listener rather than thirty.
// Split out because the SVG is rebuilt whenever the cosmological layer
// changes, and its handlers have to come back with it.
// The single entry point for selection. Returns true if it acted.
function numogramActivate(target) {
	if (!target || !target.closest) return false
	var b = target.closest(".numGeoBody")
	if (b !== null) { numogramSelectBody(b.getAttribute("data-body")); return true }
	var g = target.closest(".numZone")
	if (g !== null) { numogramSelect(+g.getAttribute("data-zone")); return true }
	// a gate or a current selects the zone it belongs to - they are readings
	// of that zone, so there is nothing separate to select
	var ga = target.closest(".numGate")
	if (ga !== null) { numogramSelect(+ga.getAttribute("data-zone")); return true }
	var c = target.closest(".numCurrent")
	if (c !== null) {
		var sz = numSyzygy(c.getAttribute("data-syzygy"))
		if (sz !== null) { numogramSelect(sz.a); return true }
	}
	var ch = target.closest(".numChannel")
	if (ch !== null) { numogramSelect(+ch.getAttribute("data-from")); return true }
	return false
}

// The geocentric panel is replaced whenever the model changes, so its
// handlers go back on with it. Same single entry point.
function numogramBindGeo() {
	var g = document.getElementById("numGeoSvg")
	if (g === null) return
	g.addEventListener("click", function (e) {
		var b = e.target.closest(".numBand")
		if (b !== null) numogramSelectBody(b.getAttribute("data-body"))
	})
	g.addEventListener("keydown", function (e) {
		if (e.key === "Escape" || e.key === "Esc") {
			e.preventDefault()
			numogramSetPicked(null); numExplore = -1; numBody = null
			numogramSyncControls(); numogramApply()
			return
		}
		if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return
		var b = e.target.closest(".numBand")
		if (b !== null) { e.preventDefault(); numogramSelectBody(b.getAttribute("data-body")) }
	})
}

function numogramBindSvg() {
	var svg = document.getElementById("numSvg")
	if (svg === null) return
	// One route in, whatever the input was: pointer, touch and keyboard all
	// come through numogramActivate so they cannot drift apart.
	svg.addEventListener("click", function (e) { numogramActivate(e.target) })
	svg.addEventListener("keydown", function (e) {
		if (e.key === "Escape" || e.key === "Esc") {
			e.preventDefault()
			numogramSetPicked(null); numExplore = -1; numBody = null
			numogramSyncControls(); numogramApply()
			return
		}
		if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return
		if (numogramActivate(e.target)) e.preventDefault()
	})
}

function numogramBind() {
	var hist = document.getElementById("numHistory")
	if (hist !== null) {
		hist.addEventListener("click", function (e) {
			var b = e.target.closest(".numHistBtn")
			if (b !== null) numogramReplay(+b.getAttribute("data-i"))
		})
	}
	numogramBindSvg()
}

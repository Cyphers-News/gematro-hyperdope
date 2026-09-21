// ========================= Master Decoder =========================
//
// Features -> Master Decoder. A word appears; type its sum in the chosen
// cipher. A five second countdown, then sixty seconds, as many as you can.
// The next word arrives 1.2s after each answer, right or wrong. Hovering or
// focusing a letter reveals its value. Two boards, Ordinal and Reduced,
// because a score in one is not comparable with a score in the other.
//
// Adapted from the standalone game (GAME/) - same rules, same words, same
// two ciphers - rebuilt as a panel of this app: it opens and closes like
// Date Calc and Astrology, and is drawn from this app's own classes.
//
// THE ROUND IS RUN BY THE DATABASE, not by this file. The server picks each
// word, checks each answer against its own sum, keeps the clock and credits
// the score (supabase/migrations/20260918000000_master_decoder.sql, called
// through auth/master-decoder-data.js). There is no score in here to send,
// so there is none to forge from the console. The clock drawn here is for
// the player's benefit; the server's is the one that counts.
//
// Anyone can open the panel and read what the game is. Playing, and seeing
// the board, needs an account - Start while signed out shows the sign-in
// prompt instead.

var masterDecoderMenuOpened = false

var MD_ROUND_SECONDS = 60
var MD_LOW_TIME_SECONDS = 10 // when the clock starts reading as urgent
var MD_BOARD_SIZE = 10

var mdMode = "ordinal"      // the cipher that will be played
var mdBoardMode = "ordinal" // the board being looked at - follows mdMode, can be switched on its own
var mdPhase = "idle"        // idle | starting | countdown | running | ending
var mdRoundId = null
var mdScore = 0
var mdEndsAt = 0            // Date.now() at which the round ends, from the server's time_left_ms
var mdCountdownTimer = null
var mdClockTimer = null
var mdAdvanceTimer = null
var mdPending = null        // the answer in flight, so the round does not close under it
var mdBoards = { ordinal: null, reduced: null } // last board fetched, per cipher
var mdBoardSeq = 0
var mdAuthSub = null
var mdWasSignedIn = null

// ---- pure rules (also exercised by tests/master-decoder.test.js) ----------

// Ordinal: A=1 .. Z=26. Reduced: A..I = 1..9, J..R = 1..9, S..Z = 1..8.
// Anything that is not A-Z has no value. master_decoder_sum() in the
// migration is the same rule; this copy only drives the hover reveal.
function mdLetterValue(ch, mode) {
	var c = String(ch).toUpperCase()
	if (!/^[A-Z]$/.test(c)) return null
	var v = c.charCodeAt(0) - 64
	return mode === "reduced" ? ((v - 1) % 9) + 1 : v
}

function mdWordSum(word, mode) {
	return String(word).split("").reduce(function (sum, ch) {
		var v = mdLetterValue(ch, mode)
		return v === null ? sum : sum + v
	}, 0)
}

var MD_MONTHS = ["January", "February", "March", "April", "May", "June", "July",
	"August", "September", "October", "November", "December"]

// "2026-09" -> "September 2026". The period itself always comes from the
// server; this only words it.
function mdPeriodLabel(period) {
	var m = /^(\d{4})-(\d{2})$/.exec(String(period || ""))
	if (!m) return ""
	return MD_MONTHS[Number(m[2]) - 1] + " " + m[1]
}

// "2026-10-01" -> "1 October"
function mdResetLabel(ymd) {
	var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ""))
	if (!m) return ""
	return Number(m[3]) + " " + MD_MONTHS[Number(m[2]) - 1]
}

// Green if the score would place on the board as it stood before this round
// landed, red if not - the rule the game has always had.
function mdQualifies(score, rows, size) {
	if (!(score > 0)) return false
	rows = rows || []
	size = size || MD_BOARD_SIZE
	if (rows.length < size) return true
	return score > rows[size - 1].best_score
}

// ---- helpers ---------------------------------------------------------------

function mdSignedIn() {
	return typeof authUser !== "undefined" && authUser !== null
}

function mdEsc(s) {
	if (typeof authEsc === "function") return authEsc(s)
	return String(s === null || s === undefined ? "" : s)
		.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

function mdEl(id) { return document.getElementById(id) }

function mdRoundActive() {
	return mdPhase === "starting" || mdPhase === "countdown" || mdPhase === "running" || mdPhase === "ending"
}

function mdClearTimers() {
	clearInterval(mdCountdownTimer); mdCountdownTimer = null
	clearInterval(mdClockTimer); mdClockTimer = null
	clearTimeout(mdAdvanceTimer); mdAdvanceTimer = null
}

// ---- open / close ----------------------------------------------------------

function toggleMasterDecoderMenu() {
	if (!masterDecoderMenuOpened) {
		closeAllOpenedMenus()
		masterDecoderMenuOpened = true
		mdWasSignedIn = null
		mdRenderPanel()
		mdWatchAuth()
		// the stored session may still be being restored; draw again once it is
		if (typeof onAuthReady === "function") onAuthReady(function () { if (masterDecoderMenuOpened) mdAuthChanged() })
	} else {
		mdAbandonRound()
		mdUnwatchAuth()
		mdRainOff()
		var area = mdEl("masterDecoderMenuArea")
		if (area !== null) area.innerHTML = ""
		masterDecoderMenuOpened = false
	}
}

// Sign in or out in this tab or another while the panel is open. Only a real
// change redraws: the hourly token refresh fires the same event and must not
// interrupt a round.
function mdWatchAuth() {
	var client = (typeof getAuthClient === "function") ? getAuthClient() : null
	if (client === null || !client.auth || !client.auth.onAuthStateChange) return
	var res = client.auth.onAuthStateChange(function () {
		setTimeout(function () { if (masterDecoderMenuOpened) mdAuthChanged() }, 0) // after auth.js has updated authUser
	})
	mdAuthSub = (res && res.data) ? res.data.subscription : null
}

function mdUnwatchAuth() {
	if (mdAuthSub && typeof mdAuthSub.unsubscribe === "function") mdAuthSub.unsubscribe()
	mdAuthSub = null
}

function mdAuthChanged() {
	var yes = mdSignedIn()
	if (yes === mdWasSignedIn) return
	var wasPlaying = mdRoundActive()
	mdWasSignedIn = yes
	// a sign-out mid-round ends it: there is nowhere left for it to count
	if (!yes && wasPlaying) mdAbandonRound()
	mdBoards = { ordinal: null, reduced: null }
	mdRenderPanel()
	if (!yes && wasPlaying) mdSetFeedback("You signed out, so the round was ended.", "bad")
}

// ---- the logo ----------------------------------------------------------------
//
// MASTER small above DECODER large, redrawn from the game's original GIF as an
// inline SVG so that every letter is its own element: hovering, tapping or
// arrowing onto one swaps just that letter for its reduced cipher value, the
// same value mdLetterValue() gives the word in play - there is no second copy
// of the cipher here.
//
// Each glyph is a single stroked path on a 100 x 160 cell, round-capped, in
// the GIF's geometric hand: a pointed diamond O, angled C, D and R, and foot
// bars on D and R. The digits are drawn the same way so a revealed value sits
// in its letter's place as part of the logo rather than as ordinary text.

var MD_LOGO_GLYPHS = {
	D: "M8,12 H58 L90,72 V88 L58,148 H8 M26,12 V148",
	E: "M88,12 H14 V148 H88 M14,80 H72",
	C: "M88,12 H48 L14,62 V98 L48,148 H88",
	O: "M50,12 L86,66 V94 L50,148 L14,94 V66 Z",
	R: "M8,12 H68 L88,32 V62 L68,82 H26 M26,12 V148 M10,148 H42 M58,82 L90,148",
	M: "M14,148 V12 L50,90 L86,12 V148",
	A: "M10,148 L50,12 L90,148 M26,96 H74",
	S: "M86,24 L74,12 H26 L14,24 V66 L26,78 H74 L86,90 V136 L74,148 H26 L14,136",
	T: "M10,12 H90 M50,12 V148",
	"1": "M28,38 L54,12 V148 M28,148 H80",
	"2": "M14,36 L34,12 H68 L88,34 V60 L14,148 H88",
	"3": "M14,12 H86 L50,68 H64 L88,92 V126 L66,148 H14",
	"4": "M68,148 V12 L12,108 H90",
	"5": "M86,12 H20 L16,72 H66 L88,94 V126 L66,148 H14",
	"6": "M78,12 H44 L14,52 V126 L36,148 H66 L88,126 V96 L66,76 H14",
	"7": "M12,12 H88 L42,148",
	"8": "M34,12 H66 L84,30 V56 L66,76 H34 L16,56 V30 Z M34,76 L14,98 V128 L34,148 H66 L86,128 V98 L66,76",
	"9": "M22,148 H58 L86,108 V32 L66,12 H34 L14,32 V56 L34,76 H86"
}

var MD_LOGO_BIG_STEP = 142    // DECODER: 100 wide cells, 42 apart
var MD_LOGO_SMALL_SCALE = 0.3 // MASTER at 30% of DECODER's size
var MD_LOGO_SMALL_STEP = 60   // ...and spaced wide, as in the GIF

// Where every letter goes, and what it reveals. DECODER spans 0..952; MASTER
// is centred over it.
function mdLogoLetters() {
	var out = []
	var big = "DECODER", small = "MASTER"
	var smallWidth = (small.length - 1) * MD_LOGO_SMALL_STEP + 100 * MD_LOGO_SMALL_SCALE
	var bigWidth = (big.length - 1) * MD_LOGO_BIG_STEP + 100
	var x0 = (bigWidth - smallWidth) / 2
	small.split("").forEach(function (ch, i) {
		out.push({ ch: ch, v: mdLetterValue(ch, "reduced"), big: false, x: x0 + i * MD_LOGO_SMALL_STEP, y: 14 })
	})
	big.split("").forEach(function (ch, i) {
		out.push({ ch: ch, v: mdLetterValue(ch, "reduced"), big: true, x: i * MD_LOGO_BIG_STEP, y: 96 })
	})
	return out
}

// One layer of the logo: every letter with both its glyphs, the letter
// showing and the value hidden. Drawn four times - shadow, ink, and two
// glitch slices - as real copies rather than <use> clones, because the page's
// stylesheet does not reach inside a clone, so its hidden value and its hit
// area would have shown through. mdLogoBind keeps the copies of a letter in
// step with each other.
function mdLogoLayer(cls, withHit, clip) {
	var s = MD_LOGO_SMALL_SCALE
	var o = '<g class="' + cls + '"' + (clip ? ' clip-path="url(#' + clip + ')"' : '') + (withHit ? '' : ' aria-hidden="true"') + '>'
	mdLogoLetters().forEach(function (L, i) {
		var t = 'translate(' + L.x + ',' + L.y + ')' + (L.big ? '' : ' scale(' + s + ')')
		o += '<g class="mdLogoLetter ' + (L.big ? 'mdLogoBig' : 'mdLogoSmall') + '" data-i="' + i + '" data-ch="' + L.ch + '" data-v="' + L.v + '" transform="' + t + '">'
		if (withHit) o += '<rect class="mdLogoHit" x="-14" y="-10" width="128" height="180"/>'
		o += '<path class="mdGlyphChar" d="' + MD_LOGO_GLYPHS[L.ch] + '"/>'
		o += '<path class="mdGlyphNum" d="' + MD_LOGO_GLYPHS[String(L.v)] + '"/>'
		o += '</g>'
	})
	return o + '</g>'
}

function mdLogoMarkup() {
	var s = MD_LOGO_SMALL_SCALE
	var o = '<div id="mdLogo" class="mdLogo" tabindex="0" role="group" '
	o += 'aria-label="Master Decoder. Use the left and right arrow keys to reveal each letter\'s reduced cipher value.">'
	o += '<svg class="mdLogoSvg" viewBox="-18 0 990 272" aria-hidden="true" focusable="false">'
	o += '<defs>'
	// the two slices the glitch tears out and shifts sideways
	o += '<clipPath id="mdLogoCutA" clipPathUnits="userSpaceOnUse"><rect x="-40" y="120" width="1060" height="26"/><rect x="-40" y="196" width="1060" height="12"/></clipPath>'
	o += '<clipPath id="mdLogoCutB" clipPathUnits="userSpaceOnUse"><rect x="-40" y="26" width="1060" height="22"/><rect x="-40" y="158" width="1060" height="18"/></clipPath>'
	o += '</defs>'

	// MASTER's letters each sit on a faint tile, as in the GIF
	mdLogoLetters().forEach(function (L) {
		if (L.big) return
		o += '<rect class="mdLogoTile" x="' + (L.x - 8) + '" y="' + (L.y - 7) + '" width="' + (100 * s + 16) + '" height="' + (160 * s + 14) + '"/>'
	})

	o += mdLogoLayer("mdLogoShadow", false)
	o += mdLogoLayer("mdLogoInk", true)
	o += mdLogoLayer("mdLogoGlitch mdLogoGlitchA", false, "mdLogoCutA")
	o += mdLogoLayer("mdLogoGlitch mdLogoGlitchB", false, "mdLogoCutB")
	o += '</svg>'
	o += '<span id="mdLogoLive" class="mdHiddenLabel" aria-live="polite"></span>'
	o += '</div>'
	return o
}

// Mouse: hover reveals, leaving puts the letter back. Touch: a tap reveals a
// letter until another is tapped or focus moves on. Keyboard: the logo is one
// tab stop, and the arrow keys walk the letters, each announced as it opens.
function mdLogoBind() {
	var box = mdEl("mdLogo")
	if (box === null) return
	var letters = box.querySelectorAll(".mdLogoInk .mdLogoLetter")
	var live = mdEl("mdLogoLive")
	var active = -1

	// the letter, and its copies in the shadow and glitch layers
	function show(i, on) {
		box.querySelectorAll('.mdLogoLetter[data-i="' + i + '"]').forEach(function (g) { g.classList.toggle("mdOn", on) })
	}
	function setActive(i, announce) {
		if (active >= 0) show(active, false)
		active = i
		if (i < 0) return
		show(i, true)
		if (announce && live !== null) {
			live.textContent = letters[i].getAttribute("data-ch") + " is " + letters[i].getAttribute("data-v")
		}
	}

	Array.prototype.forEach.call(letters, function (g, i) {
		g.addEventListener("mouseenter", function () { show(i, true) })
		g.addEventListener("mouseleave", function () { if (i !== active) show(i, false) })
		g.addEventListener("click", function () { setActive(active === i ? -1 : i, false) })
	})

	box.addEventListener("keydown", function (e) {
		var n = letters.length
		if (e.key === "ArrowRight" || e.key === "ArrowDown") {
			e.preventDefault(); setActive((active + 1) % n, true)
		} else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
			e.preventDefault(); setActive(active <= 0 ? n - 1 : active - 1, true)
		} else if (e.key === "Escape") {
			setActive(-1)
		}
	})
	// arriving by keyboard opens the first letter; a mouse click does not
	box.addEventListener("focus", function () {
		var byKeyboard = true
		try { byKeyboard = box.matches(":focus-visible") } catch (e) {}
		if (byKeyboard && active < 0) setActive(0, true)
	})
	box.addEventListener("blur", function () { setActive(-1) })
}

// ---- markup ----------------------------------------------------------------
//
// The original game's layout, drawn from this app's pieces: a play card - the
// Master Decoder logo (mdLogoMarkup, above), Start, the clock, the word, the cipher dropdown, the
// answer box and Submit - and beside it (below it on a narrow screen) the Top
// Decoders card. Colours, faces, buttons (.intBtn, .intBtn3) and the hidden
// state (.hideValue) are the app's own; calc/master-decoder.css only lays
// them out, scoped to .mdRoot.

function mdRenderPanel() {
	var area = mdEl("masterDecoderMenuArea")
	if (area === null) return
	var yes = mdSignedIn()
	if (mdWasSignedIn === null) mdWasSignedIn = yes

	var o = '<div class="mdRoot">'
	o += '<input class="closeMenuBtn" type="button" value="&#215;" onclick="closeAllOpenedMenus()">'

	// ---- the game ----
	o += '<section class="mdPanel mdPanelPlay">'
	o += mdLogoMarkup()
	o += '<div class="mdStack">'
	o += '<div id="mdCountdown" class="mdCountdown hideValue" role="status" aria-live="polite"></div>'
	o += '<div id="mdWho"></div>'
	o += '<input id="mdStartBtn" class="intBtn mdBtn mdBtnPrimary" type="button" value="Start" onclick="mdStart()">'
	o += '<div id="mdTimer" class="mdTimer" role="status" aria-live="off"><span>Time</span><span id="mdTime">' + MD_ROUND_SECONDS + '</span><span>s</span></div>'
	o += '<div class="mdWordDisplay"><span>Word</span><span id="mdWord"></span></div>'
	o += '<div><label class="mdFieldLabel" for="mdCipherMode">Cipher</label>'
	o += '<select id="mdCipherMode" class="mdSelect" onchange="mdSetMode(this.value)">'
	o += '<option value="ordinal"' + (mdMode === "ordinal" ? ' selected' : '') + '>Ordinal Cipher</option>'
	o += '<option value="reduced"' + (mdMode === "reduced" ? ' selected' : '') + '>Reduced Cipher</option>'
	o += '</select></div>'
	o += '<div><label class="mdHiddenLabel" for="mdAnswer">Enter sum</label>'
	o += '<input id="mdAnswer" class="mdInput" type="number" inputmode="numeric" placeholder="Enter sum here" autocomplete="off" disabled '
	o += 'onkeydown="if(event.key===&quot;Enter&quot;){event.preventDefault();mdSubmit()}"></div>'
	o += '<input id="mdSubmitBtn" class="intBtn mdBtn" type="button" value="Submit" disabled onclick="mdSubmit()">'
	o += '<div id="mdResult" class="mdResult" role="status" aria-live="polite"></div>'
	o += '<div id="mdFeedback" class="mdFeedback"></div>'
	o += '<div id="mdFinal" class="mdFinal hideValue" role="status" aria-live="polite"></div>'
	o += '</div></section>'

	// ---- the leaderboard ----
	o += '<aside class="mdPanel mdPanelBoard">'
	o += '<div class="mdPanelTitle"><span id="mdBoardTitle"></span><span id="mdPeriod" class="mdPeriod"></span></div>'
	o += '<div class="mdBoardToggle" role="group" aria-label="Which board to show">'
	o += '<button type="button" class="intBtn3 mdBoardTab" data-md-mode="ordinal" onclick="mdSetBoardMode(&quot;ordinal&quot;)"><span id="mdBoardOrdinalText"></span></button>'
	o += '<button type="button" class="intBtn3 mdBoardTab" data-md-mode="reduced" onclick="mdSetBoardMode(&quot;reduced&quot;)"><span id="mdBoardReducedText"></span></button>'
	o += '</div>'
	o += '<div id="mdBoard"></div>'
	o += '<div class="mdLbFoot">Best score per player, per cipher, per month (UTC).</div>'
	o += '</aside>'

	o += '</div>'
	area.innerHTML = o

	// The headings reveal their own values, each true to its name, as they
	// always have: "Ordinal" in ordinal, "Reduced" in reduced.
	mdLogoBind()
	mdRenderHover(mdEl("mdBoardTitle"), "Top Decoders", "ordinal")
	mdRenderHover(mdEl("mdBoardOrdinalText"), "Ordinal", "ordinal")
	mdRenderHover(mdEl("mdBoardReducedText"), "Reduced", "reduced")

	mdRenderWho()
	mdShowWord(yes ? "" : "World") // signed out: a sample word to try the reveal on
	if (!yes) mdSetFeedback("Preview — hover or tap a letter to see its value.")
	mdSyncControls()
	mdChartTint()
	mdSetBoardMode(mdBoardMode)
}

// "Playing as ..." when signed in; the sign-in prompt when signed out.
function mdRenderWho() {
	var el = mdEl("mdWho")
	if (el === null) return
	if (mdSignedIn()) {
		var name = (typeof authDisplayName === "function") ? authDisplayName() : "Player"
		var avatar = (typeof authAvatarUrl === "function") ? authAvatarUrl() : null
		var o = avatar
			? '<img class="mdAvatar" src="' + mdEsc(avatar) + '" alt="">'
			: '<span class="mdAvatar mdAvatarFallback">' + mdEsc(String(name).charAt(0).toUpperCase()) + '</span>'
		o += 'Playing as <b>' + mdEsc(name) + '</b>'
		el.className = "mdPlayingAs"
		el.innerHTML = o
		return
	}
	el.className = "mdSignedOut"
	el.innerHTML = 'Sign up or log in to play Master Decoder &mdash; scores are saved to your Cyphers profile. '
		+ '<a href="login.html">Sign in</a> or <a href="register.html">create a free account</a>.'
}

// Buttons and inputs follow the phase from one place.
function mdSyncControls() {
	var busy = mdRoundActive()
	var start = mdEl("mdStartBtn")
	if (start !== null) start.disabled = busy
	if (mdPhase !== "running") {
		var ans = mdEl("mdAnswer")
		var sub = mdEl("mdSubmitBtn")
		if (ans !== null) ans.disabled = true
		if (sub !== null) sub.disabled = true
	}
	// the cipher cannot be changed mid-round
	var sel = mdEl("mdCipherMode")
	if (sel !== null) sel.disabled = busy
}

// "Correct!" / "Incorrect!"
function mdSetResult(text, kind) {
	var el = mdEl("mdResult")
	if (el === null) return
	el.className = "mdResult" + (kind === "ok" ? " mdOk" : kind === "bad" ? " mdBad" : "")
	el.textContent = text || ""
}

// The line under it: the correct sum, the preview hint, or what went wrong.
// value, when given, is set in the mono face after text, as the game has it.
function mdSetFeedback(text, kind, value) {
	var el = mdEl("mdFeedback")
	if (el === null) return
	el.className = "mdFeedback" + (kind === "bad" ? " mdBad" : "")
	el.innerHTML = ""
	if (!text) return
	el.appendChild(document.createTextNode(text))
	if (value !== undefined) {
		var b = document.createElement("span")
		b.className = "mdVal"
		b.textContent = value
		el.appendChild(b)
		el.appendChild(document.createTextNode("."))
	}
}

function mdSetCountdown(text) {
	var el = mdEl("mdCountdown")
	if (el === null) return
	el.textContent = text || ""
	el.classList.toggle("hideValue", !text)
}

function mdSetTime(seconds) {
	var t = mdEl("mdTime")
	if (t !== null) t.textContent = seconds
	var box = mdEl("mdTimer")
	if (box !== null) box.classList.toggle("mdTimerLow", mdPhase === "running" && seconds <= MD_LOW_TIME_SECONDS)
}

// One span per letter which, on hover or focus, swaps the letter for its
// value and turns red. Focus is wired alongside hover so a keyboard, and a
// touch screen, can reach it. Built with textContent throughout.
function mdRenderHover(el, text, mode) {
	if (el === null) return
	el.innerHTML = ""
	String(text || "").split("").forEach(function (ch) {
		var span = document.createElement("span")
		span.textContent = ch
		var v = mdLetterValue(ch, mode)
		if (v !== null) {
			span.className = "mdLetter"
			span.tabIndex = 0
			var reveal = function () { span.textContent = String(v); span.classList.add("mdLetterOn") }
			var hide = function () { span.textContent = ch; span.classList.remove("mdLetterOn") }
			span.addEventListener("mouseenter", reveal)
			span.addEventListener("mouseleave", hide)
			span.addEventListener("focus", reveal)
			span.addEventListener("blur", hide)
		}
		el.appendChild(span)
	})
}

// The word in play; its values follow whichever cipher is being played.
function mdShowWord(word) {
	mdRenderHover(mdEl("mdWord"), word, mdMode)
}

// The Cipher Chart's gradient colour, for the cipher being played: the same
// rule updateCipherChart() (breakdown.js) uses for #ChartSpot - the cipher's
// own colour at 20% when Colored Ciphers is on, a faint black when it is off,
// and no gradient at all when Gradient Charts is off. Read from the
// calculator's cipher list, so a recoloured cipher recolours this too.
function mdChartTint() {
	var root = document.querySelector("#masterDecoderMenuArea .mdRoot")
	if (root === null) return
	var on = (typeof optGradientCharts === "undefined") || optGradientCharts
	root.classList.toggle("mdNoChartGradient", !on)
	var tint = "hsl(0 0% 0% / 0.1)"
	if (typeof optColoredCiphers !== "undefined" && optColoredCiphers && typeof cipherList !== "undefined") {
		var name = mdMode === "reduced" ? "Reduction" : "Ordinal"
		for (var i = 0; i < cipherList.length; i++) {
			if (cipherList[i].cipherName === name) {
				tint = "hsl(" + cipherList[i].H + " " + cipherList[i].S + "% " + cipherList[i].L + "% / 0.2)"
				break
			}
		}
	}
	root.style.setProperty("--md-chart-tint", tint)
}

// ---- cipher / board switching ----------------------------------------------

function mdSetMode(mode) {
	if (mode !== "ordinal" && mode !== "reduced") return
	if (mdRoundActive()) return
	mdMode = mode
	var sel = mdEl("mdCipherMode")
	if (sel !== null && sel.value !== mode) sel.value = mode
	// the preview word re-reads its values in the new cipher
	if (!mdSignedIn()) mdShowWord("World")
	mdChartTint()
	// the board on screen follows the cipher you are about to play
	mdSetBoardMode(mode)
}

function mdSetBoardMode(mode) {
	if (mode !== "ordinal" && mode !== "reduced") return
	mdBoardMode = mode
	document.querySelectorAll(".mdBoardToggle .mdBoardTab").forEach(function (b) {
		var on = b.getAttribute("data-md-mode") === mode
		b.classList.toggle("mdBoardTabOn", on)
		b.setAttribute("aria-pressed", on ? "true" : "false")
	})
	mdLoadBoard(mode)
}

// ---- the round -------------------------------------------------------------

function mdStart() {
	if (!mdSignedIn()) {
		mdSetFeedback("Sign up or log in to play Master Decoder.", "bad")
		var link = document.querySelector("#mdWho a")
		if (link !== null) link.focus()
		return
	}
	if (mdRoundActive()) return

	mdPhase = "starting"
	mdScore = 0
	mdSetTime(MD_ROUND_SECONDS)
	mdShowWord("")
	mdSetResult("")
	mdSetFeedback("")
	var fin = mdEl("mdFinal")
	if (fin !== null) fin.classList.add("hideValue")
	mdSyncControls()
	mdRainOn()

	mdStartRound(mdMode).then(function (r) {
		if (!masterDecoderMenuOpened || mdPhase !== "starting" || r === null) {
			if (r !== null) mdFinishRound(r.round_id).catch(function () {})
			return
		}
		mdRoundId = r.round_id
		mdCountdown(Math.max(1, Math.round((r.countdown_ms || 5000) / 1000)))
	}).catch(function (err) {
		if (mdPhase !== "starting") return
		mdPhase = "idle"
		mdRainOff()
		mdSyncControls()
		mdSetFeedback(err.message, "bad")
	})
}

function mdCountdown(seconds) {
	mdPhase = "countdown"
	mdSyncControls()
	var left = seconds
	mdSetCountdown("Starting in " + left + "s...")
	mdCountdownTimer = setInterval(function () {
		left--
		if (left > 0) { mdSetCountdown("Starting in " + left + "s..."); return }
		clearInterval(mdCountdownTimer); mdCountdownTimer = null
		mdSetCountdown("")
		mdBeginPlay()
	}, 1000)
}

function mdBeginPlay() {
	var id = mdRoundId
	mdFirstWord(id).then(function (w) {
		if (id !== mdRoundId || mdPhase !== "countdown" || w === null) return
		mdPhase = "running"
		mdEndsAt = Date.now() + (w.time_left_ms || MD_ROUND_SECONDS * 1000)
		mdTick()
		mdClockTimer = setInterval(mdTick, 200)
		mdSyncControls()
		mdPresentWord(w.word)
	}).catch(function (err) {
		if (id !== mdRoundId) return
		mdAbandonRound()
		mdSetFeedback(err.message, "bad")
	})
}

function mdTick() {
	var left = Math.max(0, Math.ceil((mdEndsAt - Date.now()) / 1000))
	mdSetTime(left)
	mdRainOn() // cheap; puts the red back if the rain engine re-initialised the canvas
	if (left <= 0) mdEndRound()
}

function mdPresentWord(word) {
	mdShowWord(word)
	mdSetResult("")
	mdSetFeedback("")
	var ans = mdEl("mdAnswer")
	var sub = mdEl("mdSubmitBtn")
	if (ans !== null) { ans.value = ""; ans.disabled = false; ans.focus() }
	if (sub !== null) sub.disabled = false
}

function mdSubmit() {
	if (mdPhase !== "running" || mdPending !== null) return
	var ans = mdEl("mdAnswer")
	var sub = mdEl("mdSubmitBtn")
	if (ans === null || ans.disabled) return
	var n = parseInt(ans.value, 10)
	if (isNaN(n)) { mdSetFeedback("Please enter a valid number."); return }

	ans.disabled = true
	if (sub !== null) sub.disabled = true

	var id = mdRoundId
	var pending = mdSendAnswer(id, n).then(function (res) {
		if (id !== mdRoundId || res === null) return
		mdScore = res.score
		if (res.is_correct) {
			mdSetResult("Correct!", "ok")
			mdSetFeedback("")
		} else {
			mdSetResult("Incorrect!", "bad")
			mdSetFeedback("The correct sum was ", "", res.correct_sum)
		}
		// the next word arrives either way, as long as the round is still going
		clearTimeout(mdAdvanceTimer)
		mdAdvanceTimer = setTimeout(function () {
			if (id === mdRoundId && mdPhase === "running") mdPresentWord(res.next_word)
		}, res.next_in_ms || 1200)
	}).catch(function (err) {
		if (id !== mdRoundId || mdPhase !== "running") return
		mdSetFeedback(err.message, "bad")
		// the same word is still in play - let them try again
		ans.disabled = false
		if (sub !== null) sub.disabled = false
		ans.focus()
	}).then(function () { if (mdPending === pending) mdPending = null })
	mdPending = pending
}

function mdEndRound() {
	if (mdPhase !== "running") return
	mdPhase = "ending"
	mdClearTimers()
	mdSyncControls()
	mdRainOff()
	mdSetTime(0)

	var id = mdRoundId
	var boardBefore = mdBoards[mdMode] ? mdBoards[mdMode].rows : []
	// an answer sent in the last moment is allowed to land before the round closes
	Promise.resolve(mdPending).catch(function () {}).then(function () {
		return mdFinishRound(id)
	}).then(function (f) {
		if (id !== mdRoundId) return
		mdShowFinal(f ? f.score : mdScore, boardBefore, null, f ? f.period : null)
	}).catch(function (err) {
		if (id !== mdRoundId) return
		mdShowFinal(mdScore, boardBefore, err.message, null)
	}).then(function () {
		if (id !== mdRoundId) return
		mdPhase = "idle"
		mdSyncControls()
		mdBoards[mdMode] = null
		if (mdBoardMode === mdMode) mdLoadBoard(mdMode)
	})
}

// "Final Score: N", green if it would place on the board as it stood before
// this round landed, red if not.
function mdShowFinal(score, boardBefore, problem, period) {
	mdScore = score
	var el = mdEl("mdFinal")
	if (el === null) return
	el.innerHTML = ""
	el.className = "mdFinal " + (mdQualifies(score, boardBefore) ? "mdScoreGreen" : "mdScoreRed")
	el.appendChild(document.createTextNode("Final Score: " + score))
	var note = null
	if (problem) note = problem
	else if (score > 0) note = "Saved to your profile for " + (mdPeriodLabel(period) || "this month")
	if (note) {
		var n = document.createElement("span")
		n.className = "mdScoreNote"
		n.textContent = note
		el.appendChild(n)
	}
}

// Stops everything and closes the round on the server if one was open. Used
// when the panel is closed, when the player signs out, and when the first
// word could not be fetched. Points already credited stay credited.
function mdAbandonRound() {
	mdClearTimers()
	if (mdRoundId !== null && mdSignedIn()) mdFinishRound(mdRoundId).catch(function () {})
	mdRoundId = null
	mdPending = null
	mdPhase = "idle"
	mdSetCountdown("")
	mdRainOff()
	mdSyncControls()
}

// ---- the board -------------------------------------------------------------

function mdBoardNote(text, bad) {
	return '<div class="mdLbNote' + (bad ? ' mdBad' : '') + '">' + mdEsc(text) + '</div>'
}

function mdLoadBoard(mode) {
	var host = mdEl("mdBoard")
	if (host === null) return
	var seq = ++mdBoardSeq

	if (!mdSignedIn()) {
		var p = mdEl("mdPeriod")
		if (p !== null) p.textContent = ""
		host.innerHTML = mdBoardNote("Log in to see this month's leaderboard.")
		return
	}

	if (mdBoards[mode]) mdDrawBoard(mdBoards[mode])
	else host.innerHTML = mdBoardNote("Loading…")

	mdFetchBoard(mode, MD_BOARD_SIZE).then(function (b) {
		mdBoards[mode] = b
		if (seq !== mdBoardSeq || mdBoardMode !== mode) return
		mdDrawBoard(b)
	}).catch(function (err) {
		if (seq !== mdBoardSeq) return
		var h = mdEl("mdBoard")
		if (h !== null) h.innerHTML = mdBoardNote(err.message, true)
	})
}

// Top ten for the current month: podium edge for the first three, avatar or
// initial, display name - never email - and the score. The player's own row
// is marked, and their best sits underneath.
function mdDrawBoard(b) {
	var host = mdEl("mdBoard")
	if (host === null || !b) return

	var p = mdEl("mdPeriod")
	if (p !== null) {
		var label = mdPeriodLabel(b.period)
		var resets = mdResetLabel(b.resets_on)
		p.textContent = label ? label + (resets ? " · resets " + resets : "") : ""
	}

	var rows = b.rows || []
	var o = ''
	if (rows.length === 0) {
		o += mdBoardNote("No scores yet this month. Be the first to break the code.")
	} else {
		o += '<ul class="mdLbList">'
		rows.forEach(function (r, i) {
			// a member who has not chosen a username yet still counts; the row
			// says so rather than inventing a name for them
			var named = !!r.display_name
			var name = named ? String(r.display_name) : "No username yet"
			var cls = "mdLbRow" + (i < 3 ? " mdPodium" + (i + 1) : "") + (r.is_me ? " mdLbMine" : "")
			var av = r.avatar
				? '<img class="mdAvatar" src="' + mdEsc(r.avatar) + '" alt="" loading="lazy">'
				: '<span class="mdAvatar mdAvatarFallback">' + (named ? mdEsc(name.charAt(0).toUpperCase()) : '?') + '</span>'
			o += '<li class="' + cls + '">'
			o += '<span class="mdLbRank">' + Number(r.pos) + '.</span>'
			o += av
			o += '<span class="mdLbName' + (named ? '' : ' mdLbNoName') + '" title="' + mdEsc(name) + '">' + mdEsc(name) + '</span>'
			o += '<span class="mdLbScore">' + Number(r.best_score) + '</span>'
			o += '</li>'
		})
		o += '</ul>'
	}

	var mine = b.mine
	o += '<div class="mdLbMineBox">'
	if (mine && mine.best_score > 0) {
		o += '<span>Your best this month' + (mine.pos ? ' &middot; #' + Number(mine.pos) : '') + '</span><b>' + Number(mine.best_score) + '</b>'
	} else {
		o += '<span>No score on this board this month yet</span>'
	}
	o += '</div>'
	// signed in without a username: the way back to the prompt after "Not now"
	if (typeof authProfile !== "undefined" && authProfile && !authProfile.username && typeof usernameGateOpen === "function") {
		o += '<div class="mdLbNote">Choose a username so other players can see who you are. '
		o += '<button class="profileMiniBtn" type="button" onclick="usernameGateOpen()">Choose username</button></div>'
	}
	host.innerHTML = o
}

// ---- the code rain during a round -----------------------------------------
//
// While a round is being played the rain turns red; when the round ends, or
// the panel is closed, the rain goes back to exactly how it looked before.
//
// Done with a CSS filter on the canvas and nothing else. The rain's own
// colour settings (coderainHue, coderainSat, coderainColorPicked) are part of
// the member's saved settings, synced to their account by workspace-sync.js,
// so the game never writes them: a filter is not a setting - it is never
// read, saved or synced - and the rain engine (calc/coderain.js) is not
// touched. sepia(1) first flattens whatever colour the rain is drawn in, in
// any of the four styles, to one known tone; saturate and hue-rotate then
// take that tone to red.

var MD_RAIN_RED = "sepia(1) saturate(5) hue-rotate(-50deg)"
var mdRainSaved = null // the canvas's own inline filter before the round, put back after it

function mdRainOn() {
	var c = mdEl("canv")
	if (c === null) return
	var cur = c.style.filter || ""
	if (mdRainSaved === null) {
		mdRainSaved = cur
	} else if (cur.indexOf(MD_RAIN_RED) === -1) {
		// calc/coderain.js blurs the canvas in Firefox and re-applies that when
		// the rain re-initialises; keep whatever it set underneath the red
		mdRainSaved = cur
	}
	var want = (mdRainSaved ? mdRainSaved + " " : "") + MD_RAIN_RED
	if (cur !== want) c.style.filter = want
}

function mdRainOff() {
	var c = mdEl("canv")
	if (c !== null && mdRainSaved !== null) c.style.filter = mdRainSaved
	mdRainSaved = null
}

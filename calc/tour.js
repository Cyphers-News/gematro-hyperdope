// ======================= Member tour =======================
//
// One tooltip at a time, spotlighting the real button or area (a green
// neon outline plus a box-shadow spread over the rest of the page - see
// .tourSpotlight in auth.css) rather than several literal windows. Three
// independently-startable mini-tours instead of one long one, so finishing
// "Calculator basics" is progress even if "Social and privacy" never
// happens. Progress is a single row in Supabase (member_tour_progress,
// auth/tour-sync.js), so it follows a member across devices, and
// TOUR_VERSION exists so a future redesign of the app can offer the tour
// again without disturbing anyone who already finished this one.

var TOUR_VERSION = 1

// Each step: css selector to spotlight, title/body copy, and an optional
// before() hook that gets whatever needs to be open (the member panel, a
// specific tab, a dropdown) into the right state first. before() may return
// a Promise; the engine waits for it, then waits one more frame for the DOM
// it just changed to actually paint before measuring the target's position.
var TOUR_SECTIONS = {
	calculator: {
		label: "Calculator basics",
		icon: "🧮",
		steps: [
			{
				selector: "#phraseBox",
				title: "Type a word or phrase",
				body: "Start here. Type anything, and every cypher you have switched on works out its value as you type.",
				before: function () { closeAllOpenedMenus(); return tourWait(150) }
			},
			{
				selector: "#queryDBbtn",
				title: "Hit Query to search the database",
				body: "Query checks your current phrase against the whole word/phrase database and lists everything sharing its value.",
				// Hidden (.hideValue) until a real phrase makes it relevant -
				// only remove that class if this step itself is the one that
				// added it, so a button that was already visible for real
				// stays exactly as it was once the step moves on.
				before: function () {
					closeAllOpenedMenus()
					var el = document.getElementById("queryDBbtn")
					if (el !== null && el.classList.contains("hideValue")) {
						el.classList.remove("hideValue")
						el.dataset.tourForced = "1"
					}
					return tourWait(150)
				},
				after: function () {
					var el = document.getElementById("queryDBbtn")
					if (el !== null && el.dataset.tourForced === "1") {
						el.classList.add("hideValue")
						delete el.dataset.tourForced
					}
				}
			},
			{
				selector: "#ciphSearchBox",
				title: "Search ciphers in the Cyphers tab",
				body: "Open the Cyphers menu and type here to jump straight to a cypher by name instead of scrolling through every category.",
				before: function () { closeAllOpenedMenus(); document.body.classList.add("tourForceDropdown"); return tourWait(150) },
				after: function () { document.body.classList.remove("tourForceDropdown") }
			},
			{
				selector: ".findMatchesTab",
				title: "Find matches",
				body: "Matches searches everything already in your history for phrases sharing the same value as your current one.",
				before: function () { closeAllOpenedMenus(); return tourWait(150) }
			},
			{
				selector: "#ctxExportMenu",
				title: "Right-click anywhere for more options",
				body: "Right-click almost anywhere on the page to open a quick menu - print, export, clear your history, reset settings.",
				// Opened programmatically (same function a real right-click
				// calls) and pinned there with ctxExportTourLock (calc/export.js)
				// so the tour's own Next/Back clicks - which land outside
				// #ctxExportMenu, same as a normal click-away - do not close it
				// out from under the spotlight before the user has seen it.
				before: function () {
					closeAllOpenedMenus()
					return tourWait(150).then(function () {
						if (typeof showExportContextMenu === "function") {
							// showExportContextMenu positions in document (page)
							// coordinates, same as a real right-click's pageX/pageY -
							// has to include scroll offset, not just viewport centre.
							var cx = window.scrollX + Math.max(20, window.innerWidth / 2 - 90)
							var cy = window.scrollY + Math.max(20, window.innerHeight / 2 - 70)
							showExportContextMenu(cx, cy)
							ctxExportTourLock = true
						}
						return tourWait(150)
					})
				},
				after: function () {
					ctxExportTourLock = false
					if (typeof closeExportContextMenu === "function") closeExportContextMenu()
				}
			}
		]
	},
	member: {
		label: "Your member area",
		icon: "👤",
		steps: [
			{
				selector: ".authNavUser",
				title: "Your member panel",
				body: "Click your username, top-right, any time you are signed in - this is the way into everything member-only: presets, saved phrases, the leaderboard, your chart, social, your account.",
				before: function () { if (typeof authUser === "undefined" || authUser === null) return null; return tourCloseProfileMenu() }
			},
			{
				selector: "#profileTabPresets",
				title: "Presets",
				body: "Whole calculator setups - which cyphers are switched on, colours, everything - saved so you can jump straight back to them later.",
				before: function () { return tourOpenPanelTab("presets") }
			},
			{
				selector: "#profileTabCsv",
				title: "CSV",
				body: "Export your saved phrases as a spreadsheet any time.",
				before: function () { return tourOpenPanelTab("csv") }
			},
			{
				selector: "#profileTabEntries",
				title: "Saved",
				body: "Every phrase you calculate lands here, privately, until you choose to publish one.",
				before: function () { return tourOpenPanelTab("entries") }
			},
			{
				selector: "#profileTabLeaderboard",
				title: "Leaders",
				body: "The community's reactions to published phrases, and a running record of what you have added yourself.",
				before: function () { return tourOpenPanelTab("leaderboard") }
			},
			{
				selector: "#profileTabChart",
				title: "Chart",
				body: "A running chart of the numbers you calculate over time.",
				before: function () { return tourOpenPanelTab("chart") }
			},
			{
				selector: "#profileTabAccount",
				title: "Account",
				body: "Your sign-in details and every privacy choice - including whether you show as online - live here.",
				before: function () { return tourOpenPanelTab("account") }
			}
		]
	},
	social: {
		label: "Social and privacy",
		icon: "💬",
		steps: [
			{
				selector: "#profileTabFriends",
				title: "Open Social",
				body: "Chats, a public Forum, Discover, Friends and News all live in one place.",
				before: function () { return tourOpenPanel() }
			},
			{
				selector: "#frTab-chats",
				title: "Chats and unread messages",
				body: "A green dot and count mean something unread is waiting - on the tab here, on Social itself, and beside your username, wherever you are on the site.",
				before: function () { return tourOpenSocialSection("chats") }
			},
			{
				selector: "#frTab-forum",
				title: "Forum",
				body: "An open board - start a topic or reply to one, on anything related to cyphers.",
				before: function () { return tourOpenSocialSection("forum") }
			},
			{
				selector: "#frTab-discover",
				title: "Discover",
				body: "Suggests members by cypher overlap, mutual friends, or how new they are.",
				before: function () { return tourOpenSocialSection("discover") }
			},
			{
				selector: "#frTab-friends",
				title: "Friends",
				body: "Your friends list, plus a Requests strip for anyone waiting on you.",
				before: function () { return tourOpenSocialSection("friends") }
			},
			{
				selector: "#frTab-news",
				title: "News",
				body: "Reactions to your published phrases, and a note any time one of yours gets added to the database.",
				before: function () { return tourOpenSocialSection("news") }
			},
			{
				selector: "#frTab-profile",
				title: "Profile",
				body: "Your public profile - pick what other members see, add roles, and pick up to four favourite cyphers. This is the exact card another member sees when they open yours.",
				before: function () { return tourOpenSocialSection("profile") }
			}
		]
	}
}

// ---- small async helpers -------------------------------------------------

function tourWait(ms) { return new Promise(function (r) { setTimeout(r, ms) }) }

function tourOpenPanelTab(tabId) {
	if (typeof authUser === "undefined" || authUser === null) return Promise.resolve(null)
	if (!profileMenuOpened) toggleProfileMenu()
	return tourWait(150).then(function () {
		if (typeof profileSetTab === "function") profileSetTab(tabId)
		return tourWait(200)
	})
}

// Opens the member panel without choosing a tab - for a step that spotlights
// the tab button itself (e.g. "Open Social"), where switching to that tab
// before the user has clicked it would spotlight the wrong thing.
function tourOpenPanel() {
	if (typeof authUser === "undefined" || authUser === null) return Promise.resolve(null)
	if (!profileMenuOpened) toggleProfileMenu()
	return tourWait(200)
}

// Opens the member panel straight onto one Social section (Chats/Forum/
// Discover/Friends/News/Profile) in a single render, rather than
// profileSetTab("friends") (which renders the friends tab against whatever
// friendsSection already was) immediately followed by frSetSection (a
// second, overlapping render of the same panel) - two renders racing each
// other against the same profileRenderSeq staleness guard was what made
// this flaky the first time it was written.
function tourOpenSocialSection(sectionId) {
	if (typeof authUser === "undefined" || authUser === null) return Promise.resolve(null)
	if (!profileMenuOpened) toggleProfileMenu()
	return tourWait(150).then(function () {
		profileTabActive = "friends"
		friendsSection = sectionId
		if (typeof renderProfilePanel === "function") renderProfilePanel()
		return tourWait(200)
	})
}

function tourCloseProfileMenu() {
	if (profileMenuOpened) toggleProfileMenu()
	return tourWait(150)
}

// ---- state ----------------------------------------------------------------

var tourActiveSection = null
var tourStepIndex = 0
var tourProgress = null   // cached member_tour_progress row (auth/tour-sync.js shape)
var tourStepRunning = false

function tourInit(user) {
	if (!user) return
	tourProgressGet().then(function (p) {
		tourProgress = p
		if (!p.prompted || p.tour_version < TOUR_VERSION) tourShowWelcome()
	})
}

$(document).ready(function () {
	if (typeof onAuthReady === "function") onAuthReady(tourInit)
})

// ---- welcome modal ----------------------------------------------------

function tourShowWelcome() {
	if (document.getElementById("tourWelcome") !== null) return
	var o = '<div class="tourOverlayBg" id="tourWelcomeBg" onclick="tourDismissWelcome(false)"></div>'
	o += '<div class="tourWelcome" id="tourWelcome" role="dialog" aria-label="Welcome to Cyphers">'
	o += '<div class="tourWelcomeTitle">Welcome to Cyphers 💚</div>'
	o += '<div class="tourWelcomeBody">Want a quick tour of your new features?</div>'
	o += '<div class="tourWelcomeBtns">'
	o += '<button class="intBtn3 tourBtnPrimary" onclick="tourDismissWelcome(true)">Start tour</button>'
	o += '<button class="intBtn3" onclick="tourDismissWelcome(false)">Maybe later</button>'
	o += '</div></div>'
	var host = document.createElement("div")
	host.id = "tourWelcomeHost"
	host.innerHTML = o
	document.body.appendChild(host)
}

function tourDismissWelcome(startNow) {
	var host = document.getElementById("tourWelcomeHost")
	if (host !== null) host.remove()
	tourProgressSave({ prompted: true, tour_version: TOUR_VERSION }).then(function (saved) { if (saved) tourProgress = saved })
	if (startNow) tourOpenPicker()
}

// ---- the picker (three sections) - also what "Guided Tour" under
// About → Cyphers (Info) opens, regardless of what tourProgress says ------

function tourOpenPicker() {
	if (document.getElementById("tourPicker") !== null) return
	var host = document.createElement("div")
	host.id = "tourPickerHost"
	host.innerHTML = tourPickerHtml()
	document.body.appendChild(host)
}

function tourPickerHtml() {
	var done = (tourProgress && tourProgress.sections_done) || []
	var o = '<div class="tourOverlayBg" onclick="tourClosePicker()"></div>'
	o += '<div class="tourWelcome tourPicker" id="tourPicker" role="dialog" aria-label="Guided tour">'
	o += '<div class="tourWelcomeTitle">Guided tour</div>'
	o += '<div class="tourWelcomeBody">Three short sections. Do them in any order, one at a time.</div>'
	o += '<div class="tourSectionList">'
	var signedIn = (typeof authUser !== "undefined" && authUser !== null)
	Object.keys(TOUR_SECTIONS).forEach(function (key) {
		// "Your member area" needs a signed-in member for every one of its
		// steps - showing it disabled would just invite a click that goes
		// nowhere, so it is left out of the list entirely instead.
		if (key === "member" && !signedIn) return
		var sec = TOUR_SECTIONS[key]
		var isDone = done.indexOf(key) > -1
		o += '<button class="tourSectionBtn' + (isDone ? ' tourSectionDone' : '') + '" onclick="tourClosePicker();tourStartSection(&quot;' + key + '&quot;)">'
		o += '<span class="tourSectionIcon">' + sec.icon + '</span>'
		o += '<span class="tourSectionBody"><span class="tourSectionLabel">' + sec.label + '</span>'
		o += '<span class="tourSectionSteps">' + sec.steps.length + ' steps</span></span>'
		o += '<span class="tourSectionTick">' + (isDone ? '✓' : '') + '</span>'
		o += '</button>'
	})
	o += '</div>'
	o += '<div class="tourWelcomeBtns"><button class="intBtn3" onclick="tourClosePicker()">Close</button></div>'
	o += '</div>'
	return o
}

function tourClosePicker() {
	var host = document.getElementById("tourPickerHost")
	if (host !== null) host.remove()
}

// Callable from About → Cyphers (Info) any time - ignores prior completion
// on purpose, since "restart" means restart.
function tourRestart() { tourOpenPicker() }

// ---- running a section --------------------------------------------------

function tourStartSection(key) {
	if (!TOUR_SECTIONS[key]) return
	tourActiveSection = key
	tourStepIndex = 0
	tourRunStep()
}

function tourCurrentStep() {
	if (tourActiveSection === null) return null
	var sec = TOUR_SECTIONS[tourActiveSection]
	if (!sec || tourStepIndex >= sec.steps.length) return null
	return sec.steps[tourStepIndex]
}

// The step a before()/after() pair is currently open for - deliberately not
// the same thing as tourCurrentStep() (which follows tourStepIndex and can
// already point at the *next* step by the time cleanup runs). Tracking this
// separately is what stops a step's own before() being undone by its own
// after() a moment later, which is what happened when both read
// tourCurrentStep() and tourStepIndex had already moved on.
var tourOpenStep = null

// Polls rather than trusting a fixed delay after before() resolves - a step
// that opens the member panel is often waiting on a network round trip
// (renderProfileFriends's own badge/unread fetch) on top of whatever
// before() itself already waited for, and a flat timeout that is long
// enough on a fast connection is exactly the one that is not on a slow one.
function tourWaitForSelector(selector, timeoutMs) {
	var start = Date.now()
	return new Promise(function (resolve) {
		(function poll() {
			var el = document.querySelector(selector)
			if (el !== null || Date.now() - start > timeoutMs) { resolve(el); return }
			setTimeout(poll, 100)
		})()
	})
}

function tourRunStep() {
	tourClearVisuals()
	var step = tourCurrentStep()
	if (step === null) { tourFinishSection(); return }
	tourStepRunning = true
	var pre = step.before ? step.before() : null
	Promise.resolve(pre).then(function () {
		return tourWaitForSelector(step.selector, 4000)
	}).then(function (el) {
		tourStepRunning = false
		if (el === null) { tourNext(); return } // the real page moved on without this element - skip rather than get stuck
		el.scrollIntoView({ block: "center", behavior: "smooth" })
		tourWait(250).then(function () { tourShowSpotlight(el, step) })
	})
}

function tourShowSpotlight(el, step) {
	tourClearVisuals()
	tourOpenStep = step
	el.classList.add("tourSpotlight")
	tourRenderTooltip(el, step)
	window.addEventListener("resize", tourRepositionTooltip)
}

// Visual cleanup only - removing the spotlight, tooltip and scrim never has
// a side effect of its own. A step's after() is invoked once, explicitly,
// by whichever of tourNext/tourBack/tourExit/tourFinishSection is leaving it.
function tourClearVisuals() {
	var lit = document.querySelectorAll(".tourSpotlight")
	for (var i = 0; i < lit.length; i++) lit[i].classList.remove("tourSpotlight")
	var tip = document.getElementById("tourTooltip")
	if (tip !== null) tip.remove()
	var scrim = document.getElementById("tourScrim")
	if (scrim !== null) scrim.remove()
	window.removeEventListener("resize", tourRepositionTooltip)
}

// Runs (once) and clears whichever step's before() is currently in effect -
// call this before moving tourStepIndex anywhere, or before leaving the
// tour altogether, so a before() that changed something (opened a menu,
// forced a dropdown) always gets its matching after() exactly once.
function tourCloseOpenStep() {
	tourClearVisuals()
	if (tourOpenStep !== null && tourOpenStep.after) tourOpenStep.after()
	tourOpenStep = null
}

function tourRenderTooltip(el, step) {
	var sec = TOUR_SECTIONS[tourActiveSection]
	var scrim = document.createElement("div")
	scrim.id = "tourScrim"
	scrim.className = "tourScrim"
	document.body.appendChild(scrim)

	var tip = document.createElement("div")
	tip.id = "tourTooltip"
	tip.className = "tourTooltip"
	tip.setAttribute("role", "dialog")
	var o = '<div class="tourTooltipStep">' + sec.label + ' &middot; ' + (tourStepIndex + 1) + ' / ' + sec.steps.length + '</div>'
	o += '<div class="tourTooltipTitle">' + authEsc(step.title) + '</div>'
	o += '<div class="tourTooltipBody">' + authEsc(step.body) + '</div>'
	o += '<div class="tourTooltipBtns">'
	o += '<span class="tourTooltipLeft">'
	if (tourStepIndex > 0) o += '<button class="profileMiniBtn" onclick="tourBack()">Back</button>'
	o += '</span>'
	o += '<span class="tourTooltipRight">'
	o += '<button class="profileMiniBtn" onclick="tourExit()">Exit</button>'
	o += '<button class="profileMiniBtn" onclick="tourSkipStep()">Skip</button>'
	o += '<button class="profileMiniBtn tourBtnPrimary" onclick="tourNext()">' + (tourStepIndex + 1 === sec.steps.length ? 'Finish' : 'Next') + '</button>'
	o += '</span></div>'
	tip.innerHTML = o
	document.body.appendChild(tip)
	tourPositionTooltip(el, tip)
}

function tourPositionTooltip(el, tip) {
	var r = el.getBoundingClientRect()
	var narrow = window.innerWidth < 620
	if (narrow) {
		tip.classList.add("tourTooltipSheet")
		tip.style.top = ""; tip.style.left = ""
		return
	}
	tip.classList.remove("tourTooltipSheet")
	var tw = tip.offsetWidth || 300, th = tip.offsetHeight || 140
	var top = r.bottom + 14
	if (top + th > window.innerHeight - 10) top = Math.max(10, r.top - th - 14)
	var left = Math.min(Math.max(10, r.left), window.innerWidth - tw - 10)
	tip.style.top = top + "px"
	tip.style.left = left + "px"
}

function tourRepositionTooltip() {
	var el = document.querySelector(".tourSpotlight")
	var tip = document.getElementById("tourTooltip")
	if (el !== null && tip !== null) tourPositionTooltip(el, tip)
}

function tourNext() {
	if (tourStepRunning) return
	tourCloseOpenStep()
	tourStepIndex++
	tourRunStep()
}

function tourBack() {
	if (tourStepRunning || tourStepIndex === 0) return
	tourCloseOpenStep()
	tourStepIndex--
	tourRunStep()
}

function tourSkipStep() { tourNext() }

function tourExit() {
	tourCloseOpenStep()
	tourActiveSection = null
	tourStepIndex = 0
}

function tourFinishSection() {
	tourCloseOpenStep()
	var key = tourActiveSection
	tourActiveSection = null
	tourStepIndex = 0
	if (key === null) return
	var done = ((tourProgress && tourProgress.sections_done) || []).slice()
	if (done.indexOf(key) === -1) done.push(key)
	tourProgress = tourProgress || tourDefaultProgress()
	tourProgress.sections_done = done
	tourProgressSave({ sections_done: done })
	if (typeof displayCalcNotification === "function") {
		displayCalcNotification(TOUR_SECTIONS[key].label + " done. Restart it any time from About → Guided Tour.", 3200)
	}
}

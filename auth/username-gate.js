// ======================= Choose your username =======================
//
// New sign-ups must choose a username (register.html, enforced by the
// database). Accounts made before that - and Discord sign-ups, which have no
// form to ask on - can have none. This asks them to choose one, on the
// calculator, whenever they arrive signed in without one: on opening or
// reloading the site while already signed in, and after signing in again.
//
// It only asks. Nothing about the account is locked, renamed, filled in or
// replaced while they have no name - chat, forum, friends, Master Decoder and
// everything else keep working, and "Not now" closes the prompt for this
// visit. It comes back on the next reload or sign-in, and never again once a
// username is saved.
//
// Saving writes through updateProfile(), the same column-restricted write
// the Account tab uses, to the profile row the account already has - same
// id, same history, settings and scores. The database checks the name again
// (profiles_username_guard in
// supabase/migrations/20260919000000_required_usernames.sql). Nothing is
// chosen for them: a Discord name is offered in the box as a suggestion, not
// saved.
//
// Accounts still in first-run onboarding are left to it (it asks for the
// name itself), and a signed-out visitor never sees this.

var USERNAME_GATE_ID = "usernameGate"
var usernameGateDismissedFor = null // the account that chose "Not now" on this page view

function usernameGateNeeded() {
	if (typeof authUser === "undefined" || authUser === null) return false
	if (typeof authProfile === "undefined" || !authProfile) return false // profile not loaded: nothing to judge by
	if (authProfile.setup_done === false) return false                  // onboarding asks for it
	return !authProfile.username
}

function usernameGateRefresh() {
	if (usernameGateNeeded() && usernameGateDismissedFor !== authUser.id) usernameGateOpen()
	else usernameGateClose()
}

function usernameGateOpen() {
	if (document.getElementById(USERNAME_GATE_ID) !== null) return

	var suggestion = ""
	if (authProfile && authProfile.discord_username && !authUsernameProblem(authProfile.discord_username)) {
		suggestion = authUsernameNormalize(authProfile.discord_username)
	}

	var o = '<div id="' + USERNAME_GATE_ID + '">'
	o += '<div class="obBack"></div>'
	o += '<div class="obBox" role="dialog" aria-modal="true" aria-labelledby="usernameGateTitle">'
	o += '<div class="obIcon">&#9997;</div>'
	o += '<div class="obTitle" id="usernameGateTitle">Choose your username</div>'
	o += '<div class="obLead">Your account doesn\'t have a username yet. Please choose one so other members can identify you.</div>'
	o += '<div class="authField obField">'
	o += '<input class="authInput" type="text" id="usernameGateInput" maxlength="32" autocomplete="username" spellcheck="false" placeholder="Your username" aria-label="Username">'
	o += '<div id="usernameGateInputErr" class="authFieldErr hideValue"></div>'
	o += '<div class="authHint">2&ndash;32 characters: letters, numbers, spaces, dots, dashes and underscores.</div>'
	o += '</div>'
	o += '<div class="obNote">Your account, history, settings and scores stay exactly as they are.</div>'
	o += '<div class="obNav">'
	o += '<button class="authBtn" type="button" id="usernameGateLater">Not now</button>'
	o += '<button class="authBtn authBtnPrimary" type="button" id="usernameGateSave">Save username</button>'
	o += '</div>'
	o += '</div></div>'
	$(o).appendTo("body")

	var box = document.getElementById("usernameGateInput")
	box.value = suggestion
	box.focus()
	$(box).on("keydown", function (e) {
		if (e.key === "Enter") { e.preventDefault(); usernameGateSave() }
		else if (e.key === "Escape") { e.preventDefault(); usernameGateLater() }
	})
	$("#usernameGateSave").on("click", usernameGateSave)
	$("#usernameGateLater").on("click", usernameGateLater)
}

function usernameGateClose() {
	$("#" + USERNAME_GATE_ID).remove()
}

// closes it for this visit only - the next reload or sign-in asks again
function usernameGateLater() {
	usernameGateDismissedFor = authUser ? authUser.id : null
	usernameGateClose()
}

function usernameGateSave() {
	var box = document.getElementById("usernameGateInput")
	if (box === null) return
	var name = authUsernameNormalize(box.value)
	authFieldError("usernameGateInput", "")
	var problem = authUsernameProblem(name)
	if (problem) { authFieldError("usernameGateInput", problem); return }

	authSetLoading("usernameGateSave", true)
	authUsernameCheck(name).then(function (taken) {
		if (taken) throw new Error(taken)
		return updateProfile({ username: name })
	}).then(function () {
		authSetLoading("usernameGateSave", false, "Save username")
		usernameGateClose()
		if (typeof renderAuthNav === "function") renderAuthNav()
		if (typeof displayCalcNotification === "function") displayCalcNotification("Username saved", 1800)
	}).catch(function (err) {
		authSetLoading("usernameGateSave", false, "Save username")
		authFieldError("usernameGateInput", authUsernameError(err) || (err && err.message) || "Could not save that username.")
	})
}

$(document).ready(function () {
	if (typeof onAuthReady !== "function") return
	// opening or reloading the site while already signed in
	onAuthReady(usernameGateRefresh)
	// A sign-in in this tab or another is handled by auth.js, which calls
	// usernameGateRefresh() once the profile has loaded. Here: forget "Not
	// now" on sign-out, so the next sign-in asks again.
	var client = (typeof getAuthClient === "function") ? getAuthClient() : null
	if (client !== null && client.auth && client.auth.onAuthStateChange) {
		client.auth.onAuthStateChange(function (event) {
			if (event === "SIGNED_OUT") { usernameGateDismissedFor = null; usernameGateClose() }
		})
	}
})

// ======================= Friends tab =======================
//
// Three sections behind one tab: chats, people to find, and your friends -
// requests waiting on you live inside Friends now, as a collapsible strip
// rather than a section of their own. They share one member-card renderer,
// because every list is the same thing - somebody, and what you can do about
// them - and the only difference is which buttons apply.
//
// Nothing here decides what is allowed. The card asks the row it was given
// what state it is in and draws the matching buttons; the database decides
// whether the action goes through. A card drawn from stale data can therefore
// offer a button that then fails, which is the right way round: the failure is
// a message, not a wrong friendship.

var friendsSection = "chats"     // chats | discover | friends | profile
var friendsSort = "recent"
var friendsDiscoverKind = "popular"
var friendsSearchTerm = ""
var friendsViewing = null        // a member id when their profile is open
var chatOpenWith = null          // a member id when a conversation is open
var chatPollTimer = null
var frRequestsExpanded = false   // Friends' "Requests" strip, collapsed by default

function frToggleRequests() { frRequestsExpanded = !frRequestsExpanded; renderProfileFriends() }

// ---- entry point ------------------------------------------------------

function renderProfileFriends() {
	var tok = profileRenderSeq

	if (chatOpenWith !== null) { frRenderChatWindow(chatOpenWith, tok); return }
	if (friendsViewing !== null) { renderFriendProfile(friendsViewing, tok); return }

	// the unread count is fetched with the others rather than read from cache:
	// a badge that is only right on a second visit is worse than none
	Promise.all([friendsBadgeCounts(true), chatUnreadCached(true)]).then(function (both) {
		var counts = both[0]
		var o = ''
		var news = frNewsCounts(counts)

		// Opening this tab is itself "seeing" the friends-gained news - there is
		// no separate action (like answering a request, or opening a chat) that
		// would otherwise clear it, so simply landing here has to be the thing
		// that does. Done before frSectionBtn below reads it, so the badge that
		// paints is already the cleared one, not one that flashes then vanishes.
		if (counts) friendsSeenSet("friends", counts.friends)

		o += '<div class="frTabs">'
		o += frSectionBtn("chats",    "&#128172;", "Chats",    news.chats)
		o += frSectionBtn("discover", "&#128269;", "Discover", 0)
		o += frSectionBtn("friends",  "&#128101;", "Friends",  news.friends + news.requests)
		o += frSectionBtn("profile",  "&#128274;", "Profile",  0)
		o += '</div>'
		o += '<div id="frBody"></div>'
		profileBody(o, tok)
		friendsRefreshBadge()

		if (friendsSection === "chats") frRenderChats(tok)
		else if (friendsSection === "discover") frRenderDiscover(tok)
		else if (friendsSection === "profile") renderProfileProfileTab()
		else frRenderFriends(tok)
	}).catch(function (err) { profileBody(profileErr(err), tok) })
}

// Icon above the word, so five sections fit a phone without wrapping into a
// second row of buttons that would read as a second menu.
//
// Two different marks, because they mean different things: a number is news
// you have not seen, and a pip is a section you have never opened.
function frSectionBtn(id, icon, label, badge, pip) {
	var on = (friendsSection === id) ? " frTabOn" : ""
	// Chats gets its own green glow instead of the plain red badge: "new
	// message" is a different feeling from "somebody wants something from
	// you" (Friends/Requests), and reads better in the app's own green.
	var chatGlow = (id === "chats" && badge > 0) ? " frTabChatGlow" : ""
	var o = '<button class="intBtn3 frTab' + on + chatGlow + '" onclick="frSetSection(&quot;' + id + '&quot;)" title="' + label + '">'
	o += '<span class="frTabIcon">' + icon + '</span>'
	o += '<span class="frTabLab">' + label + '</span>'
	if (badge > 0) o += '<span class="frBadge' + (id === "chats" ? " frBadgeChat" : "") + '">' + (badge > 99 ? "99+" : badge) + '</span>'
	else if (pip) o += '<span class="frPip" title="Worth a look">&#10022;</span>'
	o += '</button>'
	return o
}

// What is actually new, as opposed to what merely exists.
//
// The friend count used to be red permanently, which made it decoration - a
// badge that is always on says nothing. It is now the number of friends gained
// since the Friends list was last opened, so it is news exactly once.
function frNewsCounts(counts) {
	return {
		friends: Math.max(0, counts.friends - friendsSeenGet("friends")),
		requests: counts.incoming,   // a pending request stays news until answered
		chats: chatUnreadCache.n     // unread is "not seen" by definition
	}
}

function frNewsTotal(counts) {
	var n = frNewsCounts(counts)
	return n.friends + n.requests + n.chats
}

function frSetSection(id) {
	friendsSection = id
	friendsViewing = null
	chatOpenWith = null
	if (typeof frStopChatPoll === "function") frStopChatPoll()
	renderProfileFriends()
}

function frBody(html, token) {
	if (token !== undefined && token !== profileRenderSeq) return
	var el = document.getElementById("frBody")
	if (el !== null) el.innerHTML = html
}

// ---- the member card --------------------------------------------------
//
// One row: avatar, who they are, and the buttons that apply to the state the
// row arrived in.

function frOnlineDot(row) {
	if (!row.last_active_at) return ''
	var on = friendsIsOnline(row.last_active_at)
	return '<span class="frDot' + (on ? ' frDotOn' : '') + '" title="' +
		(on ? 'Online now' : 'Last seen ' + frWhen(row.last_active_at)) + '"></span>'
}

// The inbox avatar's corner dot - unlike frOnlineDot (an inline mark next to
// a name, on whenever presence is visible at all) this only ever appears
// while actually online, since a permanently-there grey dot on every row
// would just be clutter a busy list does not need.
function frThreadPresenceDot(row) {
	if (!row.last_active_at || !friendsIsOnline(row.last_active_at)) return ''
	return '<span class="frPresenceDot" title="Online now"></span>'
}

function frAvatar(row) {
	if (row.avatar) return '<img class="frAvatar" src="' + authEsc(row.avatar) + '" alt="">'
	var initial = String(row.display_name || "?").charAt(0).toUpperCase()
	return '<span class="frAvatar frAvatarFallback">' + authEsc(initial) + '</span>'
}

// "3 minutes ago" down to a date, because "2026-08-06T11:04:22Z" is not an
// answer to "when"
function frWhen(iso) {
	if (!iso) return ""
	var t = Date.parse(iso)
	if (!isFinite(t)) return ""
	var s = Math.floor((Date.now() - t) / 1000)
	if (s < 60) return "just now"
	if (s < 3600) return Math.floor(s / 60) + "m ago"
	if (s < 86400) return Math.floor(s / 3600) + "h ago"
	if (s < 2592000) return Math.floor(s / 86400) + "d ago"
	return new Date(t).toLocaleDateString()
}

function frCard(row, opts) {
	opts = opts || {}
	var id = row.id
	var o = '<div class="profileRow frRow" data-uid="' + id + '">'

	o += frAvatar(row)
	o += '<span class="frWho" onclick="frOpenProfile(&quot;' + id + '&quot;)" title="See their profile">'
	o += '<span class="frName">' + authEsc(row.display_name) + frAdminBadge(row.id) + frOnlineDot(row) + '</span>'
	var sub = []
	if (row.username && row.username !== row.display_name) sub.push('@' + row.username)
	// On the friends list specifically, presence is worth a line of its own,
	// not just the dot next to the name - "Online" or "Last active 2h ago"
	// says something a colour alone does not.
	if (opts.since && row.last_active_at) {
		sub.push(friendsIsOnline(row.last_active_at) ? "Online" : "Last active " + frWhen(row.last_active_at))
	}
	if (opts.since) sub.push("friends since " + new Date(row.since).toLocaleDateString())
	else if (opts.asked) sub.push("asked " + frWhen(row.asked_at))
	else if (opts.joined) sub.push("joined " + new Date(row.joined_at).toLocaleDateString())
	if (row.mutuals > 0) sub.push(row.mutuals + (row.mutuals === 1 ? " mutual friend" : " mutual friends"))
	if (opts.scoreLine) sub.push(opts.scoreLine)
	if (sub.length) o += '<span class="frSub">' + authEsc(sub.join(" · ")) + '</span>'
	o += '</span>'

	o += '<span class="profileRowActions frActions">' + frButtons(row, opts) + '</span>'
	o += '</div>'
	return o
}

// The buttons for a state. Kept in one place so every list offers the same
// verbs for the same situation.
function frButtons(row, opts) {
	var id = row.id
	var state = opts.state || row.state || "none"
	var q = function (s) { return '&quot;' + s + '&quot;' }

	if (state === "self") return '<span class="profileBadge">you</span>'
	if (state === "blocked") return '<span class="profileBadge">blocked</span>'

	if (state === "friends") {
		// Message is the one thing you do to a friend often; View/Remove/Block
		// are all rare, so they live behind a menu instead of Remove sitting
		// there in red on every single row - a friends list should not read as
		// a list of people you might be about to lose.
		var o = '<button class="profileMiniBtn frMsg" onclick="frOpenChat(&quot;' + id + '&quot;)" title="Send a message">Message</button>'
		o += '<span class="frCardMenu">'
		o += '<button class="profileMiniBtn frCardMenuBtn" onclick="frToggleCardMenu(this)" title="More">&#8942;</button>'
		o += '<span class="frCardMenuList hideValue">'
		o += '<button class="frCardMenuItem" onclick="frCloseCardMenus();frOpenProfile(&quot;' + id + '&quot;)">View profile</button>'
		o += '<button class="frCardMenuItem frCardMenuDanger" onclick="frAct(this,' + q(id) + ',&quot;remove&quot;)">Remove friend</button>'
		o += '<button class="frCardMenuItem frCardMenuDanger" onclick="frBlockMember(this,' + q(id) + ')">Block</button>'
		o += '</span></span>'
		return o
	}
	if (state === "sent") {
		return '<span class="profileBadge">asked</span>' +
			'<button class="profileMiniBtn" onclick="frAct(this,' + q(id) + ',&quot;cancel&quot;)">Cancel</button>'
	}
	if (state === "received") {
		return '<button class="profileMiniBtn frAccept" onclick="frAct(this,' + q(id) + ',&quot;accept&quot;)">Accept</button>' +
			'<button class="profileMiniBtn" onclick="frAct(this,' + q(id) + ',&quot;decline&quot;)">Decline</button>'
	}
	return '<button class="profileMiniBtn frAdd" onclick="frAct(this,' + q(id) + ',&quot;add&quot;)">Add friend</button>'
}

// One menu open at a time, closed by clicking anywhere outside it - the
// click that opens one (on .frCardMenuBtn) also bubbles to this same
// document handler, but closest(".frCardMenu") finds it on the way up, so
// that click never closes what it just opened.
function frToggleCardMenu(btn) {
	var list = btn.nextElementSibling
	if (list === null) return
	var opening = list.classList.contains("hideValue")
	frCloseCardMenus()
	if (opening) list.classList.remove("hideValue")
}
function frCloseCardMenus() {
	document.querySelectorAll(".frCardMenuList").forEach(function (el) { el.classList.add("hideValue") })
}
$(document).on("click", function (e) {
	if ($(e.target).closest(".frCardMenu").length === 0) frCloseCardMenus()
})

// Every button goes through here: disable, call, re-render on the state the
// database hands back. Removing and declining ask twice, because both throw
// something away that the other person has to re-do.
function frAct(btn, id, verb) {
	if ((verb === "remove" || verb === "decline") && !profileConfirmClick(btn, "Sure?")) return

	var call =
		verb === "add"     ? friendsAdd(id) :
		verb === "cancel"  ? friendsCancel(id) :
		verb === "accept"  ? friendsAccept(id) :
		verb === "decline" ? friendsDecline(id) :
		verb === "remove"  ? friendsRemove(id) : null
	if (call === null) return

	btn.disabled = true
	call.then(function () {
		friendsBadgeInvalidate()
		renderProfileFriends()
		displayCalcNotification(frDoneWord(verb), 1800)
	}).catch(function (err) {
		btn.disabled = false
		displayCalcNotification(err.message || "That did not work", 2800)
		renderProfileFriends()
	})
}

function frDoneWord(verb) {
	return verb === "add" ? "Friend request sent"
		: verb === "cancel" ? "Request withdrawn"
		: verb === "accept" ? "Friend added"
		: verb === "decline" ? "Request declined"
		: "Friend removed"
}

// ---- friends ------------------------------------------------------------
//
// Requests live here too now (moved up from their own tab): who's waiting on
// you is exactly the kind of thing worth seeing without a second click once
// you're already looking at your friends, rather than living behind a tab of
// its own most people have nothing in.

function frRenderFriends(tok) {
	frBody('<div class="profileLoading">Loading…</div>', tok)
	Promise.all([
		friendsList(friendsSort),
		friendsRequests("incoming"),
		friendsRequests("outgoing")
	]).then(function (all) {
		var rows = all[0], inc = all[1], out = all[2]
		var o = ''

		// A compact strip, expanded only on request - "Sent by you" in
		// particular used to sit fully open and take up prime space above the
		// actual friends list for something that is usually empty or small.
		if (inc.length || out.length) {
			o += '<div class="frReqStrip" onclick="frToggleRequests()">'
			o += '<span class="frReqStripLabel">Requests</span>'
			if (inc.length) o += '<span class="frReqStripItem">Received <span class="frBadge frBadgeInline">' + inc.length + '</span></span>'
			if (out.length) o += '<span class="frReqStripItem">Sent ' + out.length + '</span>'
			o += '<span class="frReqStripArrow">' + (frRequestsExpanded ? '&#9662;' : '&#9656;') + '</span>'
			o += '</div>'
			if (frRequestsExpanded) {
				if (inc.length) {
					o += '<div class="frSectionTitle">Waiting for you</div>'
					o += '<div class="profileList">'
					for (var i = 0; i < inc.length; i++) o += frCard(inc[i], { state: "received", asked: true })
					o += '</div>'
				}
				if (out.length) {
					o += '<div class="frSectionTitle">Sent by you</div>'
					o += '<div class="profileList">'
					for (var j = 0; j < out.length; j++) o += frCard(out[j], { state: "sent", asked: true })
					o += '</div>'
				}
			}
			o += '<div class="frReqDivider"></div>'
		}

		// One control instead of three buttons. Sorting is a choice between
		// mutually exclusive options, which is what a select is for, and as
		// chips it took a third of the panel and read as part of the menu.
		o += '<div class="frToolbar">'
		o += '<label class="frToolLab" for="frSortSel">Sort</label>'
		o += '<select id="frSortSel" class="frSelect" onchange="frSetSort(this.value)">'
		o += frSortOpt("recent", "&#128338; Recently added")
		o += frSortOpt("name",   "&#128292; A&ndash;Z")
		o += frSortOpt("online", "&#128994; Online first")
		o += '</select>'
		o += '<span class="frToolCount">' + rows.length + (rows.length === 1 ? ' friend' : ' friends') + '</span>'
		o += '</div>'

		if (!rows.length) {
			o += '<div class="profileNote">No friends yet. Find people under <b>Discover</b>, or search for someone by name.</div>'
			frBody(o, tok); return
		}
		o += '<div class="profileList">'
		for (var k = 0; k < rows.length; k++) {
			rows[k].state = "friends"
			o += frCard(rows[k], { state: "friends", since: true })
		}
		o += '</div>'
		frBody(o, tok)
	}).catch(function (err) { frBody(profileErr(err), tok) })
}

function frSortOpt(id, label) {
	return '<option value="' + id + '"' + (friendsSort === id ? ' selected' : '') + '>' + label + '</option>'
}

function frSetSort(s) { friendsSort = s; frRenderFriends(profileRenderSeq) }

// ---- discover ---------------------------------------------------------
//
// Search and browse in one place: typing takes over from the browse lists,
// because a search is a more specific version of the same question.

function frRenderDiscover(tok) {
	var o = ''
	o += '<div class="profileSearchRow">'
	o += '<input type="text" id="frSearch" class="profileSearchInput" placeholder="Search members by name…" '
	o += 'autocomplete="off" spellcheck="false" value="' + authEsc(friendsSearchTerm) + '" oninput="frSearchDebounced()">'
	o += '</div>'
	o += '<div id="frDiscoverBody"></div>'
	frBody(o, tok)
	frDiscoverBody(tok)
}

var frSearchTimer = null
function frSearchDebounced() {
	clearTimeout(frSearchTimer)
	var box = document.getElementById("frSearch")
	friendsSearchTerm = (box === null) ? "" : box.value
	frSearchTimer = setTimeout(function () { frDiscoverBody(profileRenderSeq) }, 220)
}

function frDiscoverBody(tok) {
	var host = function (html) {
		if (tok !== undefined && tok !== profileRenderSeq) return
		var el = document.getElementById("frDiscoverBody")
		if (el !== null) el.innerHTML = html
	}

	var term = String(friendsSearchTerm || "").trim()
	if (term !== "") {
		friendsSearch(term, 30).then(function (rows) {
			var o = '<div class="frSectionTitle">' + rows.length + (rows.length === 1 ? " match" : " matches") + '</div>'
			if (!rows.length) o += '<div class="profileNote">Nobody by that name. Members who have hidden their profile do not appear.</div>'
			else {
				o += '<div class="profileList">'
				for (var i = 0; i < rows.length; i++) o += frCard(rows[i], { joined: true })
				o += '</div>'
			}
			host(o)
		}).catch(function (err) { host(profileErr(err)) })
		return
	}

	var kinds = [
		["recent", "New"],
		["active", "Recently active"],
		["popular", "Top contributors"]
	]
	var o = '<div class="frToolbar">'
	for (var k = 0; k < kinds.length; k++) {
		var on = (friendsDiscoverKind === kinds[k][0]) ? " frChipOn" : ""
		o += '<button class="intBtn3 frChip' + on + '" onclick="frSetDiscover(&quot;' + kinds[k][0] + '&quot;)">' + kinds[k][1] + '</button>'
	}
	o += '</div><div id="frDiscoverList"><div class="profileLoading">Loading…</div></div>'
	host(o)

	friendsDiscover(friendsDiscoverKind, 20).then(function (rows) {
		var out = ''
		if (!rows.length) out = '<div class="profileNote">' + frEmptyWord(friendsDiscoverKind) + '</div>'
		else {
			out = '<div class="profileList">'
			for (var i = 0; i < rows.length; i++) {
				out += frCard(rows[i], { joined: true, scoreLine: frDiscoverScoreLine(friendsDiscoverKind, rows[i]) })
			}
			out += '</div>'
		}
		if (tok !== undefined && tok !== profileRenderSeq) return
		var el = document.getElementById("frDiscoverList")
		if (el !== null) el.innerHTML = out
	}).catch(function (err) {
		var el = document.getElementById("frDiscoverList")
		if (el !== null) el.innerHTML = profileErr(err)
	})
}

function frEmptyWord(kind) {
	if (kind === "similar") return "Nobody else has published in the cyphers you use. Publish a few phrases and this fills up."
	if (kind === "mutual") return "No friends of friends yet — that needs a friend or two first."
	if (kind === "active") return "Nobody else has been active recently."
	if (kind === "popular") return "Nobody has published a phrase yet."
	return "No new members to show."
}

function frSetDiscover(kind) { friendsDiscoverKind = kind; frDiscoverBody(profileRenderSeq) }

// member_discover (auth/friends.js) already computes a per-row "score" server
// side - shared cyphers for "similar", submission count for "popular" - this
// just turns that number into the line that made someone worth surfacing.
// "Uses your cyphers" is the one directory feature a generic social app does
// not have, so it is worth spelling out rather than leaving as a bare count.
function frDiscoverScoreLine(kind, row) {
	var n = row.score
	if (!n || n <= 0) return null
	if (kind === "similar") return "Uses " + n + (n === 1 ? " cypher you use" : " cyphers you use")
	if (kind === "popular") return n + (n === 1 ? " phrase published" : " phrases published")
	return null // "mutual" is already the mutuals line frCard adds on its own
}

// ---- one member's profile ---------------------------------------------

function frOpenProfile(id) { friendsViewing = id; renderProfileFriends() }
function frCloseProfile() { friendsViewing = null; renderProfileFriends() }

function renderFriendProfile(id, tok) {
	profileBody('<div class="profileLoading">Loading…</div>', tok)
	Promise.all([friendsProfile(id), friendsRoleOptions()]).then(function (both) {
		var p = both[0]
		if (p === null) {
			profileBody('<div class="frBack"><button class="profileMiniBtn" onclick="frCloseProfile()">&larr; Back</button></div>' +
				'<div class="profileNote">That profile is private.</div>', tok)
			return
		}
		var o = '<div class="frBack"><button class="profileMiniBtn" onclick="frCloseProfile()">&larr; Back</button></div>'
		o += frProfileBodyHtml(p)
		profileBody(o, tok)
	}).catch(function (err) { profileBody(profileErr(err), tok) })
}

// One renderer for a public profile, used both by the Profile tab - where you
// are looking at your own - and by everyone else looking at yours. Two
// renderers would drift, and "what they see" would stop being true.
function frProfileBodyHtml(p) {
	var o = '<div class="frProfile">'

	o += '<div class="frProfileHead">'
	o += frAvatar(p).replace("frAvatar", "frAvatar frAvatarBig")
	o += '<div class="frProfileWho">'
	o += '<div class="frProfileName">' + authEsc(p.display_name) + frAdminBadge(p.id) + frOnlineDot(p) + '</div>'
	if (p.username && p.username !== p.display_name) o += '<div class="frSub">@' + authEsc(p.username) + '</div>'
	o += '<div class="frSub">&#128197; Member since ' + new Date(p.joined_at).toLocaleDateString() + '</div>'
	o += '</div>'
	// no buttons against yourself: frButtons returns the "you" badge for state
	// "self", which is exactly right in the preview
	o += '<div class="frProfileActions">' + frButtons(p, { state: p.state }) + '</div>'
	o += '</div>'

	if (p.roles && p.roles.length) {
		o += '<div class="frRoleShow">'
		for (var r = 0; r < p.roles.length; r++) {
			o += '<span class="frRoleTag">' + authEsc(friendsRoleLabel(p.roles[r])) + '</span>'
		}
		o += '</div>'
	}

	if (p.fav_ciphers && p.fav_ciphers.length) {
		o += '<div class="frFavShow"><span class="frFavLab">&#128302; Favourite cyphers</span>'
		for (var f = 0; f < p.fav_ciphers.length; f++) {
			var col = (typeof profileCipherColor === "function") ? profileCipherColor(p.fav_ciphers[f]) : null
			o += '<span class="frFav"' + (col ? ' style="color:' + col + ';border-color:' + col + '"' : '') + '>'
			o += authEsc(p.fav_ciphers[f]) + '</span>'
		}
		o += '</div>'
	}

	o += '<div class="frStats">'
	o += frStat(p.rank ? "#" + p.rank : "—", "Leaderboard")
	o += frStat(p.submissions, p.submissions === 1 ? "Phrase published" : "Phrases published")
	o += frStat(p.ciphers_used, p.ciphers_used === 1 ? "Cypher used" : "Cyphers used")
	// null means they have chosen not to show it, which is different from none
	if (p.friends !== null && p.friends !== undefined) {
		o += frStat(p.friends, p.friends === 1 ? "Friend" : "Friends")
	}
	if (p.mutuals > 0) o += frStat(p.mutuals, p.mutuals === 1 ? "Mutual friend" : "Mutual friends")
	if (p.reactions_received > 0) o += frStat(p.reactions_received, p.reactions_received === 1 ? "Reaction received" : "Reactions received")
	o += '</div>'

	var badges = frBadgesFor(p)
	if (badges.length) {
		o += '<div class="frSectionTitle">Badges</div><div class="frBadgeRow">'
		for (var i = 0; i < badges.length; i++) {
			o += '<span class="frAward" title="' + authEsc(badges[i].why) + '">' + badges[i].icon + ' ' + authEsc(badges[i].name) + '</span>'
		}
		o += '</div>'
	}
	o += '</div>'
	return o
}

function frStat(value, label) {
	return '<div class="frStat"><div class="frStatVal">' + authEsc(String(value)) + '</div>' +
		'<div class="frStatLab">' + authEsc(label) + '</div></div>'
}

// Earned from what the database already knows, rather than a badge table
// nobody would ever award from. Every one of these is checkable.
function frBadgesFor(p) {
	var out = []
	if (p.rank === 1) out.push({ icon: "&#129351;", name: "Top contributor", why: "First on the leaderboard" })
	else if (p.rank && p.rank <= 3) out.push({ icon: "&#127941;", name: "Top three", why: "Third or better on the leaderboard" })
	else if (p.rank && p.rank <= 10) out.push({ icon: "&#11088;", name: "Top ten", why: "Tenth or better on the leaderboard" })

	if (p.submissions >= 100) out.push({ icon: "&#128220;", name: "Century", why: "100 phrases published" })
	else if (p.submissions >= 25) out.push({ icon: "&#128221;", name: "Prolific", why: "25 phrases published" })
	else if (p.submissions >= 1) out.push({ icon: "&#9997;", name: "Published", why: "Has published a phrase" })

	if (p.ciphers_used >= 10) out.push({ icon: "&#128302;", name: "Polyglot", why: "Published in ten or more cyphers" })

	if (p.reactions_received >= 200) out.push({ icon: "&#128150;", name: "Beloved", why: "200+ reactions across published phrases" })
	else if (p.reactions_received >= 50) out.push({ icon: "&#128153;", name: "Well liked", why: "50+ reactions across published phrases" })

	if (p.top_phrase_reactions >= 25) out.push({ icon: "&#128293;", name: "Viral phrase", why: "One phrase reached 25+ reactions" })

	var days = (Date.now() - Date.parse(p.joined_at)) / 86400000
	if (isFinite(days) && days >= 365) out.push({ icon: "&#127881;", name: "A year in", why: "Member for over a year" })
	return out
}

// ---- privacy ------------------------------------------------------------
//
// The entry point (renderAccountPrivacy) now lives in profile-tab.js, on the
// Account tab right after the display name - who can find and see you reads
// as part of the account, not something bolted onto Friends. The pieces below
// are still shared: the card/switch renderers and the click handlers that
// save each field, used from wherever the privacy panel is drawn.

function frChoiceCard(current, value, icon, title, blurb) {
	// "members" and "everyone" mean the same thing while the whole social layer
	// needs an account, so a row set to either lights the same card
	var on = (current === value || (value === "everyone" && current === "members"))
	var o = '<button class="frChoiceCard' + (on ? ' frChoiceOn' : '') + '" onclick="frSetPolicy(&quot;' + value + '&quot;)">'
	o += '<span class="frChoiceIcon">' + icon + '</span>'
	o += '<span class="frChoiceBody"><span class="frChoiceTitle">' + title + '</span>'
	o += '<span class="frChoiceBlurb">' + blurb + '</span></span>'
	o += '<span class="frChoiceTick">' + (on ? '&#10003;' : '') + '</span>'
	o += '</button>'
	return o
}

// A real switch rather than a tickbox: the whole row is the target, it is
// obvious which way is on, and green against grey says the state without
// anything having to be read.
function frSwitch(key, value, icon, title, blurb) {
	var o = '<div class="frSwitchRow' + (value ? ' frSwitchOn' : '') + '" onclick="frToggleSwitch(this,&quot;' + key + '&quot;)">'
	o += '<span class="frSwitchIcon">' + icon + '</span>'
	o += '<span class="frSwitchBody"><span class="frSwitchTitle">' + title + '</span>'
	if (blurb) o += '<span class="frSwitchBlurb">' + blurb + '</span>'
	o += '</span>'
	o += '<span class="frSwitch" role="switch" aria-checked="' + (value ? 'true' : 'false') + '"><span class="frSwitchKnob"></span></span>'
	o += '</div>'
	return o
}

// Flipped in place and saved in the background, then put back if the save
// fails - so the switch never shows a state the database does not have.
function frToggleSwitch(row, key) {
	var on = !row.classList.contains("frSwitchOn")
	row.classList.toggle("frSwitchOn", on)
	var sw = row.querySelector(".frSwitch")
	if (sw !== null) sw.setAttribute("aria-checked", on ? "true" : "false")

	var patch = {}
	patch[key] = on
	friendsPrivacySet(patch).catch(function (err) {
		row.classList.toggle("frSwitchOn", !on)
		if (sw !== null) sw.setAttribute("aria-checked", !on ? "true" : "false")
		displayCalcNotification(err.message || "Could not save", 2600)
	})
}

function frSetPolicy(value) {
	friendsPrivacySet({ friend_policy: value }).then(function () {
		displayCalcNotification("Saved", 1400)
		renderAccountPrivacy(profileRenderSeq)
	}).catch(function (err) { displayCalcNotification(err.message || "Could not save", 2600) })
}

// ---- your own public profile -------------------------------------------
//
// Moved to profile-tab.js (renderProfileProfileTab and its helpers) now that
// Profile is a top-level tab next to Friends rather than a section inside it.

// ---- the tab's own badge ----------------------------------------------
//
// Shown on the Friends tab button in the row above, so an incoming request is
// visible without opening the tab.

function friendsRefreshBadge() {
	var counts = friendsBadgeCache.counts
	if (!counts) return
	var n = frNewsTotal(counts)

	var btn = document.getElementById("profileTabFriends")
	if (btn !== null) {
		btn.value = n > 0 ? "💬 Social (" + (n > 99 ? "99+" : n) + ")" : "💬 Social"
		btn.classList.toggle("profileTabAlert", n > 0)
	}

	// Same total, mirrored onto [Username] in the site nav - the one thing
	// visible everywhere, panel open or closed - so a message finds you
	// wherever you are, not only once you have opened Friends yourself.
	var navUser = document.querySelector(".authNavUser")
	if (navUser !== null) {
		var dot = navUser.querySelector(".authNavBadge")
		if (n > 0 && dot === null) {
			dot = document.createElement("span")
			dot.className = "authNavBadge"
			navUser.appendChild(dot)
		} else if (n === 0 && dot !== null) {
			dot.remove()
		}
	}
}

// ---- chats ------------------------------------------------------------
//
// Two views: the list of conversations, and one conversation. The second takes
// over the whole tab rather than sitting inside it, because a chat wants the
// height and the panel does not have much to spare.

var frShowArchived = false

function frToggleArchived() { frShowArchived = !frShowArchived; frRenderChats(profileRenderSeq) }

function frRenderChats(tok) {
	frBody('<div class="profileLoading">Loading…</div>', tok)
	chatThreads(frShowArchived).then(function (rows) {
		if (frShowArchived) rows = rows.filter(function (r) { return r.archived })
		chatUnreadInvalidate()
		var o = ''
		// A light filter strip, not a second toolbar sitting under two other
		// navigation rows - Inbox/Archived is a filter on what is already the
		// Chats section (that button above is already the title), not a
		// parallel piece of navigation.
		var unreadTotal = (typeof chatUnreadCache !== "undefined" && chatUnreadCache.n) || 0
		o += '<div class="frChatsHead">'
		o += '<span class="frChatsFilters">'
		o += '<span class="frChatsFilter' + (frShowArchived ? '' : ' frChatsFilterOn') + '" onclick="frShowArchived&&frToggleArchived()">Inbox'
		if (!frShowArchived && unreadTotal > 0) o += ' <span class="frChatsFilterBadge">' + (unreadTotal > 99 ? "99+" : unreadTotal) + '</span>'
		o += '</span>'
		o += '<span class="frChatsDot">&middot;</span>'
		o += '<span class="frChatsFilter' + (frShowArchived ? ' frChatsFilterOn' : '') + '" onclick="frShowArchived||frToggleArchived()">Archived</span>'
		o += '</span>'
		o += '</div>'

		if (!rows.length) {
			o += '<div class="profileNote">' + (frShowArchived
				? 'Nothing archived.'
				: 'No conversations yet. Open <b>Friends</b> and press Message on someone.') + '</div>'
			frBody(o, tok); return
		}
		o += '<div class="profileList">'
		for (var i = 0; i < rows.length; i++) {
			var r = rows[i]
			var unread = r.unread > 0
			// Unread rows breathe until they are opened - very subtly, since
			// green here has to mean "something new happened", not be the
			// permanent colour of every row. The badge says how many; the tint
			// says which row without making you count.
			//
			// The whole row opens the conversation now, not just a slice of it -
			// a message list is a list of things to click, and a card that is
			// only half clickable reads as broken. Name and avatar still stop
			// the click from bubbling so they can go to the profile instead,
			// same split as everywhere else on the site.
			o += '<div class="profileRow frRow frRowClick' + (unread ? ' frThreadUnread' : '') + '" onclick="frOpenChat(&quot;' + r.friend_id + '&quot;)" title="Open the conversation">'
			o += '<span class="frThreadWho" onclick="event.stopPropagation();frOpenProfile(&quot;' + r.friend_id + '&quot;)" title="See their profile">'
			o += frAvatar({ avatar: r.avatar, display_name: r.display_name })
			o += frThreadPresenceDot(r)
			if (unread) o += '<span class="frUnreadDot" title="Unread"></span>'
			o += '</span>'
			o += '<span class="frWho">'
			o += '<span class="frThreadTop">'
			o += '<span class="frThreadName' + (unread ? ' frThreadNameUnread' : '') + '" onclick="event.stopPropagation();frOpenProfile(&quot;' + r.friend_id + '&quot;)" title="See their profile">'
			o += authEsc(r.display_name) + frAdminBadge(r.friend_id) + '</span>'
			// no "Seen" here - that belongs to the read receipt inside an open
			// conversation, not a plain inbox timestamp
			o += '<span class="frThreadTime">' + frWhen(r.last_at) + '</span>'
			o += '</span>'
			// the preview is escaped like the message itself: a thread list is
			// no place for the one bit of unescaped text in the app
			o += '<span class="frSub frPreview' + (unread ? ' frPreviewUnread' : '') + '">' + (r.last_body ? authEsc(r.last_body) : "no messages yet") + '</span>'
			o += '</span>'
			o += '<span class="profileRowActions frActions">'
			if (unread) o += '<span class="frNewBadge">NEW</span>'
			o += '<button class="profileMiniBtn frThreadBtn" onclick="event.stopPropagation();frArchiveThread(this,&quot;' + r.friend_id + '&quot;,' + (r.archived ? 'false' : 'true') + ')" '
			o += 'title="' + (r.archived ? 'Put it back in the inbox' : 'Archive this conversation') + '">' + (r.archived ? '&#128228;' : '&#128229;') + '</button>'
			o += '<button class="profileMiniBtn profileMiniDanger frThreadBtn" onclick="event.stopPropagation();frClearThread(this,&quot;' + r.friend_id + '&quot;)" '
			o += 'title="Delete your copy of this conversation">&#128465;</button>'
			o += '</span></div>'
		}
		o += '</div>'
		frBody(o, tok)
	}).catch(function (err) { frBody(profileErr(err), tok) })
}

function frOpenChat(id) {
	chatOpenWith = id
	friendsViewing = null
	renderProfileFriends()
}

function frCloseChat() {
	chatOpenWith = null
	frStopChatPoll()
	friendsSection = "chats"
	chatUnreadInvalidate()
	renderProfileFriends()
}

// Message ids already painted, per conversation - a poll tick (below) diffs
// against this to know which messages are new enough to highlight, rather
// than flashing every message on every poll. Seeded with no highlight on
// first open: nothing in a conversation you are opening for the first time
// this session is "new", it is just there.
var frSeenMsgIds = {}

function frRenderChatWindow(id, tok) {
	profileBody('<div class="profileLoading">Loading…</div>', tok)
	Promise.all([friendsProfile(id), chatHistory(id, 100)]).then(function (both) {
		var who = both[0], msgs = both[1]
		var name = who ? who.display_name : "Conversation"

		var seen = {}
		msgs.forEach(function (m) { seen[m.id] = true })
		frSeenMsgIds[id] = seen

		var o = '<div class="frChatHead">'
		o += '<button class="profileMiniBtn" onclick="frCloseChat()">&larr; Back</button>'
		o += '<span class="frChatWho">' + authEsc(name) + frAdminBadge(id) + (who ? frOnlineDot(who) : '') + '</span>'
		o += '<span class="frChatHeadActions">'
		o += '<button class="profileMiniBtn" onclick="frReportPrompt(this,&quot;' + id + '&quot;)" title="Report this member">Report</button>'
		o += '<button class="profileMiniBtn profileMiniDanger" onclick="frBlockMember(this,&quot;' + id + '&quot;)" title="Block: they can no longer message you, ask to be friends, or find you">Block</button>'
		o += '</span></div>'

		o += '<div id="frChatLog" class="frChatLog">' + frChatLogHtml(msgs) + '</div>'

		o += '<div class="frChatCompose">'
		o += '<textarea id="frChatBox" class="frChatBox" rows="2" maxlength="' + CHAT_MAX_LEN + '" '
		o += 'placeholder="Say something…" oninput="frChatTyping()" onkeydown="frChatKey(event)"></textarea>'
		o += '<button class="profileMiniBtn frChatSend" id="frChatSendBtn" onclick="frChatSend()">Send</button>'
		o += '</div>'
		o += '<div id="frChatWarn" class="frChatWarn"></div>'
		// Says what is checked and, just as importantly, what is not. The old
		// wording said messages "are checked", which reads as somebody reading
		// them.
		o += '<div class="frChatRules">'
		o += '<div class="frChatRule">&#128172; Text and emoji only.</div>'
		o += '<div class="frChatRule">&#128274; Links, contact details and personal information are filtered out automatically before a message sends.</div>'
		o += '<div class="frChatRule">&#129302; Those checks are automatic. Nobody reads your conversations &mdash; a moderator only ever sees a message if it is reported.</div>'
		o += '</div>'

		profileBody(o, tok)
		frChatScrollDown()
		chatMarkRead(id).catch(function () {})
		frStartChatPoll(id)
	}).catch(function (err) { profileBody(profileErr(err), tok) })
}

function frChatLogHtml(msgs, newIds) {
	if (!msgs.length) return '<div class="profileNote">Nothing here yet. Say hello.</div>'
	var o = ''
	for (var i = 0; i < msgs.length; i++) {
		var m = msgs[i]
		// Highlighted like a fresh line in a highlighter pen, not a message you
		// sent yourself - you already know you sent that one.
		var isNew = !!(newIds && newIds[m.id] && !m.mine)
		o += '<div class="frMsgRow' + (m.mine ? ' frMsgMine' : '') + (isNew ? ' frMsgNew' : '') + '">'
		o += '<div class="frBubble">' + chatRenderBody(m.body) + '</div>'
		o += '<div class="frMsgWhen">' + frWhen(m.created_at)
		// reporting the message rather than the person: a moderator judging
		// "they were rude" with no idea which line cannot judge anything
		if (!m.mine) {
			o += ' <span class="frMsgFlag" title="Report this message" onclick="frReportMessage(this,&quot;' +
				m.sender_id + '&quot;,&quot;' + m.id + '&quot;)">&#9873;</span>'
		}
		o += '</div>'
		o += '</div>'
	}
	return o
}

function frChatScrollDown() {
	var log = document.getElementById("frChatLog")
	if (log !== null) log.scrollTop = log.scrollHeight
}

// Enter sends, shift-Enter makes a line break. Line breaks are allowed, so
// there has to be a way to type one.
function frChatKey(e) {
	if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); frChatSend() }
}

// Warn as they type rather than only on send, for the rules a person trips by
// accident - a pasted link, a phone number - so it never gets as far as a
// refusal.
function frChatTyping() {
	var box = document.getElementById("frChatBox")
	var warn = document.getElementById("frChatWarn")
	if (box === null || warn === null) return
	var v = box.value
	if (v.trim() === "") { warn.textContent = ""; warn.className = "frChatWarn"; return }
	var pre = chatPrecheck(v)
	if (pre.ok) {
		var left = CHAT_MAX_LEN - v.length
		warn.textContent = left <= 60 ? left + " characters left" : ""
		warn.className = "frChatWarn"
	} else {
		warn.textContent = pre.why
		warn.className = "frChatWarn frChatWarnBad"
	}
}

function frChatSend() {
	var box = document.getElementById("frChatBox")
	var btn = document.getElementById("frChatSendBtn")
	if (box === null || chatOpenWith === null) return
	var body = box.value
	if (body.trim() === "") return

	btn.disabled = true
	chatSend(chatOpenWith, body).then(function () {
		box.value = ""
		frChatTyping()
		btn.disabled = false
		return chatHistory(chatOpenWith, 100)
	}).then(function (msgs) {
		var log = document.getElementById("frChatLog")
		if (log !== null) { log.innerHTML = frChatLogHtml(msgs); frChatScrollDown() }
	}).catch(function (err) {
		btn.disabled = false
		var warn = document.getElementById("frChatWarn")
		if (warn !== null) {
			warn.textContent = err.message || "Not sent"
			warn.className = "frChatWarn frChatWarnBad"
		}
		// the message stays in the box: they wrote it, and losing it because a
		// rule fired would be a second punishment for the same thing
	})
}

// Polling rather than a realtime subscription: a chat this quiet does not
// justify a socket, and a poll cannot get stuck in a state that needs a reload
// to clear.
function frStartChatPoll(id) {
	frStopChatPoll()
	chatPollTimer = setInterval(function () {
		if (chatOpenWith !== id) { frStopChatPoll(); return }
		chatHistory(id, 100).then(function (msgs) {
			var log = document.getElementById("frChatLog")
			if (log === null) { frStopChatPoll(); return }
			var atBottom = (log.scrollHeight - log.scrollTop - log.clientHeight) < 40

			var prevSeen = frSeenMsgIds[id] || {}
			var newIds = {}
			var seen = {}
			msgs.forEach(function (m) {
				if (!prevSeen[m.id]) newIds[m.id] = true
				seen[m.id] = true
			})
			frSeenMsgIds[id] = seen

			var next = frChatLogHtml(msgs, newIds)
			if (next !== log.innerHTML) {
				log.innerHTML = next
				if (atBottom) frChatScrollDown() // do not yank them away from what they are reading
				chatMarkRead(id).catch(function () {})
			}
		}).catch(function () { frStopChatPoll() })
	}, 6000)
}

function frStopChatPoll() {
	if (chatPollTimer !== null) { clearInterval(chatPollTimer); chatPollTimer = null }
}

// ---- report and block -------------------------------------------------

// A report with a reason and a requested outcome, rather than a bare flag. A
// moderator opening "reported" with nothing else to go on has to reconstruct
// what the problem was; two dropdowns save that entirely.
var frReportTarget = null, frReportMessage = null

function frReportPrompt(btn, id, messageId) {
	frReportTarget = id
	frReportMessage = messageId || null
	frShowReportDialog()
}

function frShowReportDialog() {
	frCloseReport()
	var o = '<div id="frReportBack" class="frReportBack" onclick="frCloseReport()"></div>'
	o += '<div id="frReportBox" class="frReportBox">'
	o += '<div class="frPrivHead">&#128681; Report ' + (frReportMessage ? 'this message' : 'this member') + '</div>'

	o += '<div class="soComposeLab">What is wrong?</div>'
	o += '<select id="frReportReason" class="frSelect frReportSel">'
	for (var i = 0; i < CHAT_REPORT_REASONS.length; i++) {
		o += '<option value="' + CHAT_REPORT_REASONS[i][0] + '">' + CHAT_REPORT_REASONS[i][1] + '</option>'
	}
	o += '</select>'

	o += '<div class="soComposeLab">What would you like done?</div>'
	o += '<select id="frReportAction" class="frSelect frReportSel">'
	for (var a = 0; a < CHAT_REPORT_ACTIONS.length; a++) {
		o += '<option value="' + CHAT_REPORT_ACTIONS[a][0] + '">' + CHAT_REPORT_ACTIONS[a][1] + '</option>'
	}
	o += '</select>'

	o += '<div class="soComposeLab">Anything else? (optional)</div>'
	o += '<textarea id="frReportNote" class="frChatBox soCaption2" rows="2" maxlength="1000" placeholder="Context that would help"></textarea>'

	o += '<div class="profileNote">An administrator sees the conversation around a reported message, so they can judge it in context.</div>'
	o += '<div class="frReportBtns">'
	o += '<button class="profileMiniBtn" onclick="frCloseReport()">Cancel</button>'
	o += '<button class="profileMiniBtn profileMiniDanger" id="frReportSend" onclick="frSendReport()">Send report</button>'
	o += '</div></div>'
	$(o).appendTo("body")
}

function frCloseReport() { $("#frReportBack, #frReportBox").remove() }

function frSendReport() {
	var reason = $("#frReportReason").val()
	var action = $("#frReportAction").val()
	var note = $("#frReportNote").val()
	var btn = document.getElementById("frReportSend")
	if (btn) btn.disabled = true
	chatReport(frReportTarget, reason, note || null, frReportMessage, action).then(function () {
		frCloseReport()
		displayCalcNotification("Reported. An administrator will look at it.", 2800)
	}).catch(function (err) {
		if (btn) btn.disabled = false
		displayCalcNotification(err.message || "Could not report", 2800)
	})
}

function frArchiveThread(btn, id, on) {
	btn.disabled = true
	chatArchive(id, on).then(function () {
		displayCalcNotification(on ? "Archived" : "Back in your inbox", 1600)
		frRenderChats(profileRenderSeq)
	}).catch(function (err) {
		btn.disabled = false
		displayCalcNotification(err.message || "Could not archive", 2400)
	})
}

function frClearThread(btn, id) {
	if (!profileConfirmClick(btn, "Delete?")) return
	chatClear(id).then(function () {
		displayCalcNotification("Deleted your copy. Theirs is untouched.", 2800)
		chatUnreadInvalidate()
		frRenderChats(profileRenderSeq)
	}).catch(function (err) { displayCalcNotification(err.message || "Could not delete", 2400) })
}

function frBlockMember(btn, id) {
	if (!profileConfirmClick(btn, "Block?")) return
	chatBlock(id).then(function () {
		displayCalcNotification("Blocked. They can no longer contact or find you.", 2800)
		friendsBadgeInvalidate()
		chatUnreadInvalidate()
		// Reachable from an open chat's header (block them, closing the chat is
		// right) and now from a friend card's ⋯ menu too (no chat is open, so
		// there is nothing to close - just redraw the list without them)
		if (chatOpenWith === id) frCloseChat()
		else renderProfileFriends()
	}).catch(function (err) {
		displayCalcNotification(err.message || "Could not block", 2600)
	})
}

// ---- administrator badge ----------------------------------------------
//
// Drawn from a cached list of admin ids rather than a column on every query,
// so a name can be decorated wherever it appears without changing the shape of
// whatever fetched it. Silent if admin.js is not loaded.

function frAdminBadge(id) {
	return (typeof adminBadgeHtml === "function") ? adminBadgeHtml(id) : ""
}

// Report one message. The id goes with it, so the panel can show the
// conversation around it instead of a bare accusation.
function frReportMessage(el, senderId, messageId) {
	if (typeof chatReport !== "function") return
	if (el.dataset.armed !== "1") {
		el.dataset.armed = "1"
		el.classList.add("frMsgFlagArmed")
		el.title = "Click again to report"
		setTimeout(function () {
			el.dataset.armed = ""
			el.classList.remove("frMsgFlagArmed")
			el.title = "Report this message"
		}, 4000)
		return
	}
	el.dataset.armed = ""
	el.classList.remove("frMsgFlagArmed")
	frReportPrompt(el, senderId, messageId)
}

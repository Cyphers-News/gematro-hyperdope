// ======================= Admin panel UI =======================
//
// Sections are rows in adminSections. Adding one is an entry here plus a
// render function; nothing registers a route or a permission, because the
// database refuses anyone who should not see the data regardless of what this
// draws.

var adminSections = [
	{ id: "dashboard", label: "Dashboard",   render: function (h) { adminRenderDashboard(h) } },
	{ id: "reports",   label: "Reports",     render: function (h) { adminRenderReports(h) } },
	{ id: "phrases",   label: "Phrase queue",render: function (h) { adminRenderPhraseQueue(h) } },
	{ id: "users",     label: "Users",       render: function (h) { adminRenderUsers(h) } },
	{ id: "audit",     label: "Audit log",   render: function (h) { adminRenderAudit(h) } }
]

var adminSection = "dashboard"
var adminSeq = 0            // stale-response guard, same idea as the profile tabs
var adminLiveTimer = null

// filters, kept across re-renders
var adminUserQuery = "", adminUserSort = "recent", adminUserStatus = "all"
var adminReportStatusFilter = "open", adminReportSort = "newest"
var adminOpenReport = null
var adminPhraseStatusFilter = "pending", adminPhraseSort = "recent"

function adminEsc(s) { return authEsc(s) }

function adminWhen(iso) {
	if (!iso) return "never"
	var t = Date.parse(iso)
	if (!isFinite(t)) return "—"
	var s = Math.floor((Date.now() - t) / 1000)
	if (s < 60) return "just now"
	if (s < 3600) return Math.floor(s / 60) + "m ago"
	if (s < 86400) return Math.floor(s / 3600) + "h ago"
	if (s < 2592000) return Math.floor(s / 86400) + "d ago"
	return new Date(t).toLocaleDateString()
}

function adminDate(iso) {
	if (!iso) return "—"
	var t = Date.parse(iso)
	return isFinite(t) ? new Date(t).toLocaleDateString() : "—"
}

function adminNotify(msg, bad) {
	var el = document.getElementById("adminToast")
	if (el === null) return
	el.textContent = msg
	el.className = "adminToast adminToastShow" + (bad ? " adminToastBad" : "")
	clearTimeout(adminNotify.t)
	adminNotify.t = setTimeout(function () { el.className = "adminToast" }, 3600)
}

// ---- shell ------------------------------------------------------------

function adminRender() {
	var nav = document.getElementById("adminNav")
	var host = document.getElementById("adminBody")
	if (nav === null || host === null) return

	var o = ''
	for (var i = 0; i < adminSections.length; i++) {
		var s = adminSections[i]
		o += '<button class="adminNavBtn' + (adminSection === s.id ? ' adminNavOn' : '') + '" ' +
			'onclick="adminGo(&quot;' + s.id + '&quot;)">' + s.label + '</button>'
	}
	nav.innerHTML = o

	adminSeq++
	adminStopLive()
	host.innerHTML = '<div class="adminLoading">Loading…</div>'
	for (var k = 0; k < adminSections.length; k++) {
		if (adminSections[k].id === adminSection) { adminSections[k].render(host); return }
	}
}

function adminGo(id) { adminSection = id; adminOpenReport = null; adminRender() }

function adminWrite(host, html, token) {
	if (token !== undefined && token !== adminSeq) return // a slower section answered late
	host.innerHTML = html
}

function adminStopLive() {
	if (adminLiveTimer !== null) { clearInterval(adminLiveTimer); adminLiveTimer = null }
}

// ---- dashboard --------------------------------------------------------

function adminRenderDashboard(host) {
	var tok = adminSeq
	Promise.all([adminStats(), adminOnline(5), adminAudit(8), adminDbFileSize().catch(function () { return null })])
		.then(function (all) {
		var s = all[0], online = all[1], recent = all[2], dbBytes = all[3]
		if (s === null) { adminWrite(host, '<div class="adminNote">No statistics available.</div>', tok); return }

		var o = '<div class="adminGrid">'
		o += adminStat(s.users_total, "Members")
		o += adminStat(s.users_online, "Online now", "adminStatLive")
		o += adminStat(s.users_new_today, "Joined today")
		o += adminStat(s.reports_open, "Open reports", s.reports_open > 0 ? "adminStatWarn" : "")
		o += adminStat(s.reports_total, "Reports total")
		o += adminStat(s.phrase_queue_pending, "Phrases awaiting review", s.phrase_queue_pending > 0 ? "adminStatWarn" : "")
		o += adminStat(s.users_suspended, "Suspended")
		o += adminStat(s.users_banned, "Banned")
		o += adminStat(s.admins, "Administrators")
		o += adminStat(s.messages_today, "Messages today")
		o += adminStat(s.rejections_today, "Blocked today")
		if (dbBytes !== null) {
			o += adminStat(adminBytesShort(dbBytes), "db.txt size",
				dbBytes >= ADMIN_DB_SIZE_WARN ? "adminStatWarn" : "")
		}
		o += '</div>'

		if (dbBytes !== null && dbBytes >= ADMIN_DB_SIZE_WARN) {
			o += '<div class="adminNote adminNoteBad">db.txt is ' + adminBytesShort(dbBytes) + ' of a ' +
				adminBytesShort(ADMIN_DB_SIZE_CAP) + ' working limit (every visitor\'s browser parses the whole ' +
				'file on load). Slow down approving more phrases in the queue below until this comes back down.</div>'
		}

		o += '<div class="adminSplit">'
		o += '<div class="adminCard"><div class="adminCardHead">Online now '
		o += '<span class="adminLiveDot" title="Updating every 20 seconds"></span></div>'
		o += '<div id="adminOnlineList">' + adminOnlineHtml(online) + '</div></div>'

		o += '<div class="adminCard"><div class="adminCardHead">Recent activity</div>'
		o += '<div class="adminList">'
		if (!recent.length) o += '<div class="adminNote">Nothing yet.</div>'
		else for (var i = 0; i < recent.length; i++) {
			o += '<div class="adminRow"><span class="adminRowMain">' + adminEsc(recent[i].admin_name || "—") +
				' <span class="adminDim">' + adminEsc(recent[i].action) + '</span> ' +
				adminEsc(recent[i].target_name || "") + '</span>' +
				'<span class="adminDim">' + adminWhen(recent[i].created_at) + '</span></div>'
		}
		o += '</div></div>'
		o += '</div>'

		adminWrite(host, o, tok)

		// the one thing on the page that has to keep up on its own
		adminStopLive()
		adminLiveTimer = setInterval(function () {
			if (adminSection !== "dashboard") { adminStopLive(); return }
			adminOnline(5).then(function (rows) {
				var el = document.getElementById("adminOnlineList")
				if (el === null) { adminStopLive(); return }
				el.innerHTML = adminOnlineHtml(rows)
				var n = document.querySelector(".adminStatLive .adminStatVal")
				if (n !== null) n.textContent = rows.length
			}).catch(function () { adminStopLive() })
		}, 20000)
	}).catch(function (err) { adminWrite(host, adminError(err), tok) })
}

function adminOnlineHtml(rows) {
	if (!rows.length) return '<div class="adminNote">Nobody in the last five minutes.</div>'
	var o = '<div class="adminList">'
	for (var i = 0; i < rows.length; i++) {
		o += '<div class="adminRow">'
		o += '<span class="adminRowMain"><span class="adminDot"></span>' + adminEsc(rows[i].username)
		if (rows[i].is_admin) o += ' <span class="adminBadge">&#128737; Admin</span>'
		o += '</span><span class="adminDim">' + adminWhen(rows[i].last_active_at) + '</span></div>'
	}
	return o + '</div>'
}

function adminStat(value, label, cls) {
	return '<div class="adminStat ' + (cls || '') + '">' +
		'<div class="adminStatVal">' + adminEsc(String(value === null || value === undefined ? 0 : value)) + '</div>' +
		'<div class="adminStatLab">' + adminEsc(label) + '</div></div>'
}

function adminError(err) {
	return '<div class="adminNote adminNoteBad">' + adminEsc((err && err.message) ? err.message : String(err)) + '</div>'
}

// ---- reports ----------------------------------------------------------

function adminRenderReports(host) {
	var tok = adminSeq
	if (adminOpenReport !== null) { adminRenderReportDetail(host, tok); return }

	adminReports(adminReportStatusFilter === "all" ? null : adminReportStatusFilter, adminReportSort)
		.then(function (rows) {
			var o = '<div class="adminBar">'
			o += '<span class="adminBarLab">Status</span>'
			;["open", "reviewing", "dismissed", "actioned", "all"].forEach(function (s) {
				o += '<button class="adminChip' + (adminReportStatusFilter === s ? ' adminChipOn' : '') +
					'" onclick="adminSetReportFilter(&quot;' + s + '&quot;)">' + s + '</button>'
			})
			o += '<span class="adminBarLab adminBarRight">Sort</span>'
			;[["newest", "Newest"], ["oldest", "Oldest"]].forEach(function (p) {
				o += '<button class="adminChip' + (adminReportSort === p[0] ? ' adminChipOn' : '') +
					'" onclick="adminSetReportSort(&quot;' + p[0] + '&quot;)">' + p[1] + '</button>'
			})
			o += '</div>'

			if (!rows.length) { adminWrite(host, o + '<div class="adminNote">No reports here.</div>', tok); return }

			o += '<table class="adminTable"><thead><tr>'
			o += '<th>When</th><th>Reported</th><th>By</th><th>Why</th><th>Message</th><th>Wants</th><th>Status</th><th></th>'
			o += '</tr></thead><tbody>'
			for (var i = 0; i < rows.length; i++) {
				var r = rows[i]
				o += '<tr>'
				o += '<td class="adminDim">' + adminWhen(r.created_at) + '</td>'
				o += '<td>' + adminEsc(r.reported_name) + '</td>'
				o += '<td class="adminDim">' + adminEsc(r.reporter_name) + '</td>'
				o += '<td>' + adminReasonLabel(r.reason) + '</td>'
				o += '<td class="adminClip">' + (r.message_body ? adminEsc(r.message_body) : '<span class="adminDim">&mdash;</span>') + '</td>'
				o += '<td class="adminDim">' + adminActionLabel(r.action_requested) + '</td>'
				o += '<td><span class="adminPill adminPill-' + adminEsc(r.status) + '">' + adminEsc(r.status) + '</span></td>'
				o += '<td><button class="adminBtn" onclick="adminOpenReportDetail(&quot;' + r.id + '&quot;)">Open</button></td>'
				o += '</tr>'
			}
			o += '</tbody></table>'
			adminWrite(host, o, tok)
		}).catch(function (err) { adminWrite(host, adminError(err), tok) })
}

// The reporter picks from a list, so these are known values rather than free
// text. Anything unrecognised is still shown, escaped, rather than dropped -
// reports written before the list existed carry whatever wording they had.
var ADMIN_REASON_LABELS = {
	spam:          "\uD83D\uDEAB Spam",
	harassment:    "\uD83E\uDD2C Harassment",
	hate:          "\u26A0\uFE0F Hate speech",
	inappropriate: "\uD83D\uDC76 Inappropriate",
	scam:          "\uD83C\uDFA3 Scam",
	advertising:   "\uD83D\uDCE2 Advertising",
	other:         "\u2753 Other"
}

var ADMIN_ACTION_LABELS = {
	review:      "review it",
	warn:        "warn them",
	investigate: "read the conversation",
	other:       "see detail"
}

function adminReasonLabel(v) {
	if (!v) return '<span class="adminDim">&mdash;</span>'
	return ADMIN_REASON_LABELS[v] || adminEsc(v)
}

function adminActionLabel(v) {
	if (!v) return "&mdash;"
	return ADMIN_ACTION_LABELS[v] || adminEsc(v)
}

// adminKV escapes what it is given, so the detail card needs the plain wording
// rather than the marked-up cell above
function adminReasonText(v) { return v ? (ADMIN_REASON_LABELS[v] || v) : "—" }
function adminActionText(v) { return v ? (ADMIN_ACTION_LABELS[v] || v) : "—" }

function adminSetReportFilter(s) { adminReportStatusFilter = s; adminRender() }
function adminSetReportSort(s) { adminReportSort = s; adminRender() }
function adminOpenReportDetail(id) { adminOpenReport = id; adminRender() }
function adminCloseReport() { adminOpenReport = null; adminRender() }

function adminRenderReportDetail(host, tok) {
	Promise.all([
		adminReports("all", "newest"),
		adminReportContext(adminOpenReport)
	]).then(function (both) {
		var all = both[0], ctx = both[1], r = null
		for (var i = 0; i < all.length; i++) if (all[i].id === adminOpenReport) { r = all[i]; break }
		if (r === null) { adminWrite(host, '<div class="adminNote">That report is gone.</div>', tok); return }

		var o = '<div class="adminBar"><button class="adminBtn" onclick="adminCloseReport()">&larr; All reports</button>'
		o += '<span class="adminPill adminPill-' + adminEsc(r.status) + '">' + adminEsc(r.status) + '</span></div>'

		o += '<div class="adminCard"><div class="adminCardHead">Report</div><div class="adminKV">'
		o += adminKV("Reported", r.reported_name)
		o += adminKV("Reported by", r.reporter_name)
		o += adminKV("When", new Date(r.created_at).toLocaleString())
		o += adminKV("Reason", adminReasonText(r.reason))
		o += adminKV("Asked for", adminActionText(r.action_requested))
		if (r.detail) o += adminKV("Detail", r.detail)
		if (r.handled_by_name) o += adminKV("Handled by", r.handled_by_name + " · " + adminWhen(r.handled_at))
		if (r.admin_note) o += adminKV("Note", r.admin_note)
		o += '</div></div>'

		if (r.message_body) {
			o += '<div class="adminCard"><div class="adminCardHead">The reported message</div>'
			o += '<div class="adminQuote">' + adminEsc(r.message_body) + '</div></div>'
		}

		o += '<div class="adminCard"><div class="adminCardHead">Conversation around it</div>'
		if (!ctx.length) {
			o += '<div class="adminNote">No surrounding messages — the report may not name one, or they have been deleted.</div>'
		} else {
			o += '<div class="adminConv">'
			for (var k = 0; k < ctx.length; k++) {
				var m = ctx[k]
				o += '<div class="adminMsg' + (m.is_reported ? ' adminMsgFlagged' : '') + '">'
				o += '<span class="adminMsgWho">' + adminEsc(m.sender_name) + '</span>'
				o += '<span class="adminMsgBody">' + adminEsc(m.body) + '</span>'
				o += '<span class="adminDim">' + adminWhen(m.created_at) + '</span>'
				o += '</div>'
			}
			o += '</div>'
		}
		o += '</div>'

		o += '<div class="adminCard"><div class="adminCardHead">Decide</div><div class="adminBar">'
		;[["reviewing", "Under review"], ["dismissed", "Dismiss"], ["actioned", "Actioned"], ["open", "Reopen"]].forEach(function (p) {
			o += '<button class="adminBtn" onclick="adminDecide(&quot;' + r.id + '&quot;,&quot;' + p[0] + '&quot;)">' + p[1] + '</button>'
		})
		o += '</div>'
		o += '<div class="adminNote">Deciding a report does not act on the account. Suspend or ban them under <b>Users</b>.</div>'
		o += '</div>'

		adminWrite(host, o, tok)
	}).catch(function (err) { adminWrite(host, adminError(err), tok) })
}

function adminKV(k, v) {
	return '<div class="adminKVRow"><span class="adminKVKey">' + adminEsc(k) + '</span>' +
		'<span class="adminKVVal">' + adminEsc(v) + '</span></div>'
}

function adminDecide(id, status) {
	adminReportStatus(id, status, null).then(function () {
		adminNotify("Report marked as " + status + ".")
		adminRender()
	}).catch(function (err) { adminNotify(err.message || "Could not update the report", true) })
}

// ---- users ------------------------------------------------------------

function adminRenderUsers(host) {
	var tok = adminSeq
	adminUsers(adminUserQuery, adminUserSort, adminUserStatus === "all" ? null : adminUserStatus, 100, 0)
		.then(function (rows) {
			var o = '<div class="adminBar">'
			o += '<input type="text" id="adminUserSearch" class="adminSearch" placeholder="Search name or email…" ' +
				'value="' + adminEsc(adminUserQuery) + '" oninput="adminUserSearchDebounced()">'
			;["all", "active", "suspended", "banned"].forEach(function (s) {
				o += '<button class="adminChip' + (adminUserStatus === s ? ' adminChipOn' : '') +
					'" onclick="adminSetUserStatus(&quot;' + s + '&quot;)">' + s + '</button>'
			})
			o += '<span class="adminBarLab adminBarRight">Sort</span>'
			;[["recent", "Newest"], ["oldest", "Oldest"], ["name", "A–Z"], ["active", "Last active"]].forEach(function (p) {
				o += '<button class="adminChip' + (adminUserSort === p[0] ? ' adminChipOn' : '') +
					'" onclick="adminSetUserSort(&quot;' + p[0] + '&quot;)">' + p[1] + '</button>'
			})
			o += '</div>'

			if (!rows.length) { adminWrite(host, o + '<div class="adminNote">Nobody matches that.</div>', tok); return }

			o += '<table class="adminTable"><thead><tr>'
			o += '<th>Member</th><th>Joined</th><th>Last active</th><th>Subs</th><th>Reports</th><th>Status</th><th>Actions</th>'
			o += '</tr></thead><tbody>'
			for (var i = 0; i < rows.length; i++) o += adminUserRow(rows[i])
			o += '</tbody></table>'
			o += '<div class="adminNote">Showing ' + rows.length + '. Refine the search to narrow it.</div>'
			adminWrite(host, o, tok)
		}).catch(function (err) { adminWrite(host, adminError(err), tok) })
}

function adminUserRow(u) {
	var me = (typeof authUser !== "undefined" && authUser !== null && authUser.id === u.id)
	var q = function (s) { return '&quot;' + s + '&quot;' }
	var o = '<tr' + (u.status !== 'active' ? ' class="adminRowFlagged"' : '') + '>'

	o += '<td><span class="adminUserCell">'
	o += '<span class="adminDot' + (adminOnlineNow(u.last_active_at) ? ' adminDotOn' : '') + '"></span>'
	o += adminEsc(u.username || "—")
	if (u.is_admin) o += ' <span class="adminBadge">&#128737; Admin</span>'
	if (me) o += ' <span class="adminDim">(you)</span>'
	o += '</span></td>'
	o += '<td class="adminDim">' + adminDate(u.joined_at) + '</td>'
	o += '<td class="adminDim">' + adminWhen(u.last_active_at) + '</td>'
	o += '<td class="adminDim">' + u.submissions + '</td>'
	// reports against them is the number a moderator actually wants beside a
	// name; the address it replaced was never used to decide anything
	o += '<td class="adminDim">' + (u.reports_against > 0
		? '<span class="adminPill adminPill-open">' + u.reports_against + '</span>' : '0') + '</td>'
	o += '<td><span class="adminPill adminPill-' + adminEsc(u.status) + '">' + adminEsc(u.status) + '</span>'
	if (u.status_reason) o += '<div class="adminDim adminClip" title="' + adminEsc(u.status_reason) + '">' + adminEsc(u.status_reason) + '</div>'
	o += '</td>'

	o += '<td class="adminActions">'
	if (u.status === 'active') {
		o += '<button class="adminBtn" onclick="adminAct(this,' + q(u.id) + ',&quot;suspend&quot;)">Suspend</button>'
		o += '<button class="adminBtn adminBtnBad" onclick="adminAct(this,' + q(u.id) + ',&quot;ban&quot;)">Ban</button>'
	} else {
		o += '<button class="adminBtn adminBtnGood" onclick="adminAct(this,' + q(u.id) + ',&quot;restore&quot;)">Restore</button>'
	}
	// disabled when there is no address to send to - a Discord-only account has
	// none, and offering the button would be offering something that cannot work
	o += u.has_email
		? '<button class="adminBtn" onclick="adminAct(this,' + q(u.id) + ',&quot;reset&quot;)">Reset password</button>'
		: '<button class="adminBtn" disabled title="No email address on this account">Reset password</button>'
	o += u.is_admin
		? '<button class="adminBtn" onclick="adminAct(this,' + q(u.id) + ',&quot;demote&quot;)">Remove admin</button>'
		: '<button class="adminBtn" onclick="adminAct(this,' + q(u.id) + ',&quot;promote&quot;)">Make admin</button>'
	o += '<button class="adminBtn adminBtnBad" onclick="adminAct(this,' + q(u.id) + ',&quot;delete&quot;)">Delete</button>'
	o += '</td></tr>'
	return o
}

var adminUserSearchTimer = null
function adminUserSearchDebounced() {
	clearTimeout(adminUserSearchTimer)
	var box = document.getElementById("adminUserSearch")
	adminUserQuery = (box === null) ? "" : box.value
	adminUserSearchTimer = setTimeout(function () {
		var host = document.getElementById("adminBody")
		if (host !== null) adminRenderUsers(host)
	}, 250)
}

function adminSetUserStatus(s) { adminUserStatus = s; adminRender() }
function adminSetUserSort(s) { adminUserSort = s; adminRender() }

// Destructive actions ask twice, in place. The button becomes the question, so
// there is no dialog to dismiss by reflex.
var adminArmed = null, adminArmedTimer = null

function adminDisarm() {
	if (adminArmed !== null && adminArmed.dataset.idle !== undefined) {
		adminArmed.textContent = adminArmed.dataset.idle
		adminArmed.classList.remove("adminBtnArmed")
	}
	adminArmed = null
	clearTimeout(adminArmedTimer)
}

function adminConfirm(btn, word) {
	if (btn === adminArmed) { adminDisarm(); return true }
	adminDisarm()
	adminArmed = btn
	btn.dataset.idle = btn.textContent
	btn.textContent = word
	btn.classList.add("adminBtnArmed")
	adminArmedTimer = setTimeout(adminDisarm, 4000)
	return false
}

var adminNeedsConfirm = { ban: "Ban?", "delete": "Delete?", demote: "Remove?", suspend: "Suspend?" }

function adminAct(btn, id, verb, extra) {
	if (adminNeedsConfirm[verb] && !adminConfirm(btn, adminNeedsConfirm[verb])) return

	var call, done
	if (verb === "suspend") { call = adminSetStatus(id, "suspended", "Suspended by an administrator", null); done = "User suspended successfully." }
	else if (verb === "ban") { call = adminSetStatus(id, "banned", "Banned by an administrator", null); done = "User banned successfully." }
	else if (verb === "restore") { call = adminSetStatus(id, "active", null, null); done = "Account restored successfully." }
	else if (verb === "promote") { call = adminSetAdmin(id, true); done = "User promoted to Administrator." }
	else if (verb === "demote") { call = adminSetAdmin(id, false); done = "Administrator rights removed." }
	else if (verb === "delete") { call = adminDeleteUser(id); done = "User deleted successfully." }
	else if (verb === "reset") { call = adminSendReset(id); done = "Password reset email sent." }
	else return

	btn.disabled = true
	call.then(function () {
		adminNotify(done)
		adminIdSet = null // the staff list may have changed
		adminRender()
	}).catch(function (err) {
		btn.disabled = false
		adminDisarm()
		adminNotify(err.message || "That did not work", true)
	})
}

// ---- audit ------------------------------------------------------------

function adminRenderAudit(host) {
	var tok = adminSeq
	adminAudit(200).then(function (rows) {
		if (!rows.length) { adminWrite(host, '<div class="adminNote">Nothing logged yet.</div>', tok); return }
		var o = '<table class="adminTable"><thead><tr>'
		o += '<th>When</th><th>Administrator</th><th>Action</th><th>Target</th><th>Detail</th><th>IP</th>'
		o += '</tr></thead><tbody>'
		for (var i = 0; i < rows.length; i++) {
			var a = rows[i]
			o += '<tr>'
			o += '<td class="adminDim" title="' + adminEsc(new Date(a.created_at).toLocaleString()) + '">' + adminWhen(a.created_at) + '</td>'
			o += '<td>' + adminEsc(a.admin_name || "—") + '</td>'
			o += '<td><span class="adminPill">' + adminEsc(a.action) + '</span></td>'
			o += '<td>' + adminEsc(a.target_name || "—") + '</td>'
			o += '<td class="adminDim adminClip">' + adminEsc(a.detail ? JSON.stringify(a.detail) : "") + '</td>'
			o += '<td class="adminDim">' + adminEsc(a.ip || "—") + '</td>'
			o += '</tr>'
		}
		o += '</tbody></table>'
		adminWrite(host, o, tok)
	}).catch(function (err) { adminWrite(host, adminError(err), tok) })
}

// ---- phrase queue -------------------------------------------------------
//
// Phrases that earned a heart/like/laugh, waiting to be decided into db.txt.
// db.txt is a static file, not a table - nothing here writes to it. Approving
// a phrase here means "yes, this belongs in the file", not "this is now in
// the file". The actual file only changes when an administrator copies the
// approved list out (below) and commits it themselves, same as any other
// edit to a file the site ships.

function adminBytesShort(n) {
	if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(2) + " MB"
	if (n >= 1024) return (n / 1024).toFixed(0) + " KB"
	return n + " B"
}

// A best-effort suggestion, not a rule: title-cases each word, except one
// that's already all-caps (more than one letter) in what the submitter
// typed, on the assumption they meant it as an acronym - "NASA" stays "NASA",
// "the" becomes "The". Shown as an editable field precisely because this
// guess is sometimes wrong - a real acronym typed in lowercase, or a proper
// noun with its own internal capital - and this file is read by every
// visitor's browser, so a human confirms every row before it counts as
// approved.
function adminSuggestCapitalization(phrase) {
	return String(phrase || "").split(" ").map(function (word) {
		if (word === "") return word
		var letters = word.replace(/[^a-zA-Z]/g, "")
		if (letters.length > 1 && letters === letters.toUpperCase()) return word
		return word.split("-").map(function (part) {
			return part === "" ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
		}).join("-")
	}).join(" ")
}

function adminSetPhraseFilter(s) { adminPhraseStatusFilter = s; adminRender() }
function adminSetPhraseSort(s)   { adminPhraseSort = s; adminRender() }

function adminRenderPhraseQueue(host) {
	var tok = adminSeq
	adminPhraseQueue(adminPhraseStatusFilter, adminPhraseSort).then(function (rows) {
		var o = '<div class="adminBar">'
		o += '<span class="adminBarLab">Status</span>'
		;["pending", "approved", "rejected", "exported", "all"].forEach(function (s) {
			o += '<button class="adminChip' + (adminPhraseStatusFilter === s ? ' adminChipOn' : '') +
				'" onclick="adminSetPhraseFilter(&quot;' + s + '&quot;)">' + s + '</button>'
		})
		o += '<span class="adminBarLab adminBarRight">Sort</span>'
		;[
			["recent",    "Most recent interaction"],
			["total",     "Total reactions"],
			["evergreen", "Most 💚 loved"],
			["trending",  "Most 🔥 trending news"],
			["funny",     "Most 😂 funny"],
			["ccru",      "Most 📖 CCRU"]
		].forEach(function (p) {
			o += '<button class="adminChip' + (adminPhraseSort === p[0] ? ' adminChipOn' : '') +
				'" onclick="adminSetPhraseSort(&quot;' + p[0] + '&quot;)">' + p[1] + '</button>'
		})
		o += '</div>'

		// The confusion this heads off: "I clicked Approve, why isn't it in
		// the database yet" - Approve only marks a row as belonging in
		// db.txt, it does not touch the file. Shown on every filter tab
		// (not just "approved"), since a first-time admin sees this the
		// moment they click Approve on a pending row, not later once they
		// happen to switch to the approved tab and find the Export button.
		o += '<div class="adminNote">Approve marks a phrase as belonging in db.txt - it does not add it to the file. '
		o += 'Once you have approved everything you want, switch to the <b>approved</b> tab above, '
		o += 'Export the list, paste it into db.txt, commit and deploy, then mark them exported.</div>'

		if (adminPhraseStatusFilter === "approved" && rows.length) {
			o += '<div class="adminBar"><button class="adminBtn" onclick="adminExportApproved()">' +
				'&#128203; Export all ' + rows.length + ' approved phrase' + (rows.length === 1 ? '' : 's') + '</button>' +
				'<span class="adminDim">Paste into db.txt, commit, deploy - then mark them exported.</span></div>'
			o += '<div id="adminExportBox"></div>'
		}

		if (!rows.length) { adminWrite(host, o + '<div class="adminNote">Nothing here.</div>', tok); return }

		o += '<table class="adminTable"><thead><tr>'
		o += '<th>Phrase</th><th>By</th><th title="Loved / Trending News / Funny / CCRU / combined">💚 🔥 😂 📖 Σ</th>'
		o += '<th>First / last reaction</th>'
		o += '<th>Suggested / final text</th><th>Status</th><th></th>'
		o += '</tr></thead><tbody>'
		for (var i = 0; i < rows.length; i++) o += adminPhraseRow(rows[i])
		o += '</tbody></table>'
		adminWrite(host, o, tok)
	}).catch(function (err) { adminWrite(host, adminError(err), tok) })
}

function adminPhraseRow(r) {
	var fieldId = "adminPhraseText-" + r.id
	var suggestion = r.final_text || adminSuggestCapitalization(r.phrase)
	var o = '<tr>'
	o += '<td class="adminPhraseCell">' + adminEsc(r.phrase)
	if (r.cipher) o += '<div class="adminDim">' + adminEsc(r.cipher) + (r.value !== null ? ' = ' + r.value : '') + '</div>'
	o += '</td>'
	o += '<td class="adminDim">' + adminEsc(r.contributor_name) + '</td>'
	o += '<td class="adminDim" title="Loved ' + (r.heart_count || 0) + ' &middot; Trending News ' + (r.like_count || 0) + ' &middot; Funny ' + (r.laugh_count || 0) + ' &middot; CCRU ' + (r.ccru_count || 0) + '">'
	o += (r.heart_count || 0) + ' 💚&nbsp; ' + (r.like_count || 0) + ' 🔥&nbsp; ' + (r.laugh_count || 0) + ' 😂&nbsp; ' + (r.ccru_count || 0) + ' 📖&nbsp; &middot; Σ ' + (r.total_count || 0)
	o += '</td>'
	o += '<td class="adminDim">' + adminWhen(r.first_reaction_at) + ' &middot; ' + adminWhen(r.last_reaction_at) + '</td>'
	o += '<td><input type="text" class="adminSearch" id="' + fieldId + '" value="' + adminEsc(suggestion) + '"' +
		(r.status === 'pending' || r.status === 'approved' ? '' : ' disabled') + '></td>'
	o += '<td><span class="adminPill adminPill-' + adminEsc(r.status) + '">' + adminEsc(r.status) + '</span>'
	if (r.reviewed_by_name) o += '<div class="adminDim">' + adminEsc(r.reviewed_by_name) + ' &middot; ' + adminWhen(r.reviewed_at) + '</div>'
	o += '</td>'
	o += '<td class="adminActions">'
	if (r.status === 'pending' || r.status === 'rejected') {
		o += '<button class="adminBtn adminBtnGood" onclick="adminPhraseAct(&quot;' + r.id + '&quot;,&quot;approved&quot;,&quot;' + fieldId + '&quot;)">Approve</button>'
	}
	if (r.status === 'pending' || r.status === 'approved') {
		o += '<button class="adminBtn adminBtnBad" onclick="adminPhraseAct(&quot;' + r.id + '&quot;,&quot;rejected&quot;,&quot;' + fieldId + '&quot;)">Reject</button>'
	}
	o += '</td></tr>'
	return o
}

function adminPhraseAct(id, decision, fieldId) {
	var box = document.getElementById(fieldId)
	var text = box !== null ? box.value.trim() : null
	adminPhraseDecide(id, decision, text || null).then(function () {
		adminNotify("Marked " + decision + ".")
		adminRender()
	}).catch(function (err) { adminNotify(err.message || "That did not work", true) })
}

// Builds the list (one phrase per line, alphabetical, matching db.txt's own
// convention) into an on-page textarea rather than a browser dialog -
// window.confirm/prompt are suppressed in ordinary use (see profileArmedBtn
// in profile-tab.js for the same reasoning), so a flow that depended on one
// answering could silently do nothing. "Copy" and "mark exported" are two
// separate, explicit buttons for the same reason a delete button here is
// armed rather than confirmed: nothing happens on this list without a second,
// deliberate click.
function adminExportApproved() {
	var box = document.getElementById("adminExportBox")
	if (box === null) return
	box.innerHTML = '<div class="adminLoading">Loading…</div>'
	adminPhraseQueue("approved").then(function (rows) {
		if (!rows.length) { box.innerHTML = '<div class="adminNote">Nothing approved to export.</div>'; return }
		var lines = rows.map(function (r) { return r.final_text || adminSuggestCapitalization(r.phrase) })
			.sort(function (a, b) { return a.localeCompare(b, undefined, { sensitivity: "base" }) })
		var text = lines.join("\n")
		var ids = rows.map(function (r) { return r.id })

		var o = '<div class="adminCard"><div class="adminCardHead">' + rows.length + ' phrase' + (rows.length === 1 ? '' : 's') + ' ready</div>'
		o += '<textarea class="adminExportArea" id="adminExportText" readonly>' + adminEsc(text) + '</textarea>'
		o += '<div class="adminBar">'
		o += '<button class="adminBtn" onclick="adminCopyExportBox()">&#128203; Copy to clipboard</button>'
		o += '<button class="adminBtn" onclick="adminMarkExported(this,' + adminEsc(JSON.stringify(ids)) + ')">Mark all as exported</button>'
		o += '</div>'
		o += '<div class="adminNote">Copy, paste into db.txt, commit and deploy - then come back and mark them exported so they drop off this list.</div>'
		o += '</div>'
		box.innerHTML = o
	}).catch(function (err) { box.innerHTML = adminError(err) })
}

function adminCopyExportBox() {
	var area = document.getElementById("adminExportText")
	if (area === null) return
	area.focus()
	area.select()
	if (navigator.clipboard && navigator.clipboard.writeText) {
		navigator.clipboard.writeText(area.value)
			.then(function () { adminNotify("Copied."); })
			.catch(function () { adminNotify("Could not copy automatically - it's selected, so Ctrl/Cmd+C will still work.", true) })
	} else {
		adminNotify("Text selected - Ctrl/Cmd+C to copy.")
	}
}

// Same arm-then-confirm pattern as the destructive user actions above
// (adminConfirm) - this cannot be undone from here, since it just marks rows
// exported without touching db.txt itself.
function adminMarkExported(btn, ids) {
	if (!adminConfirm(btn, "Confirm?")) return
	Promise.all(ids.map(function (id) { return adminPhraseDecide(id, "exported", null) }))
		.then(function () { adminNotify("Marked as exported."); adminRender() })
		.catch(function (err) { adminDisarm(); adminNotify(err.message || "Could not update", true) })
}



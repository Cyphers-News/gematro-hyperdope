// ======================= Chat client =======================
//
// The filter in here is a courtesy, not a control. It exists so an obvious
// rejection is instant and free rather than a round trip, and so the sender is
// told before they press send. Everything it does, chat_send() does again on
// the server, where it cannot be skipped. If the two ever disagree, the server
// is right and this is a bug.
//
// Nothing here is allowed to be the only place a rule lives.

function chatClient() {
	var c = (typeof getAuthClient === "function") ? getAuthClient() : null
	if (c === null || typeof authUser === "undefined" || authUser === null) return null
	return c
}

function chatRpc(name, args) {
	var c = chatClient()
	if (c === null) return Promise.reject(new Error("Not signed in"))
	return c.rpc(name, args || {}).then(function (res) {
		if (res.error) throw friendsError(res.error) // same "run the migration" handling
		return res.data
	}, function (err) { throw friendsError(err) })
}

// ---- reading ----------------------------------------------------------

function chatThreads(archived)    { return chatRpc("chat_threads", { include_archived: !!archived }).then(function (r) { return r || [] }) }
function chatArchive(id, on)      { return chatRpc("chat_archive", { target: id, on_off: on !== false }) }
// Clears your side only. The other person keeps theirs, and anything already
// attached to a report keeps its copy - deleting for both would let anyone
// erase the evidence of what they just said.
function chatClear(id)            { return chatRpc("chat_clear", { target: id }) }
function chatHistory(id, limit)   { return chatRpc("chat_history", { target: id, lim: limit || 100 }).then(function (r) { return (r || []).reverse() }) }
function chatMarkRead(id)         { return chatRpc("chat_mark_read", { target: id }) }
function chatUnreadTotal()        { return chatRpc("chat_unread_total") }

// ---- sending ----------------------------------------------------------

var CHAT_MAX_LEN = 500

function chatSend(target, body, replyTo) {
	var pre = chatPrecheck(body)
	if (!pre.ok) return Promise.reject(new Error(pre.why))
	return chatRpc("chat_send", { target: target, body: body, reply_to: replyTo || null })
}

// ---- blocking and reporting -------------------------------------------

function chatBlock(id)               { return chatRpc("member_block", { target: id }) }
function chatUnblock(id)             { return chatRpc("member_unblock", { target: id }) }
function chatBlockedList()           { return chatRpc("member_blocked_list").then(function (r) { return r || [] }) }
function chatReport(id, reason, det, messageId, action) {
	return chatRpc("member_report", {
		target: id, reason: reason, detail: det || null,
		message: messageId || null, action: action || "review"
	})
}

// The list the report dialog offers. Kept here so the wording is in one place
// and the values match the check constraint on reports.action_requested.
var CHAT_REPORT_REASONS = [
	["spam",          "\uD83D\uDEAB Spam"],
	["harassment",    "\uD83E\uDD2C Harassment"],
	["hate",          "\u26A0\uFE0F Hate speech"],
	["inappropriate", "\uD83D\uDC76 Inappropriate content"],
	["scam",          "\uD83C\uDFA3 Scam or phishing"],
	["advertising",   "\uD83D\uDCE2 Advertising"],
	["other",         "\u2753 Something else"]
]

var CHAT_REPORT_ACTIONS = [
	["review",      "Just review it"],
	["warn",        "Warn them"],
	["investigate", "Look at the whole conversation"],
	["other",       "Something else (say below)"]
]

// ---- the local pre-check ----------------------------------------------
//
// A deliberately small subset of the server rules: the shapes, which are the
// ones a person can trip by accident and would rather be told about while they
// are still typing. Vocabulary is left to the server - shipping the word list
// to the browser would publish the filter, and knowing it exactly is most of
// the work of getting round it.

// Ordered the same way mod_check orders its categories - personal details
// before links - so that "joe@example.com" is reported as an email address
// rather than as a link. Both refuse it either way; the two just have to give
// the same reason, or the server contradicting this one looks like a bug.
var chatShapeRules = [
	{ re: /[a-z0-9._%+-]+\s*(@|\(at\)|\[at\])\s*[a-z0-9.-]+\s*(\.|\(dot\)|\[dot\])\s*[a-z]{2,}/i, why: "email addresses are not allowed" },
	{ re: /(\+?\d[\s().-]?){9,}/,                  why: "phone numbers are not allowed" },
	{ re: /\b0\d{3}[\s-]?\d{6,7}\b/,               why: "phone numbers are not allowed" },
	{ re: /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/, why: "postcodes are not allowed" },
	{ re: /\b\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}\b/, why: "coordinates are not allowed" },
	{ re: /https?:\/\//i,                          why: "links are not allowed" },
	{ re: /www\.[a-z0-9-]+/i,                      why: "links are not allowed" },
	{ re: /[a-z0-9-]+\.(com|net|org|co\.uk|io|me|gg|ly|xyz|info|biz|tv|link|site|app)\b/i, why: "links are not allowed" },
	{ re: /<[a-z/][^>]*>/i,                        why: "HTML is not allowed" }
]

function chatPrecheck(body) {
	var text = String(body === undefined || body === null ? "" : body)
	var trimmed = text.trim()

	if (trimmed.length === 0) return { ok: false, why: "Nothing to send" }
	if (trimmed.length > CHAT_MAX_LEN) {
		return { ok: false, why: "Too long — " + CHAT_MAX_LEN + " characters at most" }
	}
	for (var i = 0; i < chatShapeRules.length; i++) {
		if (chatShapeRules[i].re.test(text)) {
			return { ok: false, why: "Message not sent — " + chatShapeRules[i].why }
		}
	}
	return { ok: true, why: null }
}

// ---- rendering as plain text ------------------------------------------
//
// Every message is escaped and then only line breaks are put back. No markdown
// is parsed, no link is made clickable, no image is embedded. A message that
// says "<b>hi</b>" reads as those characters, which is the whole of the
// "plain text only" rule on the display side.
//
// Emoji need nothing: they are ordinary characters and survive escaping.

function chatRenderBody(body) {
	return authEsc(String(body === null || body === undefined ? "" : body))
		.replace(/\r\n|\r|\n/g, "<br>")
}

// ---- unread badge -----------------------------------------------------

var chatUnreadCache = { at: 0, n: 0 }
var CHAT_UNREAD_TTL = 15000

function chatUnreadCached(force) {
	var now = Date.now()
	if (!force && (now - chatUnreadCache.at) < CHAT_UNREAD_TTL) return Promise.resolve(chatUnreadCache.n)
	return chatUnreadTotal().then(function (n) {
		chatUnreadCache = { at: Date.now(), n: Number(n) || 0 }
		return chatUnreadCache.n
	}).catch(function () { return chatUnreadCache.n })
}

function chatUnreadInvalidate() { chatUnreadCache = { at: 0, n: 0 } }

// ---- deleting your own message -----------------------------------------
//
// A direct delete, not an RPC: messages_delete_own (20260806010000_chat.sql)
// already restricts this to the sender's own row, and the DELETE grant that
// finally made that policy usable landed in
// 20260820120000_security_audit_fixes.sql. Unlike the forum's equivalent
// there is no counter to keep in step, so there is nothing for a function
// to do that the policy does not already do.
//
// Deleting takes the message's reactions with it (message_reactions'
// foreign key cascades) and clears the reply pointer on anything that
// answered it (messages.reply_to is "on delete set null"), so a reply
// survives showing "Original message unavailable" rather than vanishing.
// Reports keep their own snapshot on purpose.

function chatMessageDelete(messageId) {
	var client = chatClient()
	if (client === null) return Promise.reject(new Error("Not signed in"))
	return client.from("messages").delete()
		.eq("id", messageId).eq("sender_id", authUser.id)
		.then(function (res) { if (res.error) throw friendsError(res.error); return true })
}

// ---- message reactions -------------------------------------------------
//
// Same shape as forumMessageReact/forumMessageUnreact (auth/forum.js) and
// phraseReact before it - direct table writes, no RPC layer, because
// there is no business logic to a reaction beyond "does this row exist".
//
// What is NOT the same is who may read them. The forum's equivalent is
// world-readable to signed-in members because the forum is public; these
// hang off private conversations, so message_reactions' policies (and
// message_reaction_counts itself) are scoped to conversation membership.
// See 20260820170000_chat_message_reactions.sql. Nothing on this side
// enforces that - the database does, which is the point.

function chatMessageReact(messageId, reactionType) {
	var client = chatClient()
	if (client === null) return Promise.reject(new Error("Not signed in"))
	return client.from("message_reactions")
		.insert({ message_id: messageId, user_id: authUser.id, reaction: reactionType })
		// 23505 is the unique index doing its job - already reacted, not a failure
		.then(function (res) { if (res.error && res.error.code !== "23505") throw friendsError(res.error); return true })
}

function chatMessageUnreact(messageId, reactionType) {
	var client = chatClient()
	if (client === null) return Promise.reject(new Error("Not signed in"))
	return client.from("message_reactions").delete()
		.eq("message_id", messageId).eq("user_id", authUser.id).eq("reaction", reactionType)
		.then(function (res) { if (res.error) throw friendsError(res.error); return true })
}

// Folded into the same {heart,like,laugh,ccru,mine:{...}} shape
// phraseReactionCounts and forumMessageReactionCounts already return, so
// the shared reaction component renders chat messages unmodified.
function chatMessageReactionCounts(messageIds) {
	if (!messageIds || !messageIds.length) return Promise.resolve({})
	return chatRpc("message_reaction_counts", { ids: messageIds }).then(function (rows) {
		var out = {}
		;(rows || []).forEach(function (r) {
			var c = out[r.message_id] || { heart: 0, like: 0, laugh: 0, ccru: 0, mine: {} }
			c[r.reaction] = r.cnt
			if (r.mine) c.mine[r.reaction] = true
			out[r.message_id] = c
		})
		return out
	})
}

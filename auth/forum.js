// ======================= Forum client =======================
//
// Every write goes through forum_topic_create()/forum_post() (chat.js's own
// comment applies here too): the moderation pass on the server is the rule,
// this file is only there to fail fast and cheap before a round trip.

function forumClient() {
	var c = (typeof getAuthClient === "function") ? getAuthClient() : null
	if (c === null || typeof authUser === "undefined" || authUser === null) return null
	return c
}

// friendsError()/chatRpc's own version both say "run the friends migration",
// which is wrong here - the forum has its own migration, unrelated to
// friends or chat.
function forumError(err) {
	var msg = (err && err.message) ? String(err.message) : "Something went wrong"
	if (/does not exist|schema cache|PGRST202/i.test(msg)) {
		return new Error("The forum is not set up on this database yet — run its migration.")
	}
	// A raw Postgres error (constraint, RLS denial, type error) names real
	// schema - not something to put in front of a member.
	if (typeof authIsRawDbError === "function" && authIsRawDbError(msg)) {
		if (typeof authDebugError === "function") authDebugError("forum", msg)
		return new Error("Something went wrong — try again.")
	}
	return new Error(msg.replace(/^.*?:\s*/, "").trim() || "Something went wrong")
}

function forumRpc(name, args) {
	var c = forumClient()
	if (c === null) return Promise.reject(new Error("Not signed in"))
	return c.rpc(name, args || {}).then(function (res) {
		if (res.error) throw forumError(res.error)
		return res.data
	}, function (err) { throw forumError(err) })
}

// ---- reading ------------------------------------------------------------

function forumTopicsList(limit) { return forumRpc("forum_topics_list", { lim: limit || 50 }).then(function (r) { return r || [] }) }
function forumActivityStats() {
	return forumRpc("forum_activity_stats").then(function (r) {
		var row = (r && r[0]) || {}
		return { active_topics: row.active_topics || 0, replies_today: row.replies_today || 0 }
	}).catch(function () { return { active_topics: 0, replies_today: 0 } })
}
function forumMessagesList(topicId, limit) { return forumRpc("forum_messages_list", { topic_id: topicId, lim: limit || 200 }).then(function (r) { return r || [] }) }

// ---- writing --------------------------------------------------------------

var FORUM_TITLE_MAX = 120
var FORUM_DESC_MAX = 500
var FORUM_POST_MAX = 500

function forumTopicCreate(title, description) {
	var t = String(title || "").trim()
	if (!t) return Promise.reject(new Error("A topic needs a title"))
	if (t.length > FORUM_TITLE_MAX) return Promise.reject(new Error("Title is too long — " + FORUM_TITLE_MAX + " characters at most"))
	return forumRpc("forum_topic_create", { title: t, description: (description || "").trim() || null })
}

function forumPost(topicId, body, replyTo, mentionIds) {
	var b = String(body || "").trim()
	if (!b) return Promise.reject(new Error("Nothing to post"))
	if (b.length > FORUM_POST_MAX) return Promise.reject(new Error("Too long — " + FORUM_POST_MAX + " characters at most"))
	return forumRpc("forum_post", { topic_id: topicId, body: b, reply_to: replyTo || null, mentions: (mentionIds && mentionIds.length) ? mentionIds : null })
}

// Deleting your own post. An RPC rather than a direct delete because
// forum_topics.message_count has to come down in the same transaction -
// see 20260820180000_forum_message_delete.sql. Ownership is enforced
// there, not here.
function forumMessageDelete(messageId) {
	return forumRpc("forum_message_delete", { target: messageId })
}

// ---- follow / unfollow a topic ------------------------------------------
//
// Direct upsert, same self-row shape as forumTopicMarkRead - explicit
// follow state lives on the same forum_topic_reads row. last_read_at is
// deliberately left out of this payload: a Follow click from the topic
// list (never opened) should not falsely mark it as read - Postgres only
// updates the columns actually sent on conflict, so last_read_at keeps
// whatever it already was (or takes its own column default on first insert).
function forumTopicSetFollow(topicId, on) {
	var c = forumClient()
	if (c === null) return Promise.reject(new Error("Not signed in"))
	return c.from("forum_topic_reads")
		.upsert({ user_id: authUser.id, topic_id: topicId, following: on }, { onConflict: "user_id,topic_id" })
		.then(function (res) { if (res.error) throw forumError(res.error); return true })
}

// ---- reporting a topic ---------------------------------------------------
//
// Same member_report() RPC chat reporting already uses, extended with
// forum_topic/forum_message params - reporting a thread reports its
// creator (targetUserId), with the topic attached so an admin sees it in
// context, the same way a chat report snapshots the message it came from.
function forumReport(targetUserId, reason, detail, topicId, messageId, action) {
	return forumRpc("member_report", {
		target: targetUserId, reason: reason, detail: detail || null,
		message: null, action: action || "review",
		forum_topic: topicId || null, forum_message: messageId || null
	})
}

// ---- message reactions -----------------------------------------------
//
// Direct table writes, same as phraseReact/phraseUnreact (auth/profile-
// features.js) - self-row RLS on forum_message_reactions makes an RPC layer
// unnecessary, there is no business logic to a reaction beyond "does this
// row exist".

function forumMessageReact(messageId, reactionType) {
	var client = forumClient()
	if (client === null) return Promise.reject(new Error("Not signed in"))
	return client.from("forum_message_reactions")
		.insert({ message_id: messageId, user_id: authUser.id, reaction: reactionType })
		.then(function (res) { if (res.error && res.error.code !== "23505") throw forumError(res.error); return true })
}

function forumMessageUnreact(messageId, reactionType) {
	var client = forumClient()
	if (client === null) return Promise.reject(new Error("Not signed in"))
	return client.from("forum_message_reactions").delete()
		.eq("message_id", messageId).eq("user_id", authUser.id).eq("reaction", reactionType)
		.then(function (res) { if (res.error) throw forumError(res.error); return true })
}

// One row per (message, reaction) with its count and whether the caller
// cast it - folded client-side into the same {heart,like,laugh,ccru,
// mine:{...}} shape phraseReactionCounts already returns per phrase, so
// profileChipReactionsHtml and friends render forum reactions unmodified.
function forumMessageReactionCounts(messageIds) {
	if (!messageIds || !messageIds.length) return Promise.resolve({})
	return forumRpc("forum_message_reaction_counts", { ids: messageIds }).then(function (rows) {
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

// ---- read tracking (the [NEW] indicator) -------------------------------
//
// Direct upsert, same self-row shape as tour-sync.js - opening a topic (and
// each poll tick while it stays open) marks it read up to now. This table
// also doubles as "who is following this topic" for @here (forum_post,
// server side) - marking read is exactly the signal "I am paying attention
// to this one".
function forumTopicMarkRead(topicId) {
	var client = forumClient()
	if (client === null) return Promise.resolve(null)
	return client.from("forum_topic_reads")
		.upsert({ user_id: authUser.id, topic_id: topicId, last_read_at: new Date().toISOString() }, { onConflict: "user_id,topic_id" })
		.then(function (res) { if (res.error) throw forumError(res.error); return true })
		.catch(function () { return null })
}

// ---- notifications (new topics, @here mentions) ------------------------

function forumNotifUnreadCount() {
	var client = forumClient()
	if (client === null) return Promise.resolve(0)
	return forumRpc("forum_notif_unread_count").then(function (n) { return Number(n) || 0 }).catch(function () { return 0 })
}

function forumNotificationsList(limit) {
	return forumRpc("forum_notifications_list", { lim: limit || 30 }).then(function (r) { return r || [] })
}

function forumNotifMarkRead(id) {
	return forumRpc("forum_notif_mark_read", { target: id })
}

function forumNotifMarkAllRead() {
	return forumRpc("forum_notif_mark_all_read")
}

var forumNotifCache = { at: 0, n: 0 }
var FORUM_NOTIF_TTL = 15000

function forumNotifCountCached(force) {
	var now = Date.now()
	if (!force && (now - forumNotifCache.at) < FORUM_NOTIF_TTL) return Promise.resolve(forumNotifCache.n)
	return forumNotifUnreadCount().then(function (n) {
		forumNotifCache = { at: Date.now(), n: n }
		return forumNotifCache.n
	}).catch(function () { return forumNotifCache.n })
}

function forumNotifInvalidate() { forumNotifCache = { at: 0, n: 0 } }

// ---- the "Global Forum Notifications" toggle (Account) -------------------
//
// A read/write pair of its own rather than folding forum_notifications into
// FRIENDS_PRIVACY_KEYS (auth/friends.js): that list is select()ed as one
// comma-joined query, and one missing column fails the whole thing, not
// just the field that doesn't exist yet - which would break every other
// privacy setting on the Account tab until this migration specifically has
// run, for a column those settings have nothing to do with. Isolated here,
// a missing column only ever affects this one toggle (defaults to on,
// matching the migration's own column default).
function forumNotifSettingGet() {
	var c = forumClient()
	if (c === null) return Promise.resolve(true)
	return c.from("profiles").select("forum_notifications").eq("id", authUser.id).maybeSingle()
		.then(function (res) {
			if (res.error || !res.data) return true
			return res.data.forum_notifications !== false
		}).catch(function () { return true })
}

function forumNotifSettingSet(on) {
	var c = forumClient()
	if (c === null) return Promise.reject(new Error("Not signed in"))
	return c.from("profiles").update({ forum_notifications: on }).eq("id", authUser.id)
		.then(function (res) { if (res.error) throw forumError(res.error); return true })
}

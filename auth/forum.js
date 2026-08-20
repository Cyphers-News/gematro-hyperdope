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

function forumPost(topicId, body) {
	var b = String(body || "").trim()
	if (!b) return Promise.reject(new Error("Nothing to post"))
	if (b.length > FORUM_POST_MAX) return Promise.reject(new Error("Too long — " + FORUM_POST_MAX + " characters at most"))
	return forumRpc("forum_post", { topic_id: topicId, body: b })
}

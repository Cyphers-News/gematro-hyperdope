// ======================= Forum tab =======================
//
// A topic list and, inside one, a message log + compose box - closer to
// chat's own shape (frRenderChatWindow, calc/friends-tab.js) than to a
// feed, since a topic is somewhere you stay and reply, not a stream you
// scroll past. Reuses chatRenderBody/frWhen/chatShapeRules from chat/friends
// rather than a second copy of the same escaping and precheck rules.

var forumOpenTopic = null   // a topic id when a thread is open, else null
var forumPollTimer = null
var forumComposingTopic = false

function frRenderForum(tok) {
	if (forumOpenTopic !== null) { frRenderForumThread(forumOpenTopic, tok); return }
	frRenderForumTopics(tok)
}

function frRenderForumTopics(tok) {
	frBody('<div class="profileLoading">Loading…</div>', tok)
	forumTopicsList(50).then(function (rows) {
		var o = '<div class="frForumHead">'
		o += '<span class="frForumHeadNote">Open to every member &mdash; anyone signed in can read and reply.</span>'
		o += '<button class="profileMiniBtn" onclick="frForumToggleCompose()">' + (forumComposingTopic ? 'Cancel' : '+ New topic') + '</button>'
		o += '</div>'

		if (forumComposingTopic) o += frForumComposeTopicHtml()

		if (!rows.length) {
			o += '<div class="profileNote">Nothing here yet. Start the first topic.</div>'
			frBody(o, tok); return
		}
		o += '<div class="profileList">'
		rows.forEach(function (t) { o += frForumTopicRowHtml(t) })
		o += '</div>'
		frBody(o, tok)
	}).catch(function (err) { frBody(profileErr(err), tok) })
}

function frForumTopicRowHtml(t) {
	var o = '<div class="profileRow frRow frRowClick" onclick="frForumOpenTopic(&quot;' + t.id + '&quot;)">'
	o += '<span class="frWho"><span class="frThreadTop">'
	o += '<span class="frThreadName">' + authEsc(t.title) + '</span>'
	o += '<span class="frThreadTime">' + frWhen(t.last_message_at) + '</span>'
	o += '</span>'
	if (t.description) o += '<span class="frSub frPreview">' + authEsc(t.description) + '</span>'
	o += '<span class="frSub">Started by ' + authEsc(t.creator_name) + ' &middot; ' + t.message_count + (t.message_count === 1 ? ' reply' : ' replies') + '</span>'
	o += '</span>'
	o += '</div>'
	return o
}

function frForumToggleCompose() {
	forumComposingTopic = !forumComposingTopic
	renderProfileFriends()
}

function frForumComposeTopicHtml() {
	var o = '<div class="frForumCompose">'
	o += '<input type="text" id="frForumTitleBox" class="frSelect" maxlength="' + FORUM_TITLE_MAX + '" placeholder="What do you want to discuss?">'
	o += '<textarea id="frForumDescBox" class="frChatBox" rows="2" maxlength="' + FORUM_DESC_MAX + '" placeholder="Say a bit more about it (optional)"></textarea>'
	o += '<div class="frForumComposeRow">'
	o += '<button class="profileMiniBtn" onclick="frForumCreateTopic()">Start topic</button>'
	o += '<span id="frForumComposeWarn" class="frChatWarn"></span>'
	o += '</div></div>'
	return o
}

function frForumCreateTopic() {
	var titleBox = document.getElementById("frForumTitleBox")
	var descBox = document.getElementById("frForumDescBox")
	var warn = document.getElementById("frForumComposeWarn")
	if (titleBox === null) return
	forumTopicCreate(titleBox.value, descBox ? descBox.value : "").then(function (id) {
		forumComposingTopic = false
		frForumOpenTopic(id)
	}).catch(function (err) {
		if (warn !== null) { warn.textContent = err.message || "Could not create that topic"; warn.className = "frChatWarn frChatWarnBad" }
	})
}

function frForumOpenTopic(id) {
	forumOpenTopic = id
	renderProfileFriends()
}

function frForumCloseTopic() {
	forumOpenTopic = null
	forumStopPoll()
	renderProfileFriends()
}

function frRenderForumThread(id, tok) {
	profileBody('<div class="profileLoading">Loading…</div>', tok)
	Promise.all([forumTopicsList(50), forumMessagesList(id, 200)]).then(function (both) {
		var topic = both[0].filter(function (t) { return t.id === id })[0]
		var msgs = both[1]
		var o = '<div class="frChatHead">'
		o += '<button class="profileMiniBtn" onclick="frForumCloseTopic()">&larr; Back</button>'
		o += '<span class="frChatWho">' + authEsc(topic ? topic.title : "Topic") + '</span>'
		o += '</div>'
		if (topic && topic.description) o += '<div class="profileNote">' + authEsc(topic.description) + '</div>'

		o += '<div id="frChatLog" class="frChatLog">' + frForumLogHtml(msgs) + '</div>'

		o += '<div class="frChatCompose">'
		o += '<textarea id="frForumPostBox" class="frChatBox" rows="2" maxlength="' + FORUM_POST_MAX + '" '
		o += 'placeholder="Add to the discussion…" onkeydown="frForumPostKey(event)"></textarea>'
		o += '<button class="profileMiniBtn frChatSend" id="frForumPostBtn" onclick="frForumSendPost()">Post</button>'
		o += '</div>'
		o += '<div id="frForumPostWarn" class="frChatWarn"></div>'
		o += '<div class="frChatRules">'
		o += '<div class="frChatRule">&#128172; Visible to every member, not just this topic\'s regulars.</div>'
		o += '<div class="frChatRule">&#128274; Links, contact details and personal information are filtered out automatically before a post sends.</div>'
		o += '</div>'

		profileBody(o, tok)
		frChatScrollDown()
		forumStartPoll(id)
	}).catch(function (err) { profileBody(profileErr(err), tok) })
}

function frForumLogHtml(msgs) {
	if (!msgs.length) return '<div class="profileNote">Nothing here yet. Be the first to reply.</div>'
	var o = ''
	for (var i = 0; i < msgs.length; i++) {
		var m = msgs[i]
		o += '<div class="frMsgRow' + (m.mine ? ' frMsgMine' : '') + '">'
		if (!m.mine) o += '<div class="frForumMsgWho">' + authEsc(m.sender_name) + frAdminBadge(m.user_id) + '</div>'
		o += '<div class="frBubble">' + chatRenderBody(m.body) + '</div>'
		o += '<div class="frMsgWhen">' + frWhen(m.created_at) + '</div>'
		o += '</div>'
	}
	return o
}

function frForumPostKey(e) {
	if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); frForumSendPost() }
}

function frForumSendPost() {
	var box = document.getElementById("frForumPostBox")
	var btn = document.getElementById("frForumPostBtn")
	if (box === null || forumOpenTopic === null) return
	var body = box.value
	if (body.trim() === "") return

	btn.disabled = true
	forumPost(forumOpenTopic, body).then(function () {
		box.value = ""
		btn.disabled = false
		return forumMessagesList(forumOpenTopic, 200)
	}).then(function (msgs) {
		var log = document.getElementById("frChatLog")
		if (log !== null) { log.innerHTML = frForumLogHtml(msgs); frChatScrollDown() }
	}).catch(function (err) {
		btn.disabled = false
		var warn = document.getElementById("frForumPostWarn")
		if (warn !== null) { warn.textContent = err.message || "Not posted"; warn.className = "frChatWarn frChatWarnBad" }
	})
}

// Polling, same reasoning as frStartChatPoll: a topic this quiet does not
// justify a socket.
function forumStartPoll(id) {
	forumStopPoll()
	forumPollTimer = setInterval(function () {
		if (forumOpenTopic !== id) { forumStopPoll(); return }
		forumMessagesList(id, 200).then(function (msgs) {
			if (forumOpenTopic !== id) return
			var log = document.getElementById("frChatLog")
			if (log === null) return
			var atBottom = (log.scrollHeight - log.scrollTop - log.clientHeight) < 40
			log.innerHTML = frForumLogHtml(msgs)
			if (atBottom) frChatScrollDown()
		}).catch(function () {})
	}, 6000)
}

function forumStopPoll() {
	if (forumPollTimer !== null) { clearInterval(forumPollTimer); forumPollTimer = null }
}

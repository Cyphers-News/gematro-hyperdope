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

// The last fetch, cached so switching filter tabs (Latest/New/Popular/
// Following) redraws instantly from what is already on hand instead of a
// round trip for the same 50 rows - the filters are all things the already-
// fetched list already carries (unread_count, following, message_count),
// nothing here needs its own query.
var forumAllTopics = []
var forumLastStats = { active_topics: 0, replies_today: 0 }
var forumFilter = "latest"
var FORUM_FILTERS = [["latest", "Latest"], ["new", "New"], ["popular", "Popular"], ["following", "Following"]]

function frRenderForum(tok) {
	if (forumOpenTopic !== null) { frRenderForumThread(forumOpenTopic, tok); return }
	frRenderForumTopics(tok)
}

function frRenderForumTopics(tok) {
	frBody('<div class="profileLoading">Loading…</div>', tok)
	Promise.all([
		forumTopicsList(50),
		(typeof forumActivityStats === "function") ? forumActivityStats() : Promise.resolve({ active_topics: 0, replies_today: 0 })
	]).then(function (both) {
		if (tok !== undefined && tok !== profileRenderSeq) return
		forumAllTopics = both[0]
		forumLastStats = both[1]
		frForumRedrawFeed(tok)
	}).catch(function (err) { frBody(profileErr(err), tok) })
}

// Splits the compose/list body from the fetch above so switching tabs
// (frForumSetFilter) never re-fetches - it only ever changes which of the
// already-fetched rows are shown.
function frForumRedrawFeed(tok) {
	var o = frForumHeaderHtml(forumLastStats)
	o += frForumFilterBarHtml(forumAllTopics)
	if (forumComposingTopic) o += frForumComposeTopicHtml()

	var filtered = frForumApplyFilter(forumAllTopics, forumFilter)
	if (!filtered.length) {
		o += '<div class="profileNote">' + frForumEmptyText(forumFilter) + '</div>'
	} else {
		o += '<div class="frForumFeed">'
		filtered.forEach(function (t) { o += frForumTopicRowHtml(t) })
		o += '</div>'
	}
	frBody(o, tok)
}

function frForumHeaderHtml(stats) {
	var o = '<div class="frForumHead2">'
	o += '<div class="frForumHeadTop">'
	o += '<div class="frForumHeadTitleBlock">'
	o += '<div class="frForumHeadSub">Open to every member &mdash; decode, discuss and reply.</div>'
	o += '</div>'
	o += '<button class="frForumStartBtn" onclick="frForumToggleCompose()">' + (forumComposingTopic ? 'Cancel' : '+ Start a Topic') + '</button>'
	o += '</div>'
	var bits = []
	if (stats.active_topics > 0) bits.push(stats.active_topics + (stats.active_topics === 1 ? ' active topic' : ' active topics'))
	if (stats.replies_today > 0) bits.push(stats.replies_today + (stats.replies_today === 1 ? ' reply today' : ' replies today'))
	if (bits.length) o += '<div class="frForumActivity">' + bits.join(' &middot; ') + '</div>'
	o += '</div>'
	return o
}

function frForumFilterBarHtml(rows) {
	var newCount = rows.filter(function (t) { return (t.unread_count || 0) > 0 }).length
	var o = '<div class="frForumFilterBar">'
	FORUM_FILTERS.forEach(function (f) {
		var label = f[1]
		if (f[0] === "new" && newCount > 0) label += ' (' + newCount + ')'
		o += '<button class="frForumFilterTab' + (forumFilter === f[0] ? ' frForumFilterOn' : '') + '" onclick="frForumSetFilter(&quot;' + f[0] + '&quot;)">' + label + '</button>'
	})
	o += '</div>'
	return o
}

function frForumSetFilter(f) {
	forumFilter = f
	frForumRedrawFeed()
}

// "Latest" is already the server's own order (last_message_at desc, from
// forum_topics_list); New and Following filter that same order rather than
// re-sorting it, so a topic's position among its own kind never jumps
// around just from switching tabs. Popular is the one real re-sort.
function frForumApplyFilter(rows, filter) {
	var out = rows.slice()
	if (filter === "new") out = out.filter(function (t) { return (t.unread_count || 0) > 0 })
	else if (filter === "following") out = out.filter(function (t) { return !!t.following })
	else if (filter === "popular") out.sort(function (a, b) { return (b.message_count || 0) - (a.message_count || 0) })
	return out
}

function frForumEmptyText(filter) {
	if (filter === "new") return "Nothing new right now."
	if (filter === "following") return "You are not following any topics yet &mdash; open one to start."
	return "Nothing here yet. Start the first topic."
}

// Title (large, bold, the reason a member is scanning this list at all)
// with [NEW] beside it, and reply count + creation date + a chevron on the
// right. One line, one click target: opening the topic.
//
// There is deliberately no author here. The creator's name used to sit on
// a second line as its own click target through to their profile, which
// put a small link inside a large row whose whole point is "open this
// topic" - so aiming at the row and hitting the name instead sent you to
// a profile you never asked for. In a list you scan to choose a
// discussion, who started it is not worth that. Author attribution still
// lives where it means something: every message inside the topic carries
// its sender's name, and that name is still a link there.
//
// The opening message's own preview text is likewise not here (see
// frRenderForumThread for where it shows, once a topic is open).
function frForumTopicRowHtml(t) {
	var unread = t.unread_count || 0
	var o = '<div class="frForumRow2' + (unread > 0 ? ' frForumRowUnread' : '') + '" onclick="frForumOpenTopic(&quot;' + t.id + '&quot;)">'
	o += '<div class="frForumRowMain">'
	o += '<div class="frForumRowTitleLine"><span class="frForumRowTitle">' + authEsc(t.title) + '</span>'
	if (unread > 0) o += '<span class="frForumNew">' + (unread > 1 ? 'NEW &middot; ' + unread : 'NEW') + '</span>'
	o += '</div>'
	o += '</div>'
	o += '<div class="frForumRowRight">'
	o += '<span class="frForumRowReplies">&#128172; ' + t.message_count + (t.message_count === 1 ? ' reply' : ' replies') + '</span>'
	// the day the topic was started, not the last reply - a fixed fact
	// about the topic rather than something that shifts under you as
	// people post
	if (t.created_at) {
		o += '<span class="frForumRowDate">' + authEsc(new Date(t.created_at).toLocaleDateString()) + '</span>'
	}
	o += '<span class="frForumRowChevron" aria-hidden="true">&#8250;</span>'
	o += '</div>'
	o += '</div>'
	return o
}

function frForumToggleCompose() {
	forumComposingTopic = !forumComposingTopic
	frForumRedrawFeed()
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
	forumOpenTopicData = null
	forumReplyTo = null
	forumMentionSelected = []
	forumMentionCandidates = []
	forumStopPoll()
	renderProfileFriends()
}

var forumOpenTopicData = null   // the current topic's own row (forum_topics_list shape) - created_by/following, for the header
var forumReplyTo = null         // { id, senderName, snippet } while composing a reply, else null
var forumMentionSelected = []   // [{id, name}, ...] chosen through the @ autocomplete this compose session
var forumMentionCandidates = [] // the autocomplete's current results, else []
var forumMentionTimer = null

function frRenderForumThread(id, tok) {
	profileBody('<div class="profileLoading">Loading…</div>', tok)
	// Cleared here, before the fetch, not inside its .then - a reply armed
	// in the previous thread must not survive into this one, and doing it
	// on the success path only left it armed when a thread failed to load
	// (matching frRenderChatWindow, which already cleared up front).
	forumReplyTo = null
	forumMentionSelected = []
	forumMentionCandidates = []
	Promise.all([forumTopicsList(50), forumMessagesList(id, 200)]).then(function (both) {
		var topic = both[0].filter(function (t) { return t.id === id })[0]
		var msgs = both[1]
		forumOpenTopicData = topic || null
		// Marks read the moment the newest message here has actually been
		// fetched, not just the moment Forum (the list) was opened - clears
		// [NEW] for a topic you open, keeps it for every topic you didn't.
		if (typeof forumTopicMarkRead === "function") forumTopicMarkRead(id)
		return forumMessageReactionCounts(msgs.map(function (m) { return m.id })).then(function (reactions) {
			Object.keys(reactions).forEach(function (mid) { profileContribReactions[mid] = reactions[mid] })
			var o = '<div class="frChatHead">'
			o += '<button class="profileMiniBtn" onclick="frForumCloseTopic()">&larr; Back</button>'
			o += '<span class="frChatWho">' + authEsc(topic ? topic.title : "Topic") + '</span>'
			if (topic) {
				o += frForumFollowBtnHtml(topic.following)
				o += '<button class="profileMiniBtn frForumReportBtn" onclick="frForumReportTopic(this)" title="Report this topic">Report</button>'
			}
			o += '</div>'
			if (topic && topic.description) o += '<div class="profileNote">' + authEsc(topic.description) + '</div>'

			o += '<div id="frChatLog" class="frChatLog">' + frForumLogHtml(msgs) + '</div>'

			o += '<div id="frForumReplyBar"></div>'
			o += '<div class="frChatCompose">'
			o += '<textarea id="frForumPostBox" class="frChatBox" rows="2" maxlength="' + FORUM_POST_MAX + '" '
			o += 'placeholder="Add to the discussion… (@name to mention someone, @here to notify everyone following this topic)" '
			o += 'oninput="forumMentionDetect()" onkeydown="frForumPostKey(event)"></textarea>'
			o += '<button class="profileMiniBtn frChatSend" id="frForumPostBtn" onclick="frForumSendPost()">Post</button>'
			o += '</div>'
			o += '<div id="frForumMentionBox"></div>'
			o += '<div id="frForumPostWarn" class="frChatWarn"></div>'
			o += '<div class="frChatRules">'
			o += '<div class="frChatRule">&#128172; Visible to every member, not just this topic\'s regulars.</div>'
			o += '<div class="frChatRule">&#128274; Links, contact details and personal information are filtered out automatically before a post sends.</div>'
			o += '</div>'

			profileBody(o, tok)
			frChatScrollDown()
			forumStartPoll(id)
		})
	}).catch(function (err) { profileBody(profileErr(err), tok) })
}

function frForumFollowBtnHtml(on) {
	return '<button class="profileMiniBtn frForumFollowBtn' + (on ? ' frForumFollowOn' : '') + '" id="frForumFollowBtn" onclick="frForumToggleFollow()">' + (on ? 'Following' : '+ Follow') + '</button>'
}

// Follow defaults to true the moment a topic is opened (forum_post/
// forumTopicMarkRead both upsert it that way server-side too) - this
// button is for the two cases that need an explicit choice: following one
// you have not opened yet (not reachable from here, see the list), or
// unfollowing one you have read plenty of and no longer want @here pings
// from. Turning it on gets a one-off green pulse (.frForumFollowFlash, same
// restart trick as .findMatchesFlash/.profileReactFlash - remove, force
// reflow, re-add, so clicking it twice in a row still gets its own pulse)
// on top of the green it then stays permanently while following.
function frForumToggleFollow() {
	if (forumOpenTopicData === null || typeof forumTopicSetFollow !== "function") return
	var on = !forumOpenTopicData.following
	var btn = document.getElementById("frForumFollowBtn")
	forumOpenTopicData.following = on
	if (btn !== null) {
		btn.textContent = on ? "Following" : "+ Follow"
		btn.classList.toggle("frForumFollowOn", on)
		if (on) {
			btn.classList.remove("frForumFollowFlash")
			void btn.offsetWidth
			btn.classList.add("frForumFollowFlash")
		}
	}
	forumTopicSetFollow(forumOpenTopicData.id, on).catch(function (err) {
		forumOpenTopicData.following = !on
		if (btn !== null) {
			btn.textContent = !on ? "Following" : "+ Follow"
			btn.classList.toggle("frForumFollowOn", !on)
			btn.classList.remove("frForumFollowFlash")
		}
		displayCalcNotification(err.message || "Could not save", 2400)
	})
}

// Reports the topic's creator, same dialog chat message reports already
// use (frShowReportDialog, calc/friends-tab.js) - frReportForumTopic tells
// frSendReport to call forumReport() instead of chatReport().
// Arm-then-confirm, same two-click pattern frReportMessage's flag icon
// already uses for a chat message - a first click just asks "are you
// sure" (armed, red, "Click again to report"), only a second click while
// still armed opens the actual report dialog (which has its own reason
// dropdown and Cancel/Send step on top of this one).
function frForumReportTopic(el) {
	if (forumOpenTopicData === null || typeof frReportForumTopicPrompt !== "function") return
	if (el.dataset.armed !== "1") {
		el.dataset.armed = "1"
		el.classList.add("frForumReportArmed")
		el.textContent = "Sure?"
		el.title = "Click again to report this topic"
		setTimeout(function () {
			el.dataset.armed = ""
			el.classList.remove("frForumReportArmed")
			el.textContent = "Report"
			el.title = "Report this topic"
		}, 4000)
		return
	}
	el.dataset.armed = ""
	el.classList.remove("frForumReportArmed")
	el.textContent = "Report"
	el.title = "Report this topic"
	frReportForumTopicPrompt(forumOpenTopicData.id, forumOpenTopicData.created_by)
}

function frForumLogHtml(msgs) {
	if (!msgs.length) return '<div class="profileNote">Nothing here yet. Be the first to reply.</div>'
	var byId = {}
	msgs.forEach(function (m) { byId[m.id] = m })
	var o = ''
	for (var i = 0; i < msgs.length; i++) {
		var m = msgs[i]
		o += '<div class="frMsgRow' + (m.mine ? ' frMsgMine' : '') + '" id="frMsg-' + m.id + '">'
		// Named on your own replies too, not just everyone else's - a public
		// board, unlike a two-person chat, is read by people who did not
		// post in it, and "who said this" should not depend on who happens
		// to be logged in reading it right now. The name is its own click
		// target through to their profile (frOpenProfile).
		o += '<div class="frForumMsgWho"><span class="frForumWhoLink" onclick="frOpenProfile(&quot;' + m.user_id + '&quot;)">' + authEsc(m.sender_name) + '</span>' + frAdminBadge(m.user_id)
		if (m.sender_online) o += '<span class="frDot frDotOn" title="Online now"></span>'
		o += '</div>'
		// Shared with Chat - see frReplyQuoteHtml (calc/social-reply.js)
		if (m.reply_to) {
			o += frReplyQuoteHtml(m.reply_to, m.reply_sender_name, m.reply_body, "frMsg-")
		}
		// wrapper so the delete × can anchor to the bubble's own top-right
		// corner rather than the full-width row's - see .frBubbleWrap
		o += '<div class="frBubbleWrap">'
		// your own post only - forum_message_delete() enforces that again on
		// the server, this just does not offer what would be refused
		if (m.mine) o += frMsgDeleteHtml(m.id, "frForumDeleteMessage")
		o += '<div class="frBubble">' + forumRenderBody(m.body, m.mentions) + '</div>'
		o += '</div>'
		// One action bar: the four reactions plus Reply, in that order, all
		// the same height - Reply used to live off on its own next to the
		// timestamp as small hover-only text, which is exactly why it went
		// unnoticed. The timestamp now has its own line underneath instead.
		o += '<div class="frMsgActionBar">'
		o += profileChipReactionsHtml(m.id, "forumToggleReaction", false)
		o += frReplyBtnHtml(m.id, m.sender_name, "frForumStartReply", m.body,
			forumReplyTo !== null && forumReplyTo.id === m.id)
		o += '</div>'
		o += '<div class="frMsgWhen">' + frWhen(m.created_at) + '</div>'
		o += '</div>'
	}
	return o
}

// Jumping to a quoted message is frReplyJumpTo (calc/social-reply.js),
// called by the preview itself - shared with Chat. Note that is a
// different thing from frForumJumpToMessage (calc/friends-tab.js), which
// notification clicks use and which waits for the thread to finish
// loading first; a quoted preview's target is already on screen.
function frForumStartReply(messageId, senderName, snippet) {
	forumReplyTo = { id: messageId, senderName: senderName, snippet: snippet || "" }
	frReplyMarkActive("frMsg-", messageId)
	frForumRenderReplyBar()
	frForumUpdateComposeBtn()
	var box = document.getElementById("frForumPostBox")
	if (box !== null) box.focus()
}

function frForumCancelReply() {
	forumReplyTo = null
	frReplyMarkActive("frMsg-", null)
	frForumRenderReplyBar()
	frForumUpdateComposeBtn()
}

// Shared with Chat - see frReplyBarHtml (calc/social-reply.js). Cancel
// clears only the armed reply, never the compose box.
function frForumRenderReplyBar() {
	var host = document.getElementById("frForumReplyBar")
	if (host === null) return
	if (forumReplyTo === null) { host.innerHTML = ""; return }
	host.innerHTML = frReplyBarHtml(forumReplyTo.senderName, forumReplyTo.snippet, "frForumCancelReply")
}

// Post doubles as Send Reply while a reply is armed, so the one button at
// the bottom of the compose area always says what it is actually about to
// do, rather than always reading "Post" even when replying to something
// specific.
function frForumUpdateComposeBtn() {
	var btn = document.getElementById("frForumPostBtn")
	if (btn !== null) btn.textContent = forumReplyTo ? "Send Reply" : "Post"
}

// chatRenderBody escapes first, then only ever adds <br> back - anything
// added after that on the escaped output is safe from injection as long as
// it doesn't reopen raw angle brackets, which this doesn't: "@here" has no
// HTML metacharacters, so it survives escaping unchanged and \b keeps this
// from also matching "@hereinafter" or "x@here.com".
//
// mentions (from forum_messages_list, one {id,name} per person the compose
// box's autocomplete resolved into this specific message - see
// forumMentionPick) are matched by their own escaped display name rather
// than a generic "@word" regex, since usernames/display names can contain
// spaces or punctuation that a word-boundary match cannot safely bound.
// Each is escaped for both HTML (authEsc, matching how the body itself was
// already escaped by chatRenderBody) and for use inside a RegExp.
function forumRenderBody(body, mentions) {
	var out = chatRenderBody(body).replace(/@here\b/gi, '<span class="forumHereMention">@here</span>')
	if (mentions && mentions.length) {
		mentions.forEach(function (men) {
			if (!men || !men.name) return
			var escName = authEsc(men.name)
			var reSafe = escName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
			var re = new RegExp('@' + reSafe, 'g')
			out = out.replace(re, '<span class="forumHereMention forumUserMention" onclick="frOpenProfile(&quot;' + men.id + '&quot;)" title="See their profile">@' + escName + '</span>')
		})
	}
	return out
}

// ---- @mention autocomplete ------------------------------------------------
//
// No existing floating/caret-tracked popup pattern in this codebase to
// copy (Discover's search and the Cyphers search box both replace an
// inline results panel rather than a positioned dropdown) - this follows
// that same simpler shape: a small results list flows in normal document
// order right under the compose box, rather than a pixel-positioned
// overlay anchored to the text caret.
function forumMentionDetect() {
	var box = document.getElementById("frForumPostBox")
	if (box === null) return
	var pos = box.selectionStart
	var text = box.value.slice(0, pos)
	var m = text.match(/@([^\s@]*)$/)
	if (m === null || m[1].length === 0) { forumMentionClose(); return }
	clearTimeout(forumMentionTimer)
	var query = m[1]
	forumMentionTimer = setTimeout(function () { forumMentionRunSearch(query) }, 220)
}

function forumMentionRunSearch(query) {
	if (typeof friendsSearch !== "function") { forumMentionClose(); return }
	friendsSearch(query, 6).then(function (rows) {
		forumMentionCandidates = rows || []
		frForumRenderMentionBox()
	}).catch(function () { forumMentionCandidates = []; frForumRenderMentionBox() })
}

function frForumRenderMentionBox() {
	var host = document.getElementById("frForumMentionBox")
	if (host === null) return
	if (!forumMentionCandidates.length) { host.innerHTML = ""; return }
	var o = '<div class="frMentionDropdown">'
	forumMentionCandidates.forEach(function (c, i) {
		o += '<div class="frMentionOpt" onclick="forumMentionPick(' + i + ')">' + authEsc(c.display_name) + '</div>'
	})
	o += '</div>'
	host.innerHTML = o
}

function forumMentionClose() {
	forumMentionCandidates = []
	var host = document.getElementById("frForumMentionBox")
	if (host !== null) host.innerHTML = ""
}

// Replaces the "@partial" the member was typing with their full name
// (matching what forumRenderBody will later search for) and remembers
// {id, name} so frForumSendPost can resolve it into an actual notification
// - the id is what the server trusts, never the typed text itself.
function forumMentionPick(i) {
	var c = forumMentionCandidates[i]
	var box = document.getElementById("frForumPostBox")
	if (!c || box === null) return
	var pos = box.selectionStart
	var before = box.value.slice(0, pos).replace(/@([^\s@]*)$/, "@" + c.display_name + " ")
	var after = box.value.slice(pos)
	box.value = before + after
	var newPos = before.length
	box.focus()
	box.setSelectionRange(newPos, newPos)
	if (!forumMentionSelected.some(function (sel) { return sel.id === c.id })) {
		forumMentionSelected.push({ id: c.id, name: c.display_name })
	}
	forumMentionClose()
}

function frForumPostKey(e) {
	if (e.key === "Escape" && forumMentionCandidates.length) { e.preventDefault(); forumMentionClose(); return }
	if (e.key === "Enter" && !e.shiftKey) {
		e.preventDefault()
		if (forumMentionCandidates.length) { forumMentionPick(0); return }
		frForumSendPost()
	}
}

function frForumSendPost() {
	var box = document.getElementById("frForumPostBox")
	var btn = document.getElementById("frForumPostBtn")
	if (box === null || forumOpenTopic === null) return
	var body = box.value
	if (body.trim() === "") return

	// Enter-to-send (frForumPostKey) bypasses the disabled button entirely,
	// so the guard has to be a flag rather than the button's own state.
	if (!frSendBegin("forum")) return

	var replyTo = forumReplyTo ? forumReplyTo.id : null
	var mentionIds = forumMentionSelected.map(function (sel) { return sel.id })
	if (btn !== null) btn.disabled = true
	forumPost(forumOpenTopic, body, replyTo, mentionIds).then(function () {
		box.value = ""
		forumReplyTo = null
		forumMentionSelected = []
		forumMentionClose()
		frReplyMarkActive("frMsg-", null)
		frForumRenderReplyBar()
		frForumUpdateComposeBtn()
		return forumMessagesList(forumOpenTopic, 200)
	}).then(function (msgs) {
		return forumMessageReactionCounts(msgs.map(function (m) { return m.id })).then(function (reactions) {
			Object.keys(reactions).forEach(function (mid) { profileContribReactions[mid] = reactions[mid] })
			var log = document.getElementById("frChatLog")
			if (log !== null) { log.innerHTML = frForumLogHtml(msgs); frChatScrollDown() }
		})
	}).catch(function (err) {
		var warn = document.getElementById("frForumPostWarn")
		if (warn !== null) { warn.textContent = err.message || "Not posted"; warn.className = "frChatWarn frChatWarnBad" }
	}).then(function () {
		// released on both paths - a failed post must leave the composer
		// usable, or one network blip locks it until the page is reloaded
		frSendEnd("forum")
		var b = document.getElementById("frForumPostBtn")
		if (b !== null) b.disabled = false
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
			// A reply that lands while the topic is already open should not
			// still read as unread once you go back to the list.
			if (typeof forumTopicMarkRead === "function") forumTopicMarkRead(id)
			return forumMessageReactionCounts(msgs.map(function (m) { return m.id })).then(function (reactions) {
				if (forumOpenTopic !== id) return
				Object.keys(reactions).forEach(function (mid) { profileContribReactions[mid] = reactions[mid] })
				var log = document.getElementById("frChatLog")
				if (log === null) return
				var atBottom = (log.scrollHeight - log.scrollTop - log.clientHeight) < 40
				log.innerHTML = frForumLogHtml(msgs)
				if (atBottom) frChatScrollDown()
			})
		}).catch(function () {})
	}, 6000)
}

function forumStopPoll() {
	if (forumPollTimer !== null) { clearInterval(forumPollTimer); forumPollTimer = null }
}

// Two-step confirm (profileConfirmClick turns it into "Sure?" first),
// then reload the thread so the message, its reactions and anything that
// quoted it all redraw from the server's answer rather than being
// patched out of the DOM by hand.
function frForumDeleteMessage(btn, messageId) {
	if (!profileConfirmClick(btn)) return
	forumMessageDelete(messageId).then(function () {
		// if the deleted message was the one being replied to, that reply is
		// no longer aimed at anything
		if (forumReplyTo !== null && forumReplyTo.id === messageId) frForumCancelReply()
		renderProfileFriends()
	}).catch(function (err) {
		displayCalcNotification(err.message || "Could not delete that", 2600)
	})
}

// ---- message reactions ---------------------------------------------------
//
// Exact mirror of profileToggleReaction (calc/profile-tab.js) - optimistic
// flip, redraw, save in the background, put it back if that fails - just
// against forum_message_reactions instead of phrase_reactions. Passing
// "forumToggleReaction" back into profileRedrawChipReactions keeps the
// redrawn buttons wired to this function rather than falling back to the
// phrase-reaction default.
function forumToggleReaction(id, type) {
	var c = profileContribReactions[id] || { heart: 0, like: 0, laugh: 0, ccru: 0, mine: {} }
	if (!c.mine) c.mine = {}
	var was = !!c.mine[type]
	var now = !was

	c[type] = Math.max(0, (c[type] || 0) + (now ? 1 : -1))
	c.mine[type] = now
	profileContribReactions[id] = c
	profileRedrawChipReactions(id, "forumToggleReaction", false)
	if (now && typeof profileFlashReaction === "function") profileFlashReaction(id, type)

	var call = now ? forumMessageReact(id, type) : forumMessageUnreact(id, type)
	call.catch(function (err) {
		c[type] = Math.max(0, (c[type] || 0) + (now ? -1 : 1))
		c.mine[type] = was
		profileContribReactions[id] = c
		profileRedrawChipReactions(id, "forumToggleReaction", false)
		displayCalcNotification(err.message || "Could not react", 2400)
	})
}

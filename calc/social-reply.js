// ======================= Shared Social reply UI =======================
//
// One reply component for both Social surfaces: the public Forum
// (calc/forum-tab.js) and private Chat (calc/friends-tab.js). Neither
// builds its own reply markup any more - both call the three builders
// here and pass their own data in.
//
// The point of the split is that Forum and Chat stay functionally
// separate (different tables, different privacy rules, different
// moderation) while replying looks and behaves identically in both. It
// also means the next change to reply styling happens in one place
// rather than two that drift apart.
//
// Three pieces, in the order a member meets them:
//   frReplyBtnHtml    the "↩ REPLY" action under a message
//   frReplyBarHtml    the "Replying to X" strip above the composer
//   frReplyQuoteHtml  the quoted preview above a posted reply
// plus frReplyJumpTo, the scroll-and-pulse both surfaces use when the
// quoted preview is clicked.

// ---- the reply action ---------------------------------------------------
//
// Same button in both surfaces, down to the touch target. Chat used to
// have a small "↩ Reply" text link here, which was the whole reason
// replying went unnoticed there.
//
// startFn is named rather than bound so this stays a plain string of
// HTML, matching how every other row in this app is built - the caller
// passes "frForumStartReply" or "frChatStartReply". The two payload
// arguments are escaped for the JS-string-inside-an-HTML-attribute
// context (authEscJs, auth/auth-ui.js): a display name is member-
// controlled text, and this is exactly the site where escaping for only
// one of those two layers is not enough.
// active marks the message a reply is currently being composed against.
// Rendered into the HTML (rather than only patched in on click) so the
// marker survives the log re-rendering underneath it - both surfaces
// rebuild their log on a poll tick, which would otherwise quietly drop
// it while the member was still typing.
function frReplyBtnHtml(messageId, senderName, startFn, snippet, active) {
	var label = String(senderName === null || senderName === undefined ? "" : senderName)
	return '<button class="frMsgReplyBtn' + (active ? ' frMsgReplyBtnOn' : '') + '" type="button"' +
		' data-replyid="' + messageId + '"' +
		' aria-pressed="' + (active ? 'true' : 'false') + '"' +
		' aria-label="Reply to this message from ' + authEsc(label) + '"' +
		' title="Reply to this message"' +
		' onclick="' + startFn + '(&quot;' + messageId + '&quot;,&quot;' + authEscJs(label) +
		'&quot;,&quot;' + authEscJs(frReplyTrim(snippet, 120)) + '&quot;)">' +
		(active ? FR_REPLY_LABEL_ON : FR_REPLY_LABEL_OFF) + '</button>'
}

var FR_REPLY_LABEL_OFF = "↩ REPLY"
var FR_REPLY_LABEL_ON = "↩ REPLYING"

// Patches the marker in immediately on click, without waiting for the
// next re-render. The label changes as well as the colour: a state shown
// only in green is a state that does not exist for anyone who cannot
// pick that green out.
function frReplyMarkActive(domPrefix, messageId) {
	// Scoped to the calling surface's own messages: Forum and Chat each keep
	// their own armed reply, and arming one must not visually disarm the
	// other's (whose state variable is still set, and which would come back
	// on its next render anyway - leaving the two disagreeing in between).
	var all = document.querySelectorAll("[id^='" + domPrefix + "'] .frMsgReplyBtn")
	for (var i = 0; i < all.length; i++) {
		var btn = all[i]
		var on = (messageId !== null && btn.getAttribute("data-replyid") === messageId)
		btn.classList.toggle("frMsgReplyBtnOn", on)
		btn.setAttribute("aria-pressed", on ? "true" : "false")
		btn.textContent = on ? FR_REPLY_LABEL_ON : FR_REPLY_LABEL_OFF
	}
}

// ---- the composer strip -------------------------------------------------
//
// Shown while a reply is armed, so it is never a guess which message the
// thing you are typing will attach to. Carries the quoted snippet as
// well as the name for the same reason the preview below does: a name
// alone does not identify which of that person's messages you picked.
//
// The × only clears the armed reply - it deliberately does not touch the
// compose box, so cancelling a reply never throws away what you have
// already typed.
function frReplyBarHtml(senderName, snippet, cancelFn) {
	var o = '<div class="frReplyBar">'
	o += '<span class="frReplyBarIcon" aria-hidden="true">&#8618;</span>'
	o += '<span class="frReplyBarText">'
	o += '<span class="frReplyBarWho">Replying to <b>' + authEsc(senderName) + '</b></span>'
	if (snippet) o += '<span class="frReplyBarSnippet">' + authEsc(frReplyTrim(snippet, 120)) + '</span>'
	o += '</span>'
	o += '<button class="frReplyBarCancel" type="button" title="Cancel reply"' +
		' aria-label="Cancel reply" onclick="' + cancelFn + '()">&times;</button>'
	o += '</div>'
	return o
}

// ---- the quoted preview -------------------------------------------------
//
// Above the reply's own bubble: who was replied to on its own line, then
// what they said underneath it. Two lines rather than the single squeezed
// nowrap line this replaced - that one read as a timestamp, not as
// context, which is the whole problem this component exists to fix.
//
// Deliberately NOT recursive: it only ever renders the one message being
// replied to, never that message's own reply. A reply to a reply to a
// reply stays at exactly this depth, so a long back-and-forth does not
// march across the screen. Clicking through is how you go further back.
//
// domPrefix is what the surface prefixes its message element ids with
// ("frMsg-" in the Forum, "frChatMsg-" in Chat), so one jump helper can
// serve both.
//
// A missing body means the quoted message is no longer readable - with
// the current schema (reply_to is "on delete set null" in both tables) a
// deleted original clears the reply pointer instead, so this is a
// defensive state rather than one the app produces today. It is handled
// anyway: a reply must never render as broken because of what happened
// to the message it answered.
function frReplyQuoteHtml(replyToId, replyWho, replyBody, domPrefix) {
	var gone = !replyBody
	var who = replyWho ? authEsc(replyWho) : "a message"
	var jump = "frReplyJumpTo(&quot;" + domPrefix + "&quot;,&quot;" + replyToId + "&quot;)"

	var o = '<div class="frReplyQuote' + (gone ? ' frReplyQuoteGone' : '') + '"'
	o += ' role="button" tabindex="0"'
	o += ' aria-label="' + (gone ? 'The message this replies to is no longer available'
		: 'Jump to the message this replies to, from ' + authEsc(replyWho || "a member")) + '"'
	o += ' title="' + (gone ? 'That message is no longer available' : 'Go to this message') + '"'
	o += ' onclick="' + jump + '"'
	// Enter/Space on a focused div is not a click on its own - div has no
	// implicit button behaviour, so keyboard use has to be wired by hand.
	o += ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();' + jump + '}"'
	o += '>'
	o += '<span class="frReplyQuoteConnector" aria-hidden="true"></span>'
	o += '<span class="frReplyQuoteMain">'
	if (gone) {
		o += '<span class="frReplyQuoteWho">&#8618; Original message deleted</span>'
	} else {
		o += '<span class="frReplyQuoteWho">&#8618; ' + who + '</span>'
		o += '<span class="frReplyQuoteBody">' + authEsc(frReplyTrim(replyBody, 220)) + '</span>'
	}
	o += '</span></div>'
	return o
}

// ---- clicking a quoted preview -----------------------------------------
//
// Scroll the quoted message into view and pulse it, then leave it alone.
// Reuses .frMsgNew, the same brief highlight an arriving message and an
// @here notification jump already use, so "look here" means one thing
// throughout Social rather than three.
//
// Only ever finds messages already loaded - both surfaces render a
// single page (200 messages) and a quote can point further back than
// that, which is worth saying out loud rather than silently doing
// nothing.
function frReplyJumpTo(domPrefix, messageId) {
	var el = document.getElementById(domPrefix + messageId)
	if (el === null) {
		if (typeof displayCalcNotification === "function") {
			displayCalcNotification("That message is further back than what's loaded", 2200)
		}
		return
	}
	el.scrollIntoView({ block: "center", behavior: "smooth" })
	el.classList.add("frMsgNew")
	setTimeout(function () { el.classList.remove("frMsgNew") }, 3000)
}

// ---- shared truncation --------------------------------------------------
//
// Enough to recognise which message is meant, not the whole thing again -
// the preview is context, and a quote as long as the reply competes with
// it. Cuts on a word boundary when there is one close enough to the
// limit, so a snippet does not end mid-word. Newlines collapse to spaces:
// the preview is a single flowing line-clamped block, and a quoted
// multi-line message should not stretch it.
function frReplyTrim(text, max) {
	var s = String(text === null || text === undefined ? "" : text).replace(/\s+/g, " ").trim()
	if (s.length <= max) return s
	var cut = s.slice(0, max)
	var lastSpace = cut.lastIndexOf(" ")
	if (lastSpace > max * 0.6) cut = cut.slice(0, lastSpace)
	return cut + "…"
}

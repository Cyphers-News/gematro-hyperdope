// ================== Master Decoder: database calls ==================
//
// The only file that talks to Supabase for Master Decoder. Every call is an
// RPC into supabase/migrations/20260918000000_master_decoder.sql, and every
// one of them takes the player from the session's JWT inside Postgres - no
// user id, score or month is ever sent from here.
//
// The round is the server's: it picks the words, checks the answers, keeps
// the clock and counts the score. This file just carries messages.
//
// Signed out, nothing here is called; the panel shows a sign-in prompt
// instead (calc/master-decoder.js).

function mdClient() {
	if (typeof getAuthClient !== "function") return null
	if (typeof authUser === "undefined" || authUser === null) return null
	return getAuthClient()
}

// Same shape as forumError / friendsError: the function's own raise messages
// are written to be read and pass through; a raw Postgres error names real
// schema and does not.
function mdError(err) {
	var msg = (err && err.message) ? String(err.message) : "Something went wrong"
	if (/does not exist|schema cache|PGRST202/i.test(msg)) {
		return new Error("Master Decoder is not set up on this database yet — run its migration.")
	}
	if (/failed to fetch|networkerror/i.test(msg)) {
		return new Error("Could not reach the server. Check your connection.")
	}
	if (typeof authIsRawDbError === "function" && authIsRawDbError(msg)) {
		if (typeof authDebugError === "function") authDebugError("master decoder", msg)
		return new Error("Something went wrong — try again.")
	}
	return new Error(msg.replace(/^.*?:\s*/, "").trim() || "Something went wrong")
}

function mdRpc(name, args) {
	var c = mdClient()
	if (c === null) return Promise.reject(new Error("Sign in to play Master Decoder."))
	return c.rpc(name, args || {}).then(function (res) {
		if (res.error) throw mdError(res.error)
		return res.data
	}, function (err) { throw mdError(err) })
}

// A RETURNS TABLE function comes back as an array of one row.
function mdFirstRow(data) {
	if (Array.isArray(data)) return data.length ? data[0] : null
	return data || null
}

// -> { round_id, period, countdown_ms, round_ms }
function mdStartRound(mode) {
	return mdRpc("master_decoder_start", { p_cipher_mode: mode }).then(mdFirstRow)
}

// -> { word, time_left_ms }
function mdFirstWord(roundId) {
	return mdRpc("master_decoder_word", { p_round_id: roundId }).then(mdFirstRow)
}

// -> { is_correct, correct_sum, score, next_word, next_in_ms, time_left_ms }
function mdSendAnswer(roundId, answer) {
	return mdRpc("master_decoder_answer", { p_round_id: roundId, p_answer: answer }).then(mdFirstRow)
}

// -> { score, period, best_score }
function mdFinishRound(roundId) {
	return mdRpc("master_decoder_finish", { p_round_id: roundId }).then(mdFirstRow)
}

// -> { period, resets_on, rows: [...], mine: {...} | null }
function mdFetchBoard(mode, limit) {
	return mdRpc("master_decoder_board", { p_cipher_mode: mode, p_limit: limit || 10 })
}

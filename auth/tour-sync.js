// ======================= Member tour: data access =======================
//
// Plain table reads/writes (RLS is self-row-only, see the migration) rather
// than RPCs - this is personal progress with no business logic attached to
// writing it, the same reason presets.js talks to public.presets directly.

function tourClient() {
	var c = (typeof getAuthClient === "function") ? getAuthClient() : null
	if (c === null || typeof authUser === "undefined" || authUser === null) return null
	return c
}

function tourDefaultProgress() {
	return { tour_version: 0, prompted: false, sections_done: [] }
}

function tourProgressGet() {
	var c = tourClient()
	if (c === null) return Promise.resolve(tourDefaultProgress())
	return c.from("member_tour_progress").select("*").eq("user_id", authUser.id).maybeSingle()
		.then(function (res) {
			if (res.error || !res.data) return tourDefaultProgress()
			return {
				tour_version: res.data.tour_version || 0,
				prompted: !!res.data.prompted,
				sections_done: res.data.sections_done || []
			}
		}).catch(function () { return tourDefaultProgress() })
}

// Merges patch onto whatever is already stored (read-modify-write, not a
// blind overwrite) so a tab that only knows about "prompted" never wipes out
// tour section progress saved from another tab or device.
function tourProgressSave(patch) {
	var c = tourClient()
	if (c === null) return Promise.resolve(null)
	return tourProgressGet().then(function (current) {
		var next = {
			user_id: authUser.id,
			tour_version: patch.tour_version !== undefined ? patch.tour_version : current.tour_version,
			prompted: patch.prompted !== undefined ? patch.prompted : current.prompted,
			sections_done: patch.sections_done !== undefined ? patch.sections_done : current.sections_done
		}
		return c.from("member_tour_progress").upsert(next, { onConflict: "user_id" })
			.then(function (res) { if (res.error) throw res.error; return next })
	}).catch(function () { return null })
}

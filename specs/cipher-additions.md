# spec: cipher additions (ccru extra, archaic, ten new ciphers)

status: accepted

> **continuity role:** proposed transition
> **owner:** cyphers technical owner (colette); net is the designated approver
> **requested by:** net
> **drafted by:** daskala, with net
> **created:** 2026-11-19
> **grounded against:** `2d4a988a6417e3390753f1083c61f9a235767e6d` (origin/master)
> **rebased onto:** `244d7a1` (master, 2026-11-21) at colette's request;
> master's standard-number correction, numbers guide copy and history/share
> work preserved; cache keys recomputed from the combined files.
> **accepted:** 2026-11-19 by net (designated approver): "I approve the spec";
> build approved separately: "approve to build". draft sha256
> `65e449849f2f9c31ace2e446df84d349013670cde0ba9573b920dbd2280f5cc3`.
> **repo:** gematro-hyperdope (cyphers.news) only. ciphers.news waits on
> colette's answer about cross-repo propagation.

only the designated approver may change `status`. implementation requires a
separate explicit "approved to build".

## owner view (net's request, condensed)

- rename the "Elizabethan" category to "Archaic"; saved workspaces follow.
- new category "CCRU Extra", directly after "CCRU".
- move "Alphanumeric" up to sit directly above "Archaic".
- add ten ciphers: Futhark Old (Languages); Nullinnix, Still Plex, Still
  Cycle, Vaxen, Unun, Divisors of 5184, Divisors of 1296 (CCRU Extra);
  Alphanumeric Reverse, Alphanumeric Sumerian (Alphanumeric).
- the verbatim request and intake checks are kept outside the repo in
  `/workspace/.daskala-inbox/ciphers-request.md`.

## decisions (net, 2026-11-19)

1. **order inside CCRU Extra: alphabetical.** "CCRU Extra" joins
   `alphabeticalCipherCategories`: Divisors of 1296, Divisors of 5184,
   Nullinnix, Still Cycle, Still Plex, Unun, Vaxen.
2. **descriptions: written.** every new cipher and the CCRU Extra category get
   quick-guide text that describes how the values are assigned (draft below;
   net corrects it). no history or origin is claimed that we can't source.
3. **archaic intro text kept** ("used with the Elizabethan English alphabet…",
   which describes the alphabet, not the category). everywhere the
   **category name** is shown (cyphers menu tab, cipher search label, quick
   guide heading, edit ciphers category field), it reads "Archaic". cipher
   names and descriptions that mention the elizabethan alphabet
   (e.g. "Elizabethan 360", "Bacon Kaye") are unchanged.

4. **canonical names (owner decision, colette, 2026-11-21, added in PR
   review; option B).** "for these ten newly shipped ciphers, the canonical
   name must always identify the shipped definition. if an existing same-name
   cipher has the identical character/value mapping, reconcile it into the
   canonical cipher and preserve its user-facing state. if its mapping
   differs, preserve it exactly as a custom cipher under a deterministic
   collision-safe name such as vaxen (custom), then add the canonical vaxen
   alongside it. the migration must be idempotent." implementation choices
   (daskala, for review): "user-facing state" = on/off and colour; category
   and input settings come from the shipped definition. the same rule holds
   on the immediate paths: cipher-file import reconciles after parsing, and
   Edit Ciphers saving a different mapping under one of the ten names saves
   "<name> (custom)" instead of replacing the shipped cipher, and saving the
   identical table under one of the ten names builds the shipped cipher
   (category, diacritics, case sensitivity, derivation and digit policy from
   the shipped definition; only colour and on/off kept). the canonical
   cipher added alongside a differing copy starts with its shipped on/off
   state (off). older built-ins are not covered: Edit Ciphers edits those in
   place by name.

## new menu order and dividers

Base-4, CCRU, CCRU Extra, Gematria, Reverse ‖ Alphanumeric, Archaic, Extra,
Illuminati, Latin, Maths, Thelemic ‖ Alchemology, Cryptography, Experimental,
Polygonal ‖ Languages, Hebrew, Greek

(‖ = menu divider; dividers move from ahead of Elizabethan/Alphanumeric/
Languages to ahead of Alphanumeric/Alchemology/Languages.)

## grounded facts

- 173 ciphers ship today, 4 enabled by default. the ten new ones ship
  disabled (`enabled=false`), like most. count becomes 183.
- no new name collides with an existing cipher.
- negative letter values already ship (e.g. Based Atlanteanism), so
  Nullinnix needs no engine change.
- returning users: `mergeBuiltinCiphers` adds missing built-ins, and an
  untouched built-in adopts its shipped category, so the nine Elizabethan
  built-ins move to Archaic on their own. edited or user-created ciphers
  filed under "Elizabethan" keep it, so `normaliseCipherCategories` also
  maps "Elizabethan" → "Archaic".
- Divisors of 1296 maps a–z only; typed digits keep the ordinary number
  fallback, as in Ordinal.

## evidence (2026-11-21)

- vm tests `tests/cipher-additions.test.js` (6): pass on this branch; the
  first 4 fail on `2d4a988`, the last 2 on `ba417ba`.
- `tests/canonical-ciphers.test.js` (7): no collision, identical collision,
  differing collision (right values, wrong character order), occupied
  "(custom)" name, three collisions at once plus a second and third load,
  Edit Ciphers, import order. all 7 fail on `e730b23` (the no-collision case
  only because it uses the new `builtinCipherDef` helper).
- browser round trip through `saveCalcSettingsLocalStorage` and two reloads
  with three collisions: Vaxen (wrong order) -> "Vaxen (custom)" kept on,
  z = 3, shipped Vaxen added, z = 1225; Unun (identical) merged, on and
  colour kept; Still Plex (one value differs) -> "Still Plex (custom)" plus
  shipped. identical after the second load; no page errors.
- after rebasing onto `244d7a1`: safety 55/55, full 165/165 (every
  rebased commit passed the full suite on its own).
- all 173 existing ciphers unchanged (values, names, colours, defaults);
  only category change is Elizabethan → Archaic.
- browser (headless chromium): menu order and dividers as specified, no
  clipped category button, Archaic note and pinned Bacon ciphers intact,
  cipher search labels Archaic, Nullinnix displays negative totals.
- restore paths: settings and cloud workspace both pass through
  `applyCalcSettingsString` → `mergeBuiltinCiphers` + `applyCipherOrdering`,
  so the mapping applies.
- immediate rebuild paths (found in colette's PR review, 2026-11-21): Edit
  Ciphers with category "Elizabethan", and both cipher-file imports, showed a
  live "Elizabethan" tab until reload. fixed: Edit Ciphers files the typed
  category through `canonicalCipherCategory`; both imports call
  `normaliseCipherCategories()` after parsing and before `initCalc()`. two
  tests cover them (both fail on `ba417ba`); a browser run through the real
  Edit Ciphers panel and an import of an old export (pre-existing
  `chkbox_SEC` crash stubbed) shows Archaic and no Elizabethan tab.
- the cipher-file imports still crash on the removed `chkbox_SEC` before
  parsing (pre-existing, filed separately); the fix above holds once they run.

## change shape

| dimension | changed? | proof |
|---|---:|---|
| user-visible behavior | yes: menu order, one renamed and one new category, ten ciphers, quick-guide text | tests below; menu screenshots; net's check |
| persisted state | yes: stored category "Elizabethan" is mapped to "Archaic" on restore | test with an old saved blob (built-in, edited and custom cipher) |
| identifiers | yes: category "Elizabethan" → "Archaic"; a stored cipher whose name is one of the ten and whose mapping differs is deliberately renamed "<name> (custom)" (next free "(custom N)"); no shipped cipher is renamed | `tests/canonical-ciphers.test.js`; diff review |
| other repos | no | changed-file list |

risk: amber. the stored-category mapping is a persistence touch, so a
read-only check of every path that restores categories runs before editing,
limited to that mapping (owner to confirm).

## implementation by invariant

1. each new cipher is defined exactly as net sent it, and a test checks its
   defining rule: Futhark Old decodes to the 24 elder futhark runes = 1–24;
   Nullinnix sums to 0; Alphanumeric Reverse = Alphanumeric Qabbala reversed;
   Alphanumeric Sumerian = Alphanumeric Qabbala × 6; each Divisors cipher =
   [0] + every divisor of its number, generated in the test; Unun − Vaxen =
   20 + 2i on letters and 2i on digits.
2. the category order, dividers and in-category order match this spec.
3. no visible category reads "Elizabethan"; a restored blob with a built-in,
   an edited and a custom "Elizabethan" cipher ends up entirely under Archaic.
4. no existing cipher's values, name or default state change.
5. quick-guide text exists for CCRU Extra and each new cipher; cache keys are
   refreshed; shipped count 183.
6. each of the ten names identifies the shipped definition after restore,
   import and Edit Ciphers; a differing same-name copy survives exactly as
   "<name> (custom)" (next free "(custom N)" if taken); re-running is a no-op.

## done when

- net approves this revision, then separately says "approved to build";
- the tests above, `bash scripts/test-local.sh safety` and `full` pass;
- net checks screenshots of the cyphers menu and quick guide, then the live
  site after merge;
- one adversarial review of the diff, limited to what it touches, is
  reconciled; colette reviews the PR.

## out of scope (filed, not done here)

- ciphers.news (pending propagation decision).
- `theme/*-interface.js` old cipher lists (their loader is commented out).

## draft quick-guide text (net to correct)

- **CCRU Extra:** 💾 More alphanumeric, keyboard-order and divisor-based
  cyphers in the spirit of the CCRU category.
- **Futhark Old:** 🌍 Ordinal for the 24 runes of the Elder Futhark, in
  traditional order: ᚠ = 1, ᚢ = 2 … ᛟ = 24.
- **Nullinnix:** 🔢 Gives the 36 alphanumeric characters 0–Z both negative
  and positive values (from A = −23 up to Y = 24) arranged so the whole
  sequence adds up to exactly 0.
- **Still Plex:** 🔢 Almost flat: every digit is 5 and nearly every letter
  is 22, except F, N and Y (24) and L and S (25).
- **Still Cycle:** ⌨️ Follows the keyboard order 1–0 then QWERTY…M. The
  digits count up from 0 (1 = 0 … 0 = 9); the letters take values between 18
  and 30.
- **Vaxen:** 🔢 Letter values climb steeply from A = 4 to Z = 1225, while
  the digits stay small (1–3).
- **Unun:** 🔢 Built on Vaxen: each letter is Vaxen's value plus 20 plus
  twice its distance from A (A + 20 … Z + 70), and each digit is Vaxen's
  value plus twice the digit (0 + 0 … 9 + 18).
- **Divisors of 5184:** 🔢 Like Synx, but with 5184 (2⁶ × 3⁴): 0 = 0, then
  each following character 1–Z takes the next of its 35 divisors, so
  Z = 5184.
- **Divisors of 1296:** 🔢 Letters only: A = 0, then B–Z take the 25
  divisors of 1296 (6⁴) in order, so Z = 1296. Typed digits follow the
  Numbers setting, as in Ordinal.
- **Alphanumeric Reverse:** 🔁 Alphanumeric Qabbala backwards: 0 = 35 …
  Z = 0.
- **Alphanumeric Sumerian:** 🔢 Alphanumeric Qabbala × 6, the way English
  Sumerian is Ordinal × 6: 0 = 0, 1 = 6 … Z = 210.

// ======================== Quickstart Guide ========================
//
// One topic at a time rather than one long scroll: the guide had grown to
// cover the whole calculator, and finding anything meant hunting through
// several screens of text. Topics are data, so adding a section is a new
// entry in quickGuideTopics rather than another string concatenated into the
// middle of a function.
//
// Special Thanks is deliberately not a topic. It sits under the topic buttons
// and stays on screen whichever topic is open, so the credits are always
// visible instead of being buried behind a tab nobody opens.

function closePanel(el) {
	$('#darkOverlay').remove();
	$(el).remove();
	$('body').removeClass('noScroll') // restore scrolling
}

var quickGuideTopic = "basics" // currently open topic

var quickGuideTopics = [

{ id: "basics", label: "🎯 Basics", html:
	'<p class="qgMedium">Phrase Box - word, phrase or numbers</p>'
	+ '<ul>'
	+ '<li><span class="qgBold">Enter</span> - add phrase to history table.<br><span class="qgBold">Query</span> - search the loaded database.</li>'
	+ '<li><span class="qgBold">Up</span> &amp; <span class="qgBold">Down</span> arrow keys - scroll history table.<br>Press <span class="qgBold">Down</span> to select the previous phrase.</li>'
	+ '<li><span class="qgBold">Delete</span> - delete the current phrase in the history table.</li>'
	+ '<li><span class="qgBold">Home</span> - clear the history table.<br><span class="qgBold">End</span> - shortcut for <span class="qgBold">Enter As Words</span>.</li>'
	+ '</ul>'

	+ '<p class="qgMedium">History Table</p>'
	+ '<ul>'
	+ '<li><span class="qgBold">"Left Click"</span> on value - toggle blinking effect (temporary)</li>'
	+ '<li><span class="qgBold">"Right Click"</span> on value - toggle cell visibility (temporary)</li>'
	+ '<li><span class="qgBold">"Shift + Left Click"</span> on cipher name - disable cipher</li>'
	+ '<li><span class="qgBold">"Shift + Left Click"</span> on phrase - delete phrase from history</li>'
	+ '<li><span class="qgBold">"Ctrl + Left Click"</span> on phrase - load phrase into the <span class="qgBold">Phrase Box</span></li>'
	+ '<li><span class="qgBold">"Ctrl + Right Click"</span> on phrase - reorder phrases, pick the same phrase again to cancel</li>'
	+ '<li><span class="qgBold">"Ctrl + Left Click"</span> on a value cell - toggle highlighting for that number'
	+ '<br><span class="qgNote">Note: click the cell, not the number itself, or you will open number properties instead</span></li>'
	+ '</ul>'

	+ '<p class="qgMedium">Right Click Anywhere</p>'
	+ '<ul>'
	+ '<li>Right clicking the page opens a shortcut menu for the export actions, plus'
	+ ' <span class="qgBold">"Edit Table Caption"</span> to name the history table (the name is used in exports)'
	+ ' and <span class="qgBold">"Clear History Table"</span>.</li>'
	+ '</ul>'
},

{ id: "ciphers", label: "🔤 Cyphers", html:
	'<p class="qgMedium">Choosing Cyphers</p>'
	+ '<ul>'
	+ '<li>The <span class="qgBold">Cyphers</span> tab groups every cypher by category. Hover a category to list it, then tick the ones you want.</li>'
	+ '<li><span class="qgBold">Empty</span>, <span class="qgBold">Default</span>, <span class="qgBold">All (EN)</span> and <span class="qgBold">All</span> set the selection in one click.</li>'
	+ '<li><span class="qgBold">"Left Click"</span> a cypher name in the Enabled Cyphers table to make it current and show its breakdown.'
	+ '<br><span class="qgBold">"Right Click"</span> to disable it. <span class="qgBold">"Ctrl + Right Click"</span> to reorder.</li>'
	+ '</ul>'

	+ '<p class="qgMedium">English - Modern, Archaic, Base 4</p>'
	+ '<ul>'
	+ '<li><span class="qgBold">English</span> - modern 26 letter 1650s+ alphabet.</li>'
	+ '<li><span class="qgBold">Archaic</span> - 24 letter English used 1300 - 1650 AD, also called the <span class="qgBold">Elizabethan</span> or <span class="qgBold">Baconian</span> cyphers.</li>'
	+ '<li><span class="qgBold">Standard</span> - previously known as Extended, based on the <span class="qgBold">Hebrew Gematria</span> chart.</li>'
	+ '<li><span class="qgBold">Base 4</span> - the four most common modern cyphers.</li>'
	+ '<li><span class="qgBold">Ordinal</span> - originating as Phoenician gematria. Each value counts up by 1.</li>'
	+ '<li><span class="qgBold">Reduction</span> - Pythagorean numerology; digits are summed repeatedly down to one digit.</li>'
	+ '<li><span class="qgBold">Reverse</span> - Z to A instead of A to Z.</li>'
	+ '</ul>'

	+ '<p class="qgMedium">Languages</p>'
	+ '<ul>'
	+ '<li><span class="qgBold">Phoenician</span> - the first phonetic alphabet and number substitution system.</li>'
	+ '<li><span class="qgBold">Hebrew</span> - from Phoenician, 500+ BC.</li>'
	+ '<li><span class="qgBold">Greek</span> - isopsephy from gematria, 500+ BC.</li>'
	+ '<li><span class="qgBold">Latin</span> - 23 letters, excluding J, U and W.</li>'
	+ '<li><span class="qgBold">Arabic</span> - the Abjad numeral system, 600+ AD.</li>'
	+ '<li><span class="qgBold">Russian</span> - the Cyrillic alphabet, 800+ AD.</li>'
	+ '</ul>'

	+ '<p class="qgMedium">Cryptography (wheel cyphers)</p>'
	+ '<ul>'
	+ '<li>These do not add up to a number. Each letter is <span class="qgBold">swapped for a symbol</span>, so the result is a string'
	+ ' such as <span class="qgBold">HAANA NHUUS</span> rather than a total.</li>'
	+ '<li>Includes <span class="qgBold">Franz Bardon</span>, <span class="qgBold">Rydumy</span>, <span class="qgBold">Alfabeto Carbonaro</span>,'
	+ ' <span class="qgBold">Cryptographic AQ</span>, <span class="qgBold">Heximal AQ</span>, <span class="qgBold">English Trigon</span>,'
	+ ' <span class="qgBold">AQ Astrology</span> and <span class="qgBold">Illuminati Novice Wheel</span>.</li>'
	+ '<li>Some map whole groups of letters, not just single ones - Bardon reads <span class="qgBold">ch</span>, <span class="qgBold">sch</span>'
	+ ' and <span class="qgBold">tz</span> as one unit, and the longest match always wins.</li>'
	+ '<li><span class="qgNote">Because there is no number, wheel cyphers are skipped by the highlighter, Find Matches,'
	+ ' Numerology Mode, number properties and database queries. They still export normally.</span></li>'
	+ '</ul>'

	+ '<p class="qgMedium">Edit Cyphers</p>'
	+ '<ul>'
	+ '<li><span class="qgBold">"Left Click"</span> a cypher name inside <span class="qgBold">Edit Cyphers</span> to change it or base a new one on it.</li>'
	+ '<li>Give each cypher a unique name. Two cyphers sharing a name makes the second one unreachable, since every lookup finds the first.</li>'
	+ '<li>Custom cyphers are saved with your settings, and sync to your account if you are signed in.</li>'
	+ '</ul>'

	+ '<p class="qgMedium">Color Controls</p>'
	+ '<ul>'
	+ '<li>Change interface, font or cypher colours (<span class="qgBold">HSL</span> - hue, saturation, lightness).</li>'
	+ '<li>Every cypher has its own swatch - click it to pick an exact colour.</li>'
	+ '<li>Save your settings afterwards, or the changes are lost on reload.</li>'
	+ '</ul>'

	+ '<p class="qgNote">Full write-ups and bibliography for every cypher live under the <span class="qgBold">Cyphers (Info)</span> topic below - open a category, then open a cypher name to read about it.</p>'
},

{ id: "ciphersInfo", label: "📖 Cyphers (Info)", render: cipherInfoTopicHtml
},

{ id: "highlighter", label: "🔎 Matching", html:
	'<p class="qgMedium">Highlight Box - space delimited numbers</p>'
	+ '<ul>'
	+ '<li><span class="qgBold">"Enter"</span> - activate the filter (removes non-matching phrases and cyphers)</li>'
	+ '<li><span class="qgBold">"Delete"</span> - clear the box (does not reset the filter)'
	+ '<br><span class="qgNote">Note: reset the filter with the "X" button beside the box</span></li>'
	+ '<li><span class="qgBold">"Insert"</span> - find all available matches</li>'
	+ '<li><span class="qgBold">"Ctrl + Delete"</span> - reset the filter and revert to the initial history state</li>'
	+ '<li><span class="qgNote">Type "0 0", or "Ctrl + Left Click" a "0" cell twice, to highlight zero.'
	+ ' The history table recalculates on every keystroke.</span></li>'
	+ '</ul>'

	+ '<p class="qgMedium">Find Matches</p>'
	+ '<ul>'
	+ '<li><span class="qgBold">Find Matches</span> has its own tab in the top menu. It fills the'
	+ ' <span class="qgBold">Highlight Box</span> with every number that appears at least twice in the history table.</li>'
	+ '<li>The button sweeps green as it runs, so you can see it worked even when nothing matched.</li>'
	+ '<li><span class="qgBold">"Show Only Matching"</span> hides everything that did not match instead of dimming it.</li>'
	+ '</ul>'

	+ '<p class="qgMedium">Highlighter Modes</p>'
	+ '<ul>'
	+ '<li><span class="qgBold">"Cross Cipher Match"</span> - a value counts if it appears under any cypher.</li>'
	+ '<li><span class="qgBold">"Same Cipher Match"</span> - a value only counts within its own cypher column.</li>'
	+ '</ul>'
},

{ id: "breakdown", label: "🧮 Breakdown", html:
	'<p class="qgMedium">Cypher &amp; Breakdown Chart</p>'
	+ '<ul>'
	+ '<li>The <span class="qgBold">Cypher Chart</span> doubles as a virtual keyboard.</li>'
	+ '<li><span class="qgBold">"Left Click"</span> the top left corner for <span class="qgBold">Space</span>, the top right for <span class="qgBold">Backspace</span>.</li>'
	+ '<li><span class="qgBold">"Left Click"</span> the cypher name to switch to uppercase.</li>'
	+ '<li><span class="qgBold">"Left Click"</span> letters to type them.</li>'
	+ '<li><span class="qgBold">"Left Click"</span> numbers or letters to highlight cells in the <span class="qgBold">Breakdown Chart</span>.</li>'
	+ '<li>Charts scale down to fit rather than overflowing, so wide cyphers stay readable on small screens.</li>'
	+ '</ul>'

	+ '<p class="qgMedium">Number Properties</p>'
	+ '<ul>'
	+ '<li>Hold <span class="qgBold">"Ctrl"</span> and hover a number to see its properties.</li>'
	+ '<li>Hold <span class="qgBold">"Shift"</span> and hover for the extended set.</li>'
	+ '<li>Supported for values up to 10 million.</li>'
	+ '<li>Drag the cursor across the tooltip to close it. On mobile, tap the tooltip first, then tap outside.'
	+ '<br><span class="qgNote">Note: available in the Enabled Cyphers Table, History Table and Query Table</span></li>'
	+ '</ul>'

	+ '<p class="qgMedium">Numerology Mode</p>'
	+ '<ul>'
	+ '<li>Shows the reduction chain beside each value - <span class="qgBold">79 &#10148; 16 &#10148; 7</span> - instead of the raw number.</li>'
	+ '<li>Stops at a single digit, or at the master numbers <span class="qgBold">11</span>, <span class="qgBold">22</span> and <span class="qgBold">33</span>.</li>'
	+ '<li>Found under <span class="qgBold">"Show Only Matching"</span> in the Options tab.</li>'
	+ '</ul>'

	+ '<p class="qgMedium">Letter &amp; Word Count</p>'
	+ '<ul>'
	+ '<li>Counts only the letters and words the current cypher actually recognises, so an unmapped character is not counted.</li>'
	+ '</ul>'
},

{ id: "datecalc", label: "📅 Dates", html:
	'<p class="qgMedium">Date Calculator</p>'
	+ '<ul>'
	+ '<li>Has its own tab in the top menu.</li>'
	+ '<li>Calculates the interval between two dates on the Gregorian calendar.</li>'
	+ '<li>Supports <span class="qgBold">Add/Subtract</span> mode for stepping forward or back from a date.</li>'
	+ '<li>Results are broken down into years, months, weeks and days, so any of them can be fed straight into the phrase box.</li>'
	+ '</ul>'
},

{ id: "astrology", label: "🔮 Astrology", html:
	'<p class="qgMedium">Astrology</p>'
	+ '<ul>'
	+ '<li>Has its own tab in the top menu. Enter a birth date, time and place to build a chart.</li>'
	+ '<li><span class="qgBold">Birth location</span> - type a place name and pick it from the lookup; latitude, longitude'
	+ ' and time zone are filled in for you.</li>'
	+ '</ul>'

	+ '<p class="qgMedium">The Charts</p>'
	+ '<ul>'
	+ '<li><span class="qgBold">2D natal wheel</span> - planets, signs, houses and aspects drawn on a traditional wheel.</li>'
	+ '<li><span class="qgBold">3D solar system</span> - the same moment shown as orbits. Drag to rotate, scroll to zoom.</li>'
	+ '<li>Houses are calculated from your birth location, so the Ascendant reflects the exact horizon at that time.</li>'
	+ '</ul>'

	+ '<p class="qgNote">Positions are computed from orbital elements rather than a lookup table, including the'
	+ ' main perturbations for the Sun and Moon.</p>'
},

{ id: "coderain", label: "🌊 Code Rain", html:
	'<p class="qgMedium">Background Styles</p>'
	+ '<ul>'
	+ '<li>The toggle at the far right of the top menu cycles'
	+ ' <span class="qgBold">Off</span> &#10148; <span class="qgBold">On</span> &#10148;'
	+ ' <span class="qgBold">Retro</span> &#10148; <span class="qgBold">CCRU</span>.</li>'
	+ '<li>The rain mixes Latin letters and digits with katakana, Hebrew, Greek and Cyrillic glyphs.</li>'
	+ '</ul>'

	+ '<p class="qgMedium">Tuning It</p>'
	+ '<ul>'
	+ '<li>Hover the toggle to open the panel.</li>'
	+ '<li><span class="qgBold">Density</span> - how many columns fall at once.</li>'
	+ '<li><span class="qgBold">Speed</span> - how fast they fall.</li>'
	+ '<li><span class="qgBold">Colour</span> - drag the spectrum for a quick hue, or use the swatch to pick an exact colour.</li>'
	+ '<li><span class="qgBold">Follow cipher</span> - the rain borrows the colour of whichever cypher is selected. Picking a colour by hand turns this off.</li>'
	+ '<li><span class="qgBold">Reset</span> - back to the defaults.</li>'
	+ '</ul>'

	+ '<p class="qgNote">A colour you pick also tints the page background, so turning the rain off or running it'
	+ ' thin still leaves the scheme you chose rather than snapping back to the default.</p>'
},

{ id: "profile", label: "✅ Profile", html:
	'<p class="qgMedium">Why make a FREE account?</p>'
	+ '<p>The calculator works fully without one. An account is for keeping your work between visits and'
	+ ' across devices. There is no cost, no card and no limit on the free features.</p>'

	+ '<p class="qgMedium">Membership perks</p>'
	+ '<ul>'
	+ '<li><span class="qgBold">&#128190; Your history is saved.</span> Phrases survive a refresh instead of vanishing,'
	+ ' and follow you to every device you sign in on.</li>'
	+ '<li><span class="qgBold">&#9881; Your workspace is default.</span> Enabled cyphers, colours, custom cyphers and'
	+ ' code rain settings load exactly as you left them.</li>'
	+ '<li><span class="qgBold">&#128269; Search what you decoded.</span> Saved entries are searchable, so you can look'
	+ ' back through every term you have run instead of typing it out again.</li>'
	+ '<li><span class="qgBold">&#127942; Climb the leaderboard.</span> Publish the phrases you choose and see the top'
	+ ' contributors ranked. Only usernames are ever shown, never email addresses.</li>'
	+ '<li><span class="qgBold">&#127912; Custom avatar.</span> Upload your own picture for your profile and the leaderboard.</li>'
	+ '<li><span class="qgBold">&#128451; Presets.</span> Save named sessions - a set of enabled cyphers, colours, custom'
	+ ' cyphers and code rain settings - and switch between them in one click.</li>'
	+ '</ul>'

	+ '<p class="qgMedium">The Profile tab</p>'
	+ '<ul>'
	+ '<li><span class="qgBold">Saved Entries</span> - everything you have looked up, searchable, and the place you'
	+ ' publish a phrase from.</li>'
	+ '<li><span class="qgBold">Presets</span> - create, load, overwrite and delete named sessions.</li>'
	+ '<li><span class="qgBold">My Submissions</span> - what you have published, and a withdraw button for each.</li>'
	+ '<li><span class="qgBold">Leaderboard</span> - the ranked contributors.</li>'
	+ '<li><span class="qgBold">Account</span> - display name, avatar and sign out.</li>'
	+ '</ul>'

	+ '<p class="qgMedium">Publishing rules</p>'
	+ '<ul>'
	+ '<li>Nothing is published automatically. You opt in per phrase.</li>'
	+ '<li>A phrase already in the <span class="qgBold">database</span> cannot be published - capitalisation is ignored,'
	+ ' so a different case is still the same phrase.</li>'
	+ '<li>A phrase someone else has already published cannot be published again.</li>'
	+ '<li>Either way the entry turns <span class="qgBold">red</span> and tells you why.</li>'
	+ '<li>You can withdraw anything you published at any time.</li>'
	+ '</ul>'
},

{ id: "options", label: "⚙ Options", html:
	'<ul>'
	+ '<li><span class="qgBold">"Number Calculation"</span>'
	+ '<ul><li>Full (123 = 123) - <span class="qgBold">default</span></li><li>Reduced (123 = 1+2+3 = 6)</li><li>Off</li></ul></li>'
	+ '<li><span class="qgBold">"Show Only Matching"</span> - with the highlighter active, hides non-matching values instead of dimming them</li>'
	+ '<li><span class="qgBold">"Enter As Words"</span> - reads the phrase box one word at a time up to a set length, then moves on</li>'
	+ '<li><span class="qgBold">"Numerology Mode"</span> - show reduction chains instead of plain values</li>'
	+ '<li><span class="qgBold">"Ignore Comments [...]"</span> - exclude text in square brackets from the calculation'
	+ '<br><span class="qgNote">Note: comments are preserved on export and import</span></li>'
	+ '<li><span class="qgBold">"Live Database Mode"</span> - turn off to generate a precalculated database on import</li>'
	+ '<li><span class="qgBold">"New Phrases Go First"</span> - insert new phrases at the top of the history table</li>'
	+ '<li><span class="qgBold">"Phrases on DB page"</span> - how many phrases appear on one page of query results</li>'
	+ '<li><span class="qgBold">"Scroll DB by lines"</span> - scrolling speed inside query results</li>'
	+ '<li><span class="qgBold">"Letter/Word Count"</span> - show how many letters and words the current cypher recognises</li>'
	+ '<li><span class="qgBold">"Word Breakdown"</span> - show the detailed breakdown for the current phrase</li>'
	+ '<li><span class="qgBold">"Compact Breakdown"</span> - leave the plain text phrase out of the breakdown table</li>'
	+ '<li><span class="qgBold">"Cipher Chart"</span> - show the letter-to-value chart for the current cypher</li>'
	+ '<li><span class="qgBold">"Gradient Charts"</span> - fill style for the breakdown and cypher charts</li>'
	+ '<li><span class="qgBold">"Switch Ciphers (CSV)"</span> - re-enable the saved cypher selection when importing history</li>'
	+ '</ul>'
},

{ id: "export", label: "📤 Export", html:
	'<ul>'
	+ '<li><span class="qgBold">"Print Cipher Chart"</span> and friends - render that element as a PNG. A preview opens first.</li>'
	+ '<li><span class="qgBold">"Image Scale"</span> - scaling factor for screenshots (1.0, 1.5, 2.0).</li>'
	+ '<li><span class="qgBold">"Import File"</span> - import a <span class="qgBold">.txt</span> file (one phrase per line),'
	+ ' a previously exported CSV history, exported matches, or a settings file.</li>'
	+ '<li><span class="qgBold">"Create Database (TXT)"</span> - convert a <span class="qgBold">.txt</span> file into'
	+ ' <span class="qgBold">Live Database</span> format.</li>'
	+ '<li><span class="qgBold">"Export History (CSV)"</span> - export the current history table. Semicolon separated,'
	+ ' with cypher names in the first row.</li>'
	+ '<li><span class="qgBold">"Export Matches (TXT)"</span> - export every available match from the current history table,'
	+ ' using the active highlighter mode.</li>'
	+ '<li><span class="qgBold">"Save/Load/Reset"</span> - store the current calculator and cypher settings in this browser.</li>'
	+ '<li><span class="qgBold">"Export Settings (JS)"</span> - export the settings and cyphers as a file you can share or keep.</li>'
	+ '</ul>'
	+ '<p class="qgNote">All of these are also on the right click menu, wherever you are on the page.</p>'
},

{ id: "databases", label: "🗃 Databases", html:
	'<ul>'
	+ '<li>Import a properly formatted TXT file to turn on database query mode.</li>'
	+ '<li><span class="qgBold">Live Database Mode</span> is used by default; a precalculated database only holds values'
	+ ' for the cyphers selected when it was built.</li>'
	+ '<li>The <span class="qgBold">"Ignore Comments [...]"</span> flag affects database generation, so the calculator'
	+ ' should use the same setting the database was built with.</li>'
	+ '<li><span class="qgBold">"Cipher Edit"</span> and reordering are unavailable while a precalculated database is loaded.</li>'
	+ '<li>The active highlighter mode controls how a query matches.</li>'
	+ '<li>Queries follow the current cypher selection, with no limit on how many are enabled.</li>'
	+ '<li>Type a phrase into the <span class="qgBold">Phrase Box</span> and press <span class="qgBold">Query</span> to match it.</li>'
	+ '</ul>'

	+ '<p class="qgMedium">Query Table</p>'
	+ '<ul>'
	+ '<li>Use the <span class="qgBold">Search Bar</span> to filter results. <span class="qgBold">"Enter"</span> applies the filter.</li>'
	+ '<li><span class="qgBold">"Up"</span> and <span class="qgBold">"Down"</span> scroll a page at a time, as does the mouse wheel.</li>'
	+ '<li>Drag the bottom-right corner to resize the table - useful when long phrases do not fit.</li>'
	+ '<li><span class="qgBold">"Ctrl + Left Click"</span> a phrase to load it into the <span class="qgBold">Phrase Box</span>.</li>'
	+ '<li><span class="qgBold">"Left Click"</span> the button in the top right corner to minimise the table, and again to bring it back.</li>'
	+ '</ul>'
}

]

// ===================== Cyphers (Info) topic ========================
//
// Built from the live cCat / cipherList at render time rather than a fixed
// html string, so the categories shown here can never drift out of sync
// with the real Cyphers menu - add/rename/move a cypher in ciphers.js and
// this topic picks it up automatically, with no separate list to maintain.
//
// Text below comes from "Information on Ciphers & Suggested Bibliography"
// by Luís Gonçalves, Gematria Research, matched to the cypher currently
// carrying that name (or a clear renamed/close equivalent, noted inline).
// Cyphers with no confident match in that source show a placeholder
// instead of an invented description.

var cipherCategoryIntro = {
	"Base-4": "🎯 The four most common modern English cyphers: Ordinal, Reduction, and their Z-to-A reverses.",
	"CCRU": "💾 Alphanumeric and keyboard-based cyphers associated with the Cybernetic Culture Research Unit and the y2k computing era.",
	"Gematria": "📐 Numerology systems built on the modern English alphabet, from simple sequences to a handful of named historical variants.",
	"Reverse": "🔁 Z-to-A counterparts of cyphers found elsewhere in the calculator.",
	"Elizabethan": "🏰 Used with the Elizabethan English alphabet with 24 letters, in which I=J and U=V.",
	"Illuminati": "🔺 Cyphers historically associated with the Bavarian Order of the Illuminati.",
	"Latin": "🏛️ Used with the Classical Latin alphabet with 23 letters.",
	"Maths": "🔢 Cyphers built directly from a mathematical sequence or constant - primes, squares, the digits of &pi;, and the like.",
	"Thelemic": "🔯 More frequently used in a Thelemic context, mostly in the analysis of Aleister Crowley&rsquo;s &ldquo;Liber AL vel Legis&rdquo; (The Book of the Law).",
	"Alphanumeric": "🔤 Experimental cyphers built on the same principles as other well-known cyphers, but extended to cover the alphanumeric sequence 0-Z (or beyond).",
	"Alchemology": "⚗️ This calculator&rsquo;s own Alchemology numbering scheme (1, 4, 7, 9, 11, 12, 14, 16, 19, 20, 23&hellip;) applied across many different alphabets and constants, in place of a historical value chart.",
	"Cryptography": "🔐 Quite different from the rest of the calculator: these are substitution cyphers used to encode or encrypt a word or phrase, rather than to add up to a number.",
	"Experimental": "🧪 Cyphers devised either by the author of this calculator or by others, kept separate while their results and reception are still being weighed.",
	"Extra": "➕ Cyphers that did not fit cleanly into any other category.",
	"Polygonal": "🔷 Connects the letters of the alphabet to a sequence of numbers - the &ldquo;Trigonal&rdquo; cypher to trigonal (triangular) numbers, &ldquo;Squares&rdquo; to square numbers, and so on.",
	"Languages": "🌍 Ordinal, reduction and traditional numeral systems for alphabets and scripts beyond English.",
	"Hebrew": "✡️ Hebrew Gematria and related cyphers built on the Hebrew alphabet.",
	"Greek": "🏺 Greek Isopsephy and related cyphers built on the Greek alphabet."
}

var cipherInfoText = {
	"Standard": "📜 Follows the numerical sequence of units, tens and hundreds.<br><br>This is the traditional system of numerical equivalences for the letters as it is used in Hebrew Gematria, Greek Isopsephia, and the Arabic Abjad system.",
	"Ordinal": "🔢 Follows the sequence of natural numbers, starting at 1.",
	"Reduction": "➗ Reduces the ordinal value of letters to a single digit.",
	"Reverse Ordinal": "🔁 The Z-to-A reversal of Ordinal.",
	"Reverse Reduction": "🔁 The Z-to-A reversal of Reduction.",
	"Bacon Kaye": "📜 Makes the 10<sup>th</sup> letter of the Elizabethan English alphabet correspond to the number 10.<br><br>Discovered by Mr. W. E. Clifton, a Baconian, using two particular 17<sup>th</sup> century books &mdash; Thomas Powell&rsquo;s &ldquo;The Repertorie of Records&rdquo; (1631) and a special edition of Rawley&rsquo;s &ldquo;Resuscitatio&rdquo; (1671) of Bacon&rsquo;s works.<br><br>These alerted him that the cipher uses the twenty-six characters of the old alphabet primers, where the Ampersand (&lsquo;&amp;&rsquo;) followed by &lsquo;et&rsquo; was added to the twenty-four letter alphabet, and K (which starts the counting) equals 10. Since 25 and 26 (the &lsquo;&amp;&rsquo; and &lsquo;et&rsquo;) are treated as nulls, A equals 27, B equals 28, etc.",
	"Modern Kaye": "📜 Like the Elizabethan Kaye cipher, assigns the value 10 to the 10<sup>th</sup> letter of the modern English alphabet.<br><br>Delivers strong results when applied in a Baconian / Rosicrucian / Shakespearean context.",
	"Beatus of Liebana": "📜 Like Standard, assigns numerical values to the Latin letters in three scales: first the units, then the tens, then the hundreds.<br><br>In the related Agrippa Key cipher the 3 extra letters &ldquo;J&rdquo;, &ldquo;V&rdquo; and &ldquo;W&rdquo; are put at the end of the alphabetical sequence, while the Beatus cipher treats them as identical to the letters they were derived from, so that I=J=9 and U=V=W=200.",
	"Cabala Simplex": "📜 A late Latin / Italian cipher using a reduced alphabet with only 22 letters (no &ldquo;K&rdquo;, so C=K).",
	"Roman Numerals": "📜 Following Roman numerical notation, assigns values only to specific letters of the alphabet (I=1, V=5, X=10, etc).<br><br>Though frequently underestimated as a system of Gematria, Roman numerals have historically been used as a kind of cryptographic cipher, encoding specific values in seemingly normal text - the book &ldquo;FaMa e sCanzIa ReDUX&rdquo;, published by Johannes Bureus in 1616, encodes the year of its own publication this way.",
	"English Qaballa": "📜 Also known as the &ldquo;ALW&rdquo; cipher and &ldquo;NAEQ&rdquo; (&ldquo;New Aeon English Qaballa&rdquo;).<br><br>Discovered on November 26, 1976 by James Lees, and derived from counting the letters in cycles of eleven; thus after A=1 comes L=2, then W=3, until P=26.",
	"Cipher X": "📜 Discovered by Edgar Joel Love, a base-3 inversion of English Qaballa.",
	"Trigrammaton Qabalah": "📜 Developed by R. Leo Gillis using Crowley&rsquo;s own English-letter attributions to the 27 trigrams of Liber Trigrammaton sub figura XXVII.",
	"Elevenfold Qabalah": "📜 Also known as &ldquo;Abrahadabra Cipher&rdquo;.<br><br>Makes a direct correspondence between the letters of the alphabet and the numbers from 1 to 11, restarting the cycle after 11 (so after K=11 comes L=1, M=2, etc, until Z=4).",
	"Toavotea Key": "📜 Discovered by John Farthing II (Frater Omnia Redementur) on January 26, 2003, its name derives from the phrase &ldquo;The Order And Value Of The English Alphabet&rdquo;.<br><br>Based on the &ldquo;grid&rdquo; in the manuscript of the Book of the Law.",
	"Mars Kamea Gematria": "📜 Discovered by Frater RIKB in April 2003.<br><br>Noting that there are 26 letters in the English alphabet and 25 numbers in the Magic Square (&ldquo;Kamea&rdquo;) of Mars, Frater RIKB took &ldquo;A&rdquo; as Zero and found the remaining correspondences by pasting the letters &ldquo;from right to left and from top to bottom&rdquo;.",
	"English Qabalah 31": "📜 Proposed by Shawn Knight; based on counting the letters in cycles of 31, so that after A=1 comes F=2, then K=3, P=4, etc, until V=26.<br><br>31 is relevant in a Thelemic context as the numerical value of &ldquo;AL&rdquo; in Hebrew Gematria, a major key to the Book of the Law as discovered by Charles Stansfeld Jones (&ldquo;Frater Achad&rdquo;) in his Liber 31.",
	"Alphanumeric Qabbala": "📜 Also known as &ldquo;Alphanumeric Gematria&rdquo;, &ldquo;Anglossic Qabbala&rdquo;, or simply &ldquo;AQ&rdquo;: a continuous, non-redundant, alphanumeric sequence from 0 to Z, so that after 9=9 comes A=10, then B=11, etc, until Z=35.<br><br>The name already explains what it is, since A=10 and Q=26, standing for the 10 Indo-Arabic numerals from 0 to 9 and the 26 English letters from A to Z.",
	"Alphanumeric Primes": "🔢 A direct correspondence between the 36 alphanumeric digits 0-Z and the sequence of prime numbers, so that 0 = 0<sup>th</sup> prime = 1, 1 = 1<sup>st</sup> prime = 2, etc, until Z = 35<sup>th</sup> prime = 149.",
	"Alphanumeric Trigonal": "🔢 Same principle as Alphanumeric Primes, adapted to the sequence of trigonal (triangular) numbers.",
	"Alphanumeric Squares": "🔢 Same principle as the ciphers above, associating the alphanumeric digits 0-Z with the sequence of tetragonal (square) numbers.",
	"Alphanumeric Satanic": "📜 Expands the alphanumeric sequence to include the numerals 0-9, lowercase a-z, and uppercase A-Z - identical in structure to base-62 notation.<br><br>Originally called &ldquo;Satanic Qabbala&rdquo;, being a fusion of Alphanumeric Qabbala and Satanic Gematria, before this name.",
	"Alphanumeric Halves": "📜 Inspired by Gematria of Nothing: an alphanumeric cipher that also includes negative values, first the numbers from 0 to 17, then the negative numbers from -17 to 0, so that &ldquo;Z&rdquo; (the initial letter of &ldquo;Zero&rdquo;) corresponds to 0 as well.<br><br>Named by Mikhail, the programmer who made the original GEMATRO.",
	"Synx": "📜 Makes a direct correspondence between the 36 alphanumeric digits 0-Z and the 36 divisors of 1260, the smallest natural number having exactly 36 divisors.<br><br>Originally called &ldquo;Alphanumeric 1260&rdquo;, later changed to &ldquo;Synx&rdquo; due to a series of synchronicities involving this cipher. Discovered in 2024 by Gematria Research.",
	"Standard Alternative": "📜 Similar to Standard, except that after reaching the number 100, the sequence progresses in tens instead of hundreds (so after S=100 comes T=110, then U=120, etc, until Z=170).<br><br>The first known source to mention this cipher is Johann Henning&rsquo;s &ldquo;Cabbalologia&rdquo; (1683), which uses the Elizabethan English alphabet with 24 letters.",
	"Satanic Reverse": "🔁 Reverses the order of the alphabet, while following the same numerical sequence (from 36 to 61) as Satanic Gematria.",
	"Zeroing Key": "📜 Created by Mikhail, using both positive and negative numbers in a symmetrical fashion.",
	"Mirroring Key": "📜 Created by Mikhail, using both positive and negative numbers in a symmetrical fashion.",
	"Archaic Alphanumeric": "📜 Follows the same principle as Alphanumeric Qabbala, assigning the letters of the Elizabethan English alphabet specific values so that after 9 comes A=10, then B=11, etc, until Z=33 &ndash; not forgetting that I=J and U=V.<br><br>Originally called &ldquo;AQ-24&rdquo;, also sometimes called &ldquo;Baconian Alphanumeric&rdquo;.",
	"Elizabethan 360": "🔢 Makes a direct association between the 24 letters of the Elizabethan English alphabet and the 24 divisors of 360, the smallest natural number that has exactly 24 divisors.",
	"QWERTY": "⌨️ Modern cipher based on the QWERTY keyboard layout.",
	"Numeric QWERTY": "⌨️ Modern cipher based on the QWERTY keyboard layout, but including the digits (1-0) at the start of the alphanumeric sequence.",
	"Illuminati Novice": "🔐 This cryptographic substitution cipher was used by the Bavarian Order of the Illuminati to conceal words, names or phrases in private correspondence.<br><br>Letters were replaced by numbers, so the name &ldquo;Savioli&rdquo; would have been written as &ldquo;18.12.20.4.14.2.4.&rdquo;",
	"Franz Bardon": "🔐 A cipher alphabet used by Franz Bardon to communicate spirit names to his students and friends.",
	"Rydumy": "🔐 Shared by John Opsopaus in 2002 on his Biblioteca Arcana website, devised specifically for the Latin language.<br><br>&ldquo;Rydumy&rdquo; translates as &ldquo;Latina&rdquo;, meaning &ldquo;Lingua Latina&rdquo;, the Latin language.",
	"Alfabeto Carbonaro": "🔐 A simple substitution cipher used by the Italian Carboneria, a secret revolutionary society formed in Italy and operated in several countries.",
	"Cryptographic AQ": "🔐 The cryptographic counterpart of Alphanumeric Qabbala.",
	"Heximal AQ": "🔐 Another cryptographic counterpart of Alphanumeric Qabbala, but converting the values of the letters to their base-6 equivalent.",
	"English Trigon": "🔐 &ldquo;The 36 Paths&rdquo;, a method based on the &ldquo;English Trigon&rdquo;, or Alphanumeric Triangle.",
	"AQ Astrology": "🎲 An experimental table of planetary correspondences for Alphanumeric Qabbala, based on the oracle &ldquo;AstroDice&rdquo;.",
	"Kabbalistic (Sepharial)": "📜 Makes a direct correspondence between English letters and the letters of the Hebrew alphabet, assigning the corresponding values according to Hebrew Gematria (so &ldquo;A&rdquo; = Hebrew letter Aleph = 1, etc) - this variant follows the Kabbalistic system of Sepharial (Walter Gorn Old).<br><br>Choosing between the several ciphers built this way is largely a question of personal taste.",
	"Primes": "🔢 Like Alphanumeric Primes and the Polygonal ciphers, makes each English letter correspond to a prime number, starting at A=2 (first prime).",
	"Satanic Gematria": "📜 Devised by Alexander Marcussen around 2008, and published in his book &ldquo;A Step Into The Numeric Enigma of God&rdquo; (2015).<br><br>Begins with A=36, the 36<sup>th</sup> triangular number being 666, and ends with Z=61, the 18<sup>th</sup> (6+6+6) prime number - the name &ldquo;Satanic Gematria&rdquo; itself adds to 666 in this cipher.",
	"Prime Qabalah": "📜 Devised by David Rankine, published in his book &ldquo;Becoming Magick: New &amp; Revised Magicks from the New Aeon&rdquo; (2004).",
	"William G. Gray": "📜 Devised by William G. Gray, published in his book &ldquo;Qabalistic Concepts: Living the Tree&rdquo; (1997).",
	"Hebrew Sofit": "✡️ Includes the final (Hebrew: &#1505;&#1493;&#1508;&#1497;&#1514; &ldquo;sofit&rdquo;) values of the letters Khaph (=500), Mem (=600), Nun (=700), Phe (=800) and Tzaddi (=900).",
	"Greek Ordinal 24": "🏺 The obsolete letters (Vau/Digamma, Qoppa and Sampi) are discarded, and values are given to the letters based on their order in the modern Greek alphabet.",
	"Glagolitic Numerals": "🌍 A hypothetical table of numerical correspondences for the letters of the old Glagolitic script, based on possible equivalences between the Glagolitic and Cyrillic scripts.",

	// ---- Gematria ----
	"Single Reduction": "➗ Digit-sums the ordinal value exactly once - not down to a single digit. S (19<sup>th</sup> letter) sums to 10 and stays there, rather than reducing again to 1.",
	"KV Exception": "➗ Single Reduction, except K and V keep their full ordinal value (11 and 22) instead of being digit-summed.",
	"SKV Exception": "➗ Single Reduction, except S, K and V keep their unreduced value instead of being digit-summed further.",
	"Capitals Added": "🔢 Lowercase a-z score 1-26, the usual Ordinal.<br><br>Capital A-Z don&rsquo;t repeat 1-26 though - they continue the count, scoring 27-52.",
	"English Sumerian": "🔢 Each letter&rsquo;s ordinal position &times; 6, so A=6 through Z=156.",
	"Reverse Sumerian": "🔁 The Z-to-A reversal of English Sumerian: Z=6 through A=156.",
	"Jewish": "📜 The Hebrew-style units/tens/hundreds numbering (like Standard), fit to the English alphabet.<br><br>J, V and W have no Hebrew equivalent, so they&rsquo;re tacked onto the end with the highest leftover values (600, 700 and 900).",
	"Fibonacci": "🔢 The Fibonacci sequence (1, 1, 2, 3, 5, 8, 13&hellip;) assigned in order up to the alphabet&rsquo;s midpoint, then mirrored back down for the second half.",
	"Squares": "🔢 Each letter&rsquo;s value is its ordinal position squared: 1, 4, 9, 16&hellip; up to Z=676.",
	"Trigonal": "🔢 Each letter&rsquo;s value is its ordinal position&rsquo;s triangular number: 1, 3, 6, 10&hellip; up to Z=351.",
	"Septenary": "🔢 Counts 1 to 7 and back down to 1 in a repeating zigzag, cycling every 12 letters.",
	"Chaldean": "📜 The traditional Chaldean numerology chart.<br><br>Every letter maps to a value from 1-8 - 9 is deliberately never assigned, treated as a sacred, complete number on its own.",

	// ---- Reverse ----
	"Reverse Single Reduction": "🔁 The Z-to-A reversal of Single Reduction.",
	"Reverse Standard": "🔁 The Z-to-A reversal of Standard.",
	"R Standard Alternative": "🔁 The Z-to-A reversal of Standard Alternative.",
	"EP Exception": "🔁 Reverse Single Reduction, with E and P kept at their unreduced value instead of being digit-summed.",
	"EHP Exception": "🔁 Reverse Single Reduction, with E, H and P kept at their unreduced value instead of being digit-summed.",
	"Reverse Caps Added": "🔁 The Z-to-A reversal of Capitals Added: capitals continue the reversed count downward instead of repeating it.",
	"Reverse Caps Mixed": "🔁 Like Reverse Caps Added, but lowercase and uppercase letters are interleaved (a, A, b, B, c, C&hellip;) rather than run as two separate blocks.",
	"Reverse Primes": "🔁 The Z-to-A reversal of Primes: Z is the 1<sup>st</sup> prime (2), Y the 2<sup>nd</sup> (3), and so on back to A.",
	"Reverse Squares": "🔁 The Z-to-A reversal of Squares: Z=1, Y=4, X=9&hellip; back to A=676.",
	"Reverse Trigonal": "🔁 The Z-to-A reversal of Trigonal: Z=1, Y=3, X=6&hellip; back to A=351.",

	// ---- Elizabethan (Archaic) ----
	"Archaic Ordinal": "🏰 Ordinal (1, 2, 3&hellip;) counted across the 24-letter Elizabethan alphabet, where I=J and U=V share a value instead of counting separately.",
	"Archaic Reverse": "🏰 The Z-to-A reversal of Archaic Ordinal, run across the 24-letter Elizabethan alphabet.",
	"Archaic Reduction": "🏰 Digit-sums Archaic Ordinal&rsquo;s value down to one digit.",
	"Archaic R Reverse": "🏰 Digit-sums Archaic Reverse&rsquo;s value down to one digit.",
	"Archaic Standard": "🏰 The units/tens/hundreds Standard scheme run across the 24-letter Elizabethan alphabet, where I=J and U=V share a value.",
	"Archaic R Standard": "🏰 The Z-to-A reversal of Archaic Standard, run across the 24-letter Elizabethan alphabet.",

	// ---- Extra ----
	"ASCII Lowercase": "⌨️ Each letter&rsquo;s value is its own lowercase ASCII/Unicode code point (a=97&hellip;z=122) - the raw character code used as the number.",
	"ASCII Uppercase": "⌨️ Each letter&rsquo;s value is its uppercase ASCII/Unicode code point (A=65&hellip;Z=90), even though the cypher is entered in lowercase.",
	"Capitals Mixed": "🔢 Lowercase and uppercase letters interleaved (a, A, b, B, c, C&hellip;), each pair counting up together - both cases of the same letter share consecutive values instead of one case following the other.",
	"False Kabbalah": "🔢 Digits 0-9 and letters a-z run together as one continuous count starting at 36, so &lsquo;0&rsquo;=36 through &lsquo;z&rsquo;=65.<br><br>Mimics Alphanumeric Qabbala&rsquo;s continuous sequence, but starting from a different offset.",
	"Keypad": "⌨️ Each letter&rsquo;s value is the digit it shares a key with on an old phone keypad (2=ABC, 3=DEF, 4=GHI&hellip;).",

	// ---- Illuminati ----
	"Hex": "🔺 Like English Sumerian (each position &times; 6) for the first half of the alphabet, then mirrored back down for the second half.",
	"Illuminati Reverse": "🔺 A reversed, split count: descends from 24 down to 13 across the first half of the alphabet, then resets and climbs from 1 to 12 across the second half.",

	// ---- Latin ----
	"Latin Ordinal": "🏛️ Ordinal (1, 2, 3&hellip;) counted through the 23-letter Classical Latin alphabet.<br><br>J, V and W, which the Romans didn&rsquo;t use, are appended after Z with their own values rather than counted in sequence.",
	"Latin Reduction": "🏛️ Digit-sums Latin Ordinal&rsquo;s value down to one digit.",
	"Beatus Ordinal": "🏛️ Ordinal counted through the Beatus alphabet, where I=J share a value and U=V=W share a value (23 effective letters).",
	"Beatus Reduction": "🏛️ Digit-sums Beatus Ordinal&rsquo;s value down to one digit.",
	"Classical Latin": "🏛️ Ordinal count through the Classical Latin alphabet: J, U and W score 0, since Classical Latin didn&rsquo;t use them, while the remaining 23 letters count 1 to 23.",
	"Carolingian Minuscule": "🏛️ Like Classical Latin, but scores J, V and W as 0 instead of J, U and W - reflecting that Carolingian minuscule script had a distinct &lsquo;u&rsquo; but not yet separate J or V.",

	// ---- Maths ----
	"√ 2": "🔢 Spells out the decimal digits of &radic;2 (1.4142135623&hellip;) in order, one digit per letter.",
	"√ 3": "🔢 Spells out the decimal digits of &radic;3 (1.7320508075&hellip;) in order, one digit per letter.",
	"√ 5": "🔢 Spells out the decimal digits of &radic;5 (2.2360679774&hellip;) in order, one digit per letter.",
	"√ 6": "🔢 Spells out the decimal digits of &radic;6 (2.4494897427&hellip;) in order, one digit per letter.",
	"√ 7": "🔢 Spells out the decimal digits of &radic;7 (2.6457513110&hellip;) in order, one digit per letter.",
	"√ 8": "🔢 Spells out the decimal digits of &radic;8 (2.8284271247&hellip;) in order, one digit per letter.",
	"√ 10": "🔢 Spells out the decimal digits of &radic;10 (3.1622776601&hellip;) in order, one digit per letter.",
	"Binary": "🔢 Each letter&rsquo;s value is the count of 1s in the binary representation of its ordinal position - C, at position 3 (11 in binary), scores 2.",
	"Composite": "🔢 Each letter&rsquo;s value is the n<sup>th</sup> composite (non-prime) number in order: A=4 (1<sup>st</sup> composite), B=6 (2<sup>nd</sup>), C=8 (3<sup>rd</sup>)&hellip;",
	"e 2.71": "🔢 Spells out the decimal digits of e (2.7182818284&hellip;) in order, one digit per letter.",
	"Fibonacci Reduced": "➗ Digit-sums the Fibonacci sequence&rsquo;s values down to one digit, instead of using them at full size like Fibonacci.",
	"Progression": "🔢 Doubles from 1 each letter (1, 2, 4, 8, 16&hellip;) and digit-sums the result down to one digit, producing a repeating 1, 2, 4, 8, 7, 5 cycle.",
	"Pyramid": "🔢 Each letter&rsquo;s value is the sum of squares from 1 to its position, the &ldquo;square pyramidal&rdquo; number: A=1&sup2;, B=1&sup2;+2&sup2;=5, C=1&sup2;+2&sup2;+3&sup2;=14&hellip;",
	"π 3.141": "🔢 Spells out the decimal digits of &pi; (3.14159265&hellip;) in order, one digit per letter.",
	"π 3.144": "🔢 Spells out this cypher&rsquo;s own &pi; approximation (3.144&hellip;) in order, one digit per letter - a different rounding from the standard &pi; 3.141 cypher alongside it, in the spirit of the &ldquo;pyramid &pi;&rdquo; (&asymp;3.1446) sometimes cited in pyramidology.",
	"ϕ 1.61": "🔢 Spells out the decimal digits of the golden ratio &phi; (1.6180339887&hellip;) in order, one digit per letter.",

	// ---- Alphanumeric ----
	"Numeric QWERTY Primes": "⌨️ Like Numeric QWERTY, but instead of counting 1, 2, 3&hellip; in keyboard order, each key gets the next prime number (2, 3, 5, 7, 11&hellip;).",

	// ---- Alchemology ----
	"Ancient Greek Alchemology": "⚗️ The Alchemology numbering scheme (1, 4, 7, 9, 11, 12, 14&hellip;) applied to the Ancient Greek alphabet, in place of a historical value chart.",
	"Chaldean Alchemology": "⚗️ The Alchemology numbering scheme applied to the same 26 letters as Chaldean, in place of the traditional 1-8 Chaldean chart.",
	"Classical Latin Alchemology": "⚗️ The Alchemology numbering scheme applied to the Classical Latin alphabet (J, U and W scored 0, as in Classical Latin).",
	"English Alchemology": "⚗️ The Alchemology numbering scheme (1, 4, 7, 9, 11, 12, 14, 16, 19, 20, 23&hellip;) applied straight down the English alphabet.",
	"Greek Proton Alchemology": "⚗️ The Alchemology numbering scheme applied to the Greek alphabet, using a more compressed value spacing than Ancient Greek Alchemology.",
	"Hebrew Alchemology": "⚗️ The Alchemology numbering scheme applied to the Hebrew alphabet, in place of the traditional Hebrew Gematria chart.",
	"Modern Greek Alchemology": "⚗️ The Alchemology numbering scheme applied to the Modern Greek alphabet.",
	"Prime Alchemology": "⚗️ A variant of the Alchemology numbering keyed to prime-numbered letter positions, reusing the same small set of core values (1, 4, 7, 9, 11, 14, 16) rather than counting upward.",
	"Pythagorean Alchemology": "⚗️ Cycles through the first 9 Alchemology values (1, 4, 7, 9, 11, 12, 14, 16, 19) repeatedly, the way Pythagorean-style reduction cycles through 1-9.",
	"Russian Alchemology": "⚗️ The Alchemology numbering scheme applied to the Russian Cyrillic alphabet.",
	"π 3.144 Alchemology": "⚗️ Applies the Alchemology numbering scheme as index positions into &pi; 3.144&rsquo;s own digit sequence, rather than reading its digits in plain letter order.",
	"ϕ 1.61 Alchemology": "⚗️ Applies the Alchemology numbering scheme as index positions into &phi; 1.61&rsquo;s own digit sequence, rather than reading its digits in plain letter order.",

	// ---- Cryptography ----
	"Illuminati Novice Wheel": "🔐 The same dotted-number substitution as Illuminati Novice (&ldquo;18.12.20.4&hellip;&rdquo;), computed from a rotating cypher wheel instead of a fixed lookup.",

	// ---- Experimental ----
	"Aphrodite": "🔢 Each letter&rsquo;s ordinal position &times; 5.",
	"Aphrodite Reduced": "➗ Digit-sums Aphrodite&rsquo;s value (position &times; 5) down to one digit.",
	"Ophiuchus": "🎲 Counts 1 to 13 and repeats - 13 for the 13 constellations of the zodiac, the traditional 12 plus Ophiuchus itself.",
	"Scrabble": "🔢 Each letter&rsquo;s value is its official English Scrabble tile score - Q and Z score 10, common letters like E and A score 1.",
	"Sun & Moon": "🔢 Each letter&rsquo;s ordinal position &times; 8.",

	// ---- Polygonal ----
	"Pentagonal": "🔷 Each letter&rsquo;s value is its position&rsquo;s pentagonal number: 1, 5, 12, 22, 35&hellip;",
	"Hexagonal": "🔷 Each letter&rsquo;s value is its position&rsquo;s hexagonal number: 1, 6, 15, 28, 45&hellip;",
	"Heptagonal": "🔷 Each letter&rsquo;s value is its position&rsquo;s heptagonal number: 1, 7, 18, 34, 55&hellip;",
	"Octagonal": "🔷 Each letter&rsquo;s value is its position&rsquo;s octagonal number: 1, 8, 21, 40, 65&hellip;",
	"Nonagonal": "🔷 Each letter&rsquo;s value is its position&rsquo;s nonagonal number: 1, 9, 24, 46, 75&hellip;",
	"Decagonal": "🔷 Each letter&rsquo;s value is its position&rsquo;s decagonal number: 1, 10, 27, 52, 85&hellip;",

	// ---- Languages ----
	"Arabic": "🌍 The traditional Arabic Abjad numeral values for each letter, with several letter variants and ligatures sharing their base letter&rsquo;s value.",
	"Arabic Full": "🌍 Like Arabic, but covering the fuller Arabic letter set, including extra variant forms.",
	"Arabic Ordinal": "🌍 Ordinal count (1, 2, 3&hellip;) through the Arabic alphabet, with several letter variants sharing a count position.",
	"Arabic Reduced": "🌍 Digit-sums the Arabic Ordinal value down to one digit.",
	"Arabic Reduction": "🌍 Digit-sums the Arabic Abjad value down to one digit.",
	"Armenian Numerals": "🌍 The traditional Armenian numeral values, following the same units/tens/hundreds/thousands pattern as Greek and Hebrew.",
	"Armenian Ordinal": "🌍 Ordinal count (1, 2, 3&hellip;) through the Armenian alphabet.",
	"Armenian Reduction": "🌍 Digit-sums the Armenian Ordinal value down to one digit.",
	"Devanagari Ordinal": "🌍 Ordinal count (1, 2, 3&hellip;) through the Devanagari (Hindi/Sanskrit) alphabet.",
	"Devanagari Reduction": "🌍 Digit-sums the Devanagari Ordinal value down to one digit.",
	"Georgian Numerals": "🌍 The traditional Georgian numeral values (units, tens, hundreds, thousands) for the Georgian alphabet.",
	"Georgian Ordinal": "🌍 Ordinal count (1, 2, 3&hellip;) through the Georgian alphabet.",
	"German Ordinal": "🌍 Ordinal count (1, 2, 3&hellip;) through the German alphabet, with &auml;, &ouml;, &uuml; and &szlig; appended after Z.",
	"Icelandic Ordinal": "🌍 Ordinal count (1, 2, 3&hellip;) through the Icelandic alphabet, with its extra letters counted in their normal alphabetical place.",
	"Kana Ordinal": "🌍 Ordinal count (1, 2, 3&hellip;) through the Japanese hiragana syllabary.",
	"Katakana Ordinal": "🌍 Ordinal count (1, 2, 3&hellip;) through the Japanese katakana syllabary.",
	"Norwegian Ordinal": "🌍 Ordinal count (1, 2, 3&hellip;) through the Norwegian alphabet, with &aelig;, &oslash; and &aring; appended after Z.",
	"Persian Abjad": "🌍 The traditional Persian Abjad numeral values, an extension of the Arabic Abjad system to Persian&rsquo;s extra letters.",
	"Persian Reduction": "🌍 Digit-sums the Persian Abjad value down to one digit.",
	"Polish Ordinal": "🌍 Ordinal count (1, 2, 3&hellip;) through the Polish alphabet, with its accented letters counted in their normal alphabetical place.",
	"Romanian Ordinal": "🌍 Ordinal count (1, 2, 3&hellip;) through the Romanian alphabet, with its accented letters counted in their normal alphabetical place.",
	"Russian Ordinal": "🌍 Ordinal count (1, 2, 3&hellip;) through the Russian Cyrillic alphabet.",
	"Russian R Ordinal": "🌍 The Z-to-A reversal of Russian Ordinal.",
	"Russian R Reduction": "🌍 The Z-to-A reversal of Russian Reduction.",
	"Russian Reduction": "🌍 Digit-sums the Russian Ordinal value down to one digit.",
	"Spanish Ordinal": "🌍 Ordinal count (1, 2, 3&hellip;) through the Spanish alphabet, with &ntilde; counted in its normal alphabetical place.",
	"Swedish Ordinal": "🌍 Ordinal count (1, 2, 3&hellip;) through the Swedish alphabet, with &aring;, &auml; and &ouml; appended after Z.",
	"Thai Ordinal": "🌍 Ordinal count (1, 2, 3&hellip;) through the Thai alphabet.",
	"Turkish Ordinal": "🌍 Ordinal count (1, 2, 3&hellip;) through the Turkish alphabet, with its extra letters counted in their normal alphabetical place.",

	// ---- Hebrew ----
	"Hebrew Gematria": "✡️ The traditional Hebrew Gematria value chart: 1-9 for the first nine letters, 10-90 for the next nine, 100-400 for the last.<br><br>The five final letter forms (&#1498; &#1501; &#1503; &#1507; &#1509;) are valued at 500-900.",
	"Hebrew Ordinal": "✡️ Ordinal count (1, 2, 3&hellip;) through the Hebrew alphabet, with the five final letter forms sharing their base letter&rsquo;s position.",
	"Hebrew Reduction": "✡️ Digit-sums the Hebrew Ordinal value down to one digit.",
	"Hebrew Atbash": "📜 The ancient Atbash substitution: the Hebrew alphabet mapped onto itself in reverse, first letter for last (Aleph&harr;Tav), so each letter&rsquo;s value is its mirrored counterpart&rsquo;s position.",
	"Hebrew ϕ 1.61": "🔢 Spells out the decimal digits of the golden ratio &phi; (1.6180339887&hellip;) across the Hebrew alphabet, one digit per letter.",
	"Hebrew Prime": "🔢 Each Hebrew letter&rsquo;s value is the n<sup>th</sup> prime number, in alphabet order (Aleph=2, Bet=3, Gimel=5, Dalet=7&hellip;).",

	// ---- Greek ----
	"Greek Isopsephy": "🏺 The traditional Greek Isopsephy value chart: 1-9, 10-90, 100-900, following the same units/tens/hundreds pattern as Hebrew Gematria.",
	"Greek Ordinal": "🏺 Ordinal count (1, 2, 3&hellip;) through the Greek alphabet.",
	"Greek Reduction": "🏺 Digit-sums the Greek Ordinal value down to one digit.",
	"Modern Greek Reduced": "🏺 Digit-sums the Modern Greek alphabet&rsquo;s ordinal value down to one digit, using the 24-letter modern alphabet rather than the fuller classical one.",
	"Ancient Greek √3": "🏺 Spells out the decimal digits of &radic;3 (1.7320508075&hellip;) across the Ancient Greek alphabet, one digit per letter.",
	"Modern Greek √3": "🏺 Spells out the decimal digits of &radic;3 (1.7320508075&hellip;) across the 24-letter Modern Greek alphabet."
}

function cipherInfoBody(c) {
	var text = cipherInfoText[c.cipherName]
	if (text) return '<p>' + text + '</p>'
	return '<p class="qgNote">Not yet documented.</p>'
}

function cipherInfoTopicHtml() {
	if (typeof cCat === "undefined" || typeof cipherList === "undefined" || cCat.length === 0) {
		return '<p class="qgNote">Cyphers have not finished loading yet - close this and reopen the guide.</p>'
	}

	var o = '<p class="qgNote">Where noted, descriptions are drawn from &ldquo;Information on Ciphers &amp; Suggested Bibliography&rdquo; by Luís Gonçalves, Gematria Research.</p>'

	for (var i = 0; i < cCat.length; i++) {
		var cat = cCat[i]
		var members = cipherList.filter(function (c) { return c.cipherCategory === cat })
		if (members.length === 0) continue

		o += '<details class="qgAcc"><summary>' + cat + '</summary><div class="qgAccBody">'
		if (cipherCategoryIntro[cat]) o += '<p>' + cipherCategoryIntro[cat] + '</p>'
		for (var j = 0; j < members.length; j++) {
			o += '<details class="qgAcc qgAccNested"><summary>' + members[j].cipherName + '</summary><div class="qgAccBody">' + cipherInfoBody(members[j]) + '</div></details>'
		}
		o += '</div></details>'
	}

	return o
}

function quickGuideTopicBtn(t) {
	var on = (quickGuideTopic === t.id) ? " qgTopicOn" : ""
	return '<input class="intBtn3 qgTopicBtn'+on+'" type="button" value="'+t.label+'" onclick="quickGuideShow(&quot;'+t.id+'&quot;)">'
}

function quickGuideBody() {
	for (var i = 0; i < quickGuideTopics.length; i++) {
		var t = quickGuideTopics[i]
		// "Cyphers (Info)" builds its html from the live cCat / cipherList at
		// open time (via .render) instead of a fixed .html string, so its
		// categories can never drift out of sync with the real Cyphers menu.
		if (t.id === quickGuideTopic) return t.render ? t.render() : t.html
	}
	return ""
}

// Repaints the buttons and the body only, so the credits underneath are left
// alone and switching topics does not rebuild the whole panel.
function quickGuideShow(id) {
	quickGuideTopic = id
	var btns = document.getElementById("qgTopicBar")
	var body = document.getElementById("qgBody")
	if (btns === null || body === null) return
	var b = ""
	for (var i = 0; i < quickGuideTopics.length; i++) b += quickGuideTopicBtn(quickGuideTopics[i])
	btns.innerHTML = b
	body.innerHTML = quickGuideBody()
	body.scrollTop = 0
}

// Credits, shown under every topic rather than hidden behind one.
function quickGuideThanks() {
	return '<p><span class="qgBold2">Special Thanks</p>\n<ul><li><span class="qgBold"> Spawn From</span> - <span class="qgBold"><a href="https://gematrinator.com/calculator" target="_blank">@Gematrinator</a></span> & <span class="qgBold"><a href="https://gematro.github.io/" target="_blank">@Gematro</a></span>.</li> Cyphers is possible due to their original code. <br> Gematro is considered a Cyphers co-founder.<br> His username was @Saun_Virroco back then. <br> Cyphers News = [155 Ordinal] = Saun_Virroco. <br><br> <li><span class="qgBold">Cyphers - suggestions by</span> <span class="qgBold"><a href="https://gematriaresearch.blogspot.com/" target="_blank">@GematriaResearch.</a> <br> Known as Alektryon and our third co-founder. </span></li><br><li><span class="qgBold">Cyphers News</span> - by Net Void. Calculator by: <br> Gematro. Contributors: Gematria Research, <br> Lake Onyx, Truth Audit, and Hyperdope. <br><br><li> <span class="qgBold">Gematria Club</span> - for actively promoting the site.</li><br><li><span class="qgBold">The CCRU</span> - Cybernetic Culture Research Unit.<br>Thanks to legend <span class="qgBold"><a href="https://x.com/xenocosmography" target="_blank">@Xenocosmography</a></span> and <br> scholar Gematria Research for the list:<br> Alphanumeric Qabbala & QWERTY cyphers. <br> Spawned since computer era - 1990s & Y2K. <br><br></li><li><span class="qgBold">[Disclaimer]</span> - <span class="qgBold">Synx</span> was discovered in 2024 <br>by <span class="qgBold"><a href="https://gematriaresearch.blogspot.com/" target="_blank">@GematriaResearch.</a></span> It is used in tandem.</li><br><li><span class="qgBold">Contact Us</span> - <span class="qgBold"><a href="https://x.com/CyphersNews" target="_blank">@CyphersNews</a></span> for more. </a></li></ul>'
}

// startTopic lets the About menu's "Cyphers (Info)" button jump straight to
// that topic instead of always landing on Basics, without needing a second,
// near-identical panel of its own.
function displayQuickstartGuide(startTopic) {
	$('<div id="darkOverlay" onclick="closePanel(&quot;.quickGuide&quot;)"></div>').appendTo('body'); // overlay

	quickGuideTopic = startTopic || "basics"

	var o = '<div class="quickGuide">'
	o += '<p><span class="qgBold2">Quickstart Guide</p>'
	o += '<p class="qgIntro">Pick a topic.</p>'

	o += '<div id="qgTopicBar" class="qgTopicBar">'
	for (var i = 0; i < quickGuideTopics.length; i++) o += quickGuideTopicBtn(quickGuideTopics[i])
	o += '</div>'

	o += '<div id="qgBody" class="qgBody">'
	o += quickGuideBody()
	o += '</div>'

	o += '<hr class="numPropSeparator">'
	o += quickGuideThanks()

	o += '</div>'

	$(o).appendTo('body'); // guide
	$('body').addClass('noScroll') // prevent scrolling
}

// ========================= Gematro credit =========================
//
// Opened from the About menu, where this was a plain line of text. It is the
// attribution for the whole calculator, so it says plainly what is original
// work and what is ours, and it routes feedback to the right person: notes on
// the original software go to Mikhail, everything else comes to us.
//
// Same shell as the guide and the contact panel - .quickGuide carries the
// overlay, the sizing and the close behaviour, and closePanel(".quickGuide")
// therefore closes this too.

var GEMATRO_EMAIL = "mmiikh96@gmail.com"

function displayGematroCredit() {
	$('<div id="darkOverlay" onclick="closePanel(&quot;.quickGuide&quot;)"></div>').appendTo('body');

	var o = '<div class="quickGuide creditPanel">'
	o += '<p><span class="qgBold2">Coded by Gematro in 2021</span></p>'

	o += '<p>This calculator that you&rsquo;re using is based entirely on the original '
	o += '<span class="qgBold">GEMATRO</span> calculator by Mikhail, with some changes and '
	o += 'additions by Cyphers News.</p>'

	o += '<p>Send any suggestions or feedback about the original software to '
	o += '<a href="mailto:' + GEMATRO_EMAIL + '">' + GEMATRO_EMAIL + '</a> '
	o += '(Mikhail, the original author of this software). Otherwise contact: '
	o += '<a href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + '</a>.</p>'

	o += '</div>'

	$(o).appendTo('body');
	$('body').addClass('noScroll') // prevent scrolling
}

// ========================== Contact panel =========================
//
// Opens the visitor's own mail app with the subject already set, rather than
// posting anywhere: there is no server here to receive a form, and a mailto
// keeps a copy in their sent items so they have a record of what they asked.

// General is also CONTACT_EMAIL - the credit panel above only ever needed one
// address, and every other use in this file already went through that name.
var CONTACT_EMAIL_GENERAL = "hello@cyphers.news"
var CONTACT_EMAIL_PRESS = "press@cyphers.news"
var CONTACT_EMAIL_SUPPORT = "support@cyphers.news"
var CONTACT_EMAIL = CONTACT_EMAIL_GENERAL

var contactTopics = [
	"Add a phrase to the database",
	"Correction to a cypher",
	"Delete my account",
	"Feature request",
	"Leaderboard or submissions",
	"Membership or account help",
	"Partnership or press",
	"Report a bug",
	"Something else",
	"Suggest a cypher to add"
]

// Three addresses by purpose rather than one inbox for everything, so press
// and bug reports do not have to be triaged out of general mail by hand.
// Listed here, not just in the signed-out fallback, so they are visible
// whether or not the message form above them is being used.
function contactEmailList() {
	var o = '<div class="contactEmails">'
	o += '<div class="contactEmailRow"><span class="contactEmailLabel">General</span><a href="mailto:' + CONTACT_EMAIL_GENERAL + '">' + CONTACT_EMAIL_GENERAL + '</a></div>'
	o += '<div class="contactEmailRow"><span class="contactEmailLabel">Press</span><a href="mailto:' + CONTACT_EMAIL_PRESS + '">' + CONTACT_EMAIL_PRESS + '</a></div>'
	o += '<div class="contactEmailRow"><span class="contactEmailLabel">Bugs & support</span><a href="mailto:' + CONTACT_EMAIL_SUPPORT + '">' + CONTACT_EMAIL_SUPPORT + '</a></div>'
	o += '</div>'
	return o
}

function displayContactPanel() {
	$('<div id="darkOverlay" onclick="closePanel(&quot;.quickGuide&quot;)"></div>').appendTo('body');

	var signedIn = (typeof authUser !== "undefined" && authUser !== null)

	var o = '<div class="quickGuide contactPanel">'
	o += '<p><span class="qgBold2">Contact Us</span></p>'
	o += contactEmailList()

	if (!signedIn) {
		o += '<p class="qgIntro">Prefer the message form instead? Messages are sent from your account, so we know who to reply to and the form cannot be used for spam. Sign in and the box below will send.</p>'
		o += '<div class="contactActions">'
		o += '<a class="intBtn3" href="login.html">Sign in</a>'
		o += '<a class="intBtn3" href="register.html">Create a free account</a>'
		o += '</div>'
		o += '</div>'
		$(o).appendTo('body'); $('body').addClass('noScroll')
		return
	}

	o += '<p class="qgIntro">Or pick a topic and write your message below. It is sent straight to us from here, so there is nothing else to do.</p>'

	o += '<div class="contactField">'
	o += '<label class="contactLabel" for="contactTopic">Topic</label>'
	o += '<select id="contactTopic" class="contactSelect">'
	for (var i = 0; i < contactTopics.length; i++) {
		o += '<option value="' + escHtml(contactTopics[i]) + '">' + escHtml(contactTopics[i]) + '</option>'
	}
	o += '</select></div>'

	o += '<div class="contactField">'
	o += '<label class="contactLabel" for="contactBody">Message</label>'
	o += '<textarea id="contactBody" class="contactTextarea" rows="6" maxlength="4000" placeholder="Anything that helps us understand&hellip;"></textarea>'
	o += '</div>'

	o += '<div class="contactField">'
	o += '<label class="contactLabel" for="contactReply">Reply to</label>'
	o += '<input type="email" id="contactReply" class="contactSelect" value="' + escHtml(authUser.email || "") + '" placeholder="Where should we reply?">'
	o += '</div>'

	o += '<div class="contactActions">'
	o += '<input class="intBtn3" id="contactSendBtn" type="button" value="Send message" onclick="contactSend()">'
	o += '</div>'

	o += '<div id="contactMsg" class="qgNote contactFoot hideValue"></div>'
	o += '</div>'

	$(o).appendTo('body');
	$('body').addClass('noScroll')
}

function contactSend() {
	var topicEl = document.getElementById("contactTopic")
	var bodyEl = document.getElementById("contactBody")
	var replyEl = document.getElementById("contactReply")
	var btn = document.getElementById("contactSendBtn")
	var msg = document.getElementById("contactMsg")

	var show = function (t, warn) {
		msg.className = "qgNote contactFoot" + (warn ? " profileWarn" : " profileOk")
		msg.textContent = t
		msg.classList.remove("hideValue")
	}

	var body = bodyEl ? bodyEl.value.trim() : ""
	if (body === "") { show("Write a message first.", true); return }

	btn.disabled = true
	btn.value = "Sending…"
	contactSubmit(topicEl ? topicEl.value : "", body, replyEl ? replyEl.value : "").then(function () {
		bodyEl.value = ""
		btn.value = "Sent"
		show("Thanks — we have it, and will reply to " + (replyEl && replyEl.value ? replyEl.value : "your account email") + ".", false)
	}).catch(function (err) {
		btn.disabled = false
		btn.value = "Send message"
		show((err && err.message) ? err.message : "Could not send. Try again shortly.", true)
	})
}

# Handoff: element picker (eyedropper) for the Speed Reader extension

Status: SPECIFIED, not built. This document is written so a fresh agent can build
the feature end to end without rediscovering the architecture. Read it top to
bottom before touching code, then follow the change map and verification plan.

## What to build

An element picker for the Chrome extension. The user activates a pick mode,
moves the cursor over the live page, the element under the cursor highlights, and
on click the reader reads ONLY the text inside that element and its descendants.
The user has called this an "eyedropper" or "pendrop" tool. In code and UI, call
it the element picker; the user-facing button label is "Pick element".

This is a new source for the existing reader, not a new reader. Everything about
RSVP, Chunk, Pacer, timing, and settings stays exactly as is. You are adding one
more way to choose WHAT text gets read, alongside the current selection,
Readability, and fallback rungs.

## Repo facts

- Local: `~/code/speed-reader`. Remote: `sblattj/speed-reader` (PRIVATE). Solo repo,
  fresh history, normal git (this is NOT the dotorg shared working tree, so plain
  `git add`/`git commit` on `main` is fine here).
- Build: `bun run build`. It regenerates `index.html` (the standalone page) AND
  `dist/` (the extension) from `src/`, then runs invariant gates and exits
  non-zero if any fail. NEVER hand-edit `index.html` or anything in `dist/`; they
  are generated. Edit `src/` and the `extension/` source files, then rebuild.
- Load unpacked from `~/code/speed-reader/dist` on the Arc/Chrome extensions page
  with Developer mode on.
- `DESIGN.md` is the extension design contract. This feature is a v1.x addition to
  it; fold a short summary into DESIGN.md when done if you like, but it is not
  required to ship.

## Architecture you are plugging into (all current, verified)

### Gesture funnel: `extension/background.js`
Toolbar click, the two keyboard commands, and the two context-menu items all call
one function `invoke(tabId, kind)`. `invoke` does
`chrome.scripting.executeScript({files:["content.js"]})` (safe to inject
repeatedly) and then `chrome.tabs.sendMessage(tabId, {kind})`. `kind` is currently
`"page"` or `"selection"`. Unscriptable pages (chrome://, the Web Store, the PDF
viewer) fail at `executeScript`; that is caught and a red "!" badge flashes for 2s.
No `host_permissions` anywhere; every injection rides the `activeTab` grant from
the gesture.

### Content script: `src/extension/content-main.js` (bundled to `dist/content.js`)
One IIFE, guarded by `window.__SPEED_READER_CONTENT_LOADED__` so a second
injection is a no-op and the first listener handles the follow-up message. Key
pieces you will touch:

- `runExtraction()` returns `{ rung, rungLabel, title, text }`. Rungs today:
  1 Selection (non-collapsed selection, wins on any page), 2 Readability (parses a
  cloned document), 3 Fallback (`extractFallbackText()`), 0 nothing found.
- `extractFallbackText()` walks `main`/`article`/`[role=main]`/`body`, collecting
  `BLOCK_TAGS` text into paragraphs and skipping `SKIP_TAGS`
  (nav/footer/aside/script/style/noscript/template). Its inner `collect(el)` walk
  is EXACTLY the logic the picker needs, just rooted at the picked element instead
  of the page root. Refactor it (see change map).
- Overlay lifecycle: `openOverlay()` -> `buildOverlayDom()` (creates `hostEl`, a
  CLOSED shadow root `shadow`, the scrim, the `sr-ext-card`, header with
  `sr-ext-rung`/`sr-ext-title`/`sr-ext-meta` and a close button, an empty-state
  div, and `sr-ext-reader-root`) -> `renderExtraction(refs, extraction)` (tokenizes
  and calls `mount(readerRootEl, {storage, keyEventTarget: shadow, initialText})`).
  `teardownOverlay(restoreScroll)` removes the host, the key guard, and restores
  `document.documentElement.style.overflow`. Re-invoking while open tears down and
  rebuilds (never stacks).
- `installKeydownGuard()` adds a CAPTURE-phase `document` keydown listener
  (`docKeydownGuard`) that swallows the reader keys (Space, arrows, r, R, Escape),
  handles Escape by closing the overlay, and re-dispatches the rest into the closed
  `shadow` so `mount()`s own listener (registered with `keyEventTarget = shadow`)
  receives them. This is why the overlay does not need `host_permissions` and why
  page shortcuts underneath do not fire.
- Storage: `createChromeStorageAdapter()` over `chrome.storage.sync` using the same
  keys as the standalone page (`sr_wpm`, `sr_theme`, plus the mode/chunk keys the
  reader writes). `readStoredWpm()` and `readStoredTheme()` read a couple directly.

### Reader core (do NOT change): `src/ui/reader.js` exports
`mount(container, {storage, keyEventTarget, initialText:{text,title}})`.
`src/core/*` is DOM-free. The picker must not touch `src/core` or `src/ui`.

## Feature design

### Entry points (build both)
1. Primary, reliable: a "Pick element" button in the overlay header, next to the
   close button. Clicking it enters pick mode from the already-open, already-injected
   overlay. This is the entry you can drive and verify without a real keystroke.
2. Accelerators: a new invocation `kind: "pick"` wired through `background.js`
   (a new context-menu item "Speed read an element", contexts `["page"]`, and
   optionally a new command). Note the verified trap below: extension keyboard
   commands need a REAL keypress, so a command shortcut is a nicety, not the path
   you can automate. The context-menu item is a good middle ground. If you add a
   command, do NOT add any permission; commands are not permissions and the
   manifest gate asserts the permission set is exactly the current five.

Both entries call one function `startElementPicker()`.

### Pick-mode mechanics
`startElementPicker()`:
- If the reader overlay is open, HIDE it rather than tearing it down: set
  `hostEl.style.display = "none"` so the closed-shadow overlay stops covering the
  viewport and stops hit-testing. Remember it was open so you can restore it on
  cancel.
- Restore page scrolling while picking: the overlay set
  `document.documentElement.style.overflow = "hidden"`; set it back to
  `prevOverflow` so the user can scroll to reach the element they want. Re-hide on
  return to the reader.
- Set a module flag `picking = true`. The existing `docKeydownGuard` must early
  return while `picking` is true (add `if (picking) return;` as its first line) so
  the overlay guard does not eat the picker's Escape. The picker installs its OWN
  capture-phase Escape handler that CANCELS pick mode (does not close everything).
- Build a picker layer: a separate host element appended to
  `document.documentElement`, max z-index, `pointer-events: none` on the host so it
  never intercepts the mouse. Inside it put: (a) a highlight box (an absolutely
  positioned div, `pointer-events: none`, a 2px solid outline in the control accent
  plus a faint translucent fill, plus a small pill showing the target tag name),
  and (b) a top-center instruction banner reading "Click an element to read it.
  Esc to cancel." Fully specify every visual style inline or in a dedicated small
  stylesheet so page CSS cannot bleed in. Recommendation: give THIS layer an OPEN
  shadow root (unlike the closed reader overlay) so live verification via CDP can
  inspect it; the reader overlay stays closed.
- Install capture-phase listeners on `document` (or `window`) for the duration of
  pick mode:
  - `mousemove`: `el = document.elementFromPoint(e.clientX, e.clientY)`; ignore if
    it is null or inside your own picker/overlay hosts; store it as `currentTarget`
    and move the highlight box to its `getBoundingClientRect()`.
  - `click`: `e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();`
    then finish the pick with `currentTarget` (or re-resolve via `elementFromPoint`
    at the click coords). Capturing click is what stops the page from following
    links or firing button handlers.
  - Swallow the sibling interaction events so nothing on the page reacts while
    picking: `mousedown`, `mouseup`, `pointerdown`, `pointerup`, `auxclick`,
    `contextmenu` all get `preventDefault` + `stopImmediatePropagation` in capture.
    Do NOT swallow `wheel`/scroll; the user needs to scroll.
  - `keydown` Escape: cancel pick mode.
- Finish (`finishPick(el)`): remove the picker layer and all picker listeners, set
  `picking = false`, re-hide page scroll, and render the reader with the element
  extraction (see below). If the overlay was hidden, reuse it; if the pick was
  invoked cold (kind "pick" with no prior overlay), build the overlay fresh.
- Cancel (`cancelPick()`): remove the picker layer and listeners, set
  `picking = false`. If an overlay was hidden, restore it (`hostEl.style.display =
  ""`, re-hide page scroll, reinstate focus). If none, clean up and do nothing.

### Extraction from the chosen element
Add a rung. Reuse the block walk:
- Refactor the inner `collect` of `extractFallbackText()` into a shared
  `collectParagraphs(rootEl)` that returns paragraph-joined text (with the existing
  fallback: if no block descendants produced text, return
  `collapseWhitespace(rootEl.innerText || rootEl.textContent)`, which handles a
  picked inline element like a single `<span>`). `extractFallbackText()` then
  becomes `collectParagraphs(root)` where `root` is the current main/article/body
  choice.
- Add `extractFromElement(el)` returning
  `{ rung: 4, rungLabel: "Element", title: document.title || null,
     text: collectParagraphs(el) }`. Give it its own rung label "Element" shown in
  the header pill. If `text` is empty, render the empty state with a picker-aware
  message like "Nothing readable in that element, pick another." and keep the
  "Pick element" button available.

### Overlay refactor so the picker can feed it
`openOverlay()` currently always calls `runExtraction()`. Split it:
- `renderIntoOverlay(extraction)`: builds/rebuilds `hostEl` + shadow (or reuses the
  hidden one), applies the stored theme, installs the key guard, focuses the card,
  and calls `renderExtraction(refs, extraction)`. Add the "Pick element" button in
  `buildOverlayDom()` wired to `startElementPicker`.
- The message path: `kind` "page"/"selection" -> `renderIntoOverlay(runExtraction())`
  (current behavior). `kind` "pick" -> `startElementPicker()`.
- The picker finish path: `renderIntoOverlay(extractFromElement(el))`.

Keep the "re-invoke replaces, never stacks" property: `startElementPicker` must not
leave a second overlay or duplicate listeners behind.

## Change map (files and functions)

- `src/extension/content-main.js` (most of the work): add `picking` flag and guard
  it in `docKeydownGuard`; refactor `extractFallbackText` -> `collectParagraphs` +
  thin wrapper; add `extractFromElement`; add `startElementPicker`, `finishPick`,
  `cancelPick`, and the picker layer builder + listener install/teardown; add the
  "Pick element" header button in `buildOverlayDom`; split `openOverlay` into
  `renderIntoOverlay(extraction)`; handle `kind === "pick"` in the
  `chrome.runtime.onMessage` listener.
- Optional new module `src/extension/picker.js` if content-main.js gets large: the
  picker layer + listeners can live there and be imported. The bundler already
  pulls in any module content-main imports; no build change needed. Keep it plain
  ESM, no new deps.
- `src/extension/overlay.css` (or the picker's own inline styles): add the
  `sr-ext-pick` button styling if you route it through the shadow stylesheet. The
  picker LAYER visuals should be self-contained (open-shadow layer or fully inline)
  so they do not depend on the reader overlay being present.
- `extension/background.js` + `extension/manifest.json` ONLY if you add the
  context-menu item and/or command. Menu item: create it in the
  `onInstalled` handler and route it in `contextMenus.onClicked` to
  `invoke(tabId, "pick")`. Do NOT add permissions.
- `dist/` is regenerated by the build; do not edit it.

## Constraints (the build enforces some; honor all)

- No em dashes or en dashes anywhere, in code or UI copy. No the word "happy", no
  the word "squarely". The build's `dash-and-banned-word-scan` gate checks the
  generated page; keep UI strings plain regardless.
- In JS you author, never escape an apostrophe as backslash-apostrophe; use double
  quotes or template literals, or avoid apostrophes in string literals.
- Add NO new permissions. `activeTab` already covers everything the picker does
  (it runs in the already-injected content script). The `manifest-json` gate fails
  if the permission set changes.
- Keep the build deterministic: `bun run build` twice must produce byte-identical
  `dist/content.js` and `index.html`.
- No references to any scratchpad or `/private/tmp` path in committed files (the
  `no-scratchpad-refs` gate checks `dist/`).
- Match the existing code style in content-main.js (var, function declarations,
  small helpers). Do not pull in a framework.

## Build and verification plan

1. `bun run build`. All nine gates must print PASS. Run it twice and diff
   `dist/content.js` to confirm determinism.
2. Reload the unpacked extension in Arc (extensions page, the reload icon on the
   Speed Reader card) so `dist/content.js` is picked up.
3. Live verification traps proven THIS session, plan around them:
   - CDP keystrokes stay in the page renderer and do NOT reach Chrome's command
     layer, so `press_key` cannot fire Alt+R or any extension command. The ONE
     real gesture the user must do per tab is opening the reader once (toolbar
     click or Alt+R), which grants `activeTab` and injects content.js. After that,
     the "Pick element" button and programmatic follow-ups work.
   - The reader overlay is a CLOSED shadow root, so `evaluate_script` cannot pierce
     it and `click({selector})` cannot reach the header button inside it. This is
     why the PICKER layer should use an OPEN shadow root (or plain fully-inline-
     styled elements): its highlight box, banner, and the resolved target are then
     inspectable from the page context for verification. You can still drive the
     picker by dispatching real mouse events at page coordinates and reading back
     the picker layer state and, after finish, the reader word count.
   - `document.documentElement.style.overflow` is set to hidden while the reader is
     open; verify the picker restores scrolling during pick and re-hides after.
4. Manual test script (ask the user to open the reader once, then drive):
   - Open the reader on a real article. Click "Pick element". Confirm the reader
     overlay hides, the banner appears, and hovering different blocks moves the
     highlight box to match each block bounding rect. Scroll the page mid-pick and
     confirm the highlight still tracks.
   - Click a specific element (say one section or one comment). Confirm the reader
     reopens with rung "Element", a word count matching that element and its
     children only (spot check against the element text length), and that the page
     did NOT navigate or activate any link you clicked on.
   - Press Esc during pick. Confirm pick cancels and the prior reader overlay comes
     back unchanged.
   - Pick an element with no text (an image wrapper). Confirm the empty state shows
     the pick-again message and "Pick element" is still available.
   - Confirm settings still round-trip (wpm/mode/theme) and no console errors.
5. Fixture sweep: run the picker on a news article, a docs page, a comment-heavy
   thread, and one app-shell page (pick a message body). Log the picked tag, word
   count, and rung for each. Empty picks must fail loudly, never silently read
   nothing.

## Acceptance criteria

- [ ] `bun run build` passes all gates, deterministic.
- [ ] "Pick element" button in the overlay header enters pick mode; the reader
      overlay hides and the page is interactive and scrollable during pick.
- [ ] Hover highlights the element under the cursor accurately (tracks scroll).
- [ ] Click reads exactly that element plus descendants (rung "Element"), and the
      click does not trigger the page (no link navigation, no button firing).
- [ ] Esc cancels pick and restores the prior overlay; cold pick with no prior
      overlay cleans up with no leftover layer or listeners.
- [ ] Empty element shows the pick-again empty state.
- [ ] No new permissions; no dashes/happy/squarely; no `src/core` or `src/ui`
      changes; no scratchpad refs; existing gestures unchanged.
- [ ] Verified live in Arc on at least four fixture pages, results logged.

## Open decisions (recommendations in brackets; decide and note what you chose)

- Picker layer isolation: open shadow root vs plain inline-styled light DOM.
  [Open shadow root, for style isolation plus CDP inspectability during verify.]
- Accelerators: ship the context-menu item and/or a command, or button-only for v1.
  [Ship the button plus the "Speed read an element" context-menu item; skip the
  keyboard command for now since it cannot be automated and adds a shortcut to
  document. Add it later if the user wants it.]
- Highlight affordance detail: outline box only, or box plus a tag/word-count pill.
  [Box plus a small tag-name pill; add live word count only if cheap.]

## Attribution

Commits: include a `Claude-Session-Id:` trailer and the model line, per the
session-signature convention. This handoff was written in session
`1c502f01-ac5e-4305-9ae7-0b222630e277`.

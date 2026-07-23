# Extension verification

Verified on 2026-07-22 with Arc and an isolated Chromium profile. The unpacked
extension under test was version 1.1.0 from `dist/`.

## Automated checks

| Claim | Minimum disconfirming evidence | Evidence | Verdict |
| --- | --- | --- | --- |
| The generated extension builds cleanly. | Any build gate fails. | Two consecutive `bun run build` runs passed all nine gates. | PASS |
| The build is deterministic. | Either generated file changes between consecutive builds. | `dist/content.js` was `cce86f85932d5e963cfaeaac3cf85c43beda9ab32d2aeee742a070f99dac8f6a` both times. `index.html` was `4167ba479f517b631c33d787f7bdbbfe976edca3c35232c29314a282fabf3b3d` both times. | PASS |
| Every gesture keeps using the shared injection funnel. | A toolbar, command, or menu route sends the wrong kind or bypasses `content.js`. | The service worker test exercises all six routes and checks each injection and message. | PASS |
| Unscriptable pages show a temporary error badge. | An injection error sends a content message, omits the badge, or fails to clear it. | The service worker test simulates a rejected `chrome://` injection and checks the red `!`, its tab ID, and the clear after 2,000 ms. | PASS |
| Permissions did not expand. | A permission differs or `host_permissions` exists. | The manifest test checks the exact set: `activeTab`, `commands`, `contextMenus`, `scripting`, and `storage`, with no `host_permissions`. | PASS |

The final service worker suite has 4 passing tests, 0 failures, and 21
expectations.

## Picker behavior

The exact generated `dist/content.js` bundle was exercised in Arc against the
local regression fixture and live sites.

| Claim | Minimum disconfirming evidence | Evidence | Verdict |
| --- | --- | --- | --- |
| The header button enters pick mode. | The reader remains visible, the picker layer is absent, or page scroll stays locked. | The `Pick element` button hid the reader, created one open-shadow picker layer, displayed the specified instruction, and restored the page's prior overflow. | PASS |
| Hover follows the live target. | The highlight rectangle differs from the target or does not move with scrolling. | Rectangle coordinates matched the target exactly. After a 100 px fixture scroll and a 120 px Wikipedia scroll, the highlight top moved by the same amount. | PASS |
| Click reads only the target subtree. | The result uses a non-Element rung, has an implausible count, or reads the whole page. | Picks reopened the reader with rung `Element`; fixture and live-site counts changed to the selected subtree counts listed below. | PASS |
| Page actions are suppressed while picking. | A clicked link navigates or its page handler fires. | Clicking the fixture link left its URL and hash unchanged and its handler count at zero. | PASS |
| Escape and cold cancel clean up. | The prior reader is lost, a cold overlay appears, or picker hosts/listeners accumulate. | Escape restored the prior `Element 114` Wikipedia reader. Cold cancel left zero reader and picker hosts. Repeated starts retained one picker host. | PASS |
| Empty picks are explicit and recoverable. | The reader silently displays no content or the pick action disappears. | An empty target showed `Nothing readable in that element, pick another.` and retained the `Pick element` button. | PASS |
| Picking does not advance hidden playback. | The word changes while the reader is hidden or cancel does not restore prior play state. | Active playback entered picker on word `10`, remained paused after two seconds, and retained the resume marker for cancel. | PASS |
| Rapid use does not duplicate listeners. | Delayed storage plus immediate pick produces more than one picker key listener. | With a 150 ms storage delay, the fixture recorded exactly one picker key listener and completed an `Element 5` pick. | PASS |
| No runtime errors were introduced. | The fixture or Wikipedia reports a console error. | Both reported zero console errors. WIRED had two site exceptions before injection and zero after injection. | PASS |

## Live fixture sweep

Each row covers full-page extraction and a picked-element extraction. Every
generated bundle injection succeeded.

| Page type | Page | Page rung and words | Picked tag | Picked rung and words | Verdict |
| --- | --- | ---: | --- | ---: | --- |
| Docs | MDN `elementFromPoint` | Readability, 315 | `p` | Element, 1 | PASS |
| Docs | Bun runtime | Readability, 1,383 | `p` | Element, 12 | PASS |
| Docs | React Quick Start | Readability, 1,770 | `p` | Element, 26 | PASS |
| Blog | Simon Willison, one-shot Python tools | Readability, 795 | `p` | Element, 3 | PASS |
| Comments | Hacker News Dropbox thread | Readability, 4,150 | `div` | Element, 48 | PASS |
| Repository | GitHub Bun README | Readability, 1,671 | `pre` | Element, 6 | PASS |
| News | BBC Future speed reading | Readability, 652 | `p` | Element, 22 | PASS |
| Paywall | WIRED speed reading teaser | Readability, 1,861 | `p` | Element, 28 | PASS |
| App shell | Workday public job | Readability, 706 | `p` | Element, 3 | PASS |
| Encyclopedia | Wikipedia Speed reading | Readability, 3,076 | `p` | Element, 114 | PASS |

Wikipedia was also checked in detail. The picker banner appeared with the reader
hidden and scrolling restored. Hovering the History paragraph produced a
highlight rectangle identical to the paragraph rectangle. Scrolling 120 px moved
the highlight by 120 px. Clicking that paragraph did not change the URL and
opened an `Element` result with 114 words. Escape from a second pick restored that
same result. Final Escape removed both reader and picker hosts and restored the
original overflow. The console error count was zero.

## Base extension sign-off

| Claim | Minimum disconfirming evidence | Evidence | Verdict |
| --- | --- | --- | --- |
| Selection extraction still works. | A non-collapsed selection does not win extraction. | The fixture selection path produced rung `Selection` with 5 words. | PASS |
| Page extraction still works. | The page does not open or skips Readability. | The fixture produced `Readability 30`; all ten live pages produced sane Readability counts. | PASS |
| Close and Escape fully unmount. | A host remains or scroll stays locked. | Both paths left zero overlay and picker hosts and restored overflow. | PASS |
| Settings share across extension tabs. | A value written in one extension context differs in another. | Two independent live extension tabs both read `425`, `pacer`, `dark`, and `3` from real `chrome.storage.sync`. | PASS |
| Settings survive extension restart. | Reloading the installed extension loses a value. | The newly created service worker read the same four values after extension reload. | PASS |
| Settings survive browser restart. | Restarting the browser loses a value. | A separate Chromium profile loaded the unpacked extension, stored `511`, `pacer`, `dark`, and `4`, shut down, restarted, and read the same values. | PASS |
| Verification leaves user settings unchanged. | The Arc profile retains test values. | The original Arc state was captured first and restored afterward as `sr_mode: chunk` with the previously absent keys removed. | PASS |

Browser automation cannot synthesize a Chrome-level extension command or grant
`activeTab`. The live page behavior therefore used the exact generated bundle
after direct CDP injection, while the installed service worker, command and menu
registration, injection routes, error route, permissions, and storage were
verified independently. No additional permission was added to hide this browser
security boundary.

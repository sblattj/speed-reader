# Speed Reader

A single self contained web page for practicing speed reading. No build step, no
external requests, no dependencies. Everything, markup, styles, and logic, lives
in one `index.html` file.

## Open it

```
open ~/code/speed-reader/index.html
```

It works straight from `file://`, no server needed.

## The three modes

**RSVP (flash mode).** Words flash one chunk at a time at a fixed spot in the
middle of the stage. At chunk size 1, the chunk's optimal recognition letter is
highlighted in orange and held at a fixed horizontal position (Spritz style), so
your eyes never have to hunt for the next word. Chunk sizes 2 and 3 just center
the group of words.

**Chunk (phrase mode).** A midpoint between RSVP and Pacer. One phrase of
roughly 3 to 5 words flashes at a time, split at natural clause boundaries
instead of a fixed word count: it never crosses a sentence or paragraph break,
and it prefers to end a phrase right after a comma, semicolon, or colon once
the phrase already has a couple of words in it. Honestly, this restores some
of the small within phrase eye movement that RSVP removes, but like RSVP it
still hides the rest of the text, so backward glances and preview stay
limited compared to Pacer.

**Pacer (guided highlight).** The full text stays on screen as normal
paragraphs, and a highlight sweeps through it at your chosen pace, auto
scrolling to keep the highlight roughly in the middle of the view. You can
click any word to jump there. This mode keeps the whole text visible, which
matters, see the note on the science below.

The chunk size buttons (1, 2, 3) only apply to RSVP and Pacer. In Chunk mode
they are disabled and replaced with a small note, since phrase length there
is decided by the text itself, not by a fixed count.

Switching between modes keeps your place in the text.

## Controls

- Play or pause, restart, back one sentence, forward one sentence
- Chunk size: 1, 2, or 3 words
- Words per minute slider, 100 to 900
- A short 3, 2, 1 countdown before playback starts or resumes, so your eyes
  can settle before the words start moving
- A session summary when you finish a pass: total words, reading time, and
  effective words per minute, plus a prompt to say out loud what the text
  argued before you decide to speed up

## Keyboard shortcuts

- Space: play or pause
- Left arrow: back one sentence
- Right arrow: forward one sentence
- Up or down arrow: words per minute, plus or minus 25
- R: restart

Shortcuts are ignored while you are typing in the text box.

## Your text

The text box under the stage holds whatever you want to read. Word count
updates live. Press Load text to load it into the reader. Clearing the box and
loading again falls back to the built in sample text. Your reading text is
never saved, only your speed, chunk size, mode, and theme preferences persist
between visits.

## What the science actually says about RSVP

Skilled adult readers already move through text at roughly 200 to 400 words
per minute, and that ceiling comes mostly from how the brain processes
language, not from how fast the eyes can physically move. Normal reading also
is not one smooth pass forward: about 10 to 15 percent of eye movements are
regressions, short backward glances that resolve confusion, and readers
constantly preview upcoming words with their peripheral vision. Flashing one
word at a time removes both of those tools at once. Research backs up the
cost: Schotter, Tran, and Rayner (2012) found that blocking those backward
glances hurt comprehension, and Benedetto and colleagues (2015) found that
Spritz style flashing held up on surface level understanding at moderate
speeds but increased eye strain and hurt deeper comprehension. A widely cited
2016 review by Rayner and colleagues summed it up as no free lunch: push speed
past your natural rate and comprehension pays for it. The honest way to read
faster is slower to sell: practice a little above your comfortable pace,
build vocabulary and background knowledge, and use deliberate skimming when
gist is enough. That is why this app also ships a pacer mode that keeps the
whole text visible while still pushing your pace.

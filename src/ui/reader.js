// Renders the mode switch, stage (RSVP/Chunk/Pacer views, countdown,
// end card), and control bar into a container element supplied by the
// shell, and wires them to a core/player.js state machine. No direct
// localStorage or document.addEventListener calls here: persistence goes
// through options.storage, and the global keydown listener attaches to
// options.keyEventTarget, both supplied by the shell (the standalone page
// passes document; a future extension overlay can pass its shadow host).

import { getOrpIndex } from "../core/chunk.js";
import { formatDuration } from "../core/timing.js";
import { createPlayer } from "../core/player.js";

var WPM_MIN = 100;
var WPM_MAX = 900;

var STAGE_TEMPLATE = "" +
'<div class="mode-row">\n' +
'  <div class="segmented" id="modeSwitch" role="group" aria-label="Reading mode">\n' +
'    <button type="button" data-mode="rsvp" class="active" aria-pressed="true">RSVP</button>\n' +
'    <button type="button" data-mode="chunk" aria-pressed="false">Chunk</button>\n' +
'    <button type="button" data-mode="pacer" aria-pressed="false">Pacer</button>\n' +
'  </div>\n' +
'</div>\n' +
'\n' +
'<section class="card stage-card">\n' +
'  <div class="progress-track"><div class="progress-fill" id="progressFill"></div></div>\n' +
'\n' +
'  <div class="stage" id="stage">\n' +
'    <p class="stage-hint" id="stageHint" hidden>Add some text below and press Load text to begin.</p>\n' +
'\n' +
'    <div class="rsvp-view" id="rsvpView">\n' +
'      <div class="crosshair top"></div>\n' +
'      <div class="crosshair bottom"></div>\n' +
'      <div class="pivot-grid" id="pivotGrid">\n' +
'        <span class="pivot-cell before" id="pivotBefore"></span><span class="pivot-cell pivot" id="pivotPivot"></span><span class="pivot-cell after" id="pivotAfter"></span>\n' +
'      </div>\n' +
'      <div class="multi-word" id="multiWord" hidden></div>\n' +
'    </div>\n' +
'\n' +
'    <div class="chunk-view" id="chunkView" hidden>\n' +
'      <div class="chunk-phrase" id="chunkPhraseText"></div>\n' +
'    </div>\n' +
'\n' +
'    <div class="pacer-wrap" id="pacerWrap" hidden>\n' +
'      <div class="pacer-text" id="pacerText"></div>\n' +
'    </div>\n' +
'\n' +
'    <div class="countdown-overlay" id="countdownOverlay" hidden>3</div>\n' +
'\n' +
'    <div class="end-card" id="endCard" hidden>\n' +
'      <div class="end-card-inner">\n' +
'        <h2>Session complete</h2>\n' +
'        <div class="end-stats">\n' +
'          <div class="end-stat"><span class="value" id="endWords">0</span><span class="label">Words</span></div>\n' +
'          <div class="end-stat"><span class="value" id="endTime">0:00</span><span class="label">Reading time</span></div>\n' +
'          <div class="end-stat"><span class="value" id="endWpm">0</span><span class="label">Effective wpm</span></div>\n' +
'        </div>\n' +
'        <p class="end-nudge">Before you rate the speed, say out loud in two sentences what the text argued. If you cannot, drop the wpm by 50 and rerun.</p>\n' +
'        <div class="end-actions">\n' +
'          <button type="button" class="btn-primary" id="btnReadAgain">Read again</button>\n' +
'          <button type="button" class="btn-secondary" id="btnSlowerRerun">Slower rerun</button>\n' +
'        </div>\n' +
'      </div>\n' +
'    </div>\n' +
'  </div>\n' +
'\n' +
'  <div class="word-readout" id="wordReadout" aria-live="polite">Word 0 / 0</div>\n' +
'</section>\n' +
'\n' +
'<section class="card control-bar">\n' +
'  <div class="transport">\n' +
'    <button type="button" class="icon-btn" id="btnRestart" title="Restart" aria-label="Restart">&#8634;</button>\n' +
'    <button type="button" class="icon-btn" id="btnBack" title="Back one sentence" aria-label="Back one sentence">&#9664;&#9664;</button>\n' +
'    <button type="button" class="icon-btn play-btn" id="btnPlay" title="Play" aria-label="Play">&#9654;</button>\n' +
'    <button type="button" class="icon-btn" id="btnForward" title="Forward one sentence" aria-label="Forward one sentence">&#9654;&#9654;</button>\n' +
'  </div>\n' +
'\n' +
'  <div class="chunk-size-group">\n' +
'    <div class="segmented" id="chunkSwitch" role="group" aria-label="Chunk size">\n' +
'      <button type="button" data-chunk="1" class="active" aria-pressed="true">1</button>\n' +
'      <button type="button" data-chunk="2" aria-pressed="false">2</button>\n' +
'      <button type="button" data-chunk="3" aria-pressed="false">3</button>\n' +
'    </div>\n' +
'    <span class="chunk-size-note" id="chunkSizeNote" hidden>3 to 5 by phrase</span>\n' +
'  </div>\n' +
'\n' +
'  <div class="wpm-control">\n' +
'    <input type="range" id="wpmSlider" min="100" max="900" step="25" value="300" aria-label="Words per minute">\n' +
'    <span class="wpm-label" id="wpmValue">300 wpm</span>\n' +
'  </div>\n' +
'</section>';

function readSavedWpm(raw) {
  var n = parseInt(raw, 10);
  return (Number.isFinite(n) && n >= WPM_MIN && n <= WPM_MAX) ? n : 300;
}

function readSavedChunkSize(raw) {
  var n = parseInt(raw, 10);
  return (n === 1 || n === 2 || n === 3) ? n : 1;
}

function readSavedMode(raw) {
  return (raw === "rsvp" || raw === "chunk" || raw === "pacer") ? raw : "rsvp";
}

function splitWordsForPacer(text) {
  return text.split(/\s+/).filter(function (w) { return w.length > 0; });
}

// Mounts the reader into `container` (its existing children are replaced)
// and returns a small handle the shell uses to feed it text.
//
// options:
//   storage        - { get(key), set(key, value) } adapter; both may
//                     return a value directly or a Promise (get is always
//                     awaited so either style works).
//   keyEventTarget - the object to attach the keydown listener to (the
//                    standalone page passes document).
//   initialText    - { text, title } loaded immediately after mount.
export async function mount(container, options) {
  var storage = options.storage;
  var keyEventTarget = options.keyEventTarget;
  var initialText = options.initialText || {};

  container.innerHTML = STAGE_TEMPLATE;

  var modeSwitchEl = container.querySelector("#modeSwitch");
  var chunkSwitchEl = container.querySelector("#chunkSwitch");
  var progressFillEl = container.querySelector("#progressFill");
  var stageHintEl = container.querySelector("#stageHint");
  var rsvpViewEl = container.querySelector("#rsvpView");
  var pivotGridEl = container.querySelector("#pivotGrid");
  var pivotBeforeEl = container.querySelector("#pivotBefore");
  var pivotPivotEl = container.querySelector("#pivotPivot");
  var pivotAfterEl = container.querySelector("#pivotAfter");
  var multiWordEl = container.querySelector("#multiWord");
  var chunkViewEl = container.querySelector("#chunkView");
  var chunkPhraseTextEl = container.querySelector("#chunkPhraseText");
  var chunkSizeNoteEl = container.querySelector("#chunkSizeNote");
  var pacerWrapEl = container.querySelector("#pacerWrap");
  var pacerTextEl = container.querySelector("#pacerText");
  var countdownOverlayEl = container.querySelector("#countdownOverlay");
  var endCardEl = container.querySelector("#endCard");
  var endWordsEl = container.querySelector("#endWords");
  var endTimeEl = container.querySelector("#endTime");
  var endWpmEl = container.querySelector("#endWpm");
  var btnReadAgain = container.querySelector("#btnReadAgain");
  var btnSlowerRerun = container.querySelector("#btnSlowerRerun");
  var wordReadoutEl = container.querySelector("#wordReadout");
  var btnRestart = container.querySelector("#btnRestart");
  var btnBack = container.querySelector("#btnBack");
  var btnPlay = container.querySelector("#btnPlay");
  var btnForward = container.querySelector("#btnForward");
  var wpmSlider = container.querySelector("#wpmSlider");
  var wpmValueEl = container.querySelector("#wpmValue");

  var modeButtons = modeSwitchEl.querySelectorAll("button");
  var chunkButtons = chunkSwitchEl.querySelectorAll("button");

  var pacerSpans = [];
  var highlightedEls = [];
  var currentDoc = null;

  function onPacerWordClick(e) {
    var idx = Number(e.currentTarget.dataset.idx);
    player.jumpToIndex(idx);
  }

  function buildPacerDom(doc) {
    pacerTextEl.textContent = "";
    pacerSpans = new Array(doc.words.length);
    highlightedEls = [];
    var idx = 0;
    doc.paragraphs.forEach(function (paraText) {
      var p = document.createElement("p");
      var ws = splitWordsForPacer(paraText);
      ws.forEach(function (w, i) {
        var span = document.createElement("span");
        span.className = "pw";
        span.textContent = w;
        span.dataset.idx = String(idx);
        span.addEventListener("click", onPacerWordClick);
        p.appendChild(span);
        pacerSpans[idx] = span;
        idx++;
        if (i < ws.length - 1) p.appendChild(document.createTextNode(" "));
      });
      pacerTextEl.appendChild(p);
    });
  }

  function ensureVisible(firstEl, lastEl) {
    var wrapRect = pacerWrapEl.getBoundingClientRect();
    var firstRect = firstEl.getBoundingClientRect();
    var lastRect = lastEl.getBoundingClientRect();
    var relTop = firstRect.top - wrapRect.top;
    var relBottom = lastRect.bottom - wrapRect.top;
    var third = wrapRect.height / 3;
    if (relTop < third || relBottom > third * 2) {
      var mid = relTop + (relBottom - relTop) / 2;
      var targetScrollTop = pacerWrapEl.scrollTop + mid - wrapRect.height / 2;
      pacerWrapEl.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "smooth" });
    }
  }

  function renderRsvpChunk(chunkIndices, view) {
    var word = currentDoc.words[chunkIndices[0]];
    if (view.chunkSize === 1) {
      var orpIdx = getOrpIndex(word.length);
      pivotBeforeEl.textContent = word.slice(0, orpIdx);
      pivotPivotEl.textContent = word.charAt(orpIdx) || "";
      pivotAfterEl.textContent = word.slice(orpIdx + 1);
      pivotGridEl.hidden = false;
      multiWordEl.hidden = true;
    } else {
      var text = chunkIndices.map(function (i) { return currentDoc.words[i]; }).join(" ");
      multiWordEl.textContent = text;
      pivotGridEl.hidden = true;
      multiWordEl.hidden = false;
    }
  }

  function renderPhraseChunk(chunkIndices) {
    var text = chunkIndices.map(function (i) { return currentDoc.words[i]; }).join(" ");
    chunkPhraseTextEl.textContent = text;
  }

  function renderPacerChunk(chunkIndices) {
    highlightedEls.forEach(function (el) { el.classList.remove("current"); });
    highlightedEls = chunkIndices.map(function (i) { return pacerSpans[i]; }).filter(Boolean);
    highlightedEls.forEach(function (el) { el.classList.add("current"); });
    if (highlightedEls.length) {
      ensureVisible(highlightedEls[0], highlightedEls[highlightedEls.length - 1]);
    }
  }

  function showActiveView(mode) {
    rsvpViewEl.hidden = mode !== "rsvp";
    chunkViewEl.hidden = mode !== "chunk";
    pacerWrapEl.hidden = mode !== "pacer";
  }

  function updateChunkControlsForMode(mode) {
    var isChunkMode = mode === "chunk";
    chunkButtons.forEach(function (b) {
      b.disabled = isChunkMode;
      b.setAttribute("aria-disabled", isChunkMode ? "true" : "false");
    });
    chunkSizeNoteEl.hidden = !isChunkMode;
  }

  function updateWpmLabel(wpm) {
    wpmValueEl.textContent = wpm + " wpm";
  }

  var savedMode = readSavedMode(await storage.get("sr_mode"));
  var savedChunkSize = readSavedChunkSize(await storage.get("sr_chunk"));
  var savedWpm = readSavedWpm(await storage.get("sr_wpm"));

  var player = createPlayer({
    storage: storage,
    initial: { mode: savedMode, chunkSize: savedChunkSize, wpm: savedWpm },
    callbacks: {
      onDocLoaded: function (doc, hasWords) {
        currentDoc = doc;
        buildPacerDom(doc);
        btnPlay.disabled = !hasWords;
        btnBack.disabled = !hasWords;
        btnForward.disabled = !hasWords;
        btnRestart.disabled = !hasWords;
        stageHintEl.hidden = hasWords;
      },
      onRender: function (chunkIndices, view) {
        if (view.mode === "rsvp") {
          renderRsvpChunk(chunkIndices, view);
        } else if (view.mode === "chunk") {
          renderPhraseChunk(chunkIndices);
        } else {
          renderPacerChunk(chunkIndices);
        }
      },
      onProgress: function (progress) {
        var total = progress.total;
        var current = progress.current;
        progressFillEl.style.width = (total ? (current / total * 100) : 0) + "%";
        wordReadoutEl.textContent = "Word " + current.toLocaleString() + " / " + total.toLocaleString();
      },
      onPlayStateChange: function (playing) {
        btnPlay.textContent = playing ? "❚❚" : "▶";
        btnPlay.setAttribute("aria-label", playing ? "Pause" : "Play");
        btnPlay.title = playing ? "Pause" : "Play";
      },
      onCountdownTick: function (text) {
        countdownOverlayEl.hidden = false;
        countdownOverlayEl.textContent = text;
      },
      onCountdownDone: function () {
        countdownOverlayEl.hidden = true;
      },
      onModeChange: function (mode) {
        modeButtons.forEach(function (b) {
          var active = b.dataset.mode === mode;
          b.classList.toggle("active", active);
          b.setAttribute("aria-pressed", active ? "true" : "false");
        });
        showActiveView(mode);
        updateChunkControlsForMode(mode);
      },
      onChunkSizeChange: function (n) {
        chunkButtons.forEach(function (b) {
          var active = Number(b.dataset.chunk) === n;
          b.classList.toggle("active", active);
          b.setAttribute("aria-pressed", active ? "true" : "false");
        });
      },
      onWpmChange: function (wpm) {
        wpmSlider.value = String(wpm);
        updateWpmLabel(wpm);
      },
      onHideEndCard: function (hasWords) {
        endCardEl.hidden = true;
        btnPlay.disabled = !hasWords;
      },
      onFinish: function (stats) {
        endWordsEl.textContent = stats.totalWords.toLocaleString();
        endTimeEl.textContent = formatDuration(stats.activePlayMs);
        endWpmEl.textContent = stats.effectiveWpm.toLocaleString();
        endCardEl.hidden = false;
        btnPlay.disabled = true;
        progressFillEl.style.width = "100%";
        wordReadoutEl.textContent = "Word " + stats.totalWords.toLocaleString() + " / " + stats.totalWords.toLocaleString();
      }
    }
  });

  // The freshly injected markup defaults to rsvp/1/300; reflect the
  // settings actually loaded from storage before wiring interaction.
  modeButtons.forEach(function (b) {
    var active = b.dataset.mode === savedMode;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", active ? "true" : "false");
  });
  chunkButtons.forEach(function (b) {
    var active = Number(b.dataset.chunk) === savedChunkSize;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", active ? "true" : "false");
  });
  showActiveView(savedMode);
  updateChunkControlsForMode(savedMode);
  wpmSlider.value = String(savedWpm);
  updateWpmLabel(savedWpm);

  modeButtons.forEach(function (b) {
    b.addEventListener("click", function () {
      player.setMode(b.dataset.mode);
      b.blur();
    });
  });

  chunkButtons.forEach(function (b) {
    b.addEventListener("click", function () {
      player.setChunkSize(Number(b.dataset.chunk));
      b.blur();
    });
  });

  btnPlay.addEventListener("click", function () {
    player.togglePlay();
    btnPlay.blur();
  });
  btnRestart.addEventListener("click", function () {
    player.restart();
    btnRestart.blur();
  });
  btnBack.addEventListener("click", function () {
    player.backSentence();
    btnBack.blur();
  });
  btnForward.addEventListener("click", function () {
    player.forwardSentence();
    btnForward.blur();
  });

  wpmSlider.addEventListener("input", function () {
    player.setWpm(Number(wpmSlider.value));
  });
  wpmSlider.addEventListener("change", function () {
    wpmSlider.blur();
  });

  btnReadAgain.addEventListener("click", function () {
    player.rerunFromStart();
    btnReadAgain.blur();
  });
  btnSlowerRerun.addEventListener("click", function () {
    player.rerunFromStart(player.getWpm() - 50);
    btnSlowerRerun.blur();
  });

  keyEventTarget.addEventListener("keydown", function (e) {
    var ae = keyEventTarget.activeElement;
    if (ae && ae.tagName === "TEXTAREA") return;

    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      player.togglePlay();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      player.backSentence();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      player.forwardSentence();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      player.adjustWpm(25);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      player.adjustWpm(-25);
    } else if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      player.restart();
    }
  });

  player.loadText(initialText.text || "");

  return {
    loadText: function (text) { return player.loadText(text); },
    getTitle: function () { return initialText.title || null; }
  };
}

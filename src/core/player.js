// Playback state machine: play, pause, countdown, navigation, and
// end-of-session stats. Holds no DOM references and never touches
// localStorage directly; every visible effect is reported through the
// callbacks supplied at creation time, and every persisted setting is
// routed through the injected storage adapter. setTimeout/clearTimeout/
// performance.now are plain JS globals, available in a page, a service
// worker, or a content-script world alike.

import { tokenizeText } from "./tokenize.js";
import { chunkPhrases, getChunkIndices, findPhraseChunkIndexAt } from "./chunk.js";
import { computeDwellMs } from "./timing.js";

var COUNTDOWN_BEATS = ["3", "2", "1"];
var COUNTDOWN_STEP_MS = 350;
var WPM_MIN = 100;
var WPM_MAX = 900;
var WPM_STEP = 25;

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

export function createPlayer(options) {
  var storage = options.storage;
  var callbacks = options.callbacks || {};
  var initial = options.initial || {};

  var state = {
    doc: null,
    mode: initial.mode || "rsvp",
    chunkSize: initial.chunkSize || 1,
    wpm: initial.wpm || 300,
    currentIndex: 0,
    playing: false,
    counting: false,
    timerId: null,
    countdownTimerId: null,
    chunkStartedAt: null,
    currentChunkDwell: 0,
    activePlayMs: 0,
    phraseChunks: []
  };

  function persist(key, value) {
    if (storage && typeof storage.set === "function") storage.set(key, value);
  }

  function currentChunkIndicesAt(idx) {
    if (state.mode === "chunk") {
      var ci = findPhraseChunkIndexAt(state.phraseChunks, idx);
      if (ci === -1) return [];
      var pc = state.phraseChunks[ci];
      var arr = [];
      for (var k = pc.start; k <= pc.end; k++) arr.push(k);
      return arr;
    }
    return getChunkIndices(state.doc, idx, state.chunkSize);
  }

  function emitProgress() {
    if (!state.doc || !callbacks.onProgress) return;
    var total = state.doc.words.length;
    var current = Math.min(state.currentIndex + 1, total);
    callbacks.onProgress({ current: current, total: total });
  }

  function emitRender(chunkIndices) {
    if (!chunkIndices || !chunkIndices.length) return;
    if (callbacks.onRender) {
      callbacks.onRender(chunkIndices, { mode: state.mode, chunkSize: state.chunkSize });
    }
    emitProgress();
  }

  function hideEndCard() {
    var hasWords = !!(state.doc && state.doc.words.length);
    if (callbacks.onHideEndCard) callbacks.onHideEndCard(hasWords);
  }

  function updatePlayButton() {
    if (callbacks.onPlayStateChange) callbacks.onPlayStateChange(state.playing);
  }

  function clearCountdown() {
    if (state.countdownTimerId) {
      clearTimeout(state.countdownTimerId);
      state.countdownTimerId = null;
      if (callbacks.onCountdownDone) callbacks.onCountdownDone();
      state.counting = false;
    }
  }

  function runCountdown(onDone) {
    state.counting = true;
    var i = 0;
    if (callbacks.onCountdownTick) callbacks.onCountdownTick(COUNTDOWN_BEATS[0]);
    function tick() {
      i++;
      if (i < COUNTDOWN_BEATS.length) {
        if (callbacks.onCountdownTick) callbacks.onCountdownTick(COUNTDOWN_BEATS[i]);
        state.countdownTimerId = setTimeout(tick, COUNTDOWN_STEP_MS);
      } else {
        if (callbacks.onCountdownDone) callbacks.onCountdownDone();
        state.counting = false;
        state.countdownTimerId = null;
        onDone();
      }
    }
    state.countdownTimerId = setTimeout(tick, COUNTDOWN_STEP_MS);
  }

  function startPlaybackLoop() {
    if (!state.doc) return;
    if (state.currentIndex >= state.doc.words.length) {
      finishSession();
      return;
    }
    var chunkIndices = currentChunkIndicesAt(state.currentIndex);
    if (!chunkIndices.length) {
      finishSession();
      return;
    }
    emitRender(chunkIndices);
    var dwell = computeDwellMs(state.doc, chunkIndices, state.wpm);
    state.chunkStartedAt = performance.now();
    state.currentChunkDwell = dwell;
    state.timerId = setTimeout(function () {
      state.activePlayMs += dwell;
      state.chunkStartedAt = null;
      state.currentIndex = chunkIndices[chunkIndices.length - 1] + 1;
      startPlaybackLoop();
    }, dwell);
  }

  function resumePlayback() {
    if (!state.doc || !state.doc.words.length) return;
    if (state.playing || state.counting) return;
    if (state.currentIndex >= state.doc.words.length) return;
    runCountdown(function () {
      state.playing = true;
      updatePlayButton();
      startPlaybackLoop();
    });
  }

  function pausePlayback() {
    clearCountdown();
    if (!state.playing) return;
    state.playing = false;
    if (state.timerId) {
      clearTimeout(state.timerId);
      state.timerId = null;
    }
    if (state.chunkStartedAt !== null) {
      var elapsed = performance.now() - state.chunkStartedAt;
      state.activePlayMs += Math.min(elapsed, state.currentChunkDwell || 0);
      state.chunkStartedAt = null;
    }
    updatePlayButton();
  }

  function togglePlay() {
    if (!state.doc || !state.doc.words.length) return;
    if (state.playing) {
      pausePlayback();
    } else {
      resumePlayback();
    }
  }

  function finishSession() {
    state.playing = false;
    state.timerId = null;
    state.chunkStartedAt = null;
    updatePlayButton();

    var totalWords = state.doc.words.length;
    var minutes = state.activePlayMs / 60000;
    var effectiveWpm = minutes > 0 ? Math.round(totalWords / minutes) : 0;
    if (callbacks.onFinish) {
      callbacks.onFinish({
        totalWords: totalWords,
        activePlayMs: state.activePlayMs,
        effectiveWpm: effectiveWpm
      });
    }
  }

  function restart() {
    if (!state.doc || !state.doc.words.length) return;
    pausePlayback();
    hideEndCard();
    state.currentIndex = 0;
    state.activePlayMs = 0;
    emitRender(currentChunkIndicesAt(0));
  }

  function setWpm(wpm) {
    state.wpm = wpm;
    persist("sr_wpm", String(state.wpm));
    if (callbacks.onWpmChange) callbacks.onWpmChange(state.wpm);
  }

  function adjustWpm(delta) {
    var next = clamp(state.wpm + delta, WPM_MIN, WPM_MAX);
    next = Math.round(next / WPM_STEP) * WPM_STEP;
    setWpm(next);
  }

  function rerunFromStart(newWpm) {
    hideEndCard();
    if (typeof newWpm === "number") {
      setWpm(clamp(newWpm, WPM_MIN, WPM_MAX));
    }
    state.currentIndex = 0;
    state.activePlayMs = 0;
    emitRender(currentChunkIndicesAt(0));
    resumePlayback();
  }

  function jumpToIndex(idx) {
    if (!state.doc || !state.doc.words.length) return;
    clearCountdown();
    var total = state.doc.words.length;
    idx = Math.max(0, Math.min(idx, total - 1));
    if (state.mode === "chunk" && state.phraseChunks.length) {
      var snapIdx = findPhraseChunkIndexAt(state.phraseChunks, idx);
      if (snapIdx !== -1) idx = state.phraseChunks[snapIdx].start;
    }
    if (state.timerId) {
      clearTimeout(state.timerId);
      state.timerId = null;
    }
    state.currentIndex = idx;
    hideEndCard();
    if (state.playing) {
      startPlaybackLoop();
    } else {
      emitRender(currentChunkIndicesAt(idx));
    }
  }

  function forwardSentence() {
    if (!state.doc || !state.doc.words.length) return;
    var starts = state.doc.sentenceStarts;
    var next;
    for (var i = 0; i < starts.length; i++) {
      if (starts[i] > state.currentIndex) { next = starts[i]; break; }
    }
    var target = (next !== undefined) ? next : Math.max(0, state.doc.words.length - 1);
    jumpToIndex(target);
  }

  function backSentence() {
    if (!state.doc || !state.doc.words.length) return;
    var starts = state.doc.sentenceStarts;
    var currentStart = 0;
    for (var i = 0; i < starts.length; i++) {
      if (starts[i] <= state.currentIndex) { currentStart = starts[i]; } else { break; }
    }
    var target;
    if (state.currentIndex > currentStart) {
      target = currentStart;
    } else {
      var prev = 0;
      for (var j = 0; j < starts.length; j++) {
        if (starts[j] < currentStart) { prev = starts[j]; } else { break; }
      }
      target = prev;
    }
    jumpToIndex(target);
  }

  function setMode(m) {
    if (m === state.mode) return;
    if (m === "chunk" && state.doc && state.phraseChunks.length) {
      var ci = findPhraseChunkIndexAt(state.phraseChunks, state.currentIndex);
      if (ci !== -1) state.currentIndex = state.phraseChunks[ci].start;
    }
    state.mode = m;
    persist("sr_mode", m);
    if (callbacks.onModeChange) callbacks.onModeChange(m);
    if (state.doc && state.doc.words.length) {
      if (state.playing) {
        if (state.timerId) {
          clearTimeout(state.timerId);
          state.timerId = null;
        }
        startPlaybackLoop();
      } else {
        emitRender(currentChunkIndicesAt(state.currentIndex));
      }
    }
  }

  function setChunkSize(n) {
    if (state.mode === "chunk") return;
    state.chunkSize = n;
    persist("sr_chunk", String(n));
    if (callbacks.onChunkSizeChange) callbacks.onChunkSizeChange(n);
    if (!state.doc || !state.doc.words.length) return;
    if (state.playing) {
      if (state.timerId) {
        clearTimeout(state.timerId);
        state.timerId = null;
      }
      startPlaybackLoop();
    } else {
      emitRender(currentChunkIndicesAt(state.currentIndex));
    }
  }

  function loadText(raw) {
    pausePlayback();
    hideEndCard();

    var doc = tokenizeText(raw);
    state.doc = doc;
    state.currentIndex = 0;
    state.activePlayMs = 0;
    state.phraseChunks = chunkPhrases(doc);

    var hasWords = doc.words.length > 0;
    if (callbacks.onDocLoaded) callbacks.onDocLoaded(doc, hasWords);

    if (hasWords) {
      emitRender(currentChunkIndicesAt(0));
    } else {
      emitProgress();
    }
    return doc;
  }

  return {
    loadText: loadText,
    setMode: setMode,
    setChunkSize: setChunkSize,
    setWpm: setWpm,
    adjustWpm: adjustWpm,
    togglePlay: togglePlay,
    restart: restart,
    rerunFromStart: rerunFromStart,
    jumpToIndex: jumpToIndex,
    forwardSentence: forwardSentence,
    backSentence: backSentence,
    getWpm: function () { return state.wpm; }
  };
}

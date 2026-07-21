// Standalone-page glue: the textarea, "Load text" button, sample text,
// theme toggle, and a localStorage-backed settings adapter. Everything
// reader-mode-specific (RSVP/Chunk/Pacer, stage, controls) lives in
// src/ui/reader.js; this file only owns page chrome and mounts that
// reader into #readerRoot.
//
// SAMPLE_TEXT is exported (not just used locally) so the build script can
// import it for the chunker-distribution invariant check without needing
// a second copy of the text anywhere.

import { mount } from "../ui/reader.js";

export const SAMPLE_TEXT = "Does flashing words actually make you read faster?\n\n" +
  "Skilled adult readers average roughly 200 to 400 words per minute. That range has held up across decades of research, and it exists mostly because of how the brain processes language, not because of how quickly the eyes move. Understanding a sentence takes time no matter how fast the words appear on a screen. Comprehension, not eye speed, is usually the real bottleneck.\n\n" +
  "Normal reading is not a smooth glide across the page. About 10 to 15 percent of eye movements during reading are regressions, brief backward glances that let a reader recheck a word or resolve a confusing phrase. Readers also use parafoveal vision to preview upcoming words before their eyes land on them, which primes recognition and speeds comprehension. RSVP style flashing, where one word or a short chunk appears alone at a fixed point, removes both of these tools at once. There is nothing to glance back at and nothing ahead to preview.\n\n" +
  "The research on this is fairly consistent. Schotter, Tran and Rayner (2012) found that preventing readers from looking back at earlier text hurt comprehension, even when overall speed went up. Benedetto and colleagues (2015) tested Spritz style flashing directly and found it held up on surface comprehension at moderate speeds, but increased eye strain and made deeper understanding harder. Rayner and colleagues summarized the field in a widely cited 2016 review titled \"So Much to Read, So Little Time,\" concluding that there is no free lunch: push reading speed past a person’s natural rate and comprehension pays the price.\n\n" +
  "The honest path to reading faster is slower to describe but it works. Practice reading a little above your comfortable pace, build the vocabulary and background knowledge that let you predict where a sentence is going, and learn deliberate skimming for moments when you only need the gist. A pacer that pushes your pace while leaving the full text visible keeps regressions and preview available, which is exactly why this tool includes one.";

function createLocalStorageAdapter() {
  return {
    get: function (key) {
      return localStorage.getItem(key);
    },
    set: function (key, value) {
      localStorage.setItem(key, value);
    }
  };
}

async function init() {
  var storage = createLocalStorageAdapter();

  var themeToggleBtn = document.getElementById("themeToggleBtn");
  var textAreaEl = document.getElementById("textArea");
  var wordCountLabelEl = document.getElementById("wordCountLabel");
  var btnLoadText = document.getElementById("btnLoadText");
  var readerRootEl = document.getElementById("readerRoot");

  var themeState = { theme: "dark" };

  function updateThemeButton() {
    themeToggleBtn.textContent = themeState.theme === "dark" ? "☾" : "☀";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeState.theme = theme;
    storage.set("sr_theme", theme);
    updateThemeButton();
  }

  function updateWordCountLabel() {
    var n = (textAreaEl.value.match(/\S+/g) || []).length;
    wordCountLabelEl.textContent = n.toLocaleString() + (n === 1 ? " word" : " words");
  }

  var savedTheme = await storage.get("sr_theme");
  var systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (savedTheme === "dark" || savedTheme === "light") {
    document.documentElement.setAttribute("data-theme", savedTheme);
    themeState.theme = savedTheme;
  } else {
    themeState.theme = systemDark ? "dark" : "light";
  }
  updateThemeButton();
  themeToggleBtn.addEventListener("click", function () {
    applyTheme(themeState.theme === "dark" ? "light" : "dark");
    themeToggleBtn.blur();
  });

  textAreaEl.value = SAMPLE_TEXT;
  updateWordCountLabel();
  textAreaEl.addEventListener("input", updateWordCountLabel);

  var reader = await mount(readerRootEl, {
    storage: storage,
    keyEventTarget: document,
    initialText: { text: SAMPLE_TEXT, title: null }
  });

  btnLoadText.addEventListener("click", function () {
    var raw = textAreaEl.value;
    var text = raw;
    if (!text || !text.trim()) {
      text = SAMPLE_TEXT;
      textAreaEl.value = SAMPLE_TEXT;
      updateWordCountLabel();
    }
    reader.loadText(text);
    btnLoadText.blur();
  });
}

if (typeof document !== "undefined") {
  init();
}

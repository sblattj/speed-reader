// Content script: extraction ladder, closed-shadow overlay, and the
// chrome.storage.sync adapter that lets the mounted reader share
// settings with the standalone page. Bundled by scripts/build.ts into
// dist/content.js as an IIFE and injected on demand by background.js,
// never declared in manifest.json's content_scripts.
//
// This file sets a window flag on first load so a second injection
// (background.js always injects before sending the message) is a no-op:
// the listener registered on first load is still alive and handles the
// follow-up message.

import { tokenizeText } from "../core/tokenize.js";
import { mount } from "../ui/reader.js";
import Readability from "../../extension/vendor/readability.js";
import readerCssText from "../ui/reader.css";
import overlayCssText from "./overlay.css";

(function () {
  if (window.__SPEED_READER_CONTENT_LOADED__) {
    return;
  }
  window.__SPEED_READER_CONTENT_LOADED__ = true;

  var WPM_MIN = 100;
  var WPM_MAX = 900;
  var READER_KEYS = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1 };
  var BLOCK_TAGS = {
    P: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1,
    LI: 1, BLOCKQUOTE: 1, PRE: 1
  };
  var SKIP_TAGS = { NAV: 1, FOOTER: 1, ASIDE: 1, SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1 };

  var hostEl = null;
  var shadow = null;
  var cardEl = null;
  var prevOverflow = null;
  var docKeydownGuard = null;

  function isReaderKey(e) {
    if (e.key === " " || e.key === "Spacebar") return true;
    if (e.key === "r" || e.key === "R") return true;
    if (e.key === "Escape" || e.key === "Esc") return true;
    return !!READER_KEYS[e.key];
  }

  function collapseWhitespace(s) {
    return s.replace(/\s+/g, " ").trim();
  }

  // Rung 2 helper: Readability hands back a cleaned HTML fragment.
  // Walking its block elements and joining with blank lines preserves
  // paragraph breaks; article.textContent alone does not, since the
  // serialized HTML often has no whitespace between adjacent blocks.
  function paragraphsFromHtml(html) {
    var container = document.createElement("div");
    container.innerHTML = html;
    var paras = [];
    function walk(node) {
      var children = node.children;
      for (var i = 0; i < children.length; i++) {
        var el = children[i];
        if (BLOCK_TAGS[el.tagName]) {
          var t = collapseWhitespace(el.textContent || "");
          if (t) paras.push(t);
        } else {
          walk(el);
        }
      }
    }
    walk(container);
    if (paras.length) return paras.join("\n\n");
    return collapseWhitespace(container.textContent || "");
  }

  // Rung 3: innerText of main/article/[role=main] (else body), reading
  // each candidate block element live off the real, attached DOM so
  // innerText resolves correctly, with nav/footer/aside/script/style
  // subtrees skipped entirely rather than mutating the page to remove
  // them.
  function extractFallbackText() {
    var root = document.querySelector("main") ||
      document.querySelector("article") ||
      document.querySelector("[role=main]") ||
      document.body;
    if (!root) return "";
    var paras = [];
    function collect(el) {
      if (SKIP_TAGS[el.tagName]) return;
      if (BLOCK_TAGS[el.tagName]) {
        var t = collapseWhitespace(el.innerText || el.textContent || "");
        if (t) paras.push(t);
        return;
      }
      var children = el.children;
      for (var i = 0; i < children.length; i++) collect(children[i]);
    }
    collect(root);
    if (paras.length) return paras.join("\n\n");
    return collapseWhitespace(root.innerText || root.textContent || "");
  }

  function runExtraction() {
    var sel = window.getSelection();
    var selText = sel && !sel.isCollapsed ? sel.toString() : "";
    if (selText && selText.trim()) {
      return { rung: 1, rungLabel: "Selection", title: document.title || null, text: selText };
    }

    try {
      var cloneDoc = document.cloneNode(true);
      var article = new Readability(cloneDoc).parse();
      if (article && article.textContent && collapseWhitespace(article.textContent).length > 0) {
        var text = paragraphsFromHtml(article.content || "") || collapseWhitespace(article.textContent);
        return {
          rung: 2,
          rungLabel: "Readability",
          title: article.title || document.title || null,
          text: text
        };
      }
    } catch (err) {
      // Readability threw on this page; fall through to rung 3.
    }

    var fallbackText = extractFallbackText();
    if (fallbackText && fallbackText.trim()) {
      return { rung: 3, rungLabel: "Fallback", title: document.title || null, text: fallbackText };
    }

    return { rung: 0, rungLabel: null, title: null, text: "" };
  }

  function createChromeStorageAdapter() {
    return {
      get: function (key) {
        return new Promise(function (resolve) {
          try {
            chrome.storage.sync.get([key], function (result) {
              if (chrome.runtime.lastError || !result) { resolve(null); return; }
              resolve(Object.prototype.hasOwnProperty.call(result, key) ? result[key] : null);
            });
          } catch (err) {
            resolve(null);
          }
        });
      },
      set: function (key, value) {
        try {
          var obj = {};
          obj[key] = value;
          chrome.storage.sync.set(obj);
        } catch (err) {
          // storage unavailable; settings simply will not persist this time.
        }
      }
    };
  }

  function readStoredWpm() {
    return new Promise(function (resolve) {
      try {
        chrome.storage.sync.get(["sr_wpm"], function (result) {
          var n = result && parseInt(result.sr_wpm, 10);
          resolve((typeof n === "number" && Number.isFinite(n) && n >= WPM_MIN && n <= WPM_MAX) ? n : 300);
        });
      } catch (err) {
        resolve(300);
      }
    });
  }

  function readStoredTheme() {
    return new Promise(function (resolve) {
      try {
        chrome.storage.sync.get(["sr_theme"], function (result) {
          var t = result && result.sr_theme;
          resolve((t === "light" || t === "dark") ? t : null);
        });
      } catch (err) {
        resolve(null);
      }
    });
  }

  function formatMeta(wordCount, wpm) {
    var minutes = wpm > 0 ? wordCount / wpm : 0;
    var rounded = Math.max(1, Math.round(minutes));
    var wordLabel = wordCount.toLocaleString() + (wordCount === 1 ? " word" : " words");
    var minuteLabel = rounded + (rounded === 1 ? " minute" : " minutes");
    return wordLabel + ", about " + minuteLabel + " at " + wpm + " wpm";
  }

  function teardownOverlay(restoreScroll) {
    if (docKeydownGuard) {
      document.removeEventListener("keydown", docKeydownGuard, true);
      docKeydownGuard = null;
    }
    if (restoreScroll && prevOverflow !== null) {
      document.documentElement.style.overflow = prevOverflow;
      prevOverflow = null;
    }
    if (hostEl) {
      hostEl.remove();
    }
    hostEl = null;
    shadow = null;
    cardEl = null;
  }

  function closeOverlay() {
    teardownOverlay(true);
  }

  function buildOverlayDom() {
    hostEl = document.createElement("div");
    hostEl.style.cssText = "all: initial; position: fixed; inset: 0; z-index: 2147483647;";
    document.documentElement.appendChild(hostEl);
    shadow = hostEl.attachShadow({ mode: "closed" });

    var styleEl = document.createElement("style");
    styleEl.textContent = readerCssText + "\n" + overlayCssText;
    shadow.appendChild(styleEl);

    var scrimEl = document.createElement("div");
    scrimEl.className = "sr-ext-scrim";

    cardEl = document.createElement("div");
    cardEl.className = "sr-ext-card";
    cardEl.tabIndex = -1;

    var headerEl = document.createElement("div");
    headerEl.className = "sr-ext-header";

    var headerMainEl = document.createElement("div");
    headerMainEl.className = "sr-ext-header-main";

    var rungEl = document.createElement("span");
    rungEl.className = "sr-ext-rung";

    var titleEl = document.createElement("span");
    titleEl.className = "sr-ext-title";

    var metaEl = document.createElement("span");
    metaEl.className = "sr-ext-meta";

    headerMainEl.appendChild(rungEl);
    headerMainEl.appendChild(titleEl);
    headerMainEl.appendChild(metaEl);

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "sr-ext-close";
    closeBtn.setAttribute("aria-label", "Close speed reader");
    closeBtn.title = "Close";
    closeBtn.textContent = String.fromCharCode(215);
    closeBtn.addEventListener("click", closeOverlay);

    headerEl.appendChild(headerMainEl);
    headerEl.appendChild(closeBtn);

    var emptyEl = document.createElement("div");
    emptyEl.className = "sr-ext-empty";
    emptyEl.hidden = true;
    emptyEl.textContent = "Nothing readable found, select text instead.";

    var readerRootEl = document.createElement("div");
    readerRootEl.className = "sr-ext-reader-root";

    cardEl.appendChild(headerEl);
    cardEl.appendChild(emptyEl);
    cardEl.appendChild(readerRootEl);
    scrimEl.appendChild(cardEl);
    shadow.appendChild(scrimEl);

    return { rungEl: rungEl, titleEl: titleEl, metaEl: metaEl, emptyEl: emptyEl, readerRootEl: readerRootEl };
  }

  function installKeydownGuard() {
    docKeydownGuard = function (e) {
      if (!isReaderKey(e)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.key === "Escape" || e.key === "Esc") {
        closeOverlay();
        return;
      }
      if (!shadow) return;
      var forwarded = new KeyboardEvent("keydown", {
        key: e.key,
        code: e.code,
        bubbles: true,
        cancelable: true
      });
      shadow.dispatchEvent(forwarded);
    };
    document.addEventListener("keydown", docKeydownGuard, true);
  }

  async function renderExtraction(refs, extraction) {
    var hasText = !!(extraction.text && extraction.text.trim());
    refs.emptyEl.hidden = hasText;
    refs.readerRootEl.hidden = !hasText;

    if (!hasText) {
      refs.rungEl.textContent = "Nothing found";
      refs.titleEl.textContent = document.title || "";
      refs.metaEl.textContent = "";
      return;
    }

    var doc = tokenizeText(extraction.text);
    var wpm = await readStoredWpm();

    refs.rungEl.textContent = extraction.rungLabel;
    refs.titleEl.textContent = extraction.title || document.title || "Untitled page";
    refs.metaEl.textContent = formatMeta(doc.words.length, wpm);

    await mount(refs.readerRootEl, {
      storage: createChromeStorageAdapter(),
      keyEventTarget: shadow,
      initialText: { text: extraction.text, title: extraction.title || document.title || null }
    });
  }

  async function openOverlay() {
    var extraction = runExtraction();

    if (hostEl) {
      teardownOverlay(false);
    } else {
      prevOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
    }

    var refs = buildOverlayDom();
    var theme = await readStoredTheme();
    if (theme) hostEl.setAttribute("data-theme", theme);

    installKeydownGuard();
    if (cardEl) cardEl.focus({ preventScroll: true });

    await renderExtraction(refs, extraction);
  }

  chrome.runtime.onMessage.addListener(function (message) {
    if (message && (message.kind === "page" || message.kind === "selection")) {
      openOverlay().catch(function (err) {
        console.error("Speed Reader: overlay failed to open.", err);
      });
    }
  });
})();

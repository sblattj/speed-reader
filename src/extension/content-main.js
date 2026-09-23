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
  var overlayRefs = null;
  var readerHandle = null;
  var readerMountPromise = null;
  var prevOverflow = null;
  var docKeydownGuard = null;
  var picking = false;
  var pickerHadOverlay = false;
  var pickerHostEl = null;
  var pickerHighlightEl = null;
  var pickerTagEl = null;
  var currentTarget = null;
  var pickerResumePlayback = false;
  var pickerFrameAccess = false;
  var pickerAllowBtn = null;
  var lifecycleVersion = 0;

  // background.js injects into every reachable frame. The top frame owns
  // the reader overlay and the picker banner; child frames only run the
  // picker highlight and hand their picks and extractions back through
  // the service worker.
  var isTop = window === window.top;
  // Identifies this frame's picker in pick-hover broadcasts.
  var frameToken = Math.random().toString(36).slice(2);
  var MIN_BLOCKED_FRAME_AREA = 200 * 150;

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

  // Shared live-DOM paragraph walk for fallback and picked elements.
  // If the root contains no recognized block descendants, its complete
  // visible text is returned so inline elements remain readable.
  function collectParagraphs(root) {
    if (!root) return "";
    if (SKIP_TAGS[root.tagName]) return "";
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
    return collectParagraphs(root);
  }

  function isFrameElement(el) {
    return !!(el && (el.tagName === "IFRAME" || el.tagName === "FRAME"));
  }

  // A frame whose document this script cannot see (cross-origin). The
  // extension can still read it once the optional frame access is granted.
  function isBlockedFrame(el) {
    try {
      return !el.contentDocument;
    } catch (err) {
      return true;
    }
  }

  function countBlockedFrames() {
    var frames = document.querySelectorAll("iframe, frame");
    var n = 0;
    for (var i = 0; i < frames.length; i++) {
      var rect = frames[i].getBoundingClientRect();
      if (rect.width * rect.height < MIN_BLOCKED_FRAME_AREA) continue;
      if (isBlockedFrame(frames[i])) n++;
    }
    return n;
  }

  function countWords(text) {
    var trimmed = (text || "").trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }

  function extractFromElement(el) {
    var extraction = {
      rung: 4,
      rungLabel: "Element",
      title: document.title || null,
      text: collectParagraphs(el)
    };
    if (isFrameElement(el) && isBlockedFrame(el) && !extraction.text.trim()) {
      extraction.needsFrameAccess = true;
    }
    return extraction;
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

  function notifyBackground(message) {
    try {
      chrome.runtime.sendMessage(message, function () {
        void chrome.runtime.lastError;
      });
    } catch (err) {
      // Extension reloaded underneath this page; nothing to notify.
    }
  }

  function requestFrameAccess(resumeKind) {
    notifyBackground({ type: "open-grant", resume: resumeKind });
  }

  // Called by background.js through scripting.executeScript in every
  // frame (same isolated world), which then chooses one extraction.
  window.__SPEED_READER_API__ = {
    extract: function () {
      var extraction = runExtraction();
      extraction.words = countWords(extraction.text);
      extraction.area = window.innerWidth * window.innerHeight;
      extraction.blockedFrames = isTop ? countBlockedFrames() : 0;
      return extraction;
    }
  };

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
    overlayRefs = null;
    readerHandle = null;
    readerMountPromise = null;
  }

  function closeOverlay() {
    lifecycleVersion++;
    teardownOverlay(true);
  }

  function buildOverlayDom() {
    hostEl = document.createElement("div");
    hostEl.setAttribute("data-speed-reader-overlay", "");
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

    var headerActionsEl = document.createElement("div");
    headerActionsEl.className = "sr-ext-header-actions";

    var pickBtn = document.createElement("button");
    pickBtn.type = "button";
    pickBtn.className = "sr-ext-pick";
    pickBtn.setAttribute("aria-label", "Pick an element to speed read");
    pickBtn.title = "Pick an element";
    pickBtn.textContent = "Pick element";
    pickBtn.addEventListener("click", function () {
      startElementPicker(false);
      chrome.runtime.sendMessage({ type: "start-pick" }, function (response) {
        if (chrome.runtime.lastError || !response || !picking) return;
        pickerFrameAccess = !!response.frameAccess;
        refreshPickerBanner();
      });
    });

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "sr-ext-close";
    closeBtn.setAttribute("aria-label", "Close speed reader");
    closeBtn.title = "Close";
    closeBtn.textContent = String.fromCharCode(215);
    closeBtn.addEventListener("click", closeOverlay);

    headerActionsEl.appendChild(pickBtn);
    headerActionsEl.appendChild(closeBtn);
    headerEl.appendChild(headerMainEl);
    headerEl.appendChild(headerActionsEl);

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
      if (picking) return;
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

  async function renderExtraction(refs, extraction, renderVersion) {
    var hasText = !!(extraction.text && extraction.text.trim()) && !extraction.needsFrameAccess;
    refs.emptyEl.hidden = hasText;
    refs.readerRootEl.hidden = !hasText;

    if (!hasText) {
      if (readerHandle) readerHandle.loadText("");
      if (hostEl) {
        hostEl.setAttribute("data-rung", extraction.rungLabel || "Nothing found");
        hostEl.setAttribute("data-word-count", "0");
      }
      refs.rungEl.textContent = extraction.rungLabel || "Nothing found";
      refs.titleEl.textContent = document.title || "";
      refs.metaEl.textContent = "";
      if (extraction.needsFrameAccess) {
        refs.emptyEl.textContent = extraction.rung === 4
          ? "That element is an embedded frame from another site. Speed Reader needs your OK to read inside embedded frames."
          : "This page's text lives in an embedded frame from another site. Speed Reader needs your OK to read inside embedded frames.";
        var grantBtn = document.createElement("button");
        grantBtn.type = "button";
        grantBtn.className = "sr-ext-grant";
        grantBtn.textContent = "Allow reading embedded frames";
        grantBtn.addEventListener("click", function () {
          requestFrameAccess(extraction.rung === 4 ? "pick" : "page");
        });
        refs.emptyEl.appendChild(document.createElement("br"));
        refs.emptyEl.appendChild(grantBtn);
      } else {
        refs.emptyEl.textContent = extraction.rung === 4
          ? "Nothing readable in that element, pick another."
          : "Nothing readable found, select text instead.";
      }
      return;
    }

    var doc = tokenizeText(extraction.text);
    var wpm = await readStoredWpm();
    if (renderVersion !== lifecycleVersion || refs !== overlayRefs) return;

    if (hostEl) {
      hostEl.setAttribute("data-rung", extraction.rungLabel);
      hostEl.setAttribute("data-word-count", String(doc.words.length));
    }
    refs.rungEl.textContent = extraction.rungLabel;
    refs.titleEl.textContent = extraction.title || document.title || "Untitled page";
    refs.metaEl.textContent = formatMeta(doc.words.length, wpm);

    if (readerHandle) {
      readerHandle.loadText(extraction.text);
    } else {
      var mountPromise = readerMountPromise;
      if (!mountPromise) {
        var mountShadow = shadow;
        mountPromise = mount(refs.readerRootEl, {
          storage: createChromeStorageAdapter(),
          keyEventTarget: mountShadow,
          initialText: { text: extraction.text, title: extraction.title || document.title || null }
        }).then(function (handle) {
          return { handle: handle, refs: refs, shadow: mountShadow };
        });
        readerMountPromise = mountPromise;
      }

      var mounted = await mountPromise;
      if (readerMountPromise === mountPromise) readerMountPromise = null;

      if (mounted.refs !== overlayRefs || mounted.shadow !== shadow) {
        mounted.handle.loadText("");
        return;
      }
      if (renderVersion !== lifecycleVersion || refs !== overlayRefs) return;

      readerHandle = mounted.handle;
      readerHandle.loadText(extraction.text);
    }
  }

  async function renderIntoOverlay(extraction) {
    var renderVersion = ++lifecycleVersion;
    var reuseHiddenOverlay = !!(hostEl && hostEl.style.display === "none" && overlayRefs);

    if (hostEl && !reuseHiddenOverlay) {
      teardownOverlay(false);
    }

    if (prevOverflow === null) {
      prevOverflow = document.documentElement.style.overflow;
    }
    document.documentElement.style.overflow = "hidden";

    if (reuseHiddenOverlay) {
      hostEl.style.display = "";
    } else {
      overlayRefs = buildOverlayDom();
      var theme = await readStoredTheme();
      if (renderVersion !== lifecycleVersion) return;
      if (theme && hostEl) hostEl.setAttribute("data-theme", theme);
    }

    if (!docKeydownGuard) installKeydownGuard();
    if (cardEl) cardEl.focus({ preventScroll: true });
    await renderExtraction(overlayRefs, extraction, renderVersion);
  }

  function openOverlay() {
    return renderIntoOverlay(runExtraction());
  }

  function pickerLayerCss() {
    return "" +
      ":host{all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;" +
      "font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif;}" +
      "*,*::before,*::after{box-sizing:border-box;}" +
      ".highlight{display:none;position:fixed;pointer-events:none;border:2px solid #147888;" +
      "background:rgba(20,120,136,.16);border-radius:3px;}" +
      ".tag{position:absolute;left:-2px;top:0;transform:translateY(calc(-100% - 4px));" +
      "max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" +
      "padding:3px 7px;border-radius:999px;background:#147888;color:#fff;" +
      "font:700 11px/1.3 -apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif;" +
      "letter-spacing:.04em;text-transform:uppercase;box-shadow:0 2px 8px rgba(0,0,0,.22);}" +
      ".banner{position:fixed;top:16px;left:50%;transform:translateX(-50%);max-width:calc(100vw - 32px);" +
      "padding:9px 14px;border:1px solid rgba(255,255,255,.28);border-radius:999px;" +
      "background:#173238;color:#fff;box-shadow:0 6px 24px rgba(0,0,0,.28);" +
      "font:600 13px/1.35 -apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif;" +
      "text-align:center;white-space:nowrap;}" +
      ".banner button{pointer-events:auto;margin-left:10px;padding:3px 10px;border:0;border-radius:999px;" +
      "background:#4fb8c4;color:#08282c;cursor:pointer;" +
      "font:700 12px/1.35 -apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif;}" +
      ".banner button[hidden]{display:none;}";
  }

  function buildPickerLayer() {
    pickerHostEl = document.createElement("div");
    pickerHostEl.setAttribute("data-speed-reader-picker", "");
    pickerHostEl.style.cssText = "all: initial; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;";
    document.documentElement.appendChild(pickerHostEl);

    var pickerShadow = pickerHostEl.attachShadow({ mode: "open" });
    var styleEl = document.createElement("style");
    styleEl.textContent = pickerLayerCss();

    pickerHighlightEl = document.createElement("div");
    pickerHighlightEl.className = "highlight";
    pickerHighlightEl.setAttribute("data-speed-reader-highlight", "");

    pickerTagEl = document.createElement("span");
    pickerTagEl.className = "tag";
    pickerHighlightEl.appendChild(pickerTagEl);

    pickerShadow.appendChild(styleEl);
    pickerShadow.appendChild(pickerHighlightEl);
    if (!isTop) return;

    var bannerEl = document.createElement("div");
    bannerEl.className = "banner";
    bannerEl.setAttribute("role", "status");
    bannerEl.appendChild(document.createTextNode("Click an element to read it. Esc to cancel."));

    pickerAllowBtn = document.createElement("button");
    pickerAllowBtn.type = "button";
    pickerAllowBtn.textContent = "Allow reading embedded frames";
    pickerAllowBtn.hidden = true;
    bannerEl.appendChild(pickerAllowBtn);

    pickerShadow.appendChild(bannerEl);
    refreshPickerBanner();
  }

  // Offer frame access only when the page has sizable frames the picker
  // cannot reach yet.
  function refreshPickerBanner() {
    if (!pickerAllowBtn) return;
    pickerAllowBtn.hidden = pickerFrameAccess || countBlockedFrames() === 0;
  }

  // A frame the picker also runs inside handles its own highlight.
  function isHandledFrame(el) {
    return isFrameElement(el) && (pickerFrameAccess || !isBlockedFrame(el));
  }

  function hidePickerHighlight() {
    currentTarget = null;
    if (pickerHighlightEl) pickerHighlightEl.style.display = "none";
    if (pickerHostEl) pickerHostEl.removeAttribute("data-target-tag");
  }

  function isPickerOwnedElement(el) {
    return !!(
      !el ||
      el === pickerHostEl ||
      el === hostEl ||
      (pickerHostEl && pickerHostEl.contains(el)) ||
      (hostEl && hostEl.contains(el))
    );
  }

  function updatePickerHighlight(el) {
    if (isPickerOwnedElement(el) || !el.isConnected || isHandledFrame(el)) {
      hidePickerHighlight();
      return;
    }

    var rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      hidePickerHighlight();
      return;
    }

    // Cross-origin frames run in their own process, so a document never
    // sees the pointer leave into one. Whenever this frame starts
    // highlighting, the other frames are told to drop theirs.
    if (!currentTarget) notifyBackground({ type: "pick-hover", token: frameToken });
    currentTarget = el;
    var tagName = el.tagName ? el.tagName.toLowerCase() : "element";
    if (pickerTagEl) {
      pickerTagEl.textContent = tagName;
      pickerTagEl.style.top = rect.top < 28 ? "100%" : "0";
      pickerTagEl.style.transform = rect.top < 28
        ? "translateY(4px)"
        : "translateY(calc(-100% - 4px))";
    }
    if (pickerHostEl) pickerHostEl.setAttribute("data-target-tag", tagName);
    if (pickerHighlightEl) {
      pickerHighlightEl.style.display = "block";
      pickerHighlightEl.style.left = rect.left + "px";
      pickerHighlightEl.style.top = rect.top + "px";
      pickerHighlightEl.style.width = rect.width + "px";
      pickerHighlightEl.style.height = rect.height + "px";
    }
  }

  function elementAtPoint(clientX, clientY) {
    var el = document.elementFromPoint(clientX, clientY);
    return isPickerOwnedElement(el) ? null : el;
  }

  function onPickerMouseMove(e) {
    updatePickerHighlight(elementAtPoint(e.clientX, e.clientY));
  }

  // The pointer left this document (into a child frame, or out of this
  // frame into its parent): the other document's picker takes over.
  function onPickerMouseOut(e) {
    if (!e.relatedTarget || isHandledFrame(e.relatedTarget)) hidePickerHighlight();
  }

  function onPickerViewportChange() {
    if (currentTarget) updatePickerHighlight(currentTarget);
  }

  function blockPickerEvent(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  function onPickerClick(e) {
    blockPickerEvent(e);
    if (pickerAllowBtn && e.composedPath().indexOf(pickerAllowBtn) !== -1) {
      requestFrameAccess("pick");
      return;
    }
    var el = elementAtPoint(e.clientX, e.clientY) || currentTarget;
    if (el) finishPick(el);
  }

  function onPickerKeydown(e) {
    if (e.key !== "Escape" && e.key !== "Esc") return;
    blockPickerEvent(e);
    cancelPick();
    // Stop the pickers running in the other frames too. From a child
    // frame this also restores the reader in the top frame.
    notifyBackground({ type: isTop ? "pick-ended" : "pick-cancel" });
  }

  function installPickerListeners() {
    document.addEventListener("mousemove", onPickerMouseMove, true);
    document.addEventListener("mouseover", onPickerMouseMove, true);
    document.addEventListener("mouseout", onPickerMouseOut, true);
    document.addEventListener("click", onPickerClick, true);
    document.addEventListener("mousedown", blockPickerEvent, true);
    document.addEventListener("mouseup", blockPickerEvent, true);
    document.addEventListener("pointerdown", blockPickerEvent, true);
    document.addEventListener("pointerup", blockPickerEvent, true);
    document.addEventListener("auxclick", blockPickerEvent, true);
    document.addEventListener("contextmenu", blockPickerEvent, true);
    document.addEventListener("keydown", onPickerKeydown, true);
    document.addEventListener("scroll", onPickerViewportChange, true);
    window.addEventListener("resize", onPickerViewportChange);
  }

  function removePickerListeners() {
    document.removeEventListener("mousemove", onPickerMouseMove, true);
    document.removeEventListener("mouseover", onPickerMouseMove, true);
    document.removeEventListener("mouseout", onPickerMouseOut, true);
    document.removeEventListener("click", onPickerClick, true);
    document.removeEventListener("mousedown", blockPickerEvent, true);
    document.removeEventListener("mouseup", blockPickerEvent, true);
    document.removeEventListener("pointerdown", blockPickerEvent, true);
    document.removeEventListener("pointerup", blockPickerEvent, true);
    document.removeEventListener("auxclick", blockPickerEvent, true);
    document.removeEventListener("contextmenu", blockPickerEvent, true);
    document.removeEventListener("keydown", onPickerKeydown, true);
    document.removeEventListener("scroll", onPickerViewportChange, true);
    window.removeEventListener("resize", onPickerViewportChange);
  }

  function teardownPicker() {
    removePickerListeners();
    if (pickerHostEl) pickerHostEl.remove();
    pickerHostEl = null;
    pickerHighlightEl = null;
    pickerTagEl = null;
    pickerAllowBtn = null;
    currentTarget = null;
    picking = false;
  }

  function suspendReaderForPicker() {
    pickerResumePlayback = false;
    if (!shadow || !readerHandle) return;

    var readoutEl = shadow.querySelector("#wordReadout");
    var match = readoutEl && readoutEl.textContent.match(/Word ([\d,]+) \//);
    var currentWord = match ? parseInt(match[1].replace(/,/g, ""), 10) : 0;
    if (hostEl) hostEl.setAttribute("data-last-picker-paused-word", String(currentWord));

    var playBtn = shadow.querySelector("#btnPlay");
    if (playBtn && playBtn.getAttribute("aria-label") === "Pause") {
      pickerResumePlayback = true;
      if (hostEl) hostEl.setAttribute("data-last-picker-resume-playback", "true");
      playBtn.click();
      if (hostEl) {
        hostEl.setAttribute(
          "data-last-picker-player-state",
          playBtn.getAttribute("aria-label") || "unknown"
        );
      }
      return;
    }

    var countdownEl = shadow.querySelector("#countdownOverlay");
    if (!countdownEl || countdownEl.hidden) {
      if (hostEl) hostEl.setAttribute("data-last-picker-resume-playback", "false");
      if (hostEl) hostEl.setAttribute("data-last-picker-player-state", "paused");
      return;
    }

    var currentPacerWord = currentWord > 0
      ? shadow.querySelector('.pw[data-idx="' + (currentWord - 1) + '"]')
      : null;
    if (hostEl) hostEl.setAttribute("data-last-picker-resume-playback", "false");
    if (currentPacerWord) {
      pickerResumePlayback = true;
      if (hostEl) hostEl.setAttribute("data-last-picker-resume-playback", "true");
      currentPacerWord.click();
      if (hostEl) {
        hostEl.setAttribute(
          "data-last-picker-player-state",
          countdownEl.hidden ? "countdown-paused" : "countdown-active"
        );
      }
    }
  }

  function resumeReaderAfterPicker() {
    var shouldResume = pickerResumePlayback;
    pickerResumePlayback = false;
    if (!shouldResume || !shadow || !readerHandle) return;
    var playBtn = shadow.querySelector("#btnPlay");
    if (playBtn) playBtn.click();
  }

  function startElementPicker(frameAccess) {
    if (picking) {
      // Already picking (a repeat gesture, or background.js fanning the
      // picker out after the Pick element button or a new frame grant):
      // keep the session and only refresh what frame access changed.
      pickerFrameAccess = !!frameAccess;
      refreshPickerBanner();
      if (currentTarget) updatePickerHighlight(currentTarget);
      return;
    }

    picking = true;
    pickerFrameAccess = !!frameAccess;
    pickerHadOverlay = !!hostEl;
    if (hostEl) {
      suspendReaderForPicker();
      hostEl.style.display = "none";
      if (prevOverflow !== null) {
        document.documentElement.style.overflow = prevOverflow;
      }
    }

    buildPickerLayer();
    installPickerListeners();
  }

  function finishPick(el) {
    if (!picking || !el) return;
    var extraction = extractFromElement(el);
    if (!isTop) {
      // The reader lives in the top frame; background.js relays this.
      teardownPicker();
      notifyBackground({ type: "picked", extraction: extraction });
      return;
    }
    finishPickWith(extraction);
    notifyBackground({ type: "pick-ended" });
  }

  function finishPickWith(extraction) {
    var hadOverlay = picking && pickerHadOverlay;
    if (picking) teardownPicker();
    pickerHadOverlay = false;
    pickerResumePlayback = false;

    if (hadOverlay && hostEl) {
      document.documentElement.style.overflow = "hidden";
    }

    renderIntoOverlay(extraction).catch(function (err) {
      console.error("Speed Reader: picked element failed to open.", err);
      if (hostEl) hostEl.style.display = "";
    });
  }

  function cancelPick(restorePlayback) {
    if (!picking) return;
    var restoreOverlay = pickerHadOverlay;
    teardownPicker();
    pickerHadOverlay = false;

    if (restoreOverlay && hostEl) {
      hostEl.style.display = "";
      document.documentElement.style.overflow = "hidden";
      if (cardEl) cardEl.focus({ preventScroll: true });
      if (restorePlayback !== false) {
        resumeReaderAfterPicker();
      } else {
        pickerResumePlayback = false;
      }
    } else {
      pickerResumePlayback = false;
    }
  }

  chrome.runtime.onMessage.addListener(function (message) {
    if (!message) return;
    if (message.kind === "pick") {
      startElementPicker(message.frameAccess);
    } else if (message.kind === "pick-cancel") {
      cancelPick();
    } else if (message.kind === "pick-hover") {
      if (picking && message.token !== frameToken) hidePickerHighlight();
    } else if (!isTop) {
      return;
    } else if (message.kind === "show") {
      if (picking) cancelPick(false);
      renderIntoOverlay(message.extraction).catch(function (err) {
        console.error("Speed Reader: overlay failed to open.", err);
      });
    } else if (message.kind === "picked") {
      finishPickWith(message.extraction);
    } else if (message.kind === "page" || message.kind === "selection") {
      if (picking) cancelPick(false);
      openOverlay().catch(function (err) {
        console.error("Speed Reader: overlay failed to open.", err);
      });
    }
  });
})();

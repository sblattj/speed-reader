// MV3 service worker: context menus, the toolbar action, and both
// keyboard commands all funnel through invoke(), which injects
// content.js into every frame it may reach (safe to inject repeatedly,
// see content-main.js) and then either asks every frame for its best
// extraction or starts the element picker in every frame.
//
// No host_permissions are declared. By default every injection rides
// the activeTab grant from the gesture that triggered it, which covers
// the top page and its same-origin frames only. Reading inside
// cross-origin frames (embedded docs, previews, sandboxed apps) needs
// the optional <all_urls> host permission, which the user grants from
// grant.html; it is never requested silently.
"use strict";

var MENU_SELECTION_ID = "speed-read-selection";
var MENU_PAGE_ID = "speed-read-this-page";
var MENU_PICK_ID = "speed-read-element";
var BADGE_ERROR_MS = 2000;
var FRAME_ACCESS = { origins: ["<all_urls>"] };
// A child frame's page text only competes with the top page when the
// frame is big enough to be content rather than an ad or a widget.
var MIN_FRAME_AREA = 200 * 200;
// Below this many words, a top page with unreachable frames is treated
// as a shell around embedded content, so the reader offers frame access.
var SHELL_MAX_WORDS = 60;

chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    id: MENU_SELECTION_ID,
    title: "Speed read selection",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: MENU_PAGE_ID,
    title: "Speed read this page",
    contexts: ["page", "link", "image"]
  });
  chrome.contextMenus.create({
    id: MENU_PICK_ID,
    title: "Speed read an element",
    contexts: ["page"]
  });
});

function flashBadgeError(tabId) {
  chrome.action.setBadgeBackgroundColor({ color: "#cf4520", tabId: tabId });
  chrome.action.setBadgeText({ text: "!", tabId: tabId });
  setTimeout(function () {
    chrome.action.setBadgeText({ text: "", tabId: tabId });
  }, BADGE_ERROR_MS);
}

function hasFrameAccess() {
  return chrome.permissions.contains(FRAME_ACCESS).catch(function () { return false; });
}

// allFrames injects wherever the extension currently has access and
// silently skips the rest, so this is right with or without the
// optional permission. It rejects only when the top page itself is
// unscriptable.
function injectAll(tabId) {
  return chrome.scripting.executeScript({
    target: { tabId: tabId, allFrames: true },
    files: ["content.js"]
  });
}

function sendToTop(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message, { frameId: 0 });
}

function broadcast(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message).catch(function () {});
}

function extractAll(tabId) {
  return chrome.scripting.executeScript({
    target: { tabId: tabId, allFrames: true },
    func: function () {
      var api = window.__SPEED_READER_API__;
      return api ? api.extract() : null;
    }
  });
}

// Choose what to read from every frame's extraction: a selection in any
// frame wins, otherwise the frame with the most words, with the top page
// kept unless a frame has more than twice its text.
function chooseExtraction(results, frameAccess) {
  var rows = [];
  for (var i = 0; i < results.length; i++) {
    if (results[i] && results[i].result) rows.push({ frameId: results[i].frameId, ex: results[i].result });
  }
  var top = null;
  for (var j = 0; j < rows.length; j++) {
    if (rows[j].ex.rung === 1) return rows[j].ex;
    if (rows[j].frameId === 0) top = rows[j];
  }
  var best = top;
  for (var k = 0; k < rows.length; k++) {
    var row = rows[k];
    if (row.frameId === 0 || row.ex.area < MIN_FRAME_AREA) continue;
    if (!best || row.ex.words > best.ex.words) best = row;
  }
  if (!best) return { rung: 0, rungLabel: null, title: null, text: "" };
  if (top && best !== top && top.ex.words * 2 >= best.ex.words) best = top;

  var ex = best.ex;
  if (best === top && !frameAccess && top.ex.blockedFrames > 0 && top.ex.words < SHELL_MAX_WORDS) {
    ex.needsFrameAccess = true;
  }
  return ex;
}

function startPick(tabId, frameAccess) {
  return chrome.tabs.sendMessage(tabId, { kind: "pick", frameAccess: frameAccess });
}

function invoke(tabId, kind) {
  if (tabId == null) return Promise.resolve();
  var frameAccess = false;
  return hasFrameAccess()
    .then(function (granted) {
      frameAccess = granted;
      return injectAll(tabId);
    })
    .then(function () {
      if (kind === "pick") return startPick(tabId, frameAccess);
      return extractAll(tabId).then(function (results) {
        return sendToTop(tabId, { kind: "show", extraction: chooseExtraction(results, frameAccess) });
      });
    })
    .catch(function () {
      // Unscriptable page (chrome://, the Web Store, a PDF viewer, etc).
      flashBadgeError(tabId);
    });
}

function openGrantPage(tabId, kind) {
  var url = chrome.runtime.getURL("grant.html") +
    "?tab=" + encodeURIComponent(String(tabId)) + "&kind=" + encodeURIComponent(kind || "");
  return chrome.windows.create({ url: url, type: "popup", width: 540, height: 480 })
    .catch(function () { return chrome.tabs.create({ url: url }); });
}

function resumeAfterGrant(tabId, kind) {
  if (!tabId || (kind !== "pick" && kind !== "page")) return Promise.resolve();
  return chrome.tabs.update(tabId, { active: true })
    .then(function (tab) {
      if (tab && tab.windowId != null) return chrome.windows.update(tab.windowId, { focused: true });
    })
    .catch(function () {})
    .then(function () { return invoke(tabId, kind); });
}

chrome.action.onClicked.addListener(function (tab) {
  invoke(tab && tab.id, "page");
});

chrome.commands.onCommand.addListener(function (command, tab) {
  var tabId = tab && tab.id;
  if (command === "speed-read-page") {
    invoke(tabId, "page");
  } else if (command === "speed-read-selection") {
    invoke(tabId, "selection");
  }
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  var tabId = tab && tab.id;
  if (info.menuItemId === MENU_SELECTION_ID) {
    invoke(tabId, "selection");
  } else if (info.menuItemId === MENU_PAGE_ID) {
    invoke(tabId, "page");
  } else if (info.menuItemId === MENU_PICK_ID) {
    invoke(tabId, "pick");
  }
});

// Messages from content scripts (any frame) and from grant.html.
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (!message || !message.type) return;
  var tabId = sender.tab && sender.tab.id;

  if (message.type === "start-pick") {
    // The reader's Pick element button: the top frame is already picking,
    // so fan the picker out to every other frame it can reach.
    hasFrameAccess().then(function (granted) {
      sendResponse({ frameAccess: granted });
      if (tabId == null) return;
      injectAll(tabId)
        .then(function () { return startPick(tabId, granted); })
        .catch(function () {});
    });
    return true;
  }

  if (message.type === "picked" && tabId != null) {
    // A child frame picked an element: the reader lives in the top frame.
    sendToTop(tabId, { kind: "picked", extraction: message.extraction })
      .catch(function () {})
      .then(function () { return broadcast(tabId, { kind: "pick-cancel" }); });
  } else if (message.type === "pick-hover" && tabId != null) {
    broadcast(tabId, { kind: "pick-hover", token: message.token });
  } else if ((message.type === "pick-cancel" || message.type === "pick-ended") && tabId != null) {
    broadcast(tabId, { kind: "pick-cancel" });
  } else if (message.type === "open-grant") {
    openGrantPage(tabId, message.resume);
  } else if (message.type === "grant-done") {
    resumeAfterGrant(message.tabId, message.kind);
  }
});

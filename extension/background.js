// MV3 service worker: context menus, the toolbar action, and both
// keyboard commands all funnel through invoke(), which injects
// content.js (safe to inject repeatedly, see content-main.js) and then
// sends a {kind} message. No host_permissions are used anywhere here;
// every injection rides the activeTab grant from the gesture that
// triggered it.
"use strict";

var MENU_SELECTION_ID = "speed-read-selection";
var MENU_PAGE_ID = "speed-read-this-page";
var BADGE_ERROR_MS = 2000;

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
});

function flashBadgeError(tabId) {
  chrome.action.setBadgeBackgroundColor({ color: "#cf4520", tabId: tabId });
  chrome.action.setBadgeText({ text: "!", tabId: tabId });
  setTimeout(function () {
    chrome.action.setBadgeText({ text: "", tabId: tabId });
  }, BADGE_ERROR_MS);
}

function invoke(tabId, kind) {
  if (tabId == null) return;
  chrome.scripting.executeScript(
    { target: { tabId: tabId }, files: ["content.js"] },
    function () {
      if (chrome.runtime.lastError) {
        // Unscriptable page (chrome://, the Web Store, a PDF viewer, etc).
        flashBadgeError(tabId);
        return;
      }
      chrome.tabs.sendMessage(tabId, { kind: kind }, function () {
        if (chrome.runtime.lastError) {
          flashBadgeError(tabId);
        }
      });
    }
  );
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
  }
});

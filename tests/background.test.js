import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

var listeners = {};
var createdMenus = [];
var injected = [];
var sentMessages = [];
var badgeColors = [];
var badgeTexts = [];

globalThis.chrome = {
  runtime: {
    lastError: null,
    onInstalled: {
      addListener: function (fn) { listeners.installed = fn; }
    }
  },
  contextMenus: {
    create: function (details) { createdMenus.push(details); },
    onClicked: {
      addListener: function (fn) { listeners.menuClicked = fn; }
    }
  },
  action: {
    onClicked: {
      addListener: function (fn) { listeners.actionClicked = fn; }
    },
    setBadgeBackgroundColor: function (details) { badgeColors.push(details); },
    setBadgeText: function (details) { badgeTexts.push(details); }
  },
  commands: {
    onCommand: {
      addListener: function (fn) { listeners.command = fn; }
    }
  },
  scripting: {
    executeScript: function (details, callback) {
      injected.push(details);
      callback();
    }
  },
  tabs: {
    sendMessage: function (tabId, message, callback) {
      sentMessages.push({ tabId: tabId, message: message });
      callback();
    }
  }
};

await import("../extension/background.js");

function resetCalls() {
  injected.length = 0;
  sentMessages.length = 0;
  badgeColors.length = 0;
  badgeTexts.length = 0;
  chrome.runtime.lastError = null;
}

describe("extension service worker", function () {
  it("registers page, selection, and element context menus", function () {
    listeners.installed();

    expect(createdMenus).toEqual([
      {
        id: "speed-read-selection",
        title: "Speed read selection",
        contexts: ["selection"]
      },
      {
        id: "speed-read-this-page",
        title: "Speed read this page",
        contexts: ["page", "link", "image"]
      },
      {
        id: "speed-read-element",
        title: "Speed read an element",
        contexts: ["page"]
      }
    ]);
  });

  it("routes every gesture through the same injection and message funnel", function () {
    var cases = [
      {
        invoke: function () { listeners.actionClicked({ id: 10 }); },
        kind: "page",
        tabId: 10
      },
      {
        invoke: function () { listeners.command("speed-read-page", { id: 11 }); },
        kind: "page",
        tabId: 11
      },
      {
        invoke: function () { listeners.command("speed-read-selection", { id: 12 }); },
        kind: "selection",
        tabId: 12
      },
      {
        invoke: function () {
          listeners.menuClicked({ menuItemId: "speed-read-this-page" }, { id: 13 });
        },
        kind: "page",
        tabId: 13
      },
      {
        invoke: function () {
          listeners.menuClicked({ menuItemId: "speed-read-selection" }, { id: 14 });
        },
        kind: "selection",
        tabId: 14
      },
      {
        invoke: function () {
          listeners.menuClicked({ menuItemId: "speed-read-element" }, { id: 15 });
        },
        kind: "pick",
        tabId: 15
      }
    ];

    cases.forEach(function (entry) {
      resetCalls();
      entry.invoke();
      expect(injected).toEqual([
        { target: { tabId: entry.tabId }, files: ["content.js"] }
      ]);
      expect(sentMessages).toEqual([
        { tabId: entry.tabId, message: { kind: entry.kind } }
      ]);
    });
  });

  it("keeps the permission set exact and omits host permissions", function () {
    var manifest = JSON.parse(
      readFileSync(new URL("../extension/manifest.json", import.meta.url), "utf8")
    );
    expect(manifest.permissions.slice().sort()).toEqual(
      ["activeTab", "commands", "contextMenus", "scripting", "storage"]
    );
    expect(Object.prototype.hasOwnProperty.call(manifest, "host_permissions")).toBe(false);
  });

  it("flashes and clears the error badge when injection is rejected", function () {
    var originalExecuteScript = chrome.scripting.executeScript;
    var originalSetTimeout = globalThis.setTimeout;
    var scheduled = [];

    chrome.scripting.executeScript = function (details, callback) {
      injected.push(details);
      chrome.runtime.lastError = { message: "Cannot access a chrome:// URL" };
      callback();
      chrome.runtime.lastError = null;
    };
    globalThis.setTimeout = function (callback, delay) {
      scheduled.push({ callback: callback, delay: delay });
      return 1;
    };

    try {
      resetCalls();
      listeners.actionClicked({ id: 16 });

      expect(sentMessages).toEqual([]);
      expect(badgeColors).toEqual([{ color: "#cf4520", tabId: 16 }]);
      expect(badgeTexts).toEqual([{ text: "!", tabId: 16 }]);
      expect(scheduled.length).toBe(1);
      expect(scheduled[0].delay).toBe(2000);

      scheduled[0].callback();
      expect(badgeTexts).toEqual([
        { text: "!", tabId: 16 },
        { text: "", tabId: 16 }
      ]);
    } finally {
      chrome.scripting.executeScript = originalExecuteScript;
      globalThis.setTimeout = originalSetTimeout;
      chrome.runtime.lastError = null;
    }
  });
});

import { beforeEach, describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

var listeners = {};
var createdMenus = [];
var injected = [];
var sentMessages = [];
var badgeColors = [];
var badgeTexts = [];
var createdWindows = [];
var frameAccess = false;
var frameExtractions = [];
var failInjection = false;

function tick() {
  return new Promise(function (resolve) { setTimeout(resolve, 0); });
}

globalThis.chrome = {
  runtime: {
    lastError: null,
    getURL: function (path) { return "chrome-extension://test/" + path; },
    onInstalled: {
      addListener: function (fn) { listeners.installed = fn; }
    },
    onMessage: {
      addListener: function (fn) { listeners.message = fn; }
    }
  },
  permissions: {
    contains: function () { return Promise.resolve(frameAccess); }
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
    executeScript: function (details) {
      if (details.files) {
        injected.push(details);
        if (failInjection) return Promise.reject(new Error("Cannot access a chrome:// URL"));
        return Promise.resolve([]);
      }
      return Promise.resolve(frameExtractions);
    }
  },
  tabs: {
    sendMessage: function (tabId, message, options) {
      sentMessages.push(options ? { tabId: tabId, message: message, options: options } : { tabId: tabId, message: message });
      return Promise.resolve();
    },
    update: function (tabId) { return Promise.resolve({ id: tabId, windowId: 7 }); },
    create: function () { return Promise.resolve({}); }
  },
  windows: {
    create: function (details) { createdWindows.push(details); return Promise.resolve({}); },
    update: function () { return Promise.resolve({}); }
  }
};

await import("../extension/background.js");

function frame(frameId, fields) {
  return {
    frameId: frameId,
    result: Object.assign({ rung: 2, rungLabel: "Readability", title: "t", text: "x", words: 1, area: 1000000, blockedFrames: 0 }, fields)
  };
}

beforeEach(function () {
  injected.length = 0;
  sentMessages.length = 0;
  badgeColors.length = 0;
  badgeTexts.length = 0;
  createdWindows.length = 0;
  frameAccess = false;
  failInjection = false;
  frameExtractions = [frame(0, { text: "top text", words: 2 })];
  chrome.runtime.lastError = null;
});

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

  it("routes every gesture through the same all-frames injection funnel", async function () {
    var cases = [
      { invoke: function () { listeners.actionClicked({ id: 10 }); }, kind: "page", tabId: 10 },
      { invoke: function () { listeners.command("speed-read-page", { id: 11 }); }, kind: "page", tabId: 11 },
      { invoke: function () { listeners.command("speed-read-selection", { id: 12 }); }, kind: "selection", tabId: 12 },
      { invoke: function () { listeners.menuClicked({ menuItemId: "speed-read-this-page" }, { id: 13 }); }, kind: "page", tabId: 13 },
      { invoke: function () { listeners.menuClicked({ menuItemId: "speed-read-selection" }, { id: 14 }); }, kind: "selection", tabId: 14 },
      { invoke: function () { listeners.menuClicked({ menuItemId: "speed-read-element" }, { id: 15 }); }, kind: "pick", tabId: 15 }
    ];

    for (var i = 0; i < cases.length; i++) {
      var entry = cases[i];
      injected.length = 0;
      sentMessages.length = 0;
      entry.invoke();
      await tick();

      expect(injected).toEqual([
        { target: { tabId: entry.tabId, allFrames: true }, files: ["content.js"] }
      ]);
      if (entry.kind === "pick") {
        expect(sentMessages).toEqual([
          { tabId: entry.tabId, message: { kind: "pick", frameAccess: false } }
        ]);
      } else {
        expect(sentMessages).toEqual([
          { tabId: entry.tabId, message: { kind: "show", extraction: frameExtractions[0].result }, options: { frameId: 0 } }
        ]);
      }
    }
  });

  it("reads the frame that holds the text when the top page is a shell", async function () {
    frameAccess = true;
    frameExtractions = [
      frame(0, { text: "Course Share", words: 2, blockedFrames: 1 }),
      frame(512, { text: "tiny ad", words: 2, area: 300 * 100 }),
      frame(640, { text: "the whole course text", words: 900 })
    ];
    listeners.actionClicked({ id: 20 });
    await tick();
    expect(sentMessages[0].message.extraction.words).toBe(900);
  });

  it("prefers a selection in any frame and keeps a comparable top page", async function () {
    frameExtractions = [
      frame(0, { words: 400 }),
      frame(640, { words: 700 }),
      frame(641, { rung: 1, rungLabel: "Selection", text: "picked words", words: 2, area: 10 })
    ];
    listeners.command("speed-read-selection", { id: 21 });
    await tick();
    expect(sentMessages[0].message.extraction.rung).toBe(1);

    sentMessages.length = 0;
    frameExtractions = frameExtractions.slice(0, 2);
    listeners.actionClicked({ id: 21 });
    await tick();
    expect(sentMessages[0].message.extraction.words).toBe(400);
  });

  it("offers frame access when the text is behind unreachable frames", async function () {
    frameExtractions = [frame(0, { text: "Course Share", words: 2, blockedFrames: 1 })];
    listeners.actionClicked({ id: 22 });
    await tick();
    expect(sentMessages[0].message.extraction.needsFrameAccess).toBe(true);

    sentMessages.length = 0;
    frameExtractions = [frame(0, { words: 500, blockedFrames: 1 })];
    listeners.actionClicked({ id: 22 });
    await tick();
    expect(sentMessages[0].message.extraction.needsFrameAccess).toBeUndefined();
  });

  it("relays a child frame's pick to the reader and stops every picker", async function () {
    var extraction = { rung: 4, rungLabel: "Element", title: "t", text: "frame text" };
    listeners.message({ type: "picked", extraction: extraction }, { tab: { id: 30 }, frameId: 640 });
    await tick();
    expect(sentMessages).toEqual([
      { tabId: 30, message: { kind: "picked", extraction: extraction }, options: { frameId: 0 } },
      { tabId: 30, message: { kind: "pick-cancel" } }
    ]);
  });

  it("opens the grant page and resumes the action once access is granted", async function () {
    listeners.message({ type: "open-grant", resume: "pick" }, { tab: { id: 31 } });
    await tick();
    expect(createdWindows[0].url).toBe("chrome-extension://test/grant.html?tab=31&kind=pick");

    frameAccess = true;
    listeners.message({ type: "grant-done", tabId: 31, kind: "pick" }, {});
    await tick();
    await tick();
    expect(sentMessages).toEqual([
      { tabId: 31, message: { kind: "pick", frameAccess: true } }
    ]);
  });

  it("keeps required permissions exact and host access optional", function () {
    var manifest = JSON.parse(
      readFileSync(new URL("../extension/manifest.json", import.meta.url), "utf8")
    );
    expect(manifest.permissions.slice().sort()).toEqual(
      ["activeTab", "commands", "contextMenus", "scripting", "storage"]
    );
    expect(Object.prototype.hasOwnProperty.call(manifest, "host_permissions")).toBe(false);
    expect(manifest.optional_host_permissions).toEqual(["<all_urls>"]);
  });

  it("flashes and clears the error badge when injection is rejected", async function () {
    var originalSetTimeout = globalThis.setTimeout;
    var scheduled = [];
    failInjection = true;
    globalThis.setTimeout = function (callback, delay) {
      if (delay === 0) return originalSetTimeout(callback, 0);
      scheduled.push({ callback: callback, delay: delay });
      return 1;
    };

    try {
      listeners.actionClicked({ id: 16 });
      await tick();

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
      globalThis.setTimeout = originalSetTimeout;
    }
  });
});

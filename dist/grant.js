// grant.html: asks for the optional <all_urls> host permission so the
// extension can inject into cross-origin frames. permissions.request
// needs a click inside an extension page, which is why this page exists.
// Opened by background.js with ?tab=<id>&kind=<pick|page> to resume the
// interrupted action, or as the options page with no query.
"use strict";

var FRAME_ACCESS = { origins: ["<all_urls>"] };
var params = new URLSearchParams(location.search);
var resumeTab = parseInt(params.get("tab"), 10);
var resumeKind = params.get("kind");
var fromReader = Number.isFinite(resumeTab);

var statusEl = document.getElementById("status");
var allowBtn = document.getElementById("allow");
var revokeBtn = document.getElementById("revoke");
var closeBtn = document.getElementById("close");

function render(granted) {
  statusEl.textContent = granted ? "allowed" : "not allowed";
  statusEl.className = "status " + (granted ? "on" : "off");
  allowBtn.hidden = granted;
  revokeBtn.hidden = !granted;
  closeBtn.hidden = !fromReader;
}

function refresh() {
  chrome.permissions.contains(FRAME_ACCESS).then(render);
}

allowBtn.addEventListener("click", function () {
  chrome.permissions.request(FRAME_ACCESS).then(function (granted) {
    render(granted);
    if (granted && fromReader) {
      chrome.runtime.sendMessage({ type: "grant-done", tabId: resumeTab, kind: resumeKind }, function () {
        void chrome.runtime.lastError;
        window.close();
      });
    }
  });
});

revokeBtn.addEventListener("click", function () {
  chrome.permissions.remove(FRAME_ACCESS).then(refresh);
});

closeBtn.addEventListener("click", function () {
  window.close();
});

refresh();

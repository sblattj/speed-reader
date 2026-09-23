#!/usr/bin/env bun
// Bun.build src/page/main.js into a single IIFE, inline reader.css, inject
// both into src/page/template.html, and write the result to index.html at
// the project root. This is the single source of truth the design
// document requires: index.html is never hand-edited, only regenerated
// from src/. Every run also executes the invariant gates below and exits
// non-zero (printing which gate failed) if any of them break.
//
// Phase 2 adds an extension-bundle entrypoint alongside this one; the
// gates and the render/write plumbing are written so that addition only
// needs a second Bun.build call plus a second output target, not a
// rewrite of this file.

import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, readdirSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";

import { tokenizeText, isSentenceEnd } from "../src/core/tokenize.js";
import { chunkPhrases } from "../src/core/chunk.js";
import { SAMPLE_TEXT } from "../src/page/main.js";

const ROOT = resolve(import.meta.dir, "..");
const TEMPLATE_PATH = join(ROOT, "src/page/template.html");
const CSS_PATH = join(ROOT, "src/ui/reader.css");
const ENTRY_PATH = join(ROOT, "src/page/main.js");
const OUT_PATH = join(ROOT, "index.html");

const EXT_ENTRY_PATH = join(ROOT, "src/extension/content-main.js");
const EXT_MANIFEST_SRC_PATH = join(ROOT, "extension/manifest.json");
const EXT_BACKGROUND_SRC_PATH = join(ROOT, "extension/background.js");
const DIST_DIR = join(ROOT, "dist");
const DIST_CONTENT_PATH = join(DIST_DIR, "content.js");
const DIST_MANIFEST_PATH = join(DIST_DIR, "manifest.json");
const DIST_BACKGROUND_PATH = join(DIST_DIR, "background.js");
// Icons are rendered from extension/icons/icon.svg and committed as PNGs;
// only the PNG sizes the manifest names are shipped in dist/icons.
const EXT_ICONS_SRC_DIR = join(ROOT, "extension/icons");
const DIST_ICONS_DIR = join(DIST_DIR, "icons");
const ICON_FILES = ["icon16.png", "icon32.png", "icon48.png", "icon128.png"];
// The frame-access grant page (also the options page) ships as-is.
const STATIC_EXT_FILES = ["grant.html", "grant.js"];
const EXPECTED_OPTIONAL_HOST_PERMISSIONS = ["<all_urls>"];
const EXPECTED_PERMISSIONS = ["activeTab", "scripting", "contextMenus", "storage", "commands"];

type GateResult = { name: string; ok: boolean; detail: string };

async function buildBundle(): Promise<string> {
  const result = await Bun.build({
    entrypoints: [ENTRY_PATH],
    format: "iife",
    target: "browser",
    minify: false
  });
  if (!result.success) {
    for (const log of result.logs) console.error(String(log));
    throw new Error("Bun.build failed for src/page/main.js");
  }
  return await result.outputs[0].text();
}

async function buildExtensionBundle(): Promise<string> {
  const result = await Bun.build({
    entrypoints: [EXT_ENTRY_PATH],
    format: "iife",
    target: "browser",
    minify: false,
    loader: { ".css": "text" }
  });
  if (!result.success) {
    for (const log of result.logs) console.error(String(log));
    throw new Error("Bun.build failed for src/extension/content-main.js");
  }
  return await result.outputs[0].text();
}

function writeExtensionDist(contentJs: string): { manifestText: string; backgroundText: string } {
  mkdirSync(DIST_DIR, { recursive: true });
  writeFileSync(DIST_CONTENT_PATH, contentJs, "utf8");
  const manifestText = readFileSync(EXT_MANIFEST_SRC_PATH, "utf8");
  const backgroundText = readFileSync(EXT_BACKGROUND_SRC_PATH, "utf8");
  writeFileSync(DIST_MANIFEST_PATH, manifestText, "utf8");
  writeFileSync(DIST_BACKGROUND_PATH, backgroundText, "utf8");
  rmSync(DIST_ICONS_DIR, { recursive: true, force: true });
  mkdirSync(DIST_ICONS_DIR, { recursive: true });
  for (const f of ICON_FILES) cpSync(join(EXT_ICONS_SRC_DIR, f), join(DIST_ICONS_DIR, f));
  for (const f of STATIC_EXT_FILES) cpSync(join(ROOT, "extension", f), join(DIST_DIR, f));
  return { manifestText, backgroundText };
}

function gateNodeCheck(name: string, path: string): GateResult {
  try {
    execFileSync("node", ["--check", path], { stdio: "pipe" });
    return { name, ok: true, detail: path + " is syntactically valid" };
  } catch (err: any) {
    const stderr = err && err.stderr ? err.stderr.toString() : String(err);
    return { name, ok: false, detail: stderr };
  }
}

function gateManifestJson(manifestText: string): GateResult {
  const problems: string[] = [];
  let manifest: any;
  try {
    manifest = JSON.parse(manifestText);
  } catch (err: any) {
    return { name: "manifest-json", ok: false, detail: "dist/manifest.json failed to parse: " + String(err) };
  }

  if (Object.prototype.hasOwnProperty.call(manifest, "host_permissions")) {
    problems.push("manifest declares host_permissions, which must be absent");
  }

  const perms: unknown = manifest.permissions;
  if (!Array.isArray(perms)) {
    problems.push("manifest.permissions is not an array");
  } else {
    const gotSorted = [...perms].sort();
    const expectedSorted = [...EXPECTED_PERMISSIONS].sort();
    const sameLength = gotSorted.length === expectedSorted.length;
    const sameEntries = sameLength && gotSorted.every((p, i) => p === expectedSorted[i]);
    if (!sameEntries) {
      problems.push(
        "expected permissions exactly " + JSON.stringify(EXPECTED_PERMISSIONS) + ", got " + JSON.stringify(perms)
      );
    }
  }

  const optional = JSON.stringify(manifest.optional_host_permissions || []);
  if (optional !== JSON.stringify(EXPECTED_OPTIONAL_HOST_PERMISSIONS)) {
    problems.push(
      "expected optional_host_permissions exactly " + JSON.stringify(EXPECTED_OPTIONAL_HOST_PERMISSIONS) + ", got " + optional
    );
  }

  return {
    name: "manifest-json",
    ok: problems.length === 0,
    detail: problems.length === 0
      ? "valid JSON, permissions exact, no host_permissions, optional host access only"
      : problems.join("; ")
  };
}

function gateDistContents(): GateResult {
  const entries = readdirSync(DIST_DIR).sort();
  const expected = ["background.js", "content.js", "grant.html", "grant.js", "icons", "manifest.json"];
  const icons = readdirSync(DIST_ICONS_DIR).sort();
  const expectedIcons = [...ICON_FILES].sort();
  const ok =
    entries.length === expected.length && entries.every((e, i) => e === expected[i]) &&
    icons.length === expectedIcons.length && icons.every((e, i) => e === expectedIcons[i]);
  return {
    name: "dist-contents",
    ok,
    detail: ok
      ? "dist/ contains exactly " + JSON.stringify(expected) + " with icons " + JSON.stringify(expectedIcons)
      : "dist/ contains " + JSON.stringify(entries) + ", dist/icons contains " + JSON.stringify(icons)
  };
}

function gateNoScratchpadRefs(files: { path: string; text: string }[]): GateResult {
  const needles = ["/private/tmp", "scratchpad", "/tmp/claude-"];
  const problems: string[] = [];
  for (const f of files) {
    for (const needle of needles) {
      if (f.text.indexOf(needle) !== -1) {
        problems.push(f.path + " contains \"" + needle + "\"");
      }
    }
  }
  return {
    name: "no-scratchpad-refs",
    ok: problems.length === 0,
    detail: problems.length === 0 ? "clean across dist/" : problems.join("; ")
  };
}

function renderPage(css: string, js: string): string {
  const template = readFileSync(TEMPLATE_PATH, "utf8");
  const icon = readFileSync(join(EXT_ICONS_SRC_DIR, "icon32.png")).toString("base64");
  let html = template.replace("<!--FAVICON-->", "<link rel=\"icon\" href=\"data:image/png;base64," + icon + "\">");
  html = html.replace("<!--STYLE-->", "<style>\n" + css + "\n</style>");
  html = html.replace("<!--SCRIPT-->", "<script>\n\"use strict\";\n" + js + "\n</script>");
  return html;
}

function gateDoctypeFirstLine(html: string): GateResult {
  const firstLine = html.split("\n")[0];
  const ok = firstLine === "<!doctype html>";
  return {
    name: "doctype-first-line",
    ok,
    detail: ok ? "first line is <!doctype html>" : "first line was: " + JSON.stringify(firstLine)
  };
}

function extractScriptBodies(html: string): string[] {
  const bodies: string[] = [];
  const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    bodies.push(m[1]);
  }
  return bodies;
}

function gateScriptSyntax(html: string): GateResult {
  const bodies = extractScriptBodies(html);
  if (bodies.length === 0) {
    return { name: "script-syntax", ok: false, detail: "no <script> tag found in built index.html" };
  }
  const dir = mkdtempSync(join(tmpdir(), "speed-reader-build-"));
  try {
    const problems: string[] = [];
    bodies.forEach((body, i) => {
      const file = join(dir, "script-" + i + ".js");
      writeFileSync(file, body, "utf8");
      try {
        execFileSync("node", ["--check", file], { stdio: "pipe" });
      } catch (err: any) {
        const stderr = err && err.stderr ? err.stderr.toString() : String(err);
        problems.push("script " + i + ": " + stderr);
      }
    });
    return {
      name: "script-syntax",
      ok: problems.length === 0,
      detail: problems.length === 0 ? bodies.length + " script block(s) checked clean" : problems.join("; ")
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function gateChunkerDistribution(): GateResult {
  const doc = tokenizeText(SAMPLE_TEXT);
  const chunks = chunkPhrases(doc);
  const totalWords = doc.words.length;
  const problems: string[] = [];

  if (chunks.length !== 78) problems.push("expected 78 chunks, got " + chunks.length);
  if (totalWords !== 336) problems.push("expected 336 words, got " + totalWords);

  let cursor = 0;
  for (const c of chunks) {
    if (c.start !== cursor) {
      problems.push("coverage gap or overlap: chunk starts at " + c.start + ", expected " + cursor);
      break;
    }
    cursor = c.end + 1;
  }
  if (cursor !== totalWords) {
    problems.push("coverage ends at word " + cursor + ", expected " + totalWords);
  }

  const counts: Record<number, number> = {};
  for (const c of chunks) {
    const size = c.end - c.start + 1;
    counts[size] = (counts[size] || 0) + 1;
    if (size < 2 || size > 5) problems.push("chunk size " + size + " outside [2,5] (start " + c.start + ")");
    for (let k = c.start; k < c.end; k++) {
      if (isSentenceEnd(doc.words[k])) {
        problems.push("sentence-end word mid-chunk at index " + k + " (\"" + doc.words[k] + "\")");
      }
    }
  }

  const expected: Record<number, number> = { 2: 8, 3: 13, 4: 4, 5: 53 };
  for (const size of [2, 3, 4, 5]) {
    const got = counts[size] || 0;
    if (got !== expected[size]) problems.push("size " + size + ": expected " + expected[size] + ", got " + got);
  }

  const summary = "chunks=" + chunks.length + " words=" + totalWords + " counts=" + JSON.stringify(counts);
  return {
    name: "chunker-distribution",
    ok: problems.length === 0,
    detail: problems.length === 0 ? summary : summary + "; problems: " + problems.join("; ")
  };
}

function gateDashAndWordScan(html: string): GateResult {
  const problems: string[] = [];
  if (html.indexOf("—") !== -1) problems.push("contains an em dash (U+2014)");
  if (html.indexOf("–") !== -1) problems.push("contains an en dash (U+2013)");
  if (/happy/i.test(html)) problems.push("contains \"happy\"");
  if (/squarely/i.test(html)) problems.push("contains \"squarely\"");
  return {
    name: "dash-and-banned-word-scan",
    ok: problems.length === 0,
    detail: problems.length === 0 ? "clean" : problems.join("; ")
  };
}

async function main() {
  const css = readFileSync(CSS_PATH, "utf8");
  const js = await buildBundle();
  const html = renderPage(css, js);
  writeFileSync(OUT_PATH, html, "utf8");

  const contentJs = await buildExtensionBundle();
  const { manifestText, backgroundText } = writeExtensionDist(contentJs);

  const gates: GateResult[] = [
    gateDoctypeFirstLine(html),
    gateScriptSyntax(html),
    gateChunkerDistribution(),
    gateDashAndWordScan(html),
    gateNodeCheck("content-js-syntax", DIST_CONTENT_PATH),
    gateNodeCheck("background-js-syntax", DIST_BACKGROUND_PATH),
    gateNodeCheck("grant-js-syntax", join(DIST_DIR, "grant.js")),
    gateDashAndWordScan(readFileSync(join(DIST_DIR, "grant.html"), "utf8")),
    gateManifestJson(manifestText),
    gateDistContents(),
    gateNoScratchpadRefs([
      { path: "dist/content.js", text: contentJs },
      { path: "dist/background.js", text: backgroundText },
      { path: "dist/manifest.json", text: manifestText }
    ])
  ];

  let allOk = true;
  for (const g of gates) {
    const status = g.ok ? "PASS" : "FAIL";
    console.log("[" + status + "] " + g.name + ": " + g.detail);
    if (!g.ok) allOk = false;
  }

  if (!allOk) {
    console.error("\nindex.html and dist/ were written but one or more invariant gates FAILED.");
    process.exit(1);
  }

  console.log(
    "\nWrote " + OUT_PATH + " (" + Buffer.byteLength(html, "utf8") + " bytes) and dist/ (content.js " +
    Buffer.byteLength(contentJs, "utf8") + " bytes). All gates passed."
  );
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});

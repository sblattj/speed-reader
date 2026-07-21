// Chunking: the fixed-N word grouping used by RSVP, the ORP (optimal
// recognition point) index used to render the pivot letter, and the
// greedy phrase chunker used by Chunk mode. Pure logic, no DOM.

import { isSentenceEnd } from "./tokenize.js";

export function getOrpIndex(len) {
  if (len <= 1) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  if (len <= 13) return 3;
  return 4;
}

export function getChunkIndices(doc, startIndex, chunkSize) {
  var indices = [];
  var total = doc.words.length;
  for (var i = 0; i < chunkSize && (startIndex + i) < total; i++) {
    indices.push(startIndex + i);
  }
  return indices;
}

export function isClauseBreak(word) {
  return /[,;:]$/.test(word);
}

// Find the next hard boundary (sentence end or paragraph end) at or after
// fromIndex. Always resolves within the document since the last word of
// every paragraph, including the final one, is a hard boundary.
export function findNextHardBoundary(doc, fromIndex) {
  for (var k = fromIndex; k < doc.words.length; k++) {
    if (doc.paragraphEndIndices.has(k) || isSentenceEnd(doc.words[k])) return k;
  }
  return doc.words.length - 1;
}

// Greedy forward phrase chunker for Chunk mode: 3 to 5 words per chunk,
// never crossing a sentence or paragraph boundary, breaking early on a
// comma/semicolon/colon once the chunk already holds 2 or more words, and
// avoiding a 1 word orphan chunk by taking 3 instead of 5 when exactly
// 6 words remain before the next hard boundary.
export function chunkPhrases(doc) {
  var words = doc.words;
  var n = words.length;
  var chunks = [];
  var i = 0;
  while (i < n) {
    var h = findNextHardBoundary(doc, i);
    var remaining = h - i + 1;
    var effectiveCap = (remaining === 6) ? 3 : 5;
    var end = i;
    for (var k = i; k < n; k++) {
      end = k;
      var len = k - i + 1;
      var word = words[k];
      var mustStop = doc.paragraphEndIndices.has(k) || isSentenceEnd(word);
      var mayStop = isClauseBreak(word) && len >= 2;
      var atCap = len >= effectiveCap;
      if (mustStop || mayStop || atCap) break;
    }
    chunks.push({ start: i, end: end });
    i = end + 1;
  }
  return chunks;
}

// Unified lookup: which phrase chunk (by index into `chunks`) contains word
// index `idx`, or -1 if none does.
export function findPhraseChunkIndexAt(chunks, idx) {
  for (var i = 0; i < chunks.length; i++) {
    if (idx >= chunks[i].start && idx <= chunks[i].end) return i;
  }
  return -1;
}
